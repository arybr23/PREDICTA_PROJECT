import { useState } from "react";
import LoginPage from "./LoginPage";
import RegisterPage from "./RegisterPage";

export default function LandingPage() {
  const [showLogin, setShowLogin] = useState(true);

  return (
    <div className="bg-bg font-sans">
      <nav className="fixed flex items-center justify-between border-b border-border bg-surface px-6 py-4 shadow-sm w-full">
        <span className="text-lg font-bold text-primary">PREDICTA</span>
        <span className="text-xs text-text-muted">
          ISIF Predicta &mdash; Food Demand Forecasting
        </span>
      </nav>

      <div className="flex">
        <div className="hidden flex-1 items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 lg:flex">
          <div className="max-w-md px-8 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <svg
                className="h-8 w-8 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-text-main">
              Smart Food Demand Forecasting
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-text-muted">
              Predict tomorrow&apos;s ingredient needs today. Reduce waste,
              prevent stockouts, and keep your kitchen running smoothly with
              AI-powered insights.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-4 text-center">
              <div className="rounded-lg border border-border bg-surface p-3">
                <p className="text-lg font-bold text-primary">95%</p>
                <p className="text-xs text-text-muted">Accuracy</p>
              </div>
              <div className="rounded-lg border border-border bg-surface p-3">
                <p className="text-lg font-bold text-primary">30%</p>
                <p className="text-xs text-text-muted">Less Waste</p>
              </div>
              <div className="rounded-lg border border-border bg-surface p-3">
                <p className="text-lg font-bold text-primary">24h</p>
                <p className="text-xs text-text-muted">Advance Notice</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 py-12">
          {showLogin ? (
            <LoginPage onToggle={() => setShowLogin(false)} />
          ) : (
            <RegisterPage onToggle={() => setShowLogin(true)} />
          )}
        </div>
      </div>
    </div>
  );
}
