
require("dotenv").config();

const supabase = require("./config/supabase");

async function testConnection() {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .limit(5);

  if (error) {
    console.error("Connection failed:", error.message);
    process.exitCode = 1;
    return;
  }

  console.log("Supabase connection successful!");
  console.log("Categories:", data);
}

testConnection();
