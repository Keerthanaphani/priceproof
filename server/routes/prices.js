

const express = require("express");
const supabase = require("../config/supabase");
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { count, error } = await supabase
      .from("price_entries")
      .select("*", { count: "exact", head: true });

    if (error) {
      console.error("Price record count failed:", error.message);
      return res.status(500).json({
        error: "Unable to count price records"
      });
    }

    res.json({ data: { total: count ?? 0 } });
  } catch (error) {
    console.error("Price record count error:", error.message);
    res.status(500).json({
      error: "Server error while counting price records"
    });
  }
});

router.get("/compare/:productId", async (req, res) => {
  const productId = Number(req.params.productId);

  if (!Number.isSafeInteger(productId) || productId < 1) {
    return res.status(400).json({
      error: "A valid product ID is required"
    });
  }

  try {
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, base_unit")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      return res.status(404).json({
        error: "Product not found"
      });
    }

    const { data, error } = await supabase
      .from("latest_price_per_product_store")
      .select("*")
      .eq("product_id", productId)
      .order("effective_unit_price", { ascending: true });

    if (error) {
      console.error("Price comparison failed:", error.message);
      return res.status(500).json({
        error: "Unable to compare prices"
      });
    }

    const unitLabels = {
      mass: "kg",
      volume: "L",
      count: "piece"
    };

    const results = (data || []).map((price) => ({
      ...price,
      unit_label: unitLabels[product.base_unit] || "unit"
    }));

    res.json({ data: results });
  } catch (error) {
    console.error("Price comparison route failed:", error.message);
    res.status(500).json({
      error: "Internal server error"
    });
  }
});

/* LOW-PRICE ALERTS */
router.get("/alerts/:productId", async (req, res) => {
  const productId = Number(req.params.productId);

  if (!Number.isSafeInteger(productId) || productId < 1) {
    return res.status(400).json({
      error: "A valid product ID is required"
    });
  }

  try {
    const { data, error } = await supabase
      .from("price_entries")
      .select("id, price, effective_unit_price, recorded_on, store_id")
      .eq("product_id", productId)
      .order("recorded_on", { ascending: false })
      .order("id", { ascending: false });

    if (error) {
      console.error("Price alert error:", error);
      return res.status(500).json({
        error: "Could not check price history"
      });
    }

    const entries = data || [];
    const storeHistory = {};

    // Group price records by store.
    for (const entry of entries) {
      const storeId = entry.store_id;

      if (storeId == null) continue;

      if (!storeHistory[storeId]) {
        storeHistory[storeId] = [];
      }

      // Keep only the two most recent entries per store.
      if (storeHistory[storeId].length < 2) {
        storeHistory[storeId].push(entry);
      }
    }
    
const storeIds = Object.keys(storeHistory).map(Number);

let storeNames = {};

if (storeIds.length > 0) {
  const { data: stores, error: storesError } = await supabase
    .from("stores")
    .select("id, name")
    .in("id", storeIds);

  if (storesError) {
    console.error("Could not load store names:", storesError);
  } else {
    storeNames = Object.fromEntries(
    (stores || []).map(store => [Number(store.id), store.name])
    );
  }
}

    const alerts = [];

    for (const [storeId, history] of Object.entries(storeHistory)) {
      if (history.length < 2) continue;

      const latest = Number(history[0].effective_unit_price);
      const previous = Number(history[1].effective_unit_price);

      if (
        !Number.isFinite(latest) ||
        !Number.isFinite(previous)
      ) {
        continue;
      }

      const dropped = latest < previous;

      alerts.push({
        storeId: Number(storeId),
        storeName: storeNames[Number(storeId)] || `Store ${storeId}`,
        alert: dropped,
        latestPrice: latest,
        previousPrice: previous,
        savings: Number((previous - latest).toFixed(2)),
        latestRecordedOn: history[0].recorded_on,
        previousRecordedOn: history[1].recorded_on,
        message: dropped
          ? "Price drop detected at this store!"
          : "No price drop detected at this store."
      });
    }

    return res.json({
      data: {
        alert: alerts.some(item => item.alert),
        alerts,
        message: alerts.length === 0
          ? "Record at least two prices at the same store to detect a price drop."
          : alerts.some(item => item.alert)
            ? "A price drop was detected at one or more stores."
            : "No price drops detected at the stores checked."
      }
    });
  } catch (error) {
    console.error("Price alert error:", error);
    return res.status(500).json({
      error: "Server error while checking price alerts"
    });
  }
});

 // Add a new store price
router.post("/", async (req, res) => {
  try {
    const {
      product_id,
      store_id,
      price,
      pack_size,
      pack_unit,
      offer_type,
      offer_value,
      recorded_on,
      notes
    } = req.body;

    if (
      !product_id ||
      !store_id ||
      price == null ||
      pack_size == null ||
      !pack_unit
    ) {
      return res.status(400).json({
        message:
          "Product, store, price, pack size, and pack unit are required."
      });
    }

    if (
      !Number.isSafeInteger(Number(product_id)) ||
      Number(product_id) < 1 ||
      !Number.isSafeInteger(Number(store_id)) ||
      Number(store_id) < 1 ||
      !Number.isFinite(Number(price)) ||
      Number(price) < 0 ||
      !Number.isFinite(Number(pack_size)) ||
      Number(pack_size) <= 0
    ) {
      return res.status(400).json({
        message:
          "Please provide valid product, store, price, and pack-size values."
      });
    }
    
const size = Number(pack_size);
const priceAmount = Number(price);

const normalizedUnit = String(pack_unit).trim().toLowerCase();

const unitFactors = {
  g: 1000,
  kg: 1,
  ml: 1000,
  l: 1,
  litre: 1,
  liter: 1,
  piece: 1,
  unit: 1
};

if (!(normalizedUnit in unitFactors)) {
  return res.status(400).json({
    message: "Unsupported pack unit. Use g, kg, ml, L, piece, or unit."
  });
}

const effectiveUnitPrice =
  priceAmount / size * unitFactors[normalizedUnit];
  console.log("Calculated unit price:", effectiveUnitPrice);
    const insertData = {
      product_id: Number(product_id),
      store_id: Number(store_id),
      price: Number(price),
      effective_unit_price: effectiveUnitPrice,
      pack_size: Number(pack_size),
      pack_unit,
      offer_type: offer_type || "none",
      offer_value:
      offer_value == null || offer_value === ""
      ? 0
      : Number(offer_value),
      recorded_on: recorded_on || new Date().toISOString().slice(0, 10),
      notes: notes || null
    };

    if (
      insertData.offer_value !== null &&
      !Number.isFinite(insertData.offer_value)
    ) {
      return res.status(400).json({
        message: "Offer value must be a valid number."
      });
    }
    console.log("Data being inserted:", insertData);
    const { data, error } = await supabase
      .from("price_entries")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Adding price failed:", error.message);
      console.log("Submitted insert data:", insertData);
      return res.status(400).json({
        message: "Could not add price entry.",
        error: error.message
      });
    }

    return res.status(201).json({
      message: "Price added successfully!",
      data
    });
  } catch (error) {
    console.error("Add price route failed:", error.message);
    return res.status(500).json({
      message: "Server error while adding price."
    });
  }
});


router.get("/history/:productId", async (req, res) => {
  try {
    const productId = Number(req.params.productId);

    if (!Number.isSafeInteger(productId) || productId < 1) {
      return res.status(400).json({
        error: "Invalid product ID"
      });
    }

    
   const { data, error } = await supabase
   .from("price_entries")
   .select(`
    id,
    product_id,
    store_id,
    price,
    pack_size,
    pack_unit,
    effective_unit_price,
    recorded_on,
    notes,
    stores (
      id,
      name
    )
  `)
    .eq("product_id", productId)
    .order("recorded_on", { ascending: false });

    if (error) {
      console.error("Price history query failed:", error.message);

      return res.status(500).json({
        error: "Unable to retrieve price history"
      });
    }

    res.json({ data });
  } catch (error) {
    console.error("Price history error:", error.message);

    res.status(500).json({
      error: "Server error while retrieving price history"
    });
  }
});

router.get("/shrinkflation/:productId", async (req, res) => {
  try {
    const productId = Number(req.params.productId);

    if (!Number.isSafeInteger(productId) || productId < 1) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    const { data, error } = await supabase
      .from("price_entries")
      .select(`
        id,
        product_id,
        store_id,
        price,
        pack_size,
        pack_unit,
        recorded_on,
        stores ( id, name )
      `)
      .eq("product_id", productId)
      .order("recorded_on", { ascending: true });

    if (error) {
      console.error("Shrinkflation query failed:", error.message);
      return res.status(500).json({
        error: "Unable to check shrinkflation"
      });
    }

    function normalizePack(size, unit) {
      const value = Number(size);
      const normalizedUnit = String(unit || "").toLowerCase().trim();

      if (!Number.isFinite(value) || value <= 0) return null;

      if (normalizedUnit === "g") {
        return { amount: value, family: "mass" };
      }
      if (normalizedUnit === "kg") {
        return { amount: value * 1000, family: "mass" };
      }
      if (normalizedUnit === "ml") {
        return { amount: value, family: "volume" };
      }
      if (["l", "litre", "liter", "litres", "liters"].includes(normalizedUnit)) {
        return { amount: value * 1000, family: "volume" };
      }
      if (["piece", "pieces", "unit", "units", "count"].includes(normalizedUnit)) {
        return { amount: value, family: "count" };
      }

      return null;
    }

    // Compare records from the same store, not prices from different stores.
    const groups = new Map();

    for (const entry of data || []) {
      const pack = normalizePack(entry.pack_size, entry.pack_unit);
      const price = Number(entry.price);

      if (!pack || !Number.isFinite(price) || price < 0) continue;

      const key = `${entry.store_id}:${pack.family}`;

      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ ...entry, normalizedPack: pack, numericPrice: price });
    }

    const alerts = [];

    for (const records of groups.values()) {
      records.sort((a, b) =>
        String(a.recorded_on || "").localeCompare(String(b.recorded_on || "")) ||
        Number(a.id) - Number(b.id)
      );

      for (let i = 1; i < records.length; i++) {
        const previous = records[i - 1];
        const latest = records[i];

        const packGotSmaller =
          latest.normalizedPack.amount < previous.normalizedPack.amount;
        const priceStayedSameOrIncreased =
          latest.numericPrice >= previous.numericPrice;

        if (packGotSmaller && priceStayedSameOrIncreased) {
          const sizeDecreasePercent =
            ((previous.normalizedPack.amount - latest.normalizedPack.amount) /
              previous.normalizedPack.amount) * 100;

          const unitCostBefore =
            previous.numericPrice / previous.normalizedPack.amount;
          const unitCostAfter =
            latest.numericPrice / latest.normalizedPack.amount;

          
alerts.push({
  store_id: latest.store_id,
  store_name: latest.stores?.name || `Store ID: ${latest.store_id}`,
  previous_date: previous.recorded_on,
  latest_date: latest.recorded_on,
  previous_price: previous.numericPrice,
  latest_price: latest.numericPrice,
  previous_pack_size: previous.pack_size,
  previous_pack_unit: previous.pack_unit,
  latest_pack_size: latest.pack_size,
  latest_pack_unit: latest.pack_unit,

  // Unit costs normalized to ₹/kg, ₹/L, or ₹/unit
  previous_unit_cost: Number(
    (unitCostBefore * 1000).toFixed(2)
  ),
  latest_unit_cost: Number(
    (unitCostAfter * 1000).toFixed(2)
  ),

  size_decrease_percent: Number(sizeDecreasePercent.toFixed(2)),
  unit_cost_increase_percent: Number(
    (((unitCostAfter - unitCostBefore) / unitCostBefore) * 100).toFixed(2)
  )
});

        }
      }
    }

    res.json({ data: alerts });
  } catch (error) {
    console.error("Shrinkflation check failed:", error.message);
    res.status(500).json({
      error: "Server error while checking shrinkflation"
    });
  }
});

module.exports = router;