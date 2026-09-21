# Runtime image for the Express app. Node 16 to match the pipeline's build agent.
# (Node 16 is end-of-life - accepted because the brief mandates it; see report.)
FROM node:16-alpine

WORKDIR /app

# Copy manifests first so the dependency layer is cached unless they change.
COPY package.json package-lock.json ./
# Reproducible install from the lockfile, production dependencies only.
RUN npm ci --omit=dev

COPY app.js ./

# Run as the built-in unprivileged 'node' user, not root.
USER node

EXPOSE 8080
CMD ["node", "app.js"]
