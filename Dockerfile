FROM node:20-slim AS builder

WORKDIR /app

COPY ./ ./
RUN corepack enable \
 && pnpm i --frozen-lockfile --aggregate-output \
 && NODE_ENV=production pnpm run build

FROM node:20-slim

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./
RUN apt-get update \
 && apt-get install -yqq --no-install-recommends libjemalloc2 \
 && ln -s /usr/lib/$(uname -m)-linux-gnu/libjemalloc.so.2 /usr/local/lib/libjemalloc.so \
 && corepack enable \
 && pnpm i --frozen-lockfile --aggregate-output

ENV LD_PRELOAD=/usr/local/lib/libjemalloc.so

COPY --from=builder /app/built ./built
COPY --from=builder /app/server.js ./

CMD ["pnpm", "run", "start"]

EXPOSE 3000
