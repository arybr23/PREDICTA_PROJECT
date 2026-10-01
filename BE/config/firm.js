/**
 * Default firm / account / store records.
 *
 * These mirror the Mongoose shapes in BE/models (Firms, Accounts, Stores) so
 * the same payloads can be written to MongoDB later without reshaping. Until a
 * database is connected, the JSON store seeds itself from here.
 *
 * The stock levels are synthetic: each ingredient starts with a deterministic
 * number of days of cover, deliberately spread so some items are genuinely
 * short. That makes the "stock vs tomorrow's requirement" comparison useful
 * instead of uniformly green.
 */

const { dailyIngredientRequirement, roundQuantity } = require("./catalog");

const FIRM = {
  firmId: "FIRM-0001",
  firmName: "Bistro Nusantara Group",
  plan: "Premium",
};

const ACCOUNT = {
  userId: "USR-0001",
  name: "John Doe",
  email: "john.doe@bistronusantara.id",
  role: "admin",
  firmId: FIRM.firmId,
  avatarUrl: "https://i.pravatar.cc/150?img=3",
};

const STORES = [
  { storeId: "STR-001", storeName: "Bistro Nusantara — Central Park", isOpen: true },
  { storeId: "STR-002", storeName: "Bistro Nusantara — Mall of Indonesia", isOpen: false },
  { storeId: "STR-003", storeName: "Warung Predicta — Kelapa Gading", isOpen: true },
  { storeId: "STR-004", storeName: "Bistro Nusantara — Pondok Indah", isOpen: false },
];

/** Stable per-ingredient pseudo-random in [0, 1) so seeds don't shift between runs. */
function deterministicFraction(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) % 100000;
  }
  return (hash % 1000) / 1000;
}

/**
 * Seed stock with between ~0.4 and ~9 days of cover per ingredient, so the
 * dashboard shows a realistic mix of healthy and short items.
 */
function initialStock() {
  return dailyIngredientRequirement().map((entry) => {
    const coverDays = 0.4 + deterministicFraction(entry.ingredient) * 9;
    return {
      ingredient: entry.ingredient,
      unit: entry.unit,
      onHand: roundQuantity(entry.perDay * coverDays, entry.unit),
      dailyRequirement: entry.perDay,
    };
  });
}

module.exports = {
  ACCOUNT,
  FIRM,
  STORES,
  initialStock,
};
