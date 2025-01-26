import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const users = sqliteTable("users", {
	id: integer("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	password: text("password").notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
	posts: many(todos),
}));

export const todos = sqliteTable("todos", {
	id: integer("id").primaryKey(),
	userId: integer("userId").notNull(),
	title: text("title").notNull(),
	completed: integer("completed", { mode: "boolean" }).notNull(),
});

export const todosRelations = relations(todos, ({ one }) => ({
	author: one(users, {
		fields: [todos.userId],
		references: [users.id],
	}),
}));
