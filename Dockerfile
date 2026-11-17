FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN npm ci --ignore-scripts --legacy-peer-deps
COPY client client
COPY server server
COPY shared shared
COPY content content
ARG VITE_ADMIN_PATH=/pms-control-room
ENV VITE_ADMIN_PATH=$VITE_ADMIN_PATH
RUN npm run build --prefix client

FROM build AS test
CMD ["npm", "test"]

FROM node:22-bookworm-slim AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/client/package.json client/package.json
COPY --from=build /app/server/package.json server/package.json
RUN npm ci --omit=dev --ignore-scripts --legacy-peer-deps
COPY --from=build /app/server/src server/src
COPY --from=build /app/shared shared
COPY --from=build /app/content content
COPY --from=build /app/client/dist client/dist
RUN mkdir -p server/uploads server/backups && chown -R node:node server/uploads server/backups
USER node
EXPOSE 5000
CMD ["node", "server/src/index.js"]
