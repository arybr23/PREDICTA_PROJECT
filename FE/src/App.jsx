import { BrowserRouter, Routes, Route } from "react-router-dom";
import TopNavBar from "./globalComponents/TopNavBar";
import Sidebar from "./globalComponents/Sidebar";
import Dashboard from "./pages/Dashboard/Dashboard";
import DataEntry from "./pages/DataEntry/DataEntry";
import Cashier from "./pages/Cashier/Cashier";
import AccountProfile from "./pages/AccountProfile/AccountProfile";

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-bg font-sans">
        <Sidebar />
        <TopNavBar />
        <main className="pl-60">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/data-entry" element={<DataEntry />} />
            <Route path="/cashier" element={<Cashier />} />
            <Route path="/account" element={<AccountProfile />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
