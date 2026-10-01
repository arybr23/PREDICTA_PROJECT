const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function formatCurrency(value) {
  if (value == null || Number.isNaN(Number(value))) return "Rp0";
  return rupiah.format(Number(value));
}

export function formatNumber(value) {
  if (value == null) return "0";
  return new Intl.NumberFormat("id-ID").format(Number(value));
}

export function formatQuantity(value, unit) {
  const num = Number(value);
  if (Number.isNaN(num)) return `${value} ${unit}`;
  const text = unit === "pcs" ? formatNumber(num) : new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: num < 1 ? 3 : 2,
  }).format(num);
  return `${text} ${unit}`;
}

const WEATHER_LABELS = {
  cerah: "Sunny",
  berawan: "Cloudy",
  hujan_ringan: "Light rain",
  hujan_deras: "Heavy rain",
  panas_extreme: "Extreme heat",
};

export function formatWeather(label) {
  return WEATHER_LABELS[label] || label;
}

export function formatDate(iso) {
  if (!iso) return "—";
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
