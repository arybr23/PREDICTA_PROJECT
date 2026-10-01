import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import TopNavBar from "./globalComponents/TopNavBar";
import Sidebar from "./globalComponents/Sidebar";
import LandingPage from "./pages/Auth/LandingPage";
import Dashboard from "./pages/Dashboard/Dashboard";
import DataEntry from "./pages/DataEntry/DataEntry";
import Cashier from "./pages/Cashier/Cashier";
import AccountProfile from "./pages/AccountProfile/AccountProfile";
import Stores from "./pages/Stores/Stores";

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-text-muted">Loading...</p>
      </div>
    </div>
  );
}

function AuthenticatedApp() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

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
            <Route
              path="/stores"
              element={isAdmin ? <Stores /> : <Navigate to="/" replace />}
            />
            <Route path="/account" element={<AccountProfile />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <LandingPage />;
  return <AuthenticatedApp />;
}

export default App;
