
const productGrid = document.getElementById("productGrid");
const statusMessage = document.getElementById("status");
const productSearch = document.getElementById("productSearch");
let allProducts = [];
const comparisonResults = document.getElementById("comparisonResults");
const refreshBtn = document.getElementById("refreshBtn");


const productIcons = {
  mass: "🌾",
  volume: "🥛",
  count: "📦"
};


const productImageMap = {
  "basmati rice": "/images/basmati-rice.jpg",
  "red gram": "/images/red-gram.jpg",
  "sunflower oil": "/images/sunflower-oil.jpg",
  "milk": "/images/milk.jpg",
  "paneer": "/images/paneer.jpg",
  "sugar": "/images/sugar.jpg",
  "salt": "/images/salt.jpg",
  "tea": "/images/tea.jpg",
  "wheat flour": "/images/wheat-flour.jpg",
  "bath soap": "/images/bath-soap.jpg",
  "toothpaste": "/images/toothpaste.jpg",
  "detergent powder": "/images/detergent-powder.jpg",
  "lays": "/images/chips.jpg",
  "biscuits": "/images/biscuits.jpg",
  "chocolate": "/images/chocolate.jpg"
};

function getProductImage(product) {
  const name = String(product.name || "").toLowerCase();
  return productImageMap[name] || "";
}


async function loadProducts() {
  statusMessage.textContent = "Loading products...";
  productGrid.replaceChildren();

  try {
    const response = await fetch("/api/products");
    if (!response.ok) {
      throw new Error("Could not load products.");
    }

    const result = await response.json();
    allProducts = result.data || [];
    const products = allProducts;

    if (products.length === 0) {
      statusMessage.textContent = "No products found. Add products to your database first.";
      return;
    }

    statusMessage.textContent = `${products.length} product(s) available`;

    products.forEach((product) => {
      const card = document.createElement("article");
      card.className = "product-card";

      
    const image = document.createElement("img");
    image.className = "product-image";
    image.alt = `${product.name} product image`;
    image.loading = "lazy";

    const imageUrl = getProductImage(product);

   if (imageUrl) {
   image.src = imageUrl;
   image.onerror = () => {
   image.hidden = true;
  };
} else {
  image.hidden = true;
}


      const name = document.createElement("h3");
      name.textContent = product.name;

      const brand = document.createElement("p");
      brand.className = "product-brand";
      brand.textContent = product.brand || "Generic brand";

      const meta = document.createElement("div");
      meta.className = "product-meta";

      const unit = document.createElement("span");
      unit.className = "unit-label";
      unit.textContent = `Unit: ${product.base_unit || "N/A"}`;

      const button = document.createElement("button");
      button.className = "compare-button";
      button.textContent = "Compare prices";
      button.addEventListener("click", () => comparePrices(product.id, product.name));

      meta.append(unit, button);
      card.append(image, name, brand, meta);
      productGrid.appendChild(card);
    });
  } catch (error) {
    statusMessage.textContent = "Unable to load products.";
    console.error(error);
  }
}

async function comparePrices(productId, productName) {
  comparisonResults.replaceChildren();

  const heading = document.createElement("h3");
  heading.textContent = `Prices for ${productName}`;

  const loading = document.createElement("p");
  loading.textContent = "Comparing store prices...";

  comparisonResults.append(heading, loading);

  try {
    const response = await fetch(
      `/api/prices/compare/${encodeURIComponent(productId)}`
    );
    console.log("Comparison API status:", response.status);
    const data = await response.json();
    console.log("Comparison API data:", data);

    if (!response.ok) {
      throw new Error("Could not compare prices.");
    }
    const prices = data.data || [];

    comparisonResults.replaceChildren(heading);

    if (prices.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "No price entries are available for this product yet.";
      comparisonResults.appendChild(empty);
      return;
    }

    const list = document.createElement("div");
    list.className = "price-list";

    prices.forEach((price, index) => {
      const row = document.createElement("div");
      row.className = "price-row";

      if (index === 0) {
        row.classList.add("best-deal");
      }

      const storeInfo = document.createElement("div");
      const storeName = document.createElement("div");
      storeName.className = "price-store";
      storeName.textContent = price.store_name || "Unknown store";

      storeInfo.appendChild(storeName);

      if (index === 0) {
        const badge = document.createElement("div");
        badge.className = "best-label";
        badge.textContent = "Lowest unit price";
        storeInfo.appendChild(badge);
      }

      const priceInfo = document.createElement("div");
      priceInfo.className = "price-value";

      const amount = Number(price.effective_unit_price);
      priceInfo.textContent = Number.isFinite(amount)
        ? `₹${amount.toFixed(2)} / ${price.unit_label || "unit"}`
        : "Price unavailable";

      row.append(storeInfo, priceInfo);
      list.appendChild(row);
    });
     
    // Calculate potential savings
    const validPrices = prices
      .map((price) => Number(price.effective_unit_price))
      .filter((price) => Number.isFinite(price) && price >= 0);

    if (validPrices.length >= 2) {
      const lowestPrice = Math.min(...validPrices);
      const highestPrice = Math.max(...validPrices);
      const savings = highestPrice - lowestPrice;

      const savingsBox = document.createElement("div");
      savingsBox.className = "savings-summary";

      const savingsTitle = document.createElement("h3");
      savingsTitle.textContent = "Your potential savings";

      const savingsText = document.createElement("p");
      savingsText.textContent =
        `Save ₹${savings.toFixed(2)} per kg by choosing the lowest price.`;

      const percentageText = document.createElement("p");
      percentageText.textContent =
        highestPrice > 0
          ? `${((savings / highestPrice) * 100).toFixed(2)}% less than the highest price.`
          : "Both prices are zero.";

      savingsBox.append(savingsTitle, savingsText, percentageText);
      comparisonResults.appendChild(savingsBox);
    }

    comparisonResults.appendChild(list);
  
} catch (error) {
  console.error("PriceProof comparison error:", error);

  const message = document.createElement("p");
  message.className = "error-message";
  message.textContent = `Comparison failed: ${error.message}`;

  comparisonResults.appendChild(message);
}

}

refreshBtn.addEventListener("click", loadProducts);

loadProducts();


function searchProducts() {
  const query = productSearch.value.trim().toLowerCase();

  const filteredProducts = allProducts.filter((product) => {
    const name = (product.name || "").toLowerCase();
    const brand = (product.brand || "").toLowerCase();

    return name.includes(query) || brand.includes(query);
  });

  productGrid.replaceChildren();

  if (filteredProducts.length === 0) {
    statusMessage.textContent = "No matching products found.";
    return;
  }

  statusMessage.textContent =
    `${filteredProducts.length} product(s) found`;

  filteredProducts.forEach((product) => {
    const card = document.createElement("article");
    card.className = "product-card";

    const icon = document.createElement("div");
    icon.className = "product-icon";
    icon.textContent = productIcons[product.base_unit] || "🛒";

    const name = document.createElement("h3");
    name.textContent = product.name;

    const brand = document.createElement("p");
    brand.className = "product-brand";
    brand.textContent = product.brand || "Generic brand";

    const meta = document.createElement("div");
    meta.className = "product-meta";

    const unit = document.createElement("span");
    unit.className = "unit-label";
    unit.textContent = `Unit: ${product.base_unit || "N/A"}`;

    const button = document.createElement("button");
    button.className = "compare-button";
    button.textContent = "Compare prices";
    button.addEventListener("click", () =>
      comparePrices(product.id, product.name)
    );

    meta.append(unit, button);
    card.append(image, name, brand, meta);
    productGrid.appendChild(card);
  });
}

productSearch.addEventListener("input", searchProducts);

const addPriceForm = document.getElementById("addPriceForm");
const addPriceStatus = document.getElementById("addPriceStatus");

addPriceForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  addPriceStatus.textContent = "Adding price...";

  const formData = new FormData(addPriceForm);

  const priceEntry = {
    product_id: Number(formData.get("product_id")),
    store_id: Number(formData.get("store_id")),
    price: Number(formData.get("price")),
    pack_size: Number(formData.get("pack_size")),
    pack_unit: formData.get("pack_unit"),
    offer_type: formData.get("offer_type"),
    offer_value: Number(formData.get("offer_value")),
    notes: formData.get("notes").trim()
  };

  if (
    !Number.isSafeInteger(priceEntry.product_id) ||
    priceEntry.product_id < 1 ||
    !Number.isSafeInteger(priceEntry.store_id) ||
    priceEntry.store_id < 1 ||
    !Number.isFinite(priceEntry.price) ||
    priceEntry.price < 0 ||
    !Number.isFinite(priceEntry.pack_size) ||
    priceEntry.pack_size <= 0 ||
    !Number.isFinite(priceEntry.offer_value) ||
    priceEntry.offer_value < 0
  ) {
    addPriceStatus.textContent =
      "Please enter valid IDs, price, pack size, and offer value.";
    return;
  }

  try {
    const response = await fetch("/api/prices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(priceEntry)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.message || result.error || "Could not add price."
      );
    }

    addPriceStatus.textContent =
      "Price added successfully! Your comparison is being updated.";

    const product = allProducts.find(
      (item) => Number(item.id) === priceEntry.product_id
    );

    addPriceForm.reset();

    // Update the comparison if this product is in the catalog.
    if (product) {
      await comparePrices(product.id, product.name);
    }
  } catch (error) {
    console.error("Add price error:", error);
    addPriceStatus.textContent = `Failed to add price: ${error.message}`;
  }
});

async function loadPriceFormOptions() {
  const productSelect = document.getElementById("priceProduct");
  const storeSelect = document.getElementById("priceStore");

  if (!productSelect || !storeSelect) return;

  try {
    const [productsResponse, storesResponse] = await Promise.all([
      fetch("/api/products"),
      fetch("/api/stores")
    ]);

    if (!productsResponse.ok || !storesResponse.ok) {
      throw new Error("Could not load dropdown options.");
    }

    const [productsResult, storesResult] = await Promise.all([
      productsResponse.json(),
      storesResponse.json()
    ]);

    productSelect.replaceChildren(
      new Option("Choose a product", "")
    );

    (productsResult.data || []).forEach(product => {
      const label = product.brand
        ? `${product.name} — ${product.brand}`
        : product.name;

      productSelect.add(new Option(label, product.id));
    });

    storeSelect.replaceChildren(
      new Option("Choose a store", "")
    );

    (storesResult.data || []).forEach(store => {
      storeSelect.add(new Option(store.name, store.id));
    });

  } catch (error) {
    console.error("Dropdown loading failed:", error);
    productSelect.replaceChildren(
      new Option("Could not load products", "")
    );
    storeSelect.replaceChildren(
      new Option("Could not load stores", "")
    );
  }
}

loadPriceFormOptions();

const historyProduct = document.getElementById("historyProduct");
const loadHistoryBtn = document.getElementById("loadHistoryBtn");
const historyStatus = document.getElementById("historyStatus");
const priceHistoryBody = document.getElementById("priceHistoryBody");

async function loadHistoryProducts() {
  try {
    const response = await fetch("/api/products");

    if (!response.ok) {
      throw new Error("Could not load products.");
    }

    const result = await response.json();

    historyProduct.replaceChildren(
      new Option("Select a product", "")
    );

    (result.data || []).forEach((product) => {
      historyProduct.add(
        new Option(product.name, product.id)
      );
    });
  } catch (error) {
    historyStatus.textContent = error.message;
  }
}

function renderPriceChart(entries) {
  const chart = document.getElementById("priceChart");

  if (!entries.length) {
    chart.innerHTML =
      '<p class="chart-empty">No price records available to chart.</p>';
    return;
  }

  // Show prices in chronological order, oldest first.
  const points = [...entries]
    .filter((entry) => Number.isFinite(Number(entry.price)))
    .sort((a, b) =>
      String(a.recorded_on).localeCompare(String(b.recorded_on))
    );

  if (!points.length) {
    chart.innerHTML =
      '<p class="chart-empty">No valid price records available.</p>';
    return;
  }

  const width = Math.max(600, points.length * 90);
  const height = 260;
  const padding = { top: 25, right: 25, bottom: 55, left: 65 };

  const prices = points.map((point) => Number(point.price));
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = maxPrice - minPrice || 1;

  const x = (index) =>
    padding.left +
    (index * (width - padding.left - padding.right)) /
      Math.max(points.length - 1, 1);

  const y = (price) =>
    padding.top +
    ((maxPrice - price) / range) *
      (height - padding.top - padding.bottom);

  const linePoints = points
    .map((point, index) => `${x(index)},${y(Number(point.price))}`)
    .join(" ");

  const gridLines = Array.from({ length: 5 }, (_, index) => {
    const price = minPrice + (range * index) / 4;
    const position = y(price);

    return `
      <line x1="${padding.left}" y1="${position}"
        x2="${width - padding.right}" y2="${position}"
        stroke="#e5e7eb" stroke-dasharray="4 4" />
      <text x="${padding.left - 10}" y="${position + 4}"
        text-anchor="end" font-size="11" fill="#64748b">
        ₹${price.toFixed(0)}
      </text>
    `;
  }).join("");

  const dots = points.map((point, index) => `
    <circle cx="${x(index)}" cy="${y(Number(point.price))}"
      r="5" fill="#2563eb">
      <title>${point.recorded_on}: ₹${Number(point.price).toFixed(2)}</title>
    </circle>
    <text x="${x(index)}" y="${height - 25}"
      text-anchor="middle" font-size="11" fill="#64748b">
      ${String(point.recorded_on || "").slice(0, 10)}
    </text>
  `).join("");

  chart.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}"
      role="img" aria-label="Product price trend chart">
      ${gridLines}
      <polyline points="${linePoints}" fill="none"
        stroke="#2563eb" stroke-width="3"
        stroke-linejoin="round" stroke-linecap="round" />
      ${dots}
    </svg>
  `;
}

async function loadPriceHistory() {
  const productId = historyProduct.value;

  if (!productId) {
    historyStatus.textContent = "Please select a product.";
    return;
  }

  historyStatus.textContent = "Loading price history...";
  priceHistoryBody.replaceChildren();

  try {
    const response = await fetch(
      `/api/prices/history/${encodeURIComponent(productId)}`
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error || "Could not load price history."
      );
    }

    const entries = result.data || [];
    renderPriceChart(entries);
    if (entries.length === 0) {
      historyStatus.textContent =
        "No price history found for this product.";
      return;
    }

    entries.forEach((entry) => {
      const row = document.createElement("tr");

      const unit = String(entry.pack_unit || "").toLowerCase();
      const factor = {
        g: 1000,
        kg: 1,
        ml: 1000,
        l: 1,
        litre: 1,
        liter: 1,
        piece: 1,
        unit: 1
      }[unit];

      const unitCost = Number(entry.effective_unit_price);
      const unitLabel = ["g", "kg"].includes(unit)
        ? "₹/kg"
        : ["ml", "l", "litre", "liter"].includes(unit)
          ? "₹/L"
          : "₹/unit";

      const values = [
        entry.recorded_on || "—",
        entry.stores?.name || `Store ID: ${entry.store_id}`,
        `${entry.pack_size} ${entry.pack_unit}`,
        `₹${Number(entry.price).toFixed(2)}`,
        Number.isFinite(unitCost)
          ? `₹${unitCost.toFixed(2)} ${unitLabel}`
          : "—"
      ];

      values.forEach((value, index) => {
        const cell = document.createElement("td");

        cell.textContent = value;
        row.appendChild(cell);
      });

      priceHistoryBody.appendChild(row);
    });

    historyStatus.textContent =
      `Showing ${entries.length} price entr${entries.length === 1 ? "y" : "ies"}.`;
  } catch (error) {
    console.error("Price history loading failed:", error);
    historyStatus.textContent = error.message;
  }
}

loadHistoryBtn.addEventListener("click", loadPriceHistory);
loadHistoryProducts();

const shrinkBtn = document.getElementById("checkShrinkflationBtn");
const shrinkStatus = document.getElementById("shrinkflationStatus");
const shrinkResults = document.getElementById("shrinkflationResults");

if (shrinkBtn) {
  shrinkBtn.addEventListener("click", async () => {
    const productSelect = document.getElementById("historyProduct");
    const productId = productSelect?.value;

    if (!productId) {
      shrinkStatus.textContent = "Please select a product in Price History first.";
      return;
    }

    shrinkBtn.disabled = true;
    shrinkStatus.textContent = "Checking price records...";
    shrinkResults.replaceChildren();

    try {
      const response = await fetch(
        `/api/prices/shrinkflation/${encodeURIComponent(productId)}`
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to check shrinkflation.");
      }

      const alerts = result.data || [];

      if (alerts.length === 0) {
        shrinkStatus.textContent =
          "No possible shrinkflation found in the available records.";
        return;
      }

      shrinkStatus.textContent = `Found ${alerts.length} possible alert(s).`;

      alerts.forEach((alert) => {
        const card = document.createElement("div");
        card.className = "shrinkflation-alert";

        const heading = document.createElement("h4");
        heading.textContent = "Possible shrinkflation detected";
        card.appendChild(heading);

        [
          `Store: ${alert.store_name}`,
          `Earlier pack: ${alert.previous_pack_size} ${alert.previous_pack_unit}`,
          `Latest pack: ${alert.latest_pack_size} ${alert.latest_pack_unit}`,
          `Earlier price: ₹${Number(alert.previous_price).toFixed(2)}`,
          `Latest price: ₹${Number(alert.latest_price).toFixed(2)}`,
          `Earlier unit cost: ₹${Number(alert.previous_unit_cost).toFixed(2)} ${["g", "kg"].includes(String(alert.previous_pack_unit).toLowerCase()) ? "/kg" : ["ml", "l", "litre", "liter"].includes(String(alert.previous_pack_unit).toLowerCase()) ? "/L" : "/unit"}`,
          `Latest unit cost: ₹${Number(alert.latest_unit_cost).toFixed(2)} ${["g", "kg"].includes(String(alert.latest_pack_unit).toLowerCase()) ? "/kg" : ["ml", "l", "litre", "liter"].includes(String(alert.latest_pack_unit).toLowerCase()) ? "/L" : "/unit"}`,
          `Pack size decreased by ${alert.size_decrease_percent}%`,
          `Unit cost changed by ${alert.unit_cost_increase_percent}%`
        ].forEach((text) => {
          const p = document.createElement("p");
          p.textContent = text;
          card.appendChild(p);
        });

        shrinkResults.appendChild(card);
      });
    } catch (error) {
      shrinkStatus.textContent = error.message;
    } finally {
      shrinkBtn.disabled = false;
    }
  });
}

async function loadDashboardSummary() {
  const totalProductsEl = document.getElementById("totalProducts");
  const totalPriceRecordsEl = document.getElementById("totalPriceRecords");
  const totalAlertsEl = document.getElementById("totalShrinkflationAlerts");
  const dashboardStatus = document.getElementById("dashboardStatus");

  // Do nothing if the dashboard HTML has not been added.
  if (
    !totalProductsEl ||
    !totalPriceRecordsEl ||
    !totalAlertsEl ||
    !dashboardStatus
  ) {
    return;
  }

  dashboardStatus.textContent = "Loading dashboard...";
  totalProductsEl.textContent = "—";
  totalPriceRecordsEl.textContent = "—";
  totalAlertsEl.textContent = "—";

  try {
    const [productsResponse, pricesResponse] = await Promise.all([
      fetch("/api/products"),
      fetch("/api/prices")
    ]);

    if (!productsResponse.ok || !pricesResponse.ok) {
      throw new Error("Could not load dashboard statistics.");
    }

    const [productsResult, pricesResult] = await Promise.all([
      productsResponse.json(),
      pricesResponse.json()
    ]);

    const products = productsResult.data || [];
    const totalPriceRecords = pricesResult.data?.total ?? 0;

    totalProductsEl.textContent = products.length;
    totalPriceRecordsEl.textContent = totalPriceRecords;

    // Count possible alerts across tracked products.
    const alertResults = await Promise.all(
      products.map(async (product) => {
        try {
          const response = await fetch(
            `/api/prices/shrinkflation/${encodeURIComponent(product.id)}`
          );

          if (!response.ok) return [];

          const result = await response.json();
          return result.data || [];
        } catch {
          return [];
        }
      })
    );

    const totalAlerts = alertResults.reduce(
      (total, alerts) => total + alerts.length,
      0
    );

    totalAlertsEl.textContent = totalAlerts;
    dashboardStatus.textContent = "Dashboard updated successfully.";
  } catch (error) {
    console.error("Dashboard loading failed:", error);
    dashboardStatus.textContent =
      "Unable to load dashboard statistics. Check the API and try refreshing.";
  }
}

loadDashboardSummary();
