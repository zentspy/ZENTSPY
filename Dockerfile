# ===========================================
# ZENT LAUNCHPAD - DOCKER IMAGE
# ===========================================

FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies first (for caching)
COPY package*.json ./
RUN npm ci --only=production

# Copy application files
COPY . .

# Create required directories
RUN mkdir -p uploads vanity data

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start the application
CMD ["npm", "start"]
