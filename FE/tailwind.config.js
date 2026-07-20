/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#F7F8FA",
        card: "#FFFFFF",
        primary: {
          DEFAULT: "#FA8112",
          light: "#FFF3E8",
          dark: "#DB6C05",
        },
        text: {
          primary: "#1F2937",
          secondary: "#6B7280",
        },
        border: {
          DEFAULT: "#E5E7EB",
        },
        success: "#22C55E",
        "success-light": "#EAFBF1",
        warning: "#F59E0B",
        "warning-light": "#FEF6E7",
        danger: "#EF4444",
        "danger-light": "#FDEDED",
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
      fontSize: {
        "dashboard-title": ["28px", { lineHeight: "36px", fontWeight: "700" }],
        "card-title": ["20px", { lineHeight: "28px", fontWeight: "600" }],
        "hero-title": ["16px", { lineHeight: "22px", fontWeight: "600" }],
        "hero-metric": ["40px", { lineHeight: "48px", fontWeight: "700" }],
        "small-title": ["14px", { lineHeight: "20px", fontWeight: "500" }],
        body: ["14px", { lineHeight: "20px", fontWeight: "400" }],
        caption: ["12px", { lineHeight: "16px", fontWeight: "400" }],
      },
      borderRadius: {
        card: "16px",
        pill: "999px",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(16, 24, 40, 0.04), 0 4px 16px rgba(16, 24, 40, 0.04)",
        "soft-lg": "0 2px 4px rgba(16, 24, 40, 0.04), 0 12px 32px rgba(16, 24, 40, 0.06)",
      },
      spacing: {
        4.5: "18px",
      },
    },
  },
  plugins: [],
};
