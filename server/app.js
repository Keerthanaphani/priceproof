
require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");

const productsRouter = require("./routes/products");
const pricesRouter = require("./routes/prices");
const storesRouter = require("./routes/stores");
const shoppingRouter = require("./routes/shopping");
const budgetRoutes = require("./routes/budget");
const app = express();

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "img-src": ["'self'", "data:", "https://images.unsplash.com"],
      },
    },
  })
);

app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:3000"
}));

app.use(express.json({ limit: "100kb" }));

// Connect the API routes
app.use("/api/products", productsRouter);
app.use("/api/prices", pricesRouter);
app.use("/api/stores", storesRouter);
app.use("/api/shopping", shoppingRouter);
app.use("/api/budget", budgetRoutes);
// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "PriceProof API is running"
  });
});

// Serve frontend files
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`PriceProof running at http://localhost:${PORT}`);
});
