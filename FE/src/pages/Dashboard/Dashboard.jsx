import HeroForecastCard from "./components/HeroForecastCard";
import IngredientsTable from "./components/IngredientsTable";
import SalesBreakdown from "./components/SalesBreakdown";
import OperationalMetrics from "./components/OperationalMetrics";

function Dashboard() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-6">
      <HeroForecastCard />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <IngredientsTable />
        <SalesBreakdown />
      </div>

      <OperationalMetrics />
    </div>
  );
}

export default Dashboard;
