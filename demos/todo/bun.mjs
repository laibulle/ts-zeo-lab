import { serve } from "@ts-zero/bun-server";

import { app } from "./app.mjs";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);

serve({
  fetch: app.fetch,
  port,
  hostname: "127.0.0.1",
  onListen: ({ port: activePort }) => {
    console.log(`Todo demo listening on http://localhost:${activePort}`);
  },
});
