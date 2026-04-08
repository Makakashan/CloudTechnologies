import express from "express";
import os from "os";

const app = express();
const PORT = process.env.PORT || 5000;

// Unique-ish instance identifier for demo/load-balancing visibility
const instanceId = process.env.INSTANCE_ID || `${os.hostname()}-${process.pid}`;

app.use(express.json());

// In-memory store for demo purposes
let items = [
  { id: 1, name: "Laptop", price: 4200, category: "Electronics" },
  { id: 2, name: "Office Chair", price: 850, category: "Furniture" },
];

let nextId = items.length + 1;

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", instanceId });
});

// GET /items
app.get("/items", (_req, res) => {
  res.status(200).json(items);
});

// POST /items
app.post("/items", (req, res) => {
  const { name, price, category } = req.body || {};

  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({
      error: 'Field "name" is required and must be a non-empty string.',
    });
  }

  const parsedPrice =
    price === undefined || price === null || price === ""
      ? null
      : Number(price);

  if (parsedPrice !== null && Number.isNaN(parsedPrice)) {
    return res
      .status(400)
      .json({ error: 'Field "price" must be a number when provided.' });
  }

  const newItem = {
    id: nextId++,
    name: name.trim(),
    price: parsedPrice,
    category:
      typeof category === "string" && category.trim()
        ? category.trim()
        : "General",
    createdAt: new Date().toISOString(),
  };

  items.push(newItem);
  return res.status(201).json(newItem);
});

// GET /stats
app.get("/stats", (_req, res) => {
  res.status(200).json({
    totalProducts: items.length,
    instanceId,
    timestamp: new Date().toISOString(),
  });
});

// Fallback 404 for unknown routes
app.use((req, res) => {
  res
    .status(404)
    .json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

app.listen(PORT, () => {
  console.log(
    `Backend API listening on port ${PORT} (instanceId=${instanceId})`,
  );
});
