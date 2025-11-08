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

# 4  Generate Convex client types so Vite can import them
RUN npx --yes convex@latest codegen          # ← **this is the missing step**

# 5  Build the production bundle
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
