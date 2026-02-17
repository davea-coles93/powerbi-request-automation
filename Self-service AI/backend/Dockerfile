FROM node:20-alpine

WORKDIR /app

# Install git and github CLI
RUN apk add --no-cache git github-cli

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Configure git (required for commits)
RUN git config --global user.name "PowerBI Automation Bot" && \
    git config --global user.email "automation@powerbi.local"

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]
