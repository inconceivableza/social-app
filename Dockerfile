FROM node:20-alpine3.22 as build-node

RUN corepack enable

WORKDIR /usr/src/atproto

COPY --from=atproto /package.json ./
RUN corepack prepare --activate

COPY --from=atproto ./tsconfig ./tsconfig
COPY --from=atproto ./packages/api/package.json ./packages/api/package.json
COPY --from=atproto ./packages/common-web/package.json ./packages/common-web/package.json
COPY --from=atproto ./packages/syntax/package.json ./packages/syntax/package.json
COPY --from=atproto ./packages/lexicon/package.json ./packages/lexicon/package.json
COPY --from=atproto ./packages/xrpc/package.json ./packages/xrpc/package.json
COPY --from=atproto ./package.json ./package.json
COPY --from=atproto ./pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=atproto ./pnpm-workspace.yaml ./pnpm-workspace.yaml

RUN pnpm install --frozen-lockfile

# COPY --from=atproto / .

COPY --from=atproto ./*.js* ./
# NOTE api's transitive dependencies go here: if that changes, this needs to be updated.
COPY --from=atproto ./tsconfig ./tsconfig
COPY --from=atproto ./packages/api ./packages/api
COPY --from=atproto ./packages/common-web ./packages/common-web
COPY --from=atproto ./packages/syntax ./packages/syntax
COPY --from=atproto ./packages/lexicon ./packages/lexicon
COPY --from=atproto ./packages/xrpc ./packages/xrpc
# build all packages with external node_modules
RUN pnpm build
# clean up
# RUN rm -rf node_modules
# install only prod deps, hoisted to root node_modules dir
# RUN pnpm install --prod --shamefully-hoist --frozen-lockfile --prefer-offline > /dev/null

WORKDIR /usr/src/social-app

# The latest git hash of the preview branch on render.com
# https://render.com/docs/docker-secrets#environment-variables-in-docker-builds
ARG RENDER_GIT_COMMIT

#
# Expo
#
ARG EXPO_PUBLIC_ENV
ENV EXPO_PUBLIC_ENV=${EXPO_PUBLIC_ENV:-development}
ARG EXPO_PUBLIC_RELEASE_VERSION
ENV EXPO_PUBLIC_RELEASE_VERSION=$EXPO_PUBLIC_RELEASE_VERSION
ARG EXPO_PUBLIC_BUNDLE_IDENTIFIER
# If not set by GitHub workflows, we're probably in Render
ENV EXPO_PUBLIC_BUNDLE_IDENTIFIER=${EXPO_PUBLIC_BUNDLE_IDENTIFIER:-$RENDER_GIT_COMMIT}

#
# Sentry
#
ARG SENTRY_AUTH_TOKEN
ENV SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN:-unknown}
ARG EXPO_PUBLIC_SENTRY_DSN
ENV EXPO_PUBLIC_SENTRY_DSN=$EXPO_PUBLIC_SENTRY_DSN
# MERGE TODO: SENTRY parameter passing
# Will fall back to package.json#version, but this is handled elsewhere
ARG SENTRY_RELEASE
ENV SENTRY_RELEASE=$SENTRY_RELEASE
# sentry org and project for webpack source maps
ARG SENTRY_ORG
ENV SENTRY_ORG=$SENTRY_ORG
ARG SENTRY_PROJECT
ENV SENTRY_PROJECT=$SENTRY_PROJECT
# can override NODE_ENV to specify the environment, if present
ARG SENTRY_ENVIRONMENT
ENV SENTRY_ENVIRONMENT=$SENTRY_ENVIRONMENT

# statsig client api key
ARG EXPO_PUBLIC_STATSIG_CLIENT_KEY
ARG EXPO_PUBLIC_STATSIG_CLIENT_KEY=$EXPO_PUBLIC_STATSIG_CLIENT_KEY
ARG EXPO_PUBLIC_STATSIG_API_URL
ARG EXPO_PUBLIC_STATSIG_API_URL=$EXPO_PUBLIC_STATSIG_API_URL

RUN echo "Using bundle identifier: $EXPO_PUBLIC_BUNDLE_IDENTIFIER" && \
  echo "EXPO_PUBLIC_BUNDLE_IDENTIFIER=$EXPO_PUBLIC_BUNDLE_IDENTIFIER" >> .env && \
  echo "EXPO_PUBLIC_BUNDLE_DATE=$(date -u +"%y%m%d%H")" >> .env

#
# Node
#
ENV NODE_VERSION=20
ENV NVM_DIR=/usr/share/nvm

COPY ./package.json ./package.json
COPY ./yarn.lock ./yarn.lock
COPY ./lingui.config.js ./lingui.config.js
COPY ./scripts/ ./scripts

RUN corepack prepare --activate

RUN yarn
#
# Copy everything into the container
#
COPY . .

#
# Generate the JavaScript webpack.
#

RUN echo "Using bundle identifier: $EXPO_PUBLIC_BUNDLE_IDENTIFIER" && \
  echo "EXPO_PUBLIC_ENV=$EXPO_PUBLIC_ENV" >> .env && \
  echo "EXPO_PUBLIC_RELEASE_VERSION=$EXPO_PUBLIC_RELEASE_VERSION" >> .env && \
  echo "EXPO_PUBLIC_BUNDLE_IDENTIFIER=$EXPO_PUBLIC_BUNDLE_IDENTIFIER" >> .env && \
  echo "EXPO_PUBLIC_BUNDLE_DATE=$(date -u +"%y%m%d%H")" >> .env && \
  echo "EXPO_PUBLIC_SENTRY_DSN=$EXPO_PUBLIC_SENTRY_DSN" >> .env && \
  yarn intl:build 2>&1 | tee i18n.log && \
  if grep -q "invalid syntax" "i18n.log"; then echo "\n\nFound compilation errors!\n\n" && exit 1; else echo "\n\nNo compile errors!\n\n"; fi && \
  SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN SENTRY_RELEASE=$EXPO_PUBLIC_RELEASE_VERSION SENTRY_DIST=$EXPO_PUBLIC_BUNDLE_IDENTIFIER yarn build-web

FROM golang:1.24-bullseye AS build-env

WORKDIR /usr/src/social-app

COPY --from=build-node /usr/src/social-app/web-build /usr/src/social-app/web-build
COPY --from=build-node /usr/src/social-app/bskyweb /usr/src/social-app/bskyweb

ENV DEBIAN_FRONTEND=noninteractive

#
# Go
#
ENV GODEBUG="netdns=go"
ENV GOOS="linux"
ENV GOARCH="amd64"
ENV CGO_ENABLED=1
ENV GOEXPERIMENT="loopvar"

#
# Generate the bskyweb Go binary.
#
RUN cd bskyweb/ && \
  go mod download && \
  go mod verify

RUN cd bskyweb/ && \
  go build \
    -v  \
    -trimpath \
    -tags timetzdata \
    -o /bskyweb \
    ./cmd/bskyweb

FROM debian:bullseye-slim

ENV GODEBUG=netdns=go
ENV TZ=Etc/UTC
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install --yes \
  dumb-init \
  curl \
  ca-certificates

ENTRYPOINT ["dumb-init", "--"]

WORKDIR /bskyweb
COPY --from=build-env /bskyweb /usr/bin/bskyweb

CMD ["/usr/bin/bskyweb"]

LABEL org.opencontainers.image.source=https://github.com/bluesky-social/social-app
LABEL org.opencontainers.image.description="bsky.app Web App"
LABEL org.opencontainers.image.licenses=MIT

# NOOP
