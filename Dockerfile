# Le serveur n'emploie que les modules natifs de Node ; aucun outil de build
# ou dépendance de développement ne participe à son fonctionnement en ligne.
FROM node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402
WORKDIR /app
COPY . .
RUN mkdir -p /app/depots /app/assets/review
ENV PORT=3000
EXPOSE 3000
CMD ["node", "servir.mjs", "3000"]
