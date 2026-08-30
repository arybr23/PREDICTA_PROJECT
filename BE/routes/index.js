const express = require("express");
const router = express.Router();

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

module.exports = router;
