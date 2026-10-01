/**
 * Shared product catalog.
 *
 * The ML layer identifies items by SKU (P01..P25). This file is the bridge
 * between those SKUs and everything the store-facing app needs: display name,
 * price, POS category, icon, and the recipe (bill of materials) used to turn a
 * predicted number of portions into a raw-ingredient shopping list.
 */

const CATEGORY_LABEL = {
  makanan_berat: "Food",
  minuman: "Drinks",
  snack: "Snacks",
};

const CATEGORY_ORDER = ["makanan_berat", "minuman", "snack"];

const PRODUCTS = [
  {
    itemId: "P01", name: "Nasi Goreng Spesial", category: "makanan_berat",
    price: 25000, icon: "\u{1F35B}", baseDemand: 95,
    recipe: [
      { ingredient: "Beras", qty: 0.20, unit: "kg" },
      { ingredient: "Telur", qty: 1, unit: "pcs" },
      { ingredient: "Ayam", qty: 0.08, unit: "kg" },
      { ingredient: "Minyak Goreng", qty: 0.025, unit: "L" },
      { ingredient: "Bawang Merah", qty: 0.03, unit: "kg" },
      { ingredient: "Cabai", qty: 0.02, unit: "kg" },
      { ingredient: "Kecap Manis", qty: 0.02, unit: "L" },
    ],
  },
  {
    itemId: "P02", name: "Mie Goreng Ayam", category: "makanan_berat",
    price: 22000, icon: "\u{1F35C}", baseDemand: 80,
    recipe: [
      { ingredient: "Mie", qty: 0.15, unit: "kg" },
      { ingredient: "Ayam", qty: 0.09, unit: "kg" },
      { ingredient: "Telur", qty: 1, unit: "pcs" },
      { ingredient: "Minyak Goreng", qty: 0.02, unit: "L" },
      { ingredient: "Bawang Putih", qty: 0.015, unit: "kg" },
      { ingredient: "Kecap Manis", qty: 0.015, unit: "L" },
    ],
  },
  {
    itemId: "P03", name: "Nasi Kuning", category: "makanan_berat",
    price: 18000, icon: "\u{1F35A}", baseDemand: 60,
    recipe: [
      { ingredient: "Beras", qty: 0.18, unit: "kg" },
      { ingredient: "Santan", qty: 0.08, unit: "L" },
      { ingredient: "Kunyit", qty: 0.01, unit: "kg" },
      { ingredient: "Telur", qty: 1, unit: "pcs" },
      { ingredient: "Kacang Tanah", qty: 0.03, unit: "kg" },
    ],
  },
  {
    itemId: "P04", name: "Nasi Uduk", category: "makanan_berat",
    price: 18000, icon: "\u{1F35A}", baseDemand: 55,
    recipe: [
      { ingredient: "Beras", qty: 0.18, unit: "kg" },
      { ingredient: "Santan", qty: 0.09, unit: "L" },
      { ingredient: "Sereh", qty: 0.008, unit: "kg" },
      { ingredient: "Daun Salam", qty: 0.002, unit: "kg" },
      { ingredient: "Tempe", qty: 0.05, unit: "kg" },
    ],
  },
  {
    itemId: "P05", name: "Mie Ayam Bakso", category: "makanan_berat",
    price: 20000, icon: "\u{1F35C}", baseDemand: 70,
    recipe: [
      { ingredient: "Mie", qty: 0.14, unit: "kg" },
      { ingredient: "Ayam", qty: 0.07, unit: "kg" },
      { ingredient: "Bakso", qty: 0.06, unit: "kg" },
      { ingredient: "Minyak Goreng", qty: 0.015, unit: "L" },
      { ingredient: "Bawang Merah", qty: 0.02, unit: "kg" },
    ],
  },
  {
    itemId: "P06", name: "Soto Ayam", category: "makanan_berat",
    price: 20000, icon: "\u{1F372}", baseDemand: 50,
    recipe: [
      { ingredient: "Ayam", qty: 0.12, unit: "kg" },
      { ingredient: "Beras", qty: 0.10, unit: "kg" },
      { ingredient: "Kunyit", qty: 0.008, unit: "kg" },
      { ingredient: "Jahe", qty: 0.005, unit: "kg" },
      { ingredient: "Sereh", qty: 0.006, unit: "kg" },
      { ingredient: "Telur", qty: 1, unit: "pcs" },
    ],
  },
  {
    itemId: "P07", name: "Ayam Geprek", category: "makanan_berat",
    price: 22000, icon: "\u{1F357}", baseDemand: 65,
    recipe: [
      { ingredient: "Ayam", qty: 0.18, unit: "kg" },
      { ingredient: "Terigu", qty: 0.05, unit: "kg" },
      { ingredient: "Minyak Goreng", qty: 0.04, unit: "L" },
      { ingredient: "Cabai", qty: 0.035, unit: "kg" },
      { ingredient: "Bawang Putih", qty: 0.01, unit: "kg" },
    ],
  },
  {
    itemId: "P08", name: "Es Teh Manis", category: "minuman",
    price: 8000, icon: "\u{1F964}", baseDemand: 160,
    recipe: [
      { ingredient: "Teh", qty: 0.004, unit: "kg" },
      { ingredient: "Gula", qty: 0.03, unit: "kg" },
      { ingredient: "Es Batu", qty: 0.20, unit: "kg" },
    ],
  },
  {
    itemId: "P09", name: "Es Jeruk", category: "minuman",
    price: 10000, icon: "\u{1F34A}", baseDemand: 110,
    recipe: [
      { ingredient: "Jeruk", qty: 0.15, unit: "kg" },
      { ingredient: "Gula", qty: 0.025, unit: "kg" },
      { ingredient: "Es Batu", qty: 0.20, unit: "kg" },
    ],
  },
  {
    itemId: "P10", name: "Kopi Hitam", category: "minuman",
    price: 12000, icon: "\u{2615}", baseDemand: 90,
    recipe: [
      { ingredient: "Kopi", qty: 0.012, unit: "kg" },
      { ingredient: "Gula", qty: 0.02, unit: "kg" },
    ],
  },
  {
    itemId: "P11", name: "Teh Anget", category: "minuman",
    price: 7000, icon: "\u{1F375}", baseDemand: 75,
    recipe: [
      { ingredient: "Teh", qty: 0.005, unit: "kg" },
      { ingredient: "Gula", qty: 0.025, unit: "kg" },
    ],
  },
  {
    itemId: "P12", name: "Jus Alpukat", category: "minuman",
    price: 15000, icon: "\u{1F951}", baseDemand: 45,
    recipe: [
      { ingredient: "Alpukat", qty: 0.20, unit: "kg" },
      { ingredient: "Susu", qty: 0.05, unit: "L" },
      { ingredient: "Gula", qty: 0.02, unit: "kg" },
      { ingredient: "Es Batu", qty: 0.10, unit: "kg" },
    ],
  },
  {
    itemId: "P13", name: "Es Campur", category: "minuman",
    price: 15000, icon: "\u{1F367}", baseDemand: 40,
    recipe: [
      { ingredient: "Es Batu", qty: 0.25, unit: "kg" },
      { ingredient: "Santan", qty: 0.06, unit: "L" },
      { ingredient: "Gula", qty: 0.03, unit: "kg" },
      { ingredient: "Kacang Tanah", qty: 0.02, unit: "kg" },
    ],
  },
  {
    itemId: "P14", name: "Kerupuk", category: "snack",
    price: 5000, icon: "\u{1F358}", baseDemand: 120,
    recipe: [
      { ingredient: "Kerupuk Mentah", qty: 0.05, unit: "kg" },
      { ingredient: "Minyak Goreng", qty: 0.03, unit: "L" },
    ],
  },
  {
    itemId: "P15", name: "Kue Lumpur", category: "snack",
    price: 6000, icon: "\u{1F9C1}", baseDemand: 35,
    recipe: [
      { ingredient: "Terigu", qty: 0.05, unit: "kg" },
      { ingredient: "Telur", qty: 1, unit: "pcs" },
      { ingredient: "Santan", qty: 0.04, unit: "L" },
      { ingredient: "Gula", qty: 0.02, unit: "kg" },
    ],
  },
  {
    itemId: "P16", name: "Pisang Goreng", category: "snack",
    price: 10000, icon: "\u{1F34C}", baseDemand: 55,
    recipe: [
      { ingredient: "Pisang", qty: 0.18, unit: "kg" },
      { ingredient: "Terigu", qty: 0.06, unit: "kg" },
      { ingredient: "Minyak Goreng", qty: 0.04, unit: "L" },
      { ingredient: "Gula", qty: 0.01, unit: "kg" },
    ],
  },
  {
    itemId: "P17", name: "Lemper", category: "snack",
    price: 7000, icon: "\u{1F371}", baseDemand: 40,
    recipe: [
      { ingredient: "Beras", qty: 0.08, unit: "kg" },
      { ingredient: "Ayam", qty: 0.05, unit: "kg" },
      { ingredient: "Santan", qty: 0.03, unit: "L" },
      { ingredient: "Daun Pisang", qty: 1, unit: "pcs" },
    ],
  },
  {
    itemId: "P18", name: "Serabi", category: "snack",
    price: 8000, icon: "\u{1F95E}", baseDemand: 30,
    recipe: [
      { ingredient: "Tepung Beras", qty: 0.06, unit: "kg" },
      { ingredient: "Santan", qty: 0.05, unit: "L" },
      { ingredient: "Gula", qty: 0.02, unit: "kg" },
    ],
  },
  {
    itemId: "P19", name: "Tahu Isi", category: "snack",
    price: 8000, icon: "\u{1F9C6}", baseDemand: 50,
    recipe: [
      { ingredient: "Tahu", qty: 0.10, unit: "kg" },
      { ingredient: "Terigu", qty: 0.03, unit: "kg" },
      { ingredient: "Sayur", qty: 0.03, unit: "kg" },
      { ingredient: "Minyak Goreng", qty: 0.03, unit: "L" },
    ],
  },
  {
    itemId: "P20", name: "Tempe Goreng", category: "snack",
    price: 6000, icon: "\u{1F9C6}", baseDemand: 45,
    recipe: [
      { ingredient: "Tempe", qty: 0.10, unit: "kg" },
      { ingredient: "Terigu", qty: 0.02, unit: "kg" },
      { ingredient: "Minyak Goreng", qty: 0.03, unit: "L" },
      { ingredient: "Bawang Putih", qty: 0.005, unit: "kg" },
    ],
  },
  {
    itemId: "P21", name: "Roti Bakar Coklat", category: "snack",
    price: 12000, icon: "\u{1F35E}", baseDemand: 35,
    recipe: [
      { ingredient: "Roti", qty: 2, unit: "pcs" },
      { ingredient: "Coklat", qty: 0.02, unit: "kg" },
      { ingredient: "Susu", qty: 0.01, unit: "L" },
    ],
  },
  {
    itemId: "P22", name: "Telur Dadar", category: "makanan_berat",
    price: 10000, icon: "\u{1F373}", baseDemand: 60,
    recipe: [
      { ingredient: "Telur", qty: 2, unit: "pcs" },
      { ingredient: "Minyak Goreng", qty: 0.02, unit: "L" },
      { ingredient: "Bawang Merah", qty: 0.015, unit: "kg" },
    ],
  },
  {
    itemId: "P23", name: "Capcay", category: "makanan_berat",
    price: 20000, icon: "\u{1F958}", baseDemand: 45,
    recipe: [
      { ingredient: "Sayur", qty: 0.20, unit: "kg" },
      { ingredient: "Ayam", qty: 0.06, unit: "kg" },
      { ingredient: "Bawang Putih", qty: 0.01, unit: "kg" },
      { ingredient: "Minyak Goreng", qty: 0.02, unit: "L" },
    ],
  },
  {
    itemId: "P24", name: "Nasi Goreng Seafood", category: "makanan_berat",
    price: 30000, icon: "\u{1F364}", baseDemand: 40,
    recipe: [
      { ingredient: "Beras", qty: 0.20, unit: "kg" },
      { ingredient: "Udang", qty: 0.08, unit: "kg" },
      { ingredient: "Telur", qty: 1, unit: "pcs" },
      { ingredient: "Minyak Goreng", qty: 0.025, unit: "L" },
      { ingredient: "Bawang Merah", qty: 0.03, unit: "kg" },
      { ingredient: "Kecap Manis", qty: 0.02, unit: "L" },
    ],
  },
  {
    itemId: "P25", name: "Bakso Urat", category: "makanan_berat",
    price: 22000, icon: "\u{1F963}", baseDemand: 55,
    recipe: [
      { ingredient: "Bakso", qty: 0.15, unit: "kg" },
      { ingredient: "Mie", qty: 0.08, unit: "kg" },
      { ingredient: "Bawang Putih", qty: 0.01, unit: "kg" },
      { ingredient: "Bawang Merah", qty: 0.015, unit: "kg" },
    ],
  },
];

const PRODUCTS_BY_ID = new Map(PRODUCTS.map((p) => [p.itemId, p]));

const CATEGORIES = ["All Items", ...CATEGORY_ORDER.map((c) => CATEGORY_LABEL[c])];

/** Look up a product by SKU, falling back to a generated label. */
function getProduct(itemId) {
  return PRODUCTS_BY_ID.get(itemId) || null;
}

/**
 * Convert predicted portions into an aggregated raw-ingredient shopping list.
 *
 * @param {Array<{item_id: string, predicted_units: number}>} breakdown
 * @param {Object<string, Array<{ingredient: string, qty: number, unit: string}>>} recipeOverrides
 * @returns {Array<{ingredient: string, weight: number, unit: string}>}
 */
function computeIngredients(breakdown, recipeOverrides = {}) {
  const totals = new Map();

  for (const item of breakdown) {
    const recipe = recipeOverrides[item.item_id] || PRODUCTS_BY_ID.get(item.item_id)?.recipe;
    if (!recipe) continue;

    for (const part of recipe) {
      const key = `${part.ingredient}::${part.unit}`;
      const current = totals.get(key) || { ingredient: part.ingredient, weight: 0, unit: part.unit };
      current.weight += part.qty * item.predicted_units;
      totals.set(key, current);
    }
  }

  return [...totals.values()]
    .map((entry) => ({
      ingredient: entry.ingredient,
      unit: entry.unit,
      weight: roundQuantity(entry.weight, entry.unit),
    }))
    .sort((a, b) => b.weight - a.weight || a.ingredient.localeCompare(b.ingredient));
}

function roundQuantity(value, unit) {
  if (unit === "pcs") return Math.ceil(value);
  const rounded = value < 1 ? Number(value.toFixed(3)) : Number(value.toFixed(2));
  return rounded;
}

/**
 * Typical daily ingredient consumption across the whole menu, derived from each
 * product's base demand and its recipe. Used to seed a realistic stock level.
 */
function dailyIngredientRequirement() {
  const totals = new Map();

  for (const product of PRODUCTS) {
    for (const part of product.recipe) {
      const key = `${part.ingredient}::${part.unit}`;
      const current = totals.get(key) || { ingredient: part.ingredient, unit: part.unit, perDay: 0 };
      current.perDay += part.qty * product.baseDemand;
      totals.set(key, current);
    }
  }

  return [...totals.values()]
    .map((entry) => ({
      ingredient: entry.ingredient,
      unit: entry.unit,
      perDay: roundQuantity(entry.perDay, entry.unit),
    }))
    .sort((a, b) => a.ingredient.localeCompare(b.ingredient));
}

module.exports = {
  CATEGORIES,
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  PRODUCTS,
  computeIngredients,
  dailyIngredientRequirement,
  getProduct,
  roundQuantity,
};
