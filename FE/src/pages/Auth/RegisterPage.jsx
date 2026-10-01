import { useState } from "react";
import { useAuth } from "../../lib/AuthContext";

export default function RegisterPage({ onToggle }) {
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    firmId: "",
  });
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const update = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
      };
      if (form.firmId) payload.firmId = form.firmId;
      await register(payload);
      onToggle();
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-primary">PREDICTA</h1>
          <p className="mt-1 text-sm text-text-muted">Create a new account</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-border bg-surface p-6 shadow-sm"
        >
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-text-main">
              Name
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={update("name")}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-main">
              Email
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={update("email")}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-main">
              Password
            </label>
            <input
              type="password"
              required
              value={form.password}
              onChange={update("password")}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-main">
              Firm ID <span className="text-text-muted">(optional)</span>
            </label>
            <input
              type="text"
              value={form.firmId}
              onChange={update("firmId")}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="FIRM-XXXX"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
          >
            {pending ? "Creating account..." : "Register"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-text-muted">
          Already have an account?{" "}
          <button
            onClick={onToggle}
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
