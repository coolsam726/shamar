# Shamar monorepo — playground app image
# Targets: development | production

FROM node:22-bookworm-slim AS base
WORKDIR /workspace

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable \
  && corepack prepare pnpm@9.15.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/playground/package.json ./apps/playground/
COPY packages/core/package.json ./packages/core/
COPY packages/adonis/package.json ./packages/adonis/
COPY packages/lucid/package.json ./packages/lucid/
COPY packages/mongoose/package.json ./packages/mongoose/

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter './packages/*' build


FROM base AS development
ENV NODE_ENV=development
ENV HOST=0.0.0.0
ENV PORT=3333
EXPOSE 3333
CMD ["pnpm", "--filter", "@shamar/playground", "dev"]


FROM base AS production
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3333

RUN pnpm --filter @shamar/playground exec node ace build --ignore-ts-errors

WORKDIR /workspace/apps/playground/build
EXPOSE 3333
CMD ["node", "bin/server.js"]
