FROM node:18-bullseye-slim

# Install build tools required by better-sqlite3 (native C++ module)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        python3 \
        build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install server dependencies
COPY server/package*.json ./server/
RUN npm --prefix server install

# Install client dependencies
COPY client/package*.json ./client/
RUN npm --prefix client install

# Copy all source files
COPY . .

# Build the React frontend
RUN npm --prefix client run build

EXPOSE 3001

CMD ["node", "server/index.js"]
