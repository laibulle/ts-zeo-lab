import { createRuntime } from "@ts-zero/runtime/runtime";
import type { HostChannel, HostMessage, RuntimeMessage } from "@ts-zero/runtime/types";

declare const nativeLog: (message: string) => void;
declare const nativeSend: (message: string) => void;

interface Todo {
  readonly id: string;
  readonly title: string;
  readonly completed: boolean;
}

let receiveFromHost: ((message: HostMessage) => void) | undefined;
let nextId = 3;
let todos: Todo[] = [
  { id: "todo-1", title: "Wire JavaScriptCore", completed: true },
  { id: "todo-2", title: "Ship a native todo UI", completed: false },
];

const channel: HostChannel = {
  send(message: RuntimeMessage) {
    nativeSend(JSON.stringify(message));
  },
  subscribe(listener) {
    receiveFromHost = listener;

    return () => {
      receiveFromHost = undefined;
    };
  },
};

const runtime = createRuntime({
  channel,
  createId: createDemoId(),
});

runtime.subscribe((message) => {
  if (message.kind !== "event") {
    return;
  }

  switch (message.name) {
    case "todo.create":
      createTodo(readTitle(message.payload));
      break;
    case "todo.toggle":
      toggleTodo(readId(message.payload));
      break;
    case "todo.delete":
      deleteTodo(readId(message.payload));
      break;
    default:
      nativeLog(`js.ignored ${message.name}`);
  }
});

function start(): void {
  runtime.emit("demo.started", {
    runtime: "JavaScriptCore",
    surface: "macOS SwiftUI",
  });

  publishTodos();

  void runtime.request("secureStorage", "set", {
    key: "last-opened-demo",
    value: "todo-native",
  }).then((value) => {
    runtime.emit("native.status", {
      text: `Secure storage ready: ${JSON.stringify(value)}`,
    });
  });
}

function receive(messageJson: string): void {
  if (receiveFromHost === undefined) {
    throw new Error("Host channel is not subscribed");
  }

  receiveFromHost(JSON.parse(messageJson) as HostMessage);
}

function createTodo(title: string): void {
  const trimmed = title.trim();

  if (trimmed.length === 0) {
    return;
  }

  todos = [
    {
      id: `todo-${nextId}`,
      title: trimmed,
      completed: false,
    },
    ...todos,
  ];
  nextId += 1;
  publishTodos();

  void runtime.request("haptics", "success");
}

function toggleTodo(id: string): void {
  todos = todos.map((todo) => todo.id === id ? { ...todo, completed: !todo.completed } : todo);
  publishTodos();
}

function deleteTodo(id: string): void {
  todos = todos.filter((todo) => todo.id !== id);
  publishTodos();
}

function publishTodos(): void {
  const completed = todos.filter((todo) => todo.completed).length;

  runtime.emit("todos.changed", {
    todos,
    stats: {
      total: todos.length,
      completed,
      remaining: todos.length - completed,
    },
  });
}

function readTitle(payload: unknown): string {
  if (payload !== null && typeof payload === "object" && typeof (payload as { title?: unknown }).title === "string") {
    return (payload as { title: string }).title;
  }

  return "";
}

function readId(payload: unknown): string {
  if (payload !== null && typeof payload === "object" && typeof (payload as { id?: unknown }).id === "string") {
    return (payload as { id: string }).id;
  }

  return "";
}

function createDemoId(): () => string {
  let next = 0;

  return () => {
    next += 1;
    return `todo-native:${next}`;
  };
}

Object.assign(globalThis, {
  TsZeroTodoNative: {
    receive,
    start,
  },
});
