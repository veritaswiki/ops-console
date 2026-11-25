FROM node:22-alpine

LABEL org.opencontainers.image.title="Ops Console" \
      org.opencontainers.image.description="Self-Hostable Architecture, Service, Memory & Log Control Plane" \
      org.opencontainers.image.version="0.3.0" \
      org.opencontainers.image.licenses="MIT"

WORKDIR /app

RUN addgroup -S ops && adduser -S -G ops ops \
  && mkdir -p /app/data /etc/ops-console \
  && chown -R ops:ops /app/data /etc/ops-console

COPY package.json ops-console.config.example.json ./
COPY bin ./bin
COPY src ./src
COPY public ./public
COPY probe ./probe

RUN chown -R ops:ops /app

ENV NODE_ENV=production \
    OPS_CONSOLE_HOSTS=0.0.0.0 \
    OPS_CONSOLE_PORT=4320 \
    OPS_CONSOLE_DATA_DIR=/app/data

USER ops

EXPOSE 4320

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.OPS_CONSOLE_PORT || 4320) + '/api/ping').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "bin/ops-console.mjs"]
