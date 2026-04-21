import { Pool } from "pg";
import { createClient } from "redis";
import { createApp } from "./app.js";

const PORT = Number(process.env.PORT || 5000);

const POSTGRES_HOST = process.env.POSTGRES_HOST || "postgres";
const POSTGRES_PORT = Number(process.env.POSTGRES_PORT || 5432);
const POSTGRES_DB = process.env.POSTGRES_DB || "productsdb";
const POSTGRES_USER = process.env.POSTGRES_USER || "products";
const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || "products";

const REDIS_URL = process.env.REDIS_URL || "redis://redis:6379";

const pool = new Pool({
	host: POSTGRES_HOST,
	port: POSTGRES_PORT,
	database: POSTGRES_DB,
	user: POSTGRES_USER,
	password: POSTGRES_PASSWORD,
});

const redis = createClient({ url: REDIS_URL });

redis.on("error", (err) => {
	console.error("Redis error:", err.message);
});

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForPostgres(maxAttempts = 20, delayMs = 1500) {
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			await pool.query("SELECT 1");
			console.log(`PostgreSQL is ready (attempt ${attempt}/${maxAttempts})`);
			return;
		} catch (err) {
			console.log(
				`Waiting for PostgreSQL (${attempt}/${maxAttempts}): ${err.code || err.message}`,
			);
			if (attempt === maxAttempts) throw err;
			await sleep(delayMs);
		}
	}
}

async function initDb() {
	await pool.query(`
    CREATE TABLE IF NOT EXISTS items (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      price NUMERIC(12,2),
      category TEXT NOT NULL DEFAULT 'General',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

	const { rows } = await pool.query("SELECT COUNT(*)::int AS c FROM items");
	if ((rows[0]?.c ?? 0) === 0) {
		await pool.query(
			`INSERT INTO items (name, price, category)
       VALUES
       ('Laptop', 4200, 'Electronics'),
       ('Office Chair', 850, 'Furniture')`,
		);
	}
}

async function bootstrap() {
	await redis.connect();
	await waitForPostgres();
	await initDb();

	const app = createApp({ db: pool, redis });

	app.listen(PORT, () => {
		console.log(`Backend API listening on port ${PORT}`);
	});
}

bootstrap().catch((err) => {
	console.error("Fatal startup error:", err);
	process.exit(1);
});
