
const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");

// Get the saved shopping budget
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("budget_settings")
      .select("monthly_budget")
      .eq("id", 1)
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error("Get budget error:", error.message);
    res.status(500).json({
      success: false,
      message: "Could not load the saved budget."
    });
  }
});

// Save the shopping budget
router.put("/", async (req, res) => {
  try {
    const budget = Number(req.body.monthly_budget);

    if (
      req.body.monthly_budget === undefined ||
      req.body.monthly_budget === null ||
      req.body.monthly_budget === "" ||
      !Number.isFinite(budget) ||
      budget < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid budget of zero or more."
      });
    }

    const { data, error } = await supabase
      .from("budget_settings")
      .update({
        monthly_budget: budget,
        updated_at: new Date().toISOString()
      })
      .eq("id", 1)
      .select("monthly_budget")
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error("Save budget error:", error.message);
    res.status(500).json({
      success: false,
      message: "Could not save the budget."
    });
  }
});

module.exports = router;
