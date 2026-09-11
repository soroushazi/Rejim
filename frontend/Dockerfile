FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# One-shot: copies the built SPA into whatever's mounted at /output, then
# exits. No nginx - Caddy serves these files directly via file_server, and
# reverse-proxies /api/, /admin/, /static/, /media/ straight to gunicorn.
FROM alpine:latest
COPY --from=build /app/dist /dist
CMD ["sh", "-c", "rm -rf /output/* && cp -r /dist/. /output/ && echo 'frontend build copied to /output'"]
