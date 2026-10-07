const express = require("express");
const router = express.Router();

const requireInitialized = require("../middleware/requireInitialized");
const requireStore = require("../middleware/storeScope");

const { getProduct, roundQuantity, CATEGORY_LABEL } = require("../config/catalog");
const python = require("../services/python");
const storeDataset = require("../services/storeDataset");
const upload = require("../services/upload");
const weather = require("../services/weather");

// Mounted at both /api/sales and /api/recipes, so this guards sales entry,
// sales history and the recipe mapping endpoints.
router.use(requireInitialized);

const WEATHER_LABELS = ["cerah", "berawan", "hujan_ringan", "hujan_deras", "panas_extreme"];

/**
 * Days of history a store needs before its model is worth (re)training.
 *
 * A model fitted on one or two days is effectively a mean predictor: every lag
 * column is still zero-padded, so it learns the average and nothing else. Below
 * this threshold the log is still saved — it just does not trigger a training
 * run that would produce a confidently useless model.
 */
const MIN_DAYS_TO_TRAIN = 7;

/**
 * Today's date in the server's local timezone (YYYY-MM-DD).
 *
 * Not `toISOString().slice(0,10)`: that is the UTC date, still yesterday for a
 * UTC+7 store until 07:00 local. Matches the helper in routes/pos.js.
 */
function localToday(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Weather for a store on a date, from its city.
 *
 * Never throws: a weather lookup failing must not stop a store from logging its
 * sales, so the caller gets { ok: false, error } and records the day without
 * weather. Returns { ok: false } with a reason when the store has no city set,
 * which is the common case for stores created before locations existed.
 */
async function lookupWeather(store, date, options = {}) {
  const location = store.location || {};
  if (!location.city || location.lat == null || location.lon == null) {
    return {
      ok: false,
      reason: "no_location",
      error: "This store has no city set, so weather cannot be fetched",
    };
  }
  if (!weather.isFetchableDate(date)) {
    return {
      ok: false,
      reason: "unfetchable_date",
      error: `Weather cannot be fetched for ${date}`,
    };
  }

  try {
    const value = await weather.fetchDay(
      {
        city: location.city,
        lat: location.lat,
        lon: location.lon,
        timezone: location.timezone || "Asia/Jakarta",
      },
      date,
      options,
    );
    return { ok: true, value };
  } catch (error) {
    console.error("[sales] weather lookup failed:", error.message);
    return { ok: false, reason: "fetch_failed", error: error.message };
  }
}

function normaliseEntries(entries) {
  if (!Array.isArray(entries)) return [];
  return entries
    .map((entry) => ({
      item_id: String(entry.item_id || "").trim(),
      units_sold: Number(entry.units_sold),
      stockout: Boolean(entry.stockout),
    }))
    .filter((entry) => entry.item_id && Number.isFinite(entry.units_sold) && entry.units_sold >= 0);
}

function menuById(store) {
  return new Map((store.menu || []).map((item) => [item.itemId, item]));
}

function plainRecipe(lines) {
  return (lines || []).map((line) => ({
    ingredient: line.ingredient,
    qty: line.qty,
    unit: line.unit,
  }));
}

/**
 * POST /api/sales/entry?storeId= — the Daily Sales Log.
 *
 * One submission does everything the day needs:
 *   1. publishes the figures into the store's dataset
 *      (ML/salesHistory/<storeId>/datasets/<storeId>.csv), which is also what
 *      marks the day as logged;
 *   2. hands the same day to the ML layer, so it lands in the store's own
 *      history under ML/salesHistory/<storeId>/raw/;
 *   3. retrains the store's model, but only once the history spans more than
 *      MIN_DAYS_TO_TRAIN days — earlier than that a fitted model is just a
 *      mean predictor.
 *
 * A day can be logged once. A second submission for a date that already has
 * rows is refused with 409 rather than overwriting.
 *
 * Body: { date, entries: [{ item_id, units_sold, stockout }], weather?,
 *         temperature?, train? }
 * `weather` is normally omitted and fetched from the store's city; passing it
 * is an override recorded with source "manual".
 */
router.post("/entry", async (req, res) => {
  const { date, weather, temperature } = req.body || {};
  const entries = normaliseEntries((req.body || {}).entries);
  const shouldTrain = (req.body || {}).train !== false;

  if (!date) {
    return res.status(400).json({ status: "error", message: "'date' is required (YYYY-MM-DD)" });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
    return res.status(400).json({
      status: "error",
      message: "'date' must be YYYY-MM-DD",
    });
  }
  if (!entries.length) {
    return res.status(400).json({
      status: "error",
      message: "'entries' must contain at least one { item_id, units_sold }",
    });
  }

  try {
    const ctx = await requireStore(req, res);
    if (!ctx) return;

    const store = ctx.store;
    const items = menuById(store);

    const unknown = entries.filter((entry) => !items.get(entry.item_id)).map((e) => e.item_id);
    if (unknown.length) {
      return res.status(400).json({
        status: "error",
        message: `Item(s) not on this store's menu: ${unknown.join(", ")}`,
      });
    }

    // ---- Once per day ----------------------------------------------------
    // The dataset is the record of which days are done, so a day that already
    // has rows is closed. This is the hard stop the UI also reflects: a second
    // submission for the same date is refused rather than silently overwriting.
    const alreadyLogged = await storeDataset.rowsForDate(store.storeId, date);
    if (alreadyLogged.length) {
      return res.status(409).json({
        status: "error",
        message: `${date} has already been logged for this store`,
        code: "already_logged",
        date,
        logged_entries: alreadyLogged,
        hint: "A day can only be logged once. Use the import endpoint to replace a whole file.",
      });
    }

    // ---- Weather ---------------------------------------------------------
    // Normally fetched from the store's city so nobody has to type it. A
    // caller may still pass `weather` explicitly, which is treated as an
    // override — useful when the API is wrong or the store has no city yet.
    let weatherLabel = null;
    let temperatureValue = null;
    let weatherSource = null;
    let weatherError = null;

    if (weather) {
      if (!WEATHER_LABELS.includes(weather)) {
        return res.status(400).json({
          status: "error",
          message: `Unknown weather label '${weather}'`,
          allowed: WEATHER_LABELS,
        });
      }
      weatherLabel = weather;
      temperatureValue =
        temperature != null && Number.isFinite(Number(temperature))
          ? Number(temperature)
          : null;
      weatherSource = "manual";
    } else {
      const fetched = await lookupWeather(store, date);
      if (fetched.ok) {
        weatherLabel = fetched.value.weather;
        temperatureValue = fetched.value.temperature;
        weatherSource = fetched.value.source;
      } else {
        weatherError = fetched.error;
      }
    }

    // ---- Hand the day to the ML layer ------------------------------------
    // The store document holds only the current day's sales now, so an
    // end-of-day log is not mirrored into Mongo: this store's ML history file
    // under ML/salesHistory/<storeId>/raw/ is the record.
    const payloadEntries = entries.map((entry) => {
      const item = items.get(entry.item_id);
      return {
        item_id: entry.item_id,
        item_name: item.name,
        item_category: item.category,
        units_sold: Math.round(entry.units_sold),
        stockout: Boolean(entry.stockout),
      };
    });

    const payload = {
      date,
      entries: payloadEntries.map((entry) => ({
        item_id: entry.item_id,
        item_name: entry.item_name,
        item_category: entry.item_category,
        units_sold: entry.units_sold,
        stockout: entry.stockout ? 1 : 0,
      })),
    };
    if (weatherLabel) payload.weather = weatherLabel;
    if (temperatureValue != null) payload.temperature = temperatureValue;

    // ---- Publish into the store's own dataset ---------------------------
    // This log is the single publish point now, so the day leaves the database
    // here. Written first: it is what marks the date as logged, and a failure
    // is reported rather than fatal so the ML side still gets its copy.
    let published = null;
    let datasetError = null;
    try {
      published = await storeDataset.upsertDailySales(store.storeId, date, payloadEntries);
    } catch (error) {
      datasetError = error.message;
      console.error("[sales] dataset publish failed:", error.message);
    }

    let rowsUpdated = null;
    // Filled from the ML layer below; the API no longer keeps a local count.
    let historyDays = null;
    let mlError = null;
    let training = null;
    let trainingError = null;
    let trainingSkipped = null;

    try {
      const appended = await python.appendDailyLog(payload, store.storeId);
      rowsUpdated = appended.rows_updated;
      historyDays = appended.history_days ?? historyDays;
      python.clearForecastCache();

      // Training is gated on the store having enough history to learn from.
      // Below the threshold the day is still saved; it just does not trigger a
      // run that would fit a mean predictor.
      if (shouldTrain && historyDays != null && historyDays > MIN_DAYS_TO_TRAIN) {
        try {
          const result = await python.trainIncremental({ storeId: store.storeId });
          python.clearForecastCache();
          store.training = {
            day: (store.training?.day || 0) + 1,
            lastTrainedAt: new Date().toISOString(),
            lastStatus: result.status || "success",
            lastResult: result,
          };
          await store.save();
          training = { ...result, adaptation: store.training.toObject?.() || store.training };
        } catch (trainErr) {
          trainingError = trainErr.message;
          console.error("[sales] store training failed:", trainErr.message);
          store.training = {
            ...(store.training?.toObject?.() || store.training || { day: 0 }),
            lastTrainedAt: new Date().toISOString(),
            lastStatus: "error",
            lastResult: { status: "error", error: trainErr.message },
          };
          await store.save();
        }
      } else if (shouldTrain) {
        trainingSkipped =
          `${historyDays ?? 0} day(s) of history — the model trains once there ` +
          `are more than ${MIN_DAYS_TO_TRAIN}`;
      }
    } catch (mlErr) {
      // The dataset is already published; the forecast simply stays empty
      // until the ML layer catches up.
      mlError = mlErr.message;
      console.error("[sales] ML mirror failed:", mlErr.message);
    }

    const message = datasetError
      ? "Log saved to the model, but the store dataset could not be written"
      : mlError
        ? "Log published, but the forecast history could not be updated"
        : trainingError
          ? "Log saved, but model retraining failed"
          : training
            ? "Daily log saved and model retrained"
            : "Daily log saved";

    res.status(200).json({
      status: "success",
      message,
      storeId: store.storeId,
      date,
      weather: {
        label: weatherLabel,
        temperature: temperatureValue,
        source: weatherSource,
        error: weatherError,
      },
      dataset: published
        ? { file: published.path, rows: published.rows, days: published.days }
        : null,
      dataset_error: datasetError,
      rows_updated: rowsUpdated,
      history_days: historyDays,
      min_days_to_train: MIN_DAYS_TO_TRAIN,
      training,
      training_skipped: trainingSkipped,
      training_error: trainingError,
      ml_error: mlError,
      // The date is now closed; the UI locks the panel on this.
      logged: !datasetError,
    });
  } catch (error) {
    console.error("[sales] entry failed:", error.message);
    if (error.detail) console.error("[sales] detail:", error.detail);
    res.status(500).json({ status: "error", message: error.message });
  }
});

/**
 * GET /api/sales/history?storeId= — days this store has sales for, newest first.
 *
 * Read from the store's own dataset
 * (ML/salesHistory/<storeId>/datasets/<storeId>.csv), which is
 * written by the cashier's checkout. The store document keeps only the current
 * day, so this is the durable record.
 */
router.get("/history", async (req, res) => {
  try {
    const ctx = await requireStore(req, res);
    if (!ctx) return;

    const logs = await storeDataset.readByDate(ctx.store.storeId);

    res.status(200).json({
      status: "success",
      storeId: ctx.store.storeId,
      count: logs.length,
      today: ctx.store.dailySales?.date || null,
      logs,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

/**
 * GET /api/sales/daily?storeId=&date= — one day's state, for the Daily Sales Log.
 *
 * Answers three things the panel needs before the user types anything:
 *   - what the cashier has already rung up for that date (`staged`);
 *   - whether the date is already logged, i.e. the dataset has rows for it
 *     (`logged`) — the once-per-day rule, surfaced so the UI can lock itself
 *     rather than let the user fill a form that will be refused;
 *   - how much history the store has, and whether a submission would train.
 *
 * `date` defaults to today. A staged day that is not the requested date is not
 * returned, because those figures belong to a different day.
 */
router.get("/daily", async (req, res) => {
  try {
    const ctx = await requireStore(req, res);
    if (!ctx) return;

    const store = ctx.store;
    const today = localToday();
    const date = String(req.query.date || "").trim() || today;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        status: "error",
        message: "'date' must be YYYY-MM-DD",
      });
    }

    const staged = store.dailySales || {};
    const stagedMatches = staged.date === date;
    const stagedEntries = stagedMatches ? staged.entries || [] : [];

    const loggedEntries = await storeDataset.rowsForDate(store.storeId, date);
    const logged = loggedEntries.length > 0;
    const historyDays = await python.storeHistoryDays(store.storeId);

    res.status(200).json({
      status: "success",
      storeId: store.storeId,
      date,
      today,
      is_today: date === today,
      is_stale_day: Boolean(staged.date) && staged.date !== today,

      // What the till recorded, offered as a starting point for the form.
      staged: {
        date: staged.date || null,
        updated_at: staged.updated_at || null,
        entries: stagedEntries.map((entry) => ({
          item_id: entry.item_id,
          item_name: entry.item_name,
          units_sold: entry.units_sold,
          stockout: Boolean(entry.stockout),
        })),
        totals: {
          units: stagedEntries.reduce(
            (sum, entry) => sum + (Number(entry.units_sold) || 0),
            0,
          ),
          distinct_items: stagedEntries.length,
        },
      },
      has_unposted: stagedEntries.length > 0,

      // The once-per-day rule.
      logged,
      logged_at: stagedMatches ? staged.posted_at || null : null,
      logged_entries: loggedEntries,
      can_submit: !logged,
      blocked_reason: logged ? "already_logged" : null,

      // Training gate, so the UI can say what will happen.
      history_days: historyDays,
      min_days_to_train: MIN_DAYS_TO_TRAIN,
      will_train: !logged && historyDays + 1 > MIN_DAYS_TO_TRAIN,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

/**
 * GET /api/sales/weather?storeId=&date= — the weather that will be recorded.
 *
 * Lets the Data Entry form show the fetched weather before the user submits, so
 * nobody types it and nobody is surprised by what gets stored. The entry
 * endpoint re-fetches on submit, so this is a preview rather than the source of
 * truth. `?refresh=1` bypasses the cache.
 *
 * Always 200: an unavailable lookup is a normal state (no city set, a future
 * date), not an error, and the form renders it as "unavailable".
 */
router.get("/weather", async (req, res) => {
  try {
    const ctx = await requireStore(req, res);
    if (!ctx) return;

    const store = ctx.store;
    const date = String(req.query.date || "").trim() || localToday();
    const location = store.location || {};

    const base = {
      status: "success",
      storeId: store.storeId,
      date,
      location: {
        city: location.city || "",
        province: location.province || "",
        lat: location.lat ?? null,
        lon: location.lon ?? null,
        timezone: location.timezone || "",
      },
    };

    if (!location.city || location.lat == null || location.lon == null) {
      return res.status(200).json({
        ...base,
        available: false,
        reason: "no_location",
        message: "Set this store's city on the Stores page to fetch weather automatically",
      });
    }

    if (!weather.isFetchableDate(date)) {
      return res.status(200).json({
        ...base,
        available: false,
        reason: "unfetchable_date",
        message: `Weather is only available up to today, not for ${date}`,
      });
    }

    const fetched = await lookupWeather(store, date, { refresh: Boolean(req.query.refresh) });
    if (!fetched.ok) {
      return res.status(200).json({
        ...base,
        available: false,
        reason: fetched.reason,
        message: fetched.error,
      });
    }

    const value = fetched.value;
    return res.status(200).json({
      ...base,
      available: true,
      weather: value.weather,
      temperature: value.temperature,
      detail: value.detail,
      fetched_location: value.location,
      source: value.source,
      cached: value.cached,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

/**
 * Derive a store's ML files (history + feature matrix + model) from its freshly
 * imported dataset. Shared by the import route and the standalone rebuild route.
 *
 * Weather is backfilled from Open-Meteo for the imported span; a failed fetch is
 * swallowed (the history is still rebuilt, just without the weather signal) so
 * the import never fails because of a weather outage.
 *
 * @returns {Promise<object>} a compact summary for the API response
 */
async function runPostImportBridge(store, importResult, menuFile) {
  const storeId = store.storeId;
  const location = store.location || {};

  // 1. Backfill real weather for the days the dataset actually covers.
  let weatherFile = null;
  try {
    const from = importResult?.date_from;
    const to = importResult?.date_to;
    if (location.lat != null && location.lon != null && from && to) {
      const span = await weather.fetchRange(location, from, to);
      if (span && span.days && Object.keys(span.days).length) {
        weatherFile = upload.writeTempJson("weather", span.days);
      }
    }
  } catch (wxErr) {
    // Weather is a bonus; never let a fetch failure block the import.
    console.warn(`[sales] weather backfill skipped for ${storeId}:`, wxErr.message);
  }

  try {
    // 2. Derive history (data/raw) and feature matrix (data/processed).
    const rebuilt = await python.rebuildStoreHistory({
      storeId,
      weatherFile: weatherFile || undefined,
      menuFile: menuFile || undefined,
    });

    // 3. Train once there is enough history for a meaningful fit.
    const historyDays = rebuilt.days ?? 0;
    let trained = false;
    if (historyDays > MIN_DAYS_TO_TRAIN) {
      await python.trainIncremental({ storeId });
      python.clearForecastCache();
      trained = true;
    }

    return {
      history_rows: rebuilt.rows ?? null,
      history_days: historyDays,
      items: rebuilt.items ?? null,
      weather_days: rebuilt.weather_days ?? 0,
      weather_backfilled: Boolean(weatherFile) && (rebuilt.weather_days ?? 0) > 0,
      feature_matrix_rows: rebuilt.feature_matrix_rows ?? null,
      trained,
    };
  } catch (bridgeErr) {
    console.error(`[sales] post-import rebuild failed for ${storeId}:`, bridgeErr.message);
    return { error: bridgeErr.message };
  } finally {
    if (weatherFile) upload.removeQuietly(weatherFile);
  }
}

/**
 * POST /api/sales/import?storeId= — load a store's pre-existing sales history.
 *
 * multipart/form-data with one `file` field (.csv / .xlsx / .tsv), plus optional
 * `sheet` (Excel tab) and `dryRun=true` to check a file without writing.
 *
 * The parsing lives in ML/src/import_sales.py: it works out which columns mean
 * what, resolves the uploaded product names or codes against this store's menu,
 * and merges the rows into the store's dataset. Rows it cannot resolve are
 * reported rather than dropped.
 *
 * This backfills the dataset only. It does not touch store.dailySales, which
 * stays reserved for the cashier's staged day.
 */
router.post("/import", async (req, res) => {
  let menuFile = null;

  try {
    await upload.parseSingleFile(req, res);

    const file = req.file;
    if (!file) {
      return res.status(400).json({
        status: "error",
        message: "No file uploaded — send one as the multipart field 'file'",
      });
    }

    const ctx = await requireStore(req, res);
    if (!ctx) return;

    const store = ctx.store;
    if (!(store.menu || []).length) {
      return res.status(400).json({
        status: "error",
        message: "This store has no menu yet, so imported products cannot be matched to anything",
      });
    }

    // The importer has no database access, so hand it the menu it needs. Categories
    // are passed too: the importer ignores them, but the post-import bridge uses
    // them to fill item_category in the rebuilt history.
    menuFile = upload.writeTempJson("menu", {
      storeId: store.storeId,
      items: (store.menu || []).map((item) => ({
        itemId: item.itemId,
        name: item.name,
        category: item.category || "",
      })),
    });

    let result;
    try {
      result = await python.importSales({
        storeId: store.storeId,
        file: file.path,
        menuFile,
        sheet: req.body?.sheet || undefined,
        dryRun: String(req.body?.dryRun || "") === "true",
      });
    } catch (error) {
      // The importer explains what went wrong in its payload.
      const payload = error.payload || {};
      return res.status(400).json({
        status: "error",
        message: error.message,
        rows_read: payload.rows_read ?? null,
        unmatched_items: payload.unmatched_items || [],
        unmatched_count: payload.unmatched_count ?? null,
        problems: payload.problems || [],
        columns_found: payload.columns_found || null,
        hint: payload.hint || null,
      });
    }

    if (!result.dry_run) python.clearForecastCache();

    // ---- Bridge: turn the imported dataset into the store's ML files ----
    // Uploading a back-catalogue wrote only
    // ML/salesHistory/<id>/datasets/<id>.csv (file 1 of the chain). Derive the
    // history (salesHistory/<id>/raw) and feature matrix (salesHistory/<id>/processed)
    // from it, and train a model once there is enough history. This is the link
    // that previously left imports with empty raw/ and processed/ directories.
    let bridge = null;
    if (!result.dry_run && (result.rows_imported ?? 0) > 0) {
      bridge = await runPostImportBridge(store, result, menuFile);
    }

    return res.status(200).json({
      status: "success",
      storeId: store.storeId,
      ...result,
      bridge,
      message: result.dry_run
        ? `Checked ${result.rows_imported} row(s) — nothing written`
        : `Imported ${result.rows_imported} row(s) across ${result.days_imported} day(s)`,
    });
  } catch (error) {
    console.error("[sales] import failed:", error.message);
    return res
      .status(error.status || 500)
      .json({ status: "error", message: error.message });
  } finally {
    // Uploads are transient — remove them on every path, success or not.
    upload.removeQuietly(req.file?.path);
    upload.removeQuietly(menuFile);
  }
});

/**
 * The shared catalog entry for a product, in the shape the store menu schema
 * expects — the same projection routes/stores.js uses for its default menu.
 * Returns null when the id is not a catalog product, which the seed routes
 * use to refuse additions the app knows nothing about.
 */
function catalogMenuEntry(itemId) {
  const product = getProduct(itemId);
  if (!product) return null;
  return {
    itemId: product.itemId,
    name: product.name,
    category: product.category,
    categoryLabel: CATEGORY_LABEL[product.category] || "",
    price: product.price,
    icon: product.icon,
    recipe: (product.recipe || []).map((line) => ({ ...line })),
  };
}

/**
 * Classify the global sample's products against this store's menu.
 *
 *   missing       — no menu entry shares the product's code or name
 *   id_mismatch   — the name matches a menu entry under a different code
 *   name_mismatch — the code matches but the names differ
 *
 * Code wins over name, mirroring how import_sales.py resolves rows, so every
 * product lands in exactly one bucket.
 */
function classifyAgainstMenu(items, menu) {
  const byId = new Map(menu.map((item) => [item.itemId, item]));
  const byName = new Map(
    menu.map((item) => [String(item.name || "").trim().toLowerCase(), item])
  );

  const review = [];
  for (const item of items) {
    const itemId = String(item.item_id || "").trim();
    const itemName = String(item.item_name || "").trim();

    const idHit = byId.get(itemId);
    if (idHit) {
      const menuName = String(idHit.name || "").trim();
      if (menuName.toLowerCase() !== itemName.toLowerCase()) {
        review.push({
          type: "name_mismatch",
          item_id: itemId,
          item_name: itemName,
          menu_id: idHit.itemId,
          menu_name: idHit.name,
        });
      }
      continue;
    }

    const nameHit = byName.get(itemName.toLowerCase());
    if (nameHit) {
      review.push({
        type: "id_mismatch",
        item_id: itemId,
        item_name: itemName,
        menu_id: nameHit.itemId,
        menu_name: nameHit.name,
      });
      continue;
    }

    review.push({ type: "missing", item_id: itemId, item_name: itemName });
  }
  return review;
}

/**
 * GET /api/sales/dataset-span?storeId= — does this store already have a
 * dataset, and what does it cover? Drives the "use the demo dataset" button,
 * which only appears on stores that have never imported or seeded one.
 */
router.get("/dataset-span", async (req, res) => {
  try {
    const ctx = await requireStore(req, res);
    if (!ctx) return;

    const span = await python.datasetSpan(ctx.store.storeId);
    res.status(200).json({
      status: "success",
      storeId: ctx.store.storeId,
      span,
      hasDataset: Boolean(span),
    });
  } catch (error) {
    console.error("[sales] dataset-span failed:", error.message);
    res.status(500).json({ status: "error", message: error.message });
  }
});

/**
 * POST /api/sales/seed-demo?storeId= — the one-click demo shortcut.
 *
 * Body:
 *   { dryRun: true }
 *     Read-only: reports the span the seed would create (global history slid
 *     forward so the last day is today) and classifies every sample product
 *     against this store's menu, so the UI can ask what to do about the ones
 *     that do not line up.
 *   { addToMenu: [catalogIds], menuChoices: [...] }
 *     The confirm run. `addToMenu` items are appended to the menu from the
 *     shared catalog. `menuChoices` entries carry the user's pick for a
 *     mismatched product: "replace_menu" rewrites that menu entry from the
 *     catalog, "replace_dataset" leaves the menu alone and lets the seeder
 *     align the fresh rows to it (code first, then name).
 *
 * Only runs on a store with no dataset (409 otherwise): the seed is a full
 * copy of the sample history, never a merge into real sales.
 */
router.post("/seed-demo", async (req, res) => {
  let menuFile = null;

  try {
    const ctx = await requireStore(req, res);
    if (!ctx) return;
    const store = ctx.store;

    const existing = await python.datasetSpan(store.storeId);
    if (existing) {
      return res.status(409).json({
        status: "error",
        message: "This store already has a dataset — the demo seed only runs on an empty store",
        span: existing,
      });
    }

    // ---- Dry run: what would be written, and what needs deciding ----------
    if (req.body?.dryRun === true) {
      const preview = await python.seedDataset({
        storeId: store.storeId,
        date: localToday(),
        dryRun: true,
      });
      return res.status(200).json({
        status: "success",
        dry_run: true,
        storeId: store.storeId,
        span: { from: preview.date_from, to: preview.date_to },
        days: preview.days_imported,
        rows: preview.rows_imported,
        shift_days: preview.shift_days,
        review: classifyAgainstMenu(preview.items || [], store.menu || []),
      });
    }

    // ---- Confirm run ------------------------------------------------------
    const addToMenu = [...new Set((req.body?.addToMenu || []).map((id) => String(id)))];
    const menuChoices = Array.isArray(req.body?.menuChoices) ? req.body.menuChoices : [];

    for (const itemId of addToMenu) {
      if (!catalogMenuEntry(itemId)) {
        return res.status(400).json({
          status: "error",
          message: `Product '${itemId}' is not in the shared catalog, so it cannot be added to the menu`,
        });
      }
    }

    // Work on a plain copy; the menu is saved once, after every choice has
    // been validated, so a rejected choice never leaves a half-applied menu.
    const menu = (store.menu || []).map((item) =>
      typeof item.toObject === "function" ? item.toObject() : { ...item }
    );
    let menuAdded = 0;
    let menuReplaced = 0;

    for (const choice of menuChoices) {
      const { type, choice: pick } = choice || {};
      const datasetId = String(choice?.item_id || "");
      const menuId = String(choice?.menu_id || "");

      if (!["id_mismatch", "name_mismatch"].includes(type)) {
        return res.status(400).json({ status: "error", message: `Unknown mismatch type '${type}'` });
      }
      if (!["replace_menu", "replace_dataset"].includes(pick)) {
        return res.status(400).json({ status: "error", message: `Unknown choice '${pick}'` });
      }

      // The pair the user decided about must still be there — otherwise the
      // decision refers to a menu that no longer exists; re-run the check.
      const anchorId = type === "id_mismatch" ? menuId : datasetId;
      const anchor = menu.find((item) => item.itemId === anchorId);
      if (!anchor) {
        return res.status(400).json({
          status: "error",
          message: "The menu changed since the check — run the check again",
        });
      }

      if (pick === "replace_dataset") continue; // dataset side: the seeder aligns the rows

      const entry = catalogMenuEntry(datasetId);
      if (!entry) {
        return res.status(400).json({
          status: "error",
          message: `Product '${datasetId}' is not in the shared catalog, so the menu entry cannot be replaced by it`,
        });
      }

      if (type === "id_mismatch") {
        // Same product, different code: swap the menu's code for the
        // catalog's so the fresh rows join onto it.
        menu[menu.indexOf(anchor)] = entry;
      } else {
        // Same code, different name: take the catalog's name/price/recipe.
        menu[menu.indexOf(anchor)] = { ...anchor, ...entry, itemId: anchor.itemId };
      }
      menuReplaced += 1;
    }

    for (const itemId of addToMenu) {
      if (menu.some((item) => item.itemId === itemId)) continue; // already there since the check
      menu.push(catalogMenuEntry(itemId));
      menuAdded += 1;
    }

    if (menuAdded || menuReplaced) {
      store.menu = menu;
      await store.save();
    }

    // The seeder aligns rows against this post-choice menu, and the rebuild
    // bridge reads categories from it to fill item_category in the history.
    menuFile = upload.writeTempJson("menu", {
      storeId: store.storeId,
      items: menu.map((item) => ({
        itemId: item.itemId,
        name: item.name,
        category: item.category || "",
      })),
    });

    const seeded = await python.seedDataset({
      storeId: store.storeId,
      date: localToday(),
      menuFile,
    });

    const bridge = await runPostImportBridge(store, seeded, menuFile);
    python.clearForecastCache();

    return res.status(200).json({
      status: "success",
      storeId: store.storeId,
      ...seeded,
      bridge,
      menu_added: menuAdded,
      menu_replaced: menuReplaced,
      message:
        `Seeded ${seeded.rows_imported} rows across ${seeded.days_imported} day(s) ` +
        `(${seeded.date_from} → ${seeded.date_to})`,
    });
  } catch (error) {
    console.error("[sales] seed-demo failed:", error.message);
    return res.status(error.status || 500).json({
      status: "error",
      message: error.message,
      ...(error.payload ? { detail: error.payload } : {}),
    });
  } finally {
    if (menuFile) upload.removeQuietly(menuFile);
  }
});

/**
 * POST /api/sales/rebuild?storeId= — derive a store's ML files from its dataset.
 *
 * For stores imported before the bridge existed (or after a manual dataset edit),
 * this runs the same derivation the import now performs automatically:
 * history -> feature matrix -> (optionally) model. Idempotent — the history is
 * rebuilt from scratch each run, so re-running after a correction is safe.
 */
router.post("/rebuild", async (req, res) => {
  try {
    const ctx = await requireStore(req, res);
    if (!ctx) return;

    const store = ctx.store;
    const span = await python.datasetSpan(store.storeId);
    if (!span) {
      return res.status(400).json({
        status: "error",
        message: "This store has no imported dataset to rebuild from",
      });
    }

    // The menu sidecar with categories, so item_category is filled in the history.
    let menuFile = null;
    try {
      menuFile = upload.writeTempJson("menu", {
        storeId: store.storeId,
        items: (store.menu || []).map((item) => ({
          itemId: item.itemId,
          name: item.name,
          category: item.category || "",
        })),
      });

      const location = store.location || {};
      let weatherFile = null;
      try {
        if (location.lat != null && location.lon != null) {
          const fetched = await weather.fetchRange(location, span.from, span.to);
          if (fetched && fetched.days && Object.keys(fetched.days).length) {
            weatherFile = upload.writeTempJson("weather", fetched.days);
          }
        }
      } catch (wxErr) {
        console.warn(`[sales] weather backfill skipped for ${store.storeId}:`, wxErr.message);
      }

      let rebuilt;
      try {
        rebuilt = await python.rebuildStoreHistory({
          storeId: store.storeId,
          weatherFile: weatherFile || undefined,
          menuFile,
        });
      } finally {
        if (weatherFile) upload.removeQuietly(weatherFile);
      }

      const historyDays = rebuilt.days ?? 0;
      let trained = false;
      if (historyDays > MIN_DAYS_TO_TRAIN) {
        await python.trainIncremental({ storeId: store.storeId });
        python.clearForecastCache();
        trained = true;
      }

      return res.status(200).json({
        status: "success",
        storeId: store.storeId,
        date_from: rebuilt.date_from,
        date_to: rebuilt.date_to,
        history_rows: rebuilt.rows ?? null,
        history_days: historyDays,
        items: rebuilt.items ?? null,
        weather_days: rebuilt.weather_days ?? 0,
        weather_backfilled: Boolean(weatherFile) && (rebuilt.weather_days ?? 0) > 0,
        feature_matrix_rows: rebuilt.feature_matrix_rows ?? null,
        trained,
      });
    } catch (error) {
      console.error(`[sales] rebuild failed for ${store.storeId}:`, error.message);
      return res
        .status(error.status || 500)
        .json({ status: "error", message: error.message });
    } finally {
      if (menuFile) upload.removeQuietly(menuFile);
    }
  } catch (error) {
    console.error("[sales] rebuild failed:", error.message);
    return res
      .status(error.status || 500)
      .json({ status: "error", message: error.message });
  }
});

/**
 * POST /api/recipes/mapping?storeId=
 *
 * Override the bill of materials for one of this store's menu items.
 * Body: { item_id, recipe: [{ ingredient, qty, unit }] }
 */
router.post("/mapping", async (req, res) => {
  const { item_id: itemId, recipe } = req.body || {};

  if (!itemId || !Array.isArray(recipe) || !recipe.length) {
    return res.status(400).json({
      status: "error",
      message: "'item_id' and a non-empty 'recipe' array are required",
    });
  }

  try {
    const ctx = await requireStore(req, res);
    if (!ctx) return;

    const item = menuById(ctx.store).get(itemId);
    if (!item) {
      return res.status(400).json({
        status: "error",
        message: `Item '${itemId}' is not on this store's menu`,
      });
    }

    const cleaned = [];
    for (const part of recipe) {
      const qty = Number(part.qty);
      if (!part.ingredient || !Number.isFinite(qty) || qty < 0) continue;
      cleaned.push({
        ingredient: String(part.ingredient).trim(),
        qty,
        unit: part.unit || "kg",
      });
    }

    if (!cleaned.length) {
      return res.status(400).json({
        status: "error",
        message: "No valid recipe lines supplied",
      });
    }

    if (!ctx.store.recipeOverrides) ctx.store.recipeOverrides = {};
    ctx.store.recipeOverrides.set(itemId, cleaned);
    await ctx.store.save();
    python.clearForecastCache();

    res.status(200).json({
      status: "success",
      message: `Recipe updated for ${item.name}`,
      storeId: ctx.store.storeId,
      item_id: itemId,
      recipe: cleaned,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

/** GET /api/recipes/mapping?storeId= — this store's overrides plus its menu defaults. */
router.get("/mapping", async (req, res) => {
  try {
    const ctx = await requireStore(req, res);
    if (!ctx) return;

    const overrides = {};
    const stored = ctx.store.recipeOverrides;
    if (stored && typeof stored.forEach === "function") {
      stored.forEach((lines, itemId) => {
        overrides[itemId] = plainRecipe(lines);
      });
    }

    // Defaults come from the store's own menu, not the shared catalog.
    const defaults = {};
    for (const item of ctx.store.menu || []) {
      defaults[item.itemId] = (item.recipe || [])
        .filter((line) => line.ingredient && Number.isFinite(Number(line.qty)))
        .map((line) => ({
          ingredient: line.ingredient,
          qty: roundQuantity(Number(line.qty), line.unit),
          unit: line.unit,
        }));
    }

    res.status(200).json({
      status: "success",
      storeId: ctx.store.storeId,
      overrides,
      defaults,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

module.exports = router;
