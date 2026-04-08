FROM node:20-alpine AS deps

WORKDIR /app

COPY frontend/package*.json ./
RUN npm install && npm cache clean --force

FROM node:20-alpine AS build

WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY frontend/package*.json ./
COPY frontend/public ./public
COPY frontend/src ./src

RUN npm run build

FROM nginx:1.27-alpine AS production

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

RUN mkdir -p /tmp/nginx/client_temp /tmp/nginx/proxy_temp /var/cache/nginx /var/run \
  && sed -Ei 's|^[[:space:]]*pid[[:space:]]+.+;|pid /tmp/nginx.pid;|' /etc/nginx/nginx.conf \
  && chown -R nginx:nginx /tmp/nginx /var/cache/nginx /var/run /usr/share/nginx/html /etc/nginx/conf.d

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O - http://127.0.0.1:8080/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
