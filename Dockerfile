# ─────────────────────────────────────────────
# Stage 1 – Build the Vite (React) application
# ─────────────────────────────────────────────
FROM node:18-alpine AS build

WORKDIR /app

# 1️⃣ Copy dependency manifests & install once
COPY package*.json ./
RUN npm ci --legacy-peer-deps          # deterministic install

# 2️⃣ Copy the rest of the source tree
COPY . .

# 3️⃣ Inject required frontend env-var
ARG VITE_CONVEX_URL
ENV VITE_CONVEX_URL=$VITE_CONVEX_URL

# 4️⃣ Generate Convex client types so Vite can import them
RUN npx --yes convex@latest codegen    # produces convex/_generated/*

# 5️⃣ Build the production bundle
RUN npm run build                      # outputs to /app/dist

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
