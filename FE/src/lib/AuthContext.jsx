import { createContext, useContext, useState, useEffect } from "react";
import { api } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.me()
      .then((res) => setUser(res.account))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await api.login(email, password);
    setUser(res.account);
    return res;
  };

  const register = async (data) => {
    const res = await api.register(data);
    return res;
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  const initialize = async () => {
    const res = await api.initialize();
    setUser((prev) => (prev ? { ...prev, initialized: true } : prev));
    return res;
  };

  const refresh = async () => {
    const res = await api.me();
    setUser(res.account);
    return res.account;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        initialized: user?.initialized === true,
        login,
        register,
        logout,
        initialize,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
