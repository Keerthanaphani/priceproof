
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
    loadLowPriceAlert(productId);
} catch (error) {
  console.error("PriceProof comparison error:", error);

  const message = document.createElement("p");
  message.className = "error-message";
  message.textContent = `Comparison failed: ${error.message}`;

  comparisonResults.appendChild(message);
 }
}

async function loadLowPriceAlert(productId) {
  const alertElement = document.getElementById("lowPriceAlert");

  if (!alertElement) return;

  alertElement.textContent = "Checking prices at each store...";
  alertElement.className = "low-price-alert";

  try {
    const response = await fetch(`/api/prices/alerts/${productId}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Could not check price history.");
    }

    const data = result.data;

    alertElement.replaceChildren();

    const heading = document.createElement("h3");
    heading.textContent = "🔔 Low-Price Alerts";
    alertElement.appendChild(heading);

    if (!data || !data.alerts || data.alerts.length === 0) {
      const message = document.createElement("p");
      message.textContent =
        data?.message ||
        "Record at least two prices at the same store to detect a price drop.";

      alertElement.appendChild(message);
      return;
    }

    const summary = document.createElement("p");
    summary.textContent = data.message;
    alertElement.appendChild(summary);

    data.alerts.forEach((item) => {
      const storeAlert = document.createElement("div");
      storeAlert.className = item.alert
        ? "store-price-alert price-drop"
        : "store-price-alert";

      const storeTitle = document.createElement("h4");
      storeTitle.textContent = item.storeName || `Store ${item.storeId}`;
      const details = document.createElement("p");
      details.textContent =
        `Previous: ₹${Number(item.previousPrice).toFixed(2)} | ` +
        `Latest: ₹${Number(item.latestPrice).toFixed(2)} per unit`;

      const status = document.createElement("p");
      status.textContent = item.alert
        ? `✅ Price dropped by ₹${Number(item.savings).toFixed(2)} per unit!`
        : `No price drop detected at this store.`;

      storeAlert.append(storeTitle, details, status);
      alertElement.appendChild(storeAlert);
    });
  } catch (error) {
    console.error("Low-price alert failed:", error);
    alertElement.textContent =
      "Unable to check price alerts right now. Please try again.";
    alertElement.className = "low-price-alert";
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
    card.append(name, brand, meta);
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
const historyStore = document.getElementById("historyStore");

async function loadHistoryStores() {
  if (!historyStore) return;

  try {
    const response = await fetch("/api/stores");
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Could not load stores.");
    }

    historyStore.replaceChildren();

    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "All stores";
    historyStore.appendChild(allOption);

    (result.data || []).forEach((store) => {
      const option = document.createElement("option");
      option.value = String(store.id);
      option.textContent = store.name;
      historyStore.appendChild(option);
    });
  } catch (error) {
    console.error("Loading history stores failed:", error);
  }
}

loadHistoryStores();

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

  if (!chart) return;

  const points = [...entries]
    .filter((entry) =>
      Number.isFinite(Number(entry.price)) &&
      entry.recorded_on
    )
    .sort((a, b) =>
      String(a.recorded_on).localeCompare(String(b.recorded_on))
    );

  if (points.length === 0) {
    chart.replaceChildren();

    const message = document.createElement("p");
    message.className = "chart-empty";
    message.textContent = "No price records available to chart.";
    chart.appendChild(message);
    return;
  }

  const prices = points.map((point) => Number(point.price));
  const previousPrice = prices.length > 1
  ? prices[prices.length - 2]
  : prices[0];
  const latestPrice = prices[prices.length - 1];
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const change = latestPrice - previousPrice;
  const changePercent = previousPrice !== 0
  ? (change / previousPrice) * 100
  : 0;

  const width = Math.max(650, points.length * 100);
  const height = 300;
  const padding = { top: 35, right: 30, bottom: 65, left: 75 };

  const range = maxPrice - minPrice || Math.max(maxPrice * 0.1, 1);
  const chartMin = Math.max(0, minPrice - range * 0.15);
  const chartMax = maxPrice + range * 0.15;
  const chartRange = chartMax - chartMin || 1;

  const x = (index) =>
    padding.left +
    (index * (width - padding.left - padding.right)) /
      Math.max(points.length - 1, 1);

  const y = (price) =>
    padding.top +
    ((chartMax - price) / chartRange) *
      (height - padding.top - padding.bottom);

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");

  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Product price trend over time");

  function addSvgElement(tag, attributes, textContent) {
    const element = document.createElementNS(svgNS, tag);

    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, String(value));
    });

    if (textContent !== undefined) {
      element.textContent = textContent;
    }

    svg.appendChild(element);
    return element;
  }

  // Horizontal grid lines and price labels.
  for (let i = 0; i <= 4; i++) {
    const price = chartMin + (chartRange * i) / 4;
    const position = y(price);

    addSvgElement("line", {
      x1: padding.left,
      y1: position,
      x2: width - padding.right,
      y2: position,
      stroke: "#dbe3ef",
      "stroke-dasharray": "5 5"
    });

    addSvgElement("text", {
      x: padding.left - 12,
      y: position + 4,
      "text-anchor": "end",
      "font-size": 12,
      fill: "#64748b"
    }, `₹${price.toFixed(0)}`);
  }

  // Price trend line.
  const linePoints = points
    .map((point, index) => `${x(index)},${y(Number(point.price))}`)
    .join(" ");

  addSvgElement("polyline", {
    points: linePoints,
    fill: "none",
    stroke: "#2563eb",
    "stroke-width": 3,
    "stroke-linejoin": "round",
    "stroke-linecap": "round"
  });

  // Data points and dates.
  points.forEach((point, index) => {
    const price = Number(point.price);
    const date = String(point.recorded_on).slice(5, 10);

    const dot = addSvgElement("circle", {
      cx: x(index),
      cy: y(price),
      r: 5,
      fill: "#2563eb",
      stroke: "#ffffff",
      "stroke-width": 2
    });

    const tooltip = document.createElementNS(svgNS, "title");
    tooltip.textContent = `${date}: ₹${price.toFixed(2)}`;
    dot.appendChild(tooltip);

    addSvgElement("text", {
      x: x(index),
      y: height - 30,
      "text-anchor": "middle",
      "font-size": 11,
      fill: "#64748b"
    }, `${date} #${index + 1}`);
  });

  // Summary cards above the chart.
  const summary = document.createElement("div");
  summary.className = "price-chart-summary";

  const stats = [
    ["Latest price", `₹${latestPrice.toFixed(2)}`],
    ["Lowest price", `₹${minPrice.toFixed(2)}`],
    ["Highest price", `₹${maxPrice.toFixed(2)}`],
    [
      "Change vs previous record",
      `${change > 0 ? "+" : ""}₹${change.toFixed(2)} (${changePercent.toFixed(1)}%)`
    ]
  ];

  stats.forEach(([label, value]) => {
    const card = document.createElement("div");
    card.className = "price-chart-stat";

    const heading = document.createElement("span");
    heading.textContent = label;

    const amount = document.createElement("strong");
    amount.textContent = value;

    if (label === "Change vs previous record") {
      amount.classList.add(
        change > 0 ? "price-increased" :
        change < 0 ? "price-decreased" : "price-unchanged"
      );
    }

    card.append(heading, amount);
    summary.appendChild(card);
  });

  const wrapper = document.createElement("div");
  wrapper.className = "price-chart-scroll";
  wrapper.appendChild(svg);

  chart.replaceChildren(summary, wrapper);
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

    const allEntries = result.data || [];
    const selectedStoreId = historyStore?.value || "all";
    const entries = selectedStoreId === "all"
    ? allEntries
    : allEntries.filter(
      (entry) => String(entry.store_id) === selectedStoreId
    );

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
historyStore?.addEventListener("change", () => {
  if (historyProduct.value) {
    loadPriceHistory();
  }
});
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

/* =========================
   SHOPPING LIST
========================= */

const shoppingForm = document.getElementById("shoppingForm");
const shoppingName = document.getElementById("shoppingName");
const shoppingQuantity = document.getElementById("shoppingQuantity");
const shoppingUnit = document.getElementById("shoppingUnit");
const shoppingEstimatedPrice = document.getElementById("shoppingEstimatedPrice");
const shoppingProduct = document.getElementById("shoppingProduct");
const shoppingStatus = document.getElementById("shoppingStatus");
const shoppingTotal = document.getElementById("shoppingTotal");
const shoppingRemaining = document.getElementById("shoppingRemaining");
const shoppingItems = document.getElementById("shoppingItems");

let shoppingListData = [];

async function loadShoppingList() {
  try {
    shoppingStatus.textContent = "Loading shopping list...";

    const response = await fetch("/api/shopping");
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Unable to load shopping list.");
    }

    shoppingListData = result.data || [];
    renderShoppingList();
  } catch (error) {
    shoppingStatus.textContent = "Could not load shopping list: " + error.message;
  }
}

function renderShoppingList() {
  shoppingItems.replaceChildren();

  shoppingTotal.textContent = shoppingListData.length;
  shoppingRemaining.textContent = shoppingListData.filter(
    item => !item.purchased
  ).length;

  if (shoppingListData.length === 0) {
    shoppingStatus.textContent = "Your shopping list is empty. Add your first item!";
    updateShoppingBudget();
    return;
  }

  shoppingStatus.textContent = "";

  shoppingListData.forEach(item => {
    const row = document.createElement("div");
    row.className = "shopping-item";

    const info = document.createElement("div");
    info.className = "shopping-item-info";

    const name = document.createElement("strong");
    name.textContent = item.name;

    const details = document.createElement("span");
    details.textContent = `Quantity: ${item.quantity} ${item.unit}`;

    info.append(name, document.createElement("br"), details);

    const actions = document.createElement("div");
    actions.className = "shopping-item-actions";

    const purchasedLabel = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = Boolean(item.purchased);
    checkbox.addEventListener("change", () => {
      updateShoppingItem(item.id, checkbox.checked);
    });

    purchasedLabel.append(checkbox, document.createTextNode(" Purchased"));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-shopping-item";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => {
      deleteShoppingItem(item.id);
    });

    actions.append(purchasedLabel, deleteButton);
    row.append(info, actions);
    shoppingItems.appendChild(row);
    });

    // Update the shopping budget after rendering the list
    updateShoppingBudget();
    }

async function updateShoppingItem(id, purchased) {
  try {
    const response = await fetch(`/api/shopping/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purchased })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Update failed.");
    }

    await loadShoppingList();
  } catch (error) {
    shoppingStatus.textContent = error.message;
    await loadShoppingList();
  }
}

async function deleteShoppingItem(id) {
  try {
    const response = await fetch(`/api/shopping/${id}`, {
      method: "DELETE"
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Delete failed.");
    }

    await loadShoppingList();
  } catch (error) {
    shoppingStatus.textContent = error.message;
  }
}

shoppingForm.addEventListener("submit", async event => {
  event.preventDefault();

  const name = shoppingName.value.trim();
  const quantity = Number(shoppingQuantity.value);
  const unit = shoppingUnit.value;
  const productId = shoppingProduct.value;
  const estimatedPrice = Number(shoppingEstimatedPrice.value);
  if (
  !name ||
  !Number.isFinite(quantity) ||
  quantity <= 0 ||
  !unit ||
  !Number.isFinite(estimatedPrice) ||
  estimatedPrice < 0
  ) {
  shoppingStatus.textContent =
    "Enter an item name, valid quantity, unit, and non-negative estimated price.";
  return;
  }

  const item = { name, quantity, unit, estimated_price: estimatedPrice };

  if (productId) {
    item.product_id = Number(productId);
  }

  try {
    shoppingStatus.textContent = "Adding item...";

    const response = await fetch("/api/shopping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item)
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Could not add item.");
    }

    shoppingForm.reset();
    await loadShoppingList();
    shoppingStatus.textContent = "Item added successfully!";
  } catch (error) {
    shoppingStatus.textContent = error.message;
  }
});

loadShoppingList();

/* SHOPPING BUDGET TRACKER */

// Connect JavaScript to the HTML elements
const shoppingBudgetInput = document.getElementById("shoppingBudget");
const estimatedShoppingCost = document.getElementById("estimatedShoppingCost");
const budgetRemaining = document.getElementById("budgetRemaining");
const budgetStatus = document.getElementById("budgetStatus");

// Calculate the total cost and remaining budget
function updateShoppingBudget() {
  if (
    !shoppingBudgetInput ||
    !estimatedShoppingCost ||
    !budgetRemaining ||
    !budgetStatus
  ) return;

  const budgetText = shoppingBudgetInput.value;
  const budget = Number(budgetText);

  // Add up estimated prices of all shopping items
  const totalCost = shoppingListData.reduce((total, item) => {
  const quantity = Number(item.quantity) || 0;
  const estimatedPrice = Number(item.estimated_price) || 0;

  return total + quantity * estimatedPrice;
  }, 0);

  // Display the estimated total
  estimatedShoppingCost.textContent = totalCost.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR"
  });

  // Validate the budget
  if (
    budgetText.trim() === "" ||
    !Number.isFinite(budget) ||
    budget < 0
  ) {
    budgetRemaining.textContent = "—";
    budgetStatus.textContent = "Enter a valid non-negative budget.";
    return;
  }

  // Calculate the remaining budget
  const remaining = budget - totalCost;
  const budgetProgressBar = document.getElementById("budgetProgressBar");
  const budgetProgressText = document.getElementById("budgetProgressText");

  const percentage = budget > 0
  ? (totalCost / budget) * 100
  : (totalCost > 0 ? 100 : 0);

  if (budgetProgressBar && budgetProgressText) {
  budgetProgressBar.style.width = `${Math.min(percentage, 100)}%`;
  budgetProgressText.textContent = `${percentage.toFixed(1)}% of budget used`;

  budgetProgressBar.style.backgroundColor =
    percentage > 100 ? "#dc2626" :
    percentage >= 80 ? "#f59e0b" :
    "#16a34a";
  }
  budgetRemaining.textContent = remaining.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR"
  });

  // Display the budget status
  if (remaining < 0) {
    budgetStatus.textContent =
      `Over budget by ₹${Math.abs(remaining).toFixed(2)}.`;
  } else {
    budgetStatus.textContent =
      `You have ₹${remaining.toFixed(2)} left in your budget.`;
  }
}

// Recalculate when the user changes the budget
if (shoppingBudgetInput) {
  shoppingBudgetInput.addEventListener("input", updateShoppingBudget);
}

// Calculate once when the page loads
updateShoppingBudget();

// Load the saved budget from Supabase through the API
async function loadShoppingBudget() {
  try {
    const response = await fetch("/api/budget");
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to load budget");
    }

    shoppingBudgetInput.value = result.data.monthly_budget;
    updateShoppingBudget();
  } catch (error) {
    console.error("Error loading budget:", error);
  }
}

// Save the budget to Supabase through the API
  async function saveShoppingBudget() {
  const budgetSaveStatus = document.getElementById("budgetSaveStatus");

  try {
    if (budgetSaveStatus) {
      budgetSaveStatus.textContent = "Saving budget...";
    }

    const response = await fetch("/api/budget", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        monthly_budget: shoppingBudgetInput.value
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to save budget");
    }

    if (budgetSaveStatus) {
      budgetSaveStatus.textContent = "Budget saved successfully!";
    }
  } catch (error) {
    console.error("Error saving budget:", error);

    if (budgetSaveStatus) {
      budgetSaveStatus.textContent =
        "Could not save budget. Please try again.";
    }
  }
}

// Save when the user finishes changing the budget
if (shoppingBudgetInput) {
  shoppingBudgetInput.addEventListener("change", saveShoppingBudget);
}

// Load the saved budget when the page opens
loadShoppingBudget();
