import ProfileCard from "./components/ProfileCard";
import StoreList from "./components/StoreList";
import StockManagement from "./components/StockManagement";

function AccountProfile() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <ProfileCard />
          <StoreList />
        </div>
        <StockManagement />
      </div>
    </div>
  );
}

export default AccountProfile;
