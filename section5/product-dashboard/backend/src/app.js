import express from "express";
import os from "os";

const defaultItems = [
  { id: 1, name: "Laptop", price: 4200, category: "Electronics" },
  { id: 2, name: "Office Chair", price: 850, category: "Furniture" },
];

function cloneItems(items) {
  return items.map((item) => ({ ...item }));
}

export function createApp(options = {}) {
  const app = express();
  const startedAt = options.startedAt ?? Date.now();
  const instanceId =
    options.instanceId ?? process.env.INSTANCE_ID ?? `${os.hostname()}-${process.pid}`;

  let requestCount = 0;
  let items = cloneItems(options.initialItems ?? defaultItems);
  let nextId =
    items.reduce((maxId, item) => Math.max(maxId, item.id ?? 0), 0) + 1;

  app.use(express.json());

  app.use((req, _res, next) => {
    requestCount += 1;
    next();
  });

  app.get("/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      instanceId,
      uptime: process.uptime(),
      serverTime: new Date().toISOString(),
      requestsHandled: requestCount,
    });
  });

  app.get("/items", (_req, res) => {
    res.status(200).json(items);
  });

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

  app.get("/stats", (_req, res) => {
    res.status(200).json({
      totalProducts: items.length,
      instanceId,
      timestamp: new Date().toISOString(),
      serverTime: new Date().toISOString(),
      uptime: process.uptime(),
      requestsHandled: requestCount,
      startedAt: new Date(startedAt).toISOString(),
    });
  });

  app.use((req, res) => {
    res
      .status(404)
      .json({ error: `Route ${req.method} ${req.originalUrl} not found` });
  });

  app.use((err, _req, res, _next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  });

  return app;
}
