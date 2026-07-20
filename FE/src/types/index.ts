/** Navigation item shown in the sidebar */
export interface NavItem {
  id: string;
  label: string;
  icon: string; // lucide-react icon name, resolved by NavigationItem
  href: string;
}

/** Status of an ingredient's stock level */
export type IngredientStatus = "in-stock" | "restock-needed" | "out-of-stock";

/** A single row in the Required Ingredients table */
export interface Ingredient {
  id: string;
  name: string;
  requiredVolume: number;
  unit: "kg" | "L" | "g" | "pcs";
  status: IngredientStatus;
}

/** A single row in the Predicted Item Sales list */
export interface MenuPrediction {
  id: string;
  name: string;
  thumbnailUrl: string;
  predictedOrders: number;
  maxOrders: number; // used to scale the progress bar relative to the top seller
}

/** Tomorrow's core forecast hero data */
export interface Forecast {
  totalItems: number;
  itemLabel: string;
  weatherCondition: string;
  weatherEmoji: string;
  trafficImpactPercent: number;
  dayLabel: string;
}

/** Generic summary metric used by the bottom row of cards */
export interface MetricCard {
  id: string;
  title: string;
  value: string;
  caption: string;
  tone: "primary" | "success" | "info" | "neutral";
}

/** Profile shown in the navbar dropdown */
export interface BusinessProfile {
  name: string;
  avatarUrl?: string;
}
