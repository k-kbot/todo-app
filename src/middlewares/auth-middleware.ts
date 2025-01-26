import { verify } from "hono/jwt";

export const authMiddleware = async (c, next) => {
	const authHeader = c.req.header("Authorization");

	if (authHeader === undefined || !authHeader.startsWith("Bearer ")) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const token = authHeader.split(" ")[1];

	try {
		const payload = await verify(token, c.env.JWT_SECRET);
		c.set("userId", payload.sub);
		await next();
	} catch (err) {
		return c.json({ error: "Invalid token" }, 401);
	}
};
