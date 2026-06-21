import { serve } from "@ts-zero/node-server";

import { app } from "./app.js";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);

serve({
  fetch: app.fetch,
  port,
  hostname: "127.0.0.1",
  onListen: ({ port: activePort }: { readonly port: number }) => {
    console.log(`Todo demo listening on http://localhost:${activePort}`);
  },
});
