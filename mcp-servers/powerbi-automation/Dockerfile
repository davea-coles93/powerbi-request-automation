FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    && rm -rf /var/lib/apt/lists/*

# Copy everything
COPY . .

# Install Python package
RUN pip install --no-cache-dir -e .

# Run the MCP server via stdio
CMD ["python", "-m", "powerbi_automation_mcp.server"]
