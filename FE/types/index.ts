export interface NavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
}

export type IngredientStatus = "in-stock" | "restock-needed" | "out-of-stock";

export type StockStatus = "shortage-risk" | "safe";

export interface Ingredient {
  id: string;
  name: string;
  requiredVolume: number;
  unit: "kg" | "L" | "g" | "pcs";
  status: IngredientStatus;
}

export interface StockItem {
  id: string;
  name: string;
  currentStock: number;
  requiredVolume: number;
  unit: "kg" | "L" | "g" | "pcs";
  status: StockStatus;
}

export interface PurchaseSuggestion {
  id: string;
  itemName: string;
  currentStock: number;
  needed: number;
  unit: string;
}

export interface MenuPrediction {
  id: string;
  name: string;
  thumbnailUrl: string;
  predictedOrders: number;
  maxOrders: number;
}

export interface ForecastSummary {
  totalItems: number;
  itemLabel: string;
  weatherCondition: string;
  weatherEmoji: string;
  trafficImpactPercent: number;
  dayLabel: string;
}

export interface FeatureWeight {
  feature: string;
  weight: number;
  description: string;
}

export interface ForecastMetric {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down";
}

export interface MetricCardData {
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

export interface DailyComparison {
  day: number;
  label: string;
  predicted: number;
  actual: number;
}

export interface StoreInfo {
  label: string;
  value: string;
}

export interface DbDiagnostic {
  metric: string;
  value: string;
  status: "healthy" | "warning" | "error";
}

export interface RecipeIngredient {
  name: string;
  amount: number;
  unit: string;
}

export interface RecipeItem {
  menuItem: string;
  baseIngredients: RecipeIngredient[];
  totalCost: string;
}

export interface PosMenuItem {
  id: string;
  name: string;
  price: number;
}

export interface SaleEntry {
  id: string;
  timestamp: string;
  itemName: string;
  quantity: number;
  total: number;
}
