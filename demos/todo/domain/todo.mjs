export const TODO_TITLE_MAX_LENGTH = 120;

export function createTodoEntity({ id, title, completed = false }) {
  const normalizedTitle = normalizeTodoTitle(title);

  if (typeof id !== "string" || normalizedTitle === null) {
    return null;
  }

  return {
    id,
    title: normalizedTitle,
    completed: completed === true,
  };
}

export function normalizeTodoTitle(title) {
  if (typeof title !== "string") {
    return null;
  }

  const trimmed = title.trim();

  if (trimmed.length === 0 || trimmed.length > TODO_TITLE_MAX_LENGTH) {
    return null;
  }

  return trimmed;
}
