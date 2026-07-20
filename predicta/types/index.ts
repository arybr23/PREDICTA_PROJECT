export interface NavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
}

export type IngredientStatus = "in-stock" | "restock-needed" | "out-of-stock";

export interface Ingredient {
  id: string;
  name: string;
  requiredVolume: number;
  unit: "kg" | "L" | "g" | "pcs";
  status: IngredientStatus;
}

export interface MenuPrediction {
  id: string;
  name: string;
  thumbnailUrl: string;
  predictedOrders: number;
  maxOrders: number;
}

export interface Forecast {
  totalItems: number;
  itemLabel: string;
  weatherCondition: string;
  weatherEmoji: string;
  trafficImpactPercent: number;
  dayLabel: string;
}

export interface MetricCard {
  id: string;
  title: string;
  value: string;
  caption: string;
  tone: "primary" | "success" | "info" | "neutral";
}

export interface BusinessProfile {
  name: string;
  avatarUrl?: string;
}
