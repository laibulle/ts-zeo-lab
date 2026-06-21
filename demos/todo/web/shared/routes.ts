import type { Routes } from "./types.js";

export const routes: Routes = {
  createTodo: "/todos/",
  home: "/",
  stats: "/stats",
  toggleTodo: (id) => `/todos/${encodeURIComponent(id)}/toggle`,
  deleteTodo: (id) => `/todos/${encodeURIComponent(id)}/delete`,
};
