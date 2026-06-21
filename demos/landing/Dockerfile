FROM oven/bun:1 AS deps
WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages ./packages
COPY demos/landing/package.json ./demos/landing/package.json
RUN bun install

FROM deps AS build
COPY demos/landing ./demos/landing
RUN bun run build
RUN cd demos/landing && bun run build:server && bun run build:client

FROM oven/bun:1 AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV TODO_DB=/data/todo.sqlite

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/demos/landing/package.json ./demos/landing/package.json
COPY --from=build /app/demos/landing/dist ./demos/landing/dist

WORKDIR /app/demos/landing
EXPOSE 3000
VOLUME ["/data"]
CMD ["bun", "dist/web/server/bun.js"]
