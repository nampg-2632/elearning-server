# syntax=docker/dockerfile:1

# Keep in sync with .nvmrc. Debian slim (glibc) so argon2 uses its prebuilt
# binary (argon2 supports Node >= 22) instead of compiling.
ARG NODE_VERSION=24.22.2

FROM node:${NODE_VERSION}-bookworm-slim AS base
WORKDIR /app
ENV HUSKY=0

# All dependencies, to build and for local development. The yarn cache is
# locked because deps and prod-deps install in parallel and yarn 1 cannot
# share it.
FROM base AS deps
COPY package.json yarn.lock ./
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn,sharing=locked \
    yarn install --frozen-lockfile

# Local development: docker-compose.yml bind-mounts the source over /app and
# keeps this image's node_modules (Linux binaries) in a volume.
FROM deps AS dev
EXPOSE 3000
CMD ["yarn", "start:dev"]

FROM deps AS build
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN yarn build

# Runtime dependencies only. --ignore-scripts skips the husky "prepare"
# script (husky is a dev dependency); argon2 still loads its prebuilt binary.
FROM base AS prod-deps
COPY package.json yarn.lock ./
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn,sharing=locked \
    yarn install --frozen-lockfile --production --ignore-scripts

FROM base AS runner
ENV NODE_ENV=production
COPY --chown=node:node package.json ./
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
USER node
EXPOSE 3000
# The slim image has no curl; Node ships fetch.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD ["node", "-e", "fetch(`http://127.0.0.1:${process.env.PORT ?? 3000}/health/live`).then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "dist/main"]
