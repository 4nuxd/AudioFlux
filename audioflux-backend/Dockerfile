# -----------------------------------
# 1. Builder image
# -----------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    ca-certificates \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    pkgconfig

# Copy only package.json (no lock file)
COPY package.json ./

# Install dependencies
RUN npm install --omit=dev --legacy-peer-deps

# Copy source
COPY . .

# -----------------------------------
# 2. Runner
# -----------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache \
    cairo \
    jpeg \
    pango \
    giflib \
    pixman \
    pangomm \
    libjpeg-turbo \
    freetype

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app /app

USER appuser

EXPOSE 3000
CMD ["node", "server.js"]
