import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { todos, users } from "../db/schema";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { sign } from "hono/jwt";
import { eq } from "drizzle-orm";

import { env } from "hono/adapter";
import { authMiddleware } from "./middlewares/auth-middleware";

type Bindings = {
	DB: D1Database;
	JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>().basePath("/api");

app.get("/", (c) => {
	return c.text("Hello Hono!");
});

const postLoginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8),
});

app.post("/login", async (c) => {
	const db = drizzle(c.env.DB);
	const body = await c.req.json();

	const validationResult = postLoginSchema.safeParse(body);
	if (!validationResult.success) {
		return c.json(
			{
				error: "Validation failed",
				details: validationResult.error.format(),
			},
			400,
		);
	}

	const { email, password } = validationResult.data;
	const [user] = await db.select().from(users).where(eq(users.email, email));

	if (user === undefined) {
		return c.json({ error: "Invalid email or password" }, 401);
	}

	const isValidPassword = await bcrypt.compare(password, user.password);
	if (!isValidPassword) {
		return c.json({ error: "Invalid email or password" }, 401);
	}

	const payload = {
		sub: user.id,
		exp: Math.floor(Date.now() / 1000) + 60 * 60,
	};
	const { JWT_SECRET } = env<{ JWT_SECRET: string }>(c);
	const token = await sign(payload, JWT_SECRET);

	return c.json(
		{
			access_token: token,
			token_type: "Bearer",
			expires_in: payload.exp,
		},
		200,
	);
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

app.get("/todos", authMiddleware, async (c) => {
	const db = drizzle(c.env.DB);
	const userId = c.get("userId") as number;
	const allTodos = await db
		.select()
		.from(todos)
		.where(eq(todos.userId, userId));
	return c.json(allTodos);
});

const postTodosSchema = z.object({
	title: z.string(),
	completed: z.boolean(),
});

app.post("/todos", authMiddleware, async (c) => {
	const db = drizzle(c.env.DB);
	const body = await c.req.json();
	const validationResult = postTodosSchema.safeParse(body);

	if (!validationResult.success) {
		return c.json(
			{
				error: "Validation failed",
				details: validationResult.error.format(),
			},
			400,
		);
	}

	const { title, completed } = validationResult.data;
	const [todo] = await db
		.insert(todos)
		.values({ userId: c.get("userId") as number, title, completed })
		.returning();
	return c.json(todo, 201);
});

export default app;
