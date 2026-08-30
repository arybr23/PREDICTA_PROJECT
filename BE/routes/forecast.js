const express = require("express");
const router = express.Router();

// GET /forecast/tomorrow
router.get("/tomorrow", (req, res) => {
  res.status(200).json({
    message: "TODO: Return tomorrow's forecast and ingredient weights",
  });
});

module.exports = router;
