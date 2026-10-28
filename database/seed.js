
require("dotenv").config();

const supabase = require("../server/config/supabase");

async function insertRows(table, rows) {
  const { data, error } = await supabase
    .from(table)
    .insert(rows)
    .select();

  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }

  console.log(`Inserted ${data.length} rows into ${table}`);
  return data;
}

async function seed() {
  const categories = await insertRows("categories", [
    { name: "Grains & Rice" },
    { name: "Dairy" },
    { name: "Cooking Essentials" }
  ]);

  const stores = await insertRows("stores", [
    { name: "Demo Supermarket", type: "retail" },
    { name: "Demo Online Store", type: "online" }
  ]);

  const riceCategory = categories.find(
    item => item.name === "Grains & Rice"
  );

  const products = await insertRows("products", [
    {
      name: "Basmati Rice",
      brand: "Demo Brand",
      category_id: riceCategory.id,
      base_unit: "mass"
    }
  ]);

  const rice = products[0];

  await insertRows("price_entries", [
    {
      product_id: rice.id,
      store_id: stores[0].id,
      price: 180,
      pack_size: 1000,
      pack_unit: "g",
      offer_type: "none",
      offer_value: 0,
      effective_unit_price: 180,
      recorded_on: "2026-10-27",
      notes: "Demonstration price only"
    },
    {
      product_id: rice.id,
      store_id: stores[1].id,
      price: 165,
      pack_size: 1000,
      pack_unit: "g",
      offer_type: "none",
      offer_value: 0,
      effective_unit_price: 165,
      recorded_on: "2026-10-27",
      notes: "Demonstration price only"
    }
  ]);

  console.log("PriceProof demo data inserted successfully!");
}

seed().catch(error => {
  console.error("Seeding failed:", error.message);
  process.exitCode = 1;
});
