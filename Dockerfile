# Le serveur n'emploie que les modules natifs de Node ; aucun outil de build
# ou dépendance de développement ne participe à son fonctionnement en ligne.
FROM node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402
WORKDIR /app
COPY . .
RUN mkdir -p /app/depots /app/assets/review
ENV PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 CMD ["node", "--input-type=module", "-e", "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "servir.mjs", "3000"]
