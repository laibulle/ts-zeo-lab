import { app } from "../demos/landing/dist/web/server/app.js";

export default {
  fetch(request: Request): Response | Promise<Response> {
    return app.fetch(request);
  },
};
