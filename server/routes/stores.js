
const express = require("express");
const supabase = require("../config/supabase");

const router = express.Router();

// GET /api/stores — retrieve all stores
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("stores")
      .select("id, name")
      .order("name");

    if (error) {
      console.error("Stores query failed:", error.message);
      return res.status(500).json({
        error: "Unable to retrieve stores"
      });
    }

    res.json({ data });
  } catch (error) {
    console.error("Stores route failed:", error.message);
    res.status(500).json({
      error: "Internal server error"
    });
  }
});

module.exports = router;
