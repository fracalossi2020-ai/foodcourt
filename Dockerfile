FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY Backend/package*.json ./
RUN npm ci --omit=dev
COPY frontend ./frontend
COPY Backend/src ./Backend/src

RUN mkdir -p /data && chown -R node:node /app /data
USER node

ENV PORT=3000 FC_DB_PATH=/data/foodcourt-db.json
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "Backend/src/server.js"]
