FROM node:20-alpine

WORKDIR /app

# Copy everything
COPY . .

# Install dependencies (skip prepare script if any)
RUN npm ci --ignore-scripts

# Build TypeScript
RUN npm run build

# Run the MCP server via stdio
CMD ["node", "build/index.js"]
