import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";

import { createApp } from "../src/app.js";

test("GET /health returns application status and increments request counter", async () => {
  const app = createApp({
    instanceId: "test-instance",
    startedAt: Date.parse("2026-04-09T10:00:00.000Z"),
  });

  const response = await request(app).get("/health");

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ok");
  assert.equal(response.body.instanceId, "test-instance");
  assert.equal(response.body.requestsHandled, 1);
  assert.equal(typeof response.body.uptime, "number");
  assert.match(response.body.serverTime, /^\d{4}-\d{2}-\d{2}T/);
});

test("GET /stats returns server time, handled requests and product totals", async () => {
  const app = createApp({
    instanceId: "stats-instance",
    startedAt: Date.parse("2026-04-09T11:30:00.000Z"),
    initialItems: [
      { id: 1, name: "Laptop", price: 4200, category: "Electronics" },
      { id: 2, name: "Office Chair", price: 850, category: "Furniture" },
      { id: 3, name: "Desk Lamp", price: 120, category: "Lighting" },
    ],
  });

  await request(app).get("/health");
  const response = await request(app).get("/stats");

  assert.equal(response.status, 200);
  assert.equal(response.body.totalProducts, 3);
  assert.equal(response.body.instanceId, "stats-instance");
  assert.equal(response.body.requestsHandled, 2);
  assert.equal(response.body.startedAt, "2026-04-09T11:30:00.000Z");
  assert.equal(typeof response.body.uptime, "number");
  assert.match(response.body.serverTime, /^\d{4}-\d{2}-\d{2}T/);
  assert.match(response.body.timestamp, /^\d{4}-\d{2}-\d{2}T/);
});
