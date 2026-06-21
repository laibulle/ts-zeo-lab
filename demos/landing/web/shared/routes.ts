import type { Routes } from "./types.js";

export const routes: Routes = {
  createTodo: "/todos/",
  home: "/",
  mutations: "/todos/actions",
  stats: "/stats",
  todos: "/todos",
  toggleTodo: (id) => `/todos/${encodeURIComponent(id)}/toggle`,
  deleteTodo: (id) => `/todos/${encodeURIComponent(id)}/delete`,
};
