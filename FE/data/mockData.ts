import type {
  BusinessProfile,
  DailyComparison,
  DbDiagnostic,
  FeatureWeight,
  ForecastMetric,
  ForecastSummary,
  Ingredient,
  MenuPrediction,
  MetricCardData,
  NavItem,
  PosMenuItem,
  PurchaseSuggestion,
  RecipeItem,
  SaleEntry,
  StockItem,
  StoreInfo,
} from "@/types";

export const businessProfile: BusinessProfile = { name: "Kedai Kopi Utama" };

export const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "LayoutDashboard", href: "/pages/dashboard" },
  { id: "forecast", label: "Forecast", icon: "TrendingUp", href: "/pages/forecast" },
  { id: "stocks", label: "Stocks", icon: "Wheat", href: "/pages/stocks" },
  { id: "reports", label: "Reports & Live Sales", icon: "FileBarChart", href: "/pages/reports" },
  { id: "profile", label: "Profile", icon: "Store", href: "/pages/profile" },
];

export const forecast: ForecastSummary = {
  totalItems: 185,
  itemLabel: "Total Items",
  weatherCondition: "Overcast Saturday",
  weatherEmoji: "☁️",
  trafficImpactPercent: 12,
  dayLabel: "Tomorrow",
};

export const requiredIngredients: Ingredient[] = [
  { id: "ing-1", name: "Wheat Flour", requiredVolume: 12.5, unit: "kg", status: "in-stock" },
  { id: "ing-2", name: "Fresh Milk", requiredVolume: 24, unit: "L", status: "restock-needed" },
  { id: "ing-3", name: "Frying Oil", requiredVolume: 5, unit: "L", status: "in-stock" },
];

export const predictedSales: MenuPrediction[] = [
  {
    id: "menu-1", name: "Nasi Goreng Special",
    thumbnailUrl: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=100&h=100&fit=crop&auto=format",
    predictedOrders: 65, maxOrders: 70,
  },
  {
    id: "menu-2", name: "Ayam Geprek",
    thumbnailUrl: "https://images.unsplash.com/photo-1626082927389-6cd097cee6a6?w=100&h=100&fit=crop&auto=format",
    predictedOrders: 50, maxOrders: 70,
  },
  {
    id: "menu-3", name: "Es Teh Manis",
    thumbnailUrl: "https://images.unsplash.com/photo-1499638673689-79a0b5115d87?w=100&h=100&fit=crop&auto=format",
    predictedOrders: 70, maxOrders: 70,
  },
];

export const summaryMetrics: MetricCardData[] = [
  { id: "waste", title: "Waste Mitigation", value: "0.8%", caption: "Expected Spoilage", tone: "primary" },
  { id: "utility", title: "Utility Optimization", value: "Normal Consumption", caption: "Compared to last week", tone: "info" },
  { id: "cost-saved", title: "Estimated Cost Saved", value: "Rp 245,000", caption: "Projected for tomorrow", tone: "success" },
];

export const featureWeights: FeatureWeight[] = [
  { feature: "payday_cycle", weight: 0.32, description: "Payday proximity effect" },
  { feature: "weather_rain", weight: 0.24, description: "Rain probability impact" },
  { feature: "day_of_week", weight: 0.18, description: "Weekend vs weekday" },
  { feature: "menu_popularity", weight: 0.14, description: "Historical item rank" },
  { feature: "temperature", weight: 0.08, description: "Temp × beverage demand" },
  { feature: "local_event", weight: 0.04, description: "Nearby event density" },
];

export const forecastMetrics: ForecastMetric[] = [
  { label: "Predicted Revenue", value: "Rp 4,280,000", change: "+12% vs last week", trend: "up" },
  { label: "Customer Count", value: "320 persons", change: "+8% vs last week", trend: "up" },
  { label: "Avg Order Value", value: "Rp 13,375", change: "+3% vs last week", trend: "up" },
  { label: "Stock Required", value: "42.5 kg", change: "+5% vs last week", trend: "up" },
];

export const stockItems: StockItem[] = [
  { id: "stk-1", name: "Wheat Flour", currentStock: 8, requiredVolume: 12.5, unit: "kg", status: "shortage-risk" },
  { id: "stk-2", name: "Fresh Milk", currentStock: 24, requiredVolume: 24, unit: "L", status: "safe" },
  { id: "stk-3", name: "Frying Oil", currentStock: 5, requiredVolume: 5, unit: "L", status: "safe" },
  { id: "stk-4", name: "Chicken Thigh", currentStock: 10, requiredVolume: 18, unit: "kg", status: "shortage-risk" },
  { id: "stk-5", name: "Eggs", currentStock: 60, requiredVolume: 45, unit: "pcs", status: "safe" },
  { id: "stk-6", name: "Rice (5kg)", currentStock: 15, requiredVolume: 20, unit: "kg", status: "shortage-risk" },
];

export const purchaseSuggestions: PurchaseSuggestion[] = [
  { id: "pur-1", itemName: "Wheat Flour", currentStock: 8, needed: 12.5, unit: "kg" },
  { id: "pur-2", itemName: "Chicken Thigh", currentStock: 10, needed: 18, unit: "kg" },
  { id: "pur-3", itemName: "Rice (5kg)", currentStock: 15, needed: 20, unit: "kg" },
];

export const dailyComparison: DailyComparison[] = [
  { day: 1, label: "Day 1", predicted: 160, actual: 155 },
  { day: 2, label: "Day 2", predicted: 175, actual: 180 },
  { day: 3, label: "Day 3", predicted: 190, actual: 185 },
  { day: 4, label: "Day 4", predicted: 165, actual: 160 },
  { day: 5, label: "Day 5", predicted: 200, actual: 210 },
  { day: 6, label: "Day 6", predicted: 185, actual: 178 },
  { day: 7, label: "Day 7", predicted: 220, actual: 168 },
];

export const storeInfo: StoreInfo[] = [
  { label: "Store Name", value: "Kedai Kopi Utama" },
  { label: "Location", value: "Jakarta Pusat" },
  { label: "Established", value: "March 2024" },
  { label: "Cuisine Type", value: "Indonesian / Kopi" },
  { label: "Avg Daily Customers", value: "310" },
  { label: "Database Engine", value: "PostgreSQL 16 (Supabase)" },
];

export const dbDiagnostics: DbDiagnostic[] = [
  { metric: "Uptime", value: "99.7%", status: "healthy" },
  { metric: "Avg Query Time", value: "24ms", status: "healthy" },
  { metric: "MAPE (7-day)", value: "9.8%", status: "warning" },
  { metric: "Sync Status", value: "Real-time", status: "healthy" },
  { metric: "Model Version", value: "LightGBM v4.6", status: "healthy" },
  { metric: "Last Training", value: "Today 03:00 AM", status: "healthy" },
];

export const recipeMatrix: RecipeItem[] = [
  {
    menuItem: "Nasi Goreng Special",
    baseIngredients: [
      { name: "Rice", amount: 200, unit: "g" },
      { name: "Chicken", amount: 80, unit: "g" },
      { name: "Egg", amount: 1, unit: "pcs" },
      { name: "Frying Oil", amount: 15, unit: "ml" },
    ],
    totalCost: "Rp 8,500",
  },
  {
    menuItem: "Ayam Geprek",
    baseIngredients: [
      { name: "Chicken Thigh", amount: 150, unit: "g" },
      { name: "Wheat Flour", amount: 50, unit: "g" },
      { name: "Frying Oil", amount: 20, unit: "ml" },
      { name: "Rice", amount: 200, unit: "g" },
    ],
    totalCost: "Rp 10,200",
  },
  {
    menuItem: "Es Teh Manis",
    baseIngredients: [
      { name: "Tea Bag", amount: 1, unit: "pcs" },
      { name: "Sugar", amount: 15, unit: "g" },
      { name: "Ice", amount: 150, unit: "g" },
    ],
    totalCost: "Rp 1,500",
  },
];

export const posMenuItems: PosMenuItem[] = [
  { id: "pos-1", name: "Nasi Goreng Spec", price: 25000 },
  { id: "pos-2", name: "Ayam Geprek", price: 22000 },
  { id: "pos-3", name: "Es Teh Manis", price: 7000 },
  { id: "pos-4", name: "Kopi Susu", price: 15000 },
  { id: "pos-5", name: "Mie Goreng", price: 20000 },
  { id: "pos-6", name: "Air Mineral", price: 5000 },
];

export const initialSaleEntries: SaleEntry[] = [
  { id: "s-1", timestamp: "12:45 PM", itemName: "2x Nasi Goreng Spec", quantity: 2, total: 50000 },
  { id: "s-2", timestamp: "12:42 PM", itemName: "1x Ayam Geprek", quantity: 1, total: 22000 },
  { id: "s-3", timestamp: "12:38 PM", itemName: "3x Es Teh Manis", quantity: 3, total: 21000 },
  { id: "s-4", timestamp: "12:35 PM", itemName: "1x Kopi Susu", quantity: 1, total: 15000 },
  { id: "s-5", timestamp: "12:30 PM", itemName: "2x Mie Goreng", quantity: 2, total: 40000 },
];
