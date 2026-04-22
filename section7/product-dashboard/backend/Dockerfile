FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

FROM deps AS test

COPY package*.json ./
RUN npm install

COPY src ./src
COPY tests ./tests

RUN npm test

FROM node:20-alpine AS production

ARG BUILD_DATE
ARG VERSION
ARG NODE_ENV=production

WORKDIR /app

ENV NODE_ENV=${NODE_ENV}

LABEL org.opencontainers.image.created="${BUILD_DATE}" \
  org.opencontainers.image.version="${VERSION}" \
  org.opencontainers.image.title="product-dashboard-backend"

COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY package*.json ./

USER node


HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O - http://127.0.0.1:3000/health >/dev/null || wget -q -O - http://127.0.0.1:3001/health >/dev/null || exit 1

CMD ["npm", "start"]
