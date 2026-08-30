const express = require("express");
const router = express.Router();
const forecast = require("./forecast");
const sales = require("./sales");
const pos = require("./pos");

router.get("/", (req, res) => {
  res.json({
    message: "Welcome to ISIF Predicta API",
    status: "success",
  });
});

router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Backend server is running",
  });
});

router.use("/forecast", forecast);
router.use("/sales", sales);
router.use("/recipes", sales);
router.use("/pos", pos);

module.exports = router;
