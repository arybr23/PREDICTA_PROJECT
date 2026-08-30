const express = require("express");
const router = express.Router();

// POST /sales/entry
router.post("/entry", (req, res) => {
  res.status(200).json({
    message: "TODO: Submit end-of-day sales and trigger ML retrain",
  });
});

// POST /recipes/mapping
router.post("/mapping", (req, res) => {
  res.status(200).json({
    message: "TODO: Map menu items to raw ingredient multipliers",
  });
});

module.exports = router;
