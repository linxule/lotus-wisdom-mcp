FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . ./

# Build the application
RUN npm run build

# Command to run the server
CMD ["node", "dist/bundle.js"] 