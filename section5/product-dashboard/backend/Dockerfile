FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY package*.json ./

USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O - http://127.0.0.1:5000/health >/dev/null || exit 1

CMD ["npm", "start"]
