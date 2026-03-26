# Stage 1: build React app
FROM node:20-alpine AS build

WORKDIR /app

COPY frontend/package*.json ./
RUN npm install

COPY frontend/public ./public
COPY frontend/src ./src
RUN npm run build

# Stage 2: serve with nginx
FROM nginx:1.27-alpine

# Custom nginx config (SPA fallback + reverse proxy + cache)
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy build artifacts
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
