# Atrium Hosting: linux/amd64, PORT=8080, ATRIUM_DATA_DIR=/data, UID 65532
# Image name: atrium-apps/lettings-advice
FROM --platform=linux/amd64 node:22-bookworm-slim AS build
WORKDIR /src
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY tsconfig.json tsconfig.build.json ./
COPY manifest.example.json ./
COPY design ./design
COPY src ./src
RUN npm run build \
  && mkdir /data \
  && find dist -name '*.test.*' -delete

FROM --platform=linux/amd64 gcr.io/distroless/nodejs22-debian12:nonroot
WORKDIR /app
COPY --from=build /src/package.json ./
COPY --from=build /src/dist/src ./dist
COPY --from=build /src/dist/design ./design
COPY --from=build /src/manifest.example.json ./manifest.example.json
COPY --from=build --chown=65532:65532 /data /data
ENV PORT=8080
ENV ATRIUM_DATA_DIR=/data
USER nonroot:nonroot
EXPOSE 8080
CMD ["dist/index.js"]
