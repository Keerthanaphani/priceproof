
const express = require("express");
const supabase = require("../config/supabase");

const router = express.Router();

// GET /api/products — retrieve products with categories
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("products")
      .select(`
        id,
        name,
        brand,
        base_unit,
        categories (
          id,
          name
        )
      `)
      .order("name");

    if (error) {
      console.error("Products query failed:", error.message);
      return res.status(500).json({
        error: "Unable to retrieve products"
      });
    }

    res.json({ data });
  } catch (error) {
    console.error("Products route failed:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/products — add a product
router.post("/", async (req, res) => {
  try {
    const { name, category_id, base_unit, brand } = req.body;

    if (!name || !base_unit) {
      return res.status(400).json({
        message: "Product name and base unit are required."
      });
    }

    const { data, error } = await supabase
      .from("products")
      .insert([{
        name: name.trim(),
        category_id: category_id || null,
        base_unit,
        brand: brand || null
      }])
      .select()
      .single();

    if (error) {
      console.error("Adding product failed:", error.message);
      return res.status(400).json({ message: error.message });
    }

    res.status(201).json({
      message: "Product added successfully!",
      data
    });
  } catch (error) {
    console.error("Add product route failed:", error.message);
    res.status(500).json({
      message: "Server error while adding product."
    });
  }
});

module.exports = router;
