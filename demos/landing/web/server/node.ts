import { serve } from "@ts-zero/node-server";

import { app } from "./app.js";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const hostname = process.env.HOST ?? "127.0.0.1";

serve({
  fetch: app.fetch,
  port,
  hostname,
  onListen: ({ port: activePort, hostname: activeHostname }: { readonly port: number; readonly hostname: string }) => {
    console.log(`Landing demo listening on http://${activeHostname}:${activePort}`);
  },
});
