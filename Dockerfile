# ─────────────────────────────────────────────
# Stage 1 – Build the Vite (React) application
# ─────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# 1  Install dependencies deterministically
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# 2  Copy source
COPY . .

# 3  Expose required frontend env var
ARG VITE_CONVEX_URL
ENV VITE_CONVEX_URL=$VITE_CONVEX_URL

# 4  Convex deploy key for authentication (passed as build arg, not stored in final image)
ARG CONVEX_DEPLOY_KEY

# 5  Extract CONVEX_DEPLOYMENT from VITE_CONVEX_URL and generate Convex client types
#    Convex URL format: https://deployment-name.convex.cloud or https://deployment-name.convex.site
RUN if [ -n "${VITE_CONVEX_URL:-}" ] && [ -n "${CONVEX_DEPLOY_KEY:-}" ] && [ "${CONVEX_DEPLOY_KEY}" != "" ]; then \
      CONVEX_DEPLOYMENT=$(echo "$VITE_CONVEX_URL" | sed -E 's|https?://([^.]+)\..*|\1|'); \
      export CONVEX_DEPLOYMENT; \
      export CONVEX_DEPLOY_KEY="${CONVEX_DEPLOY_KEY}"; \
      echo "Running convex codegen for deployment: $CONVEX_DEPLOYMENT"; \
      npx --yes convex@latest codegen; \
    else \
      echo "Warning: VITE_CONVEX_URL or CONVEX_DEPLOY_KEY not set, skipping convex codegen"; \
      echo "VITE_CONVEX_URL=${VITE_CONVEX_URL:-<empty>}"; \
      echo "CONVEX_DEPLOY_KEY=${CONVEX_DEPLOY_KEY:-<empty>}"; \
    fi

# 6  Build the production bundle
RUN npm run build                            # writes to /app/dist

# ─────────────────────────────────────────────
# Stage 2 – Serve with Nginx (small final image)
# ─────────────────────────────────────────────
FROM nginx:1.21.6-alpine

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Provide a templated Nginx config (uses $PORT)
COPY nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 8080
ENV PORT=8080

# Render template → run Nginx
CMD ["sh", "-c", "envsubst '$$PORT' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
