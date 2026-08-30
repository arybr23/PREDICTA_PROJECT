import AdaptationBadge from "./components/AdaptationBadge";
import DailyLogForm from "./components/DailyLogForm";
import StockoutToggle from "./components/StockoutToggle";
import RecipeTemplateBuilder from "./components/RecipeTemplateBuilder";

function DataEntry() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-6">
      <h1 className="text-2xl font-bold text-text-main">
        Data Entry & Adaptation
      </h1>

      <AdaptationBadge />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DailyLogForm />
        <StockoutToggle />
      </div>

      <RecipeTemplateBuilder />
    </div>
  );
}

export default DataEntry;
