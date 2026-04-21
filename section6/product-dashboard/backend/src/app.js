import express from "express";
import os from "os";

const STATS_CACHE_KEY = "stats:v1";
const STATS_TTL_SECONDS = 10;

function toNumberOrNull(value) {
	if (value === undefined || value === null || value === "") return null;
	const n = Number(value);
	return Number.isNaN(n) ? NaN : n;
}

export function createApp(options = {}) {
	const app = express();

	const startedAt = options.startedAt ?? Date.now();
	const instanceId =
		options.instanceId ??
		process.env.INSTANCE_ID ??
		`${os.hostname()}-${process.pid}`;

	const db = options.db;
	const redis = options.redis;

	let requestCount = 0;

	app.use(express.json());

	app.use((req, _res, next) => {
		requestCount += 1;
		next();
	});

	app.get("/health", async (_req, res) => {
		let postgres = { status: "down" };
		let redisStatus = { status: "down" };

		try {
			if (!db) throw new Error("DB client not configured");
			await db.query("SELECT 1");
			postgres = { status: "up" };
		} catch (err) {
			postgres = { status: "down", error: err.message };
		}

		try {
			if (!redis) throw new Error("Redis client not configured");
			await redis.ping();
			redisStatus = { status: "up" };
		} catch (err) {
			redisStatus = { status: "down", error: err.message };
		}

		const overall =
			postgres.status === "up" && redisStatus.status === "up"
				? "ok"
				: "degraded";

		res.status(200).json({
			status: overall,
			instanceId,
			uptime: process.uptime(),
			serverTime: new Date().toISOString(),
			requestsHandled: requestCount,
			postgres,
			redis: redisStatus,
		});
	});

	app.get("/items", async (_req, res, next) => {
		try {
			const { rows } = await db.query(
				`SELECT id, name, price, category, created_at AS "createdAt"
         FROM items
         ORDER BY id ASC`,
			);
			res.status(200).json(rows);
		} catch (err) {
			next(err);
		}
	});

	app.post("/items", async (req, res, next) => {
		try {
			const { name, price, category } = req.body || {};

			if (!name || typeof name !== "string" || !name.trim()) {
				return res.status(400).json({
					error: 'Field "name" is required and must be a non-empty string.',
				});
			}

			const parsedPrice = toNumberOrNull(price);
			if (Number.isNaN(parsedPrice)) {
				return res
					.status(400)
					.json({ error: 'Field "price" must be a number when provided.' });
			}

			const normalizedCategory =
				typeof category === "string" && category.trim()
					? category.trim()
					: "General";

			const insert = await db.query(
				`INSERT INTO items (name, price, category)
         VALUES ($1, $2, $3)
         RETURNING id, name, price, category, created_at AS "createdAt"`,
				[name.trim(), parsedPrice, normalizedCategory],
			);

			await redis.del(STATS_CACHE_KEY);

			return res.status(201).json(insert.rows[0]);
		} catch (err) {
			next(err);
		}
	});

	app.get("/stats", async (_req, res, next) => {
		try {
			const cached = await redis.get(STATS_CACHE_KEY);
			if (cached) {
				res.set("X-Cache", "HIT");
				return res.status(200).json(JSON.parse(cached));
			}

			const result = await db.query("SELECT COUNT(*)::int AS total FROM items");
			const totalProducts = result.rows[0]?.total ?? 0;

			const payload = {
				totalProducts,
				instanceId,
				timestamp: new Date().toISOString(),
				serverTime: new Date().toISOString(),
				uptime: process.uptime(),
				requestsHandled: requestCount,
				startedAt: new Date(startedAt).toISOString(),
			};

			await redis.set(STATS_CACHE_KEY, JSON.stringify(payload), {
				EX: STATS_TTL_SECONDS,
			});

			res.set("X-Cache", "MISS");
			return res.status(200).json(payload);
		} catch (err) {
			next(err);
		}
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
