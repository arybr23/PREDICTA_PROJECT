/**
 * Fixed list of Indonesian cities, with coordinates and timezone.
 *
 * The store's weather is looked up from its city rather than from a free-text
 * address, so there is no geocoding dependency and no way for a typo to move a
 * store to the wrong island. Coordinates are city-centre and only need to be
 * good to ~0.05°, since the weather grids behind them are 11–25 km.
 *
 * Timezones matter more than the coordinates: Open-Meteo aggregates a "day"
 * over the local calendar day, so a store in WITA (UTC+8) must not be fetched
 * with the Jakarta offset or its day boundaries shift by an hour.
 *
 *   WIB  Asia/Jakarta   UTC+7   Sumatra, Java, West/Central Kalimantan
 *   WITA Asia/Makassar  UTC+8   Bali, NTB, NTT, South/East/North Kalimantan, Sulawesi
 *   WIT  Asia/Jayapura  UTC+9   Maluku, Papua
 */

const WIB = "Asia/Jakarta";
const WITA = "Asia/Makassar";
const WIT = "Asia/Jayapura";

const CITIES = [
  { city: "Jakarta", province: "DKI Jakarta", lat: -6.2088, lon: 106.8456, timezone: WIB },
  { city: "Bogor", province: "West Java", lat: -6.5971, lon: 106.806, timezone: WIB },
  { city: "Depok", province: "West Java", lat: -6.4025, lon: 106.7942, timezone: WIB },
  { city: "Tangerang", province: "Banten", lat: -6.1783, lon: 106.6319, timezone: WIB },
  { city: "Bekasi", province: "West Java", lat: -6.2383, lon: 106.9756, timezone: WIB },
  { city: "Bandung", province: "West Java", lat: -6.9175, lon: 107.6191, timezone: WIB },
  { city: "Semarang", province: "Central Java", lat: -6.9667, lon: 110.4167, timezone: WIB },
  { city: "Surakarta", province: "Central Java", lat: -7.5755, lon: 110.8243, timezone: WIB },
  { city: "Yogyakarta", province: "DI Yogyakarta", lat: -7.7956, lon: 110.3695, timezone: WIB },
  { city: "Surabaya", province: "East Java", lat: -7.2575, lon: 112.7521, timezone: WIB },
  { city: "Malang", province: "East Java", lat: -7.9666, lon: 112.6326, timezone: WIB },
  { city: "Medan", province: "North Sumatra", lat: 3.5952, lon: 98.6722, timezone: WIB },
  { city: "Palembang", province: "South Sumatra", lat: -2.9761, lon: 104.7754, timezone: WIB },
  { city: "Padang", province: "West Sumatra", lat: -0.9471, lon: 100.4172, timezone: WIB },
  { city: "Pekanbaru", province: "Riau", lat: 0.5071, lon: 101.4478, timezone: WIB },
  { city: "Jambi", province: "Jambi", lat: -1.6101, lon: 103.6131, timezone: WIB },
  { city: "Bandar Lampung", province: "Lampung", lat: -5.3971, lon: 105.2668, timezone: WIB },
  { city: "Pontianak", province: "West Kalimantan", lat: -0.0263, lon: 109.3425, timezone: WIB },
  { city: "Denpasar", province: "Bali", lat: -8.6705, lon: 115.2126, timezone: WITA },
  { city: "Mataram", province: "West Nusa Tenggara", lat: -8.5833, lon: 116.1167, timezone: WITA },
  { city: "Banjarmasin", province: "South Kalimantan", lat: -3.3186, lon: 114.5944, timezone: WITA },
  { city: "Balikpapan", province: "East Kalimantan", lat: -1.2379, lon: 116.8529, timezone: WITA },
  { city: "Samarinda", province: "East Kalimantan", lat: -0.5017, lon: 117.1536, timezone: WITA },
  { city: "Makassar", province: "South Sulawesi", lat: -5.1477, lon: 119.4327, timezone: WITA },
  { city: "Manado", province: "North Sulawesi", lat: 1.4748, lon: 124.8421, timezone: WITA },
  { city: "Kupang", province: "East Nusa Tenggara", lat: -10.1772, lon: 123.607, timezone: WITA },
  { city: "Ambon", province: "Maluku", lat: -3.6954, lon: 128.1814, timezone: WIT },
  { city: "Jayapura", province: "Papua", lat: -2.5916, lon: 140.669, timezone: WIT },
];

const BY_NAME = new Map(CITIES.map((c) => [c.city.toLowerCase(), c]));

/** Look up a city by name (case-insensitive). Returns null when unknown. */
function findCity(name) {
  if (!name) return null;
  return BY_NAME.get(String(name).trim().toLowerCase()) || null;
}

/** The location subdocument to store on a Store, or null when unknown. */
function locationFor(name) {
  const match = findCity(name);
  if (!match) return null;
  return {
    city: match.city,
    province: match.province,
    lat: match.lat,
    lon: match.lon,
    timezone: match.timezone,
  };
}

/** City list for the frontend dropdown. */
function cityOptions() {
  return CITIES.map((c) => ({
    city: c.city,
    province: c.province,
    label: `${c.city} — ${c.province}`,
    timezone: c.timezone,
  })).sort((a, b) => a.city.localeCompare(b.city));
}

module.exports = { CITIES, cityOptions, findCity, locationFor };
