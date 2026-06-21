import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const defaultFile = fileURLToPath(new URL("../todo.sqlite", import.meta.url));

export async function openSqliteTodoRepository(file = process.env.TODO_DB ?? defaultFile) {
  if (file !== ":memory:") {
    await mkdir(dirname(file), { recursive: true });
  }

  const driver = globalThis.Bun === undefined ? await openNodeSqlite(file) : await openBunSqlite(file);

  driver.exec("PRAGMA journal_mode = WAL");
  driver.exec("PRAGMA foreign_keys = ON");
  driver.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL CHECK(length(title) > 0 AND length(title) <= 120),
      completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0, 1)),
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);

  return {
    listTodos() {
      return driver.all("SELECT id, title, completed FROM todos ORDER BY created_at DESC, id DESC").map(rowToTodo);
    },
    countTodos() {
      return Number(driver.get("SELECT count(*) AS count FROM todos")?.count ?? 0);
    },
    createTodo(todo) {
      driver.run(
        "INSERT OR IGNORE INTO todos (id, title, completed) VALUES (?, ?, ?)",
        todo.id,
        todo.title,
        todo.completed ? 1 : 0,
      );
    },
    toggleTodo(id) {
      driver.run("UPDATE todos SET completed = CASE completed WHEN 1 THEN 0 ELSE 1 END WHERE id = ?", id);
    },
    deleteTodo(id) {
      driver.run("DELETE FROM todos WHERE id = ?", id);
    },
    close() {
      driver.close();
    },
  };
}

async function openNodeSqlite(file) {
  const { DatabaseSync } = await import("node:sqlite");
  const database = new DatabaseSync(file);

  return createDriver(database, (sql) => database.prepare(sql));
}

async function openBunSqlite(file) {
  const { Database } = await import("bun:sqlite");
  const database = new Database(file, { create: true });
  const prepare = typeof database.prepare === "function" ? database.prepare.bind(database) : database.query.bind(database);

  return createDriver(database, prepare);
}

function createDriver(database, prepare) {
  return {
    exec(sql) {
      database.exec(sql);
    },
    all(sql, ...params) {
      return prepare(sql).all(...params);
    },
    get(sql, ...params) {
      return prepare(sql).get(...params);
    },
    run(sql, ...params) {
      prepare(sql).run(...params);
    },
    close() {
      database.close();
    },
  };
}

function rowToTodo(row) {
  return {
    id: String(row.id),
    title: String(row.title),
    completed: row.completed === 1,
  };
}
