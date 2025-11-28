# syntax = docker/dockerfile:1.4

ARG NODE_VERSION=22

FROM --platform=$TARGETPLATFORM node:${NODE_VERSION}-slim AS base

ARG UID="991"
ARG GID="991"

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
 libmimalloc-dev libmimalloc2.0 \
 && ln -s /usr/lib/$(uname -m)-linux-gnu/libmimalloc.so.2 /usr/local/lib/libmimalloc.so \
 && groupadd -g "${GID}" media-proxy \
 && useradd -l -u "${UID}" -g "${GID}" -m -d /app media-proxy \
 && find / -type d -path /sys -prune -o -type d -path /proc -prune -o -type f -perm /u+s -ignore_readdir_race -exec chmod u-s {} \; \
 && find / -type d -path /sys -prune -o -type d -path /proc -prune -o -type f -perm /g+s -ignore_readdir_race -exec chmod g-s {} \; \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists \
 && npm install -g pnpm

FROM base AS build

WORKDIR /app
COPY . ./
RUN pnpm i --frozen-lockfile --aggregate-output \
 && NODE_ENV=production pnpm run build

FROM base AS runtime

USER media-proxy
WORKDIR /app
COPY --chown=media-proxy:media-proxy . ./
COPY --from=build --chown=media-proxy:media-proxy /app/built ./built
COPY --from=build --chown=media-proxy:media-proxy /app/server.mjs ./

ENV NODE_ENV=production
RUN pnpm i --frozen-lockfile --aggregate-output

ENV LD_PRELOAD=/usr/local/lib/libmimalloc.so
ENV MIMALLOC_LARGE_OS_PAGES=0

CMD ["pnpm", "run", "start"]

EXPOSE 3000
