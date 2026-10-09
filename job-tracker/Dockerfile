# Stage 1: Dependencies cache layer
FROM node:20.18.0-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Testing target (executable via: docker build --target test .)
FROM deps AS test
COPY . .
RUN npm test -- --watch=false

# Stage 3: Production-optimized Docker build
FROM deps AS builder
COPY . .
RUN npm run build:docker && \
    if grep -rq "job-tracker-api-72bt.onrender.com" dist/job-tracker/browser; then \
      echo "ERROR: Render production API URL detected in docker build bundle!" && exit 1; \
    fi

# Stage 4: Unprivileged runtime web server
FROM nginxinc/nginx-unprivileged:alpine-slim AS runtime
COPY --from=builder /app/dist/job-tracker/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
