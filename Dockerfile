# ==============================================================================
# HOTEL CONTRACT MANAGER - PRODUCTION DOCKERFILE
# Multi-stage production build for Node.js + Express + React SPA
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build stage
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies needed for compiling
COPY package*.json ./
RUN npm ci

# Copy source code and build tools
COPY tsconfig*.json vite.config.ts index.html ./
COPY src/ ./src/
COPY public/ ./public/
COPY server.ts ./

# Run production build (Vite frontend + esbuild backend bundle -> dist/)
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production runtime stage
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production-only dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled production artifacts from builder stage
COPY --from=builder /app/dist ./dist

# Create persistent storage directories with appropriate ownership
RUN mkdir -p /app/data /app/uploads/contracts && \
    chown -R node:node /app/data /app/uploads

# Run as non-privileged node user for security hardening
USER node

# Expose HTTP port
EXPOSE 3000

# Container healthcheck querying the lightweight public /api/health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); const req = http.request('http://localhost:' + (process.env.PORT || 3000) + '/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)); req.on('error', () => process.exit(1)); req.end();"

# Start production server
CMD ["npm", "start"]
