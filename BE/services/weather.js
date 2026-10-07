/**
 * Weather from Open-Meteo — historical (archive) and forecast.
 *
 * Free, no API key, no registration. Two endpoints, split by whether the day
 * has happened yet:
 *
 *   https://archive-api.open-meteo.com/v1/archive  — today and the past (ERA5
 *     blended with ECMWF IFS for recent days): backfill and same-day entry
 *   https://api.open-meteo.com/v1/forecast         — the future (≈16 days):
 *     the weather /forecast/tomorrow predicts WITH
 *
 * Both serve the same daily variables, so one classify() labels either day.
 *
 * Two things about this API drive the design below:
 *
 * 1. `timezone` is mandatory. A "day" is aggregated over the local calendar
 *    day, so a store in WITA fetched with the Jakarta offset would have its day
 *    boundaries shifted by an hour against the app's own local-date helpers.
 *
 * 2. The daily `weather_code` is the MOST SEVERE hour of the day, not the
 *    typical one. Measured on 733 days of Surakarta data, that rule moves 69% of
 *    days onto a different label than the most-common hour would, and it
 *    reports a 15-hour-clear day as "dense drizzle" if one hour drizzled. So the
 *    rain axis here comes from `precipitation_sum` — an honest daily total —
 *    and the code is used only to split dry days into clear vs cloudy.
 *
 * Weather never changes once a day is past, so results are cached. Today's
 * value is still being filled in, so it gets a much shorter TTL.
 */

const https = require("node:https");

const ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

const REQUEST_TIMEOUT_MS = 10_000;
const PAST_TTL_MS = 6 * 60 * 60 * 1000; // a past day is immutable
const TODAY_TTL_MS = 30 * 60 * 1000; // today is still filling in
const FORECAST_TTL_MS = 30 * 60 * 1000; // tomorrow keeps being revised during the day

// ---- Label thresholds -----------------------------------------------------
// These are a judgement call and the honest place to tune them. Defaults are
// anchored to measured Surakarta rainfall: ~18% of days are completely dry,
// the median wet day is 4.7 mm, p75 is 10 mm and p90 is 18.7 mm.

const HOT_C_MAX = 33; // the generator's own panas_extreme band is 33-38 °C
const HEAVY_RAIN_MM = 20; // ≈ p90 of daily totals
const RAIN_MM = 1; // below this a day counts as dry (trace only)

const CLOUDY_CODES = [2, 3, 45, 48];

const LABELS = ["cerah", "berawan", "hujan_ringan", "hujan_deras", "panas_extreme"];

/**
 * Collapse one day of weather into the single label the model expects.
 *
 * Order matters, and the two rules disagree on ~7% of Surakarta days — the hot
 * ones that are also wet. Heat is checked first, which means a 34 °C day with
 * 3 mm of rain is labelled panas_extreme and loses its rain signal.
 *
 * The alternative (rain first) was measured over 733 days and rejected: it
 * pushes hujan_ringan to 59% of all days, so the label discriminates less
 * (spread 0.51 vs 0.44). Neither ordering is really right, because the
 * generator's five labels assume weather is occasional, while Surakarta is hot
 * most days and wet most days. The durable fix is to stop relying on this label
 * alone — see the note in BE/API_ENDPOINTS.md about adding precipitation as
 * continuous features, which makes the ordering almost irrelevant.
 */
function classify({ code, tmax, precip }) {
  if (tmax != null && tmax >= HOT_C_MAX) return "panas_extreme";
  if (precip != null && precip >= HEAVY_RAIN_MM) return "hujan_deras";
  if (precip != null && precip >= RAIN_MM) return "hujan_ringan";
  if (code != null && CLOUDY_CODES.includes(code)) return "berawan";
  return "cerah";
}

// ---- Cache ----------------------------------------------------------------

const cache = new Map();

function cacheKey(location, date) {
  return `${location.lat},${location.lon},${date}`;
}

function isToday(date, now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return date === `${y}-${m}-${d}`;
}

function clearCache() {
  cache.clear();
}

// ---- HTTP -----------------------------------------------------------------

function getJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: REQUEST_TIMEOUT_MS }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(new Error(`Open-Meteo returned unparseable JSON: ${error.message}`));
        }
      });
    });

    req.on("timeout", () => {
      req.destroy(new Error(`Open-Meteo timed out after ${REQUEST_TIMEOUT_MS}ms`));
    });
    req.on("error", reject);
  });
}

// ---- Public API -----------------------------------------------------------

/**
 * Map one Open-Meteo daily payload (either endpoint) to the app's day shape.
 *
 * Shared by fetchDay and fetchForecastDay so a past day and a predicted day
 * are byte-for-byte comparable — same label rules, same temperature convention.
 */
function buildDayValue(payload, daily, location, date) {
  const code = daily.weather_code?.[0] ?? null;
  const tmax = daily.temperature_2m_max?.[0] ?? null;
  const tmin = daily.temperature_2m_min?.[0] ?? null;
  const mean = daily.temperature_2m_mean?.[0] ?? null;
  const precip = daily.precipitation_sum?.[0] ?? null;
  const precipHours = daily.precipitation_hours?.[0] ?? null;

  return {
    date,
    // The model's single temperature feature.
    //
    // This is the day's MAXIMUM, not its mean, and that choice is deliberate:
    // the generator draws each weather type's temperature from a per-label band
    // (panas_extreme is 33-38, cerah 28-35, hujan_deras 21-26), and those bands
    // only line up with a daily high. Surakarta's daily *mean* never reaches
    // 33 °C, so storing the mean would emit "panas_extreme, 29.3 °C" — a
    // combination that never appears in training. Using the max keeps the label
    // and the temperature self-consistent.
    temperature: tmax != null ? Number(tmax.toFixed(1)) : null,
    weather: classify({ code, tmax, precip }),
    detail: {
      weather_code: code,
      temperature_mean: mean,
      temperature_max: tmax,
      temperature_min: tmin,
      precipitation_sum: precip,
      precipitation_hours: precipHours,
    },
    location: {
      city: location.city || null,
      lat: payload.latitude ?? location.lat,
      lon: payload.longitude ?? location.lon,
      timezone: payload.timezone || location.timezone || null,
    },
    source: "open-meteo",
    cached: false,
  };
}

/**
 * Weather for one location on one date.
 *
 * @param {{lat:number, lon:number, timezone:string, city?:string}} location
 * @param {string} date  YYYY-MM-DD
 * @param {{refresh?: boolean}} [options]
 * @returns {Promise<object>} throws when the lookup fails
 */
async function fetchDay(location, date, options = {}) {
  if (!location || typeof location.lat !== "number" || typeof location.lon !== "number") {
    throw new Error("location with numeric lat/lon is required");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ""))) {
    throw new Error("date must be YYYY-MM-DD");
  }

  const key = cacheKey(location, date);
  if (!options.refresh) {
    const hit = cache.get(key);
    if (hit) {
      const ttl = isToday(date) ? TODAY_TTL_MS : PAST_TTL_MS;
      if (Date.now() - hit.at < ttl) return { ...hit.value, cached: true };
    }
  }

  const url =
    `${ARCHIVE_URL}?latitude=${location.lat}&longitude=${location.lon}` +
    `&start_date=${date}&end_date=${date}` +
    `&daily=weather_code,temperature_2m_mean,temperature_2m_max,temperature_2m_min,` +
    `precipitation_sum,precipitation_hours` +
    `&timezone=${encodeURIComponent(location.timezone || "Asia/Jakarta")}`;

  const payload = await getJson(url);

  if (payload.error) {
    throw new Error(`Open-Meteo: ${payload.reason || "request rejected"}`);
  }

  const daily = payload.daily || {};
  if (!daily.time || !daily.time.length) {
    throw new Error(`Open-Meteo returned no data for ${date}`);
  }

  const value = buildDayValue(payload, daily, location, date);

  cache.set(key, { at: Date.now(), value });
  return value;
}

/**
 * Whether a date can be looked up. Past and today are fine; the future is not
 * (there is nothing to retrieve yet).
 */
function isFetchableDate(date, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ""))) return false;
  if (date < "1940-01-01") return false;
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return date <= `${y}-${m}-${d}`;
}

/**
 * Whether a date is after today — the one condition where the forecast
 * endpoint (not the archive) is the right source.
 */
function isFutureDate(date, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ""))) return false;
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return date > `${y}-${m}-${d}`;
}

/**
 * Weather for one FUTURE date, from Open-Meteo's forecast endpoint.
 *
 * Same daily variables as fetchDay, so classify() and the temperature
 * convention are unchanged — a predicted day is labelled exactly like a day in
 * the training data. The forecast horizon is ≈16 days; beyond it the API
 * answers with an error, which the caller treats as "weather unavailable".
 *
 * @param {{lat:number, lon:number, timezone:string, city?:string}} location
 * @param {string} date  YYYY-MM-DD, strictly after today
 * @param {{refresh?: boolean}} [options]
 * @returns {Promise<object>} throws when the lookup fails or the date isn't future
 */
async function fetchForecastDay(location, date, options = {}) {
  if (!location || typeof location.lat !== "number" || typeof location.lon !== "number") {
    throw new Error("location with numeric lat/lon is required");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ""))) {
    throw new Error("date must be YYYY-MM-DD");
  }
  if (!isFutureDate(date)) {
    throw new Error(`${date} is not in the future — use fetchDay for today or earlier`);
  }

  const key = cacheKey(location, date);
  if (!options.refresh) {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < FORECAST_TTL_MS) {
      return { ...hit.value, cached: true };
    }
  }

  const url =
    `${FORECAST_URL}?latitude=${location.lat}&longitude=${location.lon}` +
    `&start_date=${date}&end_date=${date}` +
    `&daily=weather_code,temperature_2m_mean,temperature_2m_max,temperature_2m_min,` +
    `precipitation_sum,precipitation_hours` +
    `&timezone=${encodeURIComponent(location.timezone || "Asia/Jakarta")}`;

  const payload = await getJson(url);

  if (payload.error) {
    throw new Error(`Open-Meteo: ${payload.reason || "request rejected"}`);
  }

  const daily = payload.daily || {};
  if (!daily.time || !daily.time.length) {
    throw new Error(`Open-Meteo returned no forecast for ${date}`);
  }

  const value = buildDayValue(payload, daily, location, date);

  cache.set(key, { at: Date.now(), value });
  return value;
}

/**
 * Weather for any date: archive for today/past, forecast for the future.
 *
 * One entry point for callers that only know a target date and shouldn't care
 * which endpoint owns it.
 */
async function dayFor(location, date, options = {}) {
  return isFutureDate(date)
    ? fetchForecastDay(location, date, options)
    : fetchDay(location, date, options);
}

/**
 * Weather for every day in a span, as { "YYYY-MM-DD": { weather, temperature } }.
 *
 * One HTTP request regardless of length — Open-Meteo returns a whole range at
 * once. Used when backfilling a store's imported history, where fetching day by
 * day would be hundreds of round trips.
 *
 * Days the API has nothing for are simply absent from the map; the caller
 * decides what to do about the gaps.
 */
async function fetchRange(location, from, to) {
  if (!location || typeof location.lat !== "number" || typeof location.lon !== "number") {
    throw new Error("location with numeric lat/lon is required");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(from || "")) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(String(to || ""))) {
    throw new Error("from and to must be YYYY-MM-DD");
  }
  if (from > to) {
    throw new Error(`from (${from}) is after to (${to})`);
  }

  const url =
    `${ARCHIVE_URL}?latitude=${location.lat}&longitude=${location.lon}` +
    `&start_date=${from}&end_date=${to}` +
    `&daily=weather_code,temperature_2m_max,precipitation_sum` +
    `&timezone=${encodeURIComponent(location.timezone || "Asia/Jakarta")}`;

  const payload = await getJson(url);
  if (payload.error) {
    throw new Error(`Open-Meteo: ${payload.reason || "request rejected"}`);
  }

  const daily = payload.daily || {};
  const out = {};

  (daily.time || []).forEach((date, i) => {
    const code = daily.weather_code?.[i] ?? null;
    const tmax = daily.temperature_2m_max?.[i] ?? null;
    const precip = daily.precipitation_sum?.[i] ?? null;
    if (tmax == null && precip == null) return;

    out[date] = {
      weather: classify({ code, tmax, precip }),
      temperature: tmax != null ? Number(tmax.toFixed(1)) : null,
      weather_code: code,
      precipitation_sum: precip,
    };
  });

  return {
    days: out,
    location: {
      city: location.city || null,
      lat: payload.latitude ?? location.lat,
      lon: payload.longitude ?? location.lon,
      timezone: payload.timezone || location.timezone || null,
    },
    source: "open-meteo",
  };
}

module.exports = {
  HEAVY_RAIN_MM,
  HOT_C_MAX,
  LABELS,
  RAIN_MM,
  classify,
  clearCache,
  dayFor,
  fetchDay,
  fetchForecastDay,
  fetchRange,
  isFetchableDate,
  isFutureDate,
};
