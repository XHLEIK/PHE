FROM node:20-alpine AS base

# Install Python and pip
RUN apk add --no-cache python3 py3-pip

WORKDIR /app

# Install Node dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Install Python dependencies
COPY requirements.txt ./
RUN pip install --break-system-packages -r requirements.txt || pip install -r requirements.txt

# Copy source
COPY . .

# Development target
FROM base AS dev
ENV NODE_ENV=development
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Production build target
FROM base AS builder
ENV NODE_ENV=production
ARG MONGODB_URI
ARG JWT_ACCESS_SECRET
ARG JWT_REFRESH_SECRET
ARG RESEND_API_KEY
ARG UPSTASH_REDIS_REST_URL
ARG UPSTASH_REDIS_REST_TOKEN
ARG CLOUDINARY_CLOUD_NAME
ARG CLOUDINARY_API_KEY
ARG CLOUDINARY_API_SECRET
ARG GEMINI_API_KEY
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# Install Python and pip in the production image as well
RUN apk add --no-cache python3 py3-pip

# Copy Node standalone build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Python requirements and agent code
COPY requirements.txt ./
# For Python 3.11+ in alpine, --break-system-packages is often needed
RUN pip install --break-system-packages -r requirements.txt || pip install -r requirements.txt
COPY lib/agent.py ./lib/agent.py

# Install concurrently globally (or just use sh to run both)
RUN npm install -g concurrently

EXPOSE 3000
CMD ["concurrently", "\"node server.js\"", "\"python lib/agent.py dev\""]
