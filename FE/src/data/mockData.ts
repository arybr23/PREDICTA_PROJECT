import type {
  BusinessProfile,
  Forecast,
  Ingredient,
  MenuPrediction,
  MetricCard,
  NavItem,
} from "@/types";

export const businessProfile: BusinessProfile = {
  name: "Kedai Kopi Utama",
};

export const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "LayoutDashboard", href: "/" },
  { id: "forecast", label: "Forecast", icon: "TrendingUp", href: "/forecast" },
  { id: "ingredients", label: "Ingredients", icon: "Wheat", href: "/ingredients" },
  { id: "menu-analysis", label: "Menu Analysis", icon: "PieChart", href: "/menu-analysis" },
  { id: "waste-mitigation", label: "Waste Mitigation", icon: "Trash2", href: "/waste-mitigation" },
  { id: "utilities", label: "Utilities", icon: "Zap", href: "/utilities" },
  { id: "reports", label: "Reports", icon: "FileBarChart", href: "/reports" },
  { id: "settings", label: "Settings", icon: "Settings", href: "/settings" },
];

export const forecast: Forecast = {
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
    id: "menu-1",
    name: "Nasi Goreng Special",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=100&h=100&fit=crop&auto=format",
    predictedOrders: 65,
    maxOrders: 70,
  },
  {
    id: "menu-2",
    name: "Ayam Geprek",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1626082927389-6cd097cee6a6?w=100&h=100&fit=crop&auto=format",
    predictedOrders: 50,
    maxOrders: 70,
  },
  {
    id: "menu-3",
    name: "Es Teh Manis",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1499638673689-79a0b5115d87?w=100&h=100&fit=crop&auto=format",
    predictedOrders: 70,
    maxOrders: 70,
  },
];

export const summaryMetrics: MetricCard[] = [
  {
    id: "waste",
    title: "Waste Mitigation",
    value: "0.8%",
    caption: "Expected Spoilage",
    tone: "primary",
  },
  {
    id: "utility",
    title: "Utility Optimization",
    value: "Normal Consumption",
    caption: "Compared to last week",
    tone: "info",
  },
  {
    id: "cost-saved",
    title: "Estimated Cost Saved",
    value: "Rp 245,000",
    caption: "Projected for tomorrow",
    tone: "success",
  },
];
