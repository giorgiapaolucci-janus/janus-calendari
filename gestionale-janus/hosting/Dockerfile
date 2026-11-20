FROM node:24-bookworm-slim
WORKDIR /app
COPY accessi-zoom.cjs accessi-zoom.json ./
COPY gestionale-janus/app ./gestionale-janus/app
COPY gestionale-janus/importazione ./gestionale-janus/importazione
COPY gestionale-janus/dati ./gestionale-janus/dati
COPY gestionale-janus/riservato/access.cjs ./gestionale-janus/riservato/access.cjs
COPY gestionale-janus/hosting/avvia.cjs ./gestionale-janus/hosting/avvia.cjs
COPY gestionale-janus/server.cjs gestionale-janus/store.cjs gestionale-janus/sheets.cjs gestionale-janus/integrations.cjs gestionale-janus/allineamento.cjs gestionale-janus/allineamento.json gestionale-janus/condivisione.cjs gestionale-janus/verifica-pubblicazione.cjs ./gestionale-janus/
RUN mkdir -p /var/lib/janus && chown node:node /var/lib/janus
USER node
ENV JANUS_MODE=condiviso JANUS_DATA_DIR=/var/lib/janus JANUS_PORT=8765
WORKDIR /app/gestionale-janus
CMD ["node","hosting/avvia.cjs"]
