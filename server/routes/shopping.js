
const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");

// GET all shopping-list items
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("shopping_list")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// POST a new shopping-list item
router.post("/", async (req, res) => {
  try {
    const { name, quantity, unit, product_id } = req.body;

    if (
      !name ||
      !Number.isFinite(Number(quantity)) ||
      Number(quantity) <= 0 ||
      !unit
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, positive quantity, and unit are required."
      });
    }

    const item = {
      name: name.trim(),
      quantity: Number(quantity),
      unit: unit.trim(),
      purchased: false
    };

    if (product_id !== undefined && product_id !== null && product_id !== "") {
      const parsedId = Number(product_id);

      if (!Number.isSafeInteger(parsedId) || parsedId < 1) {
        return res.status(400).json({
          success: false,
          message: "Invalid product ID."
        });
      }

      item.product_id = parsedId;
    }

    const { data, error } = await supabase
      .from("shopping_list")
      .insert(item)
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// PATCH purchased status
router.patch("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid shopping-list item ID."
      });
    }

    if (typeof req.body.purchased !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "purchased must be true or false."
      });
    }

    const { data, error } = await supabase
      .from("shopping_list")
      .update({ purchased: req.body.purchased })
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Shopping-list item not found."
      });
    }

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// DELETE a shopping-list item
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid shopping-list item ID."
      });
    }

    const { data, error } = await supabase
      .from("shopping_list")
      .delete()
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Shopping-list item not found."
      });
    }

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
