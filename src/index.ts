import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { todos } from "../db/schema";

type Bindings = {
	DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>().basePath("/api");

app.get("/", (c) => {
	return c.text("Hello Hono!");
});

app.get("/todos", async (c) => {
	const db = drizzle(c.env.DB);
	const allTodos = await db.select().from(todos).all();
	return c.json(allTodos);
});

export default app;
