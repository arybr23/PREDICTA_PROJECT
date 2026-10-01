require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const connectDB = require("./config/db");
const routes = require("./routes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// API lives under /api (see API_ENDPOINTS.md); '/' stays as a friendly index.
app.get("/", (req, res) => {
  res.json({
    message: "PREDICTA API — try GET /api/health",
    status: "success",
  });
});

app.use("/api", routes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Something went wrong!",
    error: err.message,
  });
});

connectDB();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API base: http://localhost:${PORT}/api`);
});
