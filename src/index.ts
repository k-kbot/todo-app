import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { todos, users } from "../db/schema";
import { z } from "zod";
import bcrypt from "bcryptjs";

type Bindings = {
	DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>().basePath("/api");

app.get("/", (c) => {
	return c.text("Hello Hono!");
});

const postUsersSchema = z.object({
	name: z.string(),
	email: z.string().email(),
	password: z.string().min(8),
});

app.post("/users", async (c) => {
	const db = drizzle(c.env.DB);
	const body = await c.req.json();
	const validationResult = postUsersSchema.safeParse(body);

	if (!validationResult.success) {
		return c.json(
			{
				error: "Validation failed",
				details: validationResult.error.format(),
			},
			400,
		);
	}

	const { name, email, password } = validationResult.data;
	const hashedPassword = await bcrypt.hash(password, 10);
	const [user] = await db
		.insert(users)
		.values({ name, email, password: hashedPassword })
		.returning();
	const { password: _, ...userWithoutPassword } = user;
	return c.json(userWithoutPassword, 201);
});

app.get("/todos", async (c) => {
	const db = drizzle(c.env.DB);
	const allTodos = await db.select().from(todos).all();
	return c.json(allTodos);
});

app.post("/todos", async (c) => {
	const db = drizzle(c.env.DB);
	const { title, completed } = await c.req.json();
	const [todo] = await db
		.insert(todos)
		.values({ title, completed, userId: 1 }) // TODO
		.returning();
	return c.json(todo, 201);
});

export default app;
