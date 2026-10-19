# Build only the context emitted by outils/distribuer-entreprise.mjs.
# A company-bearing image is never used as an ancestor of this distribution.
FROM node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402
WORKDIR /app
COPY . .
RUN node outils/distribuer-entreprise.mjs --verifier . \
    && mkdir -p /app/depots /app/assets/review \
    && chown node:node /app/depots /app/assets/review \
    && chmod 700 /app/depots /app/assets/review
USER node
ENV PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --retries=12 CMD ["node", "--input-type=module", "-e", "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["sh", "-c", "node outils/preparer-entreprise.mjs && exec node servir.mjs 3000"]
