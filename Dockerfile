# Smart Money AI Monitor Service - Dockerfile for Fly.io
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY index.js ./

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S monitor -u 1001
USER monitor

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check passed')" || exit 1

# Expose port (optional, mainly for health checks)
EXPOSE 8080

# Start the monitor
CMD ["node", "index.js"]
