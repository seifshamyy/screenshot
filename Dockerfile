# Use official Puppeteer image (Includes Chrome + Node)
FROM ghcr.io/puppeteer/puppeteer:22.6.0

# Set working directory inside the container
WORKDIR /usr/src/app

# Copy package definitions
COPY package*.json ./

# Install dependencies
# PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true prevents downloading Chrome again
# because the base image already has it installed.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

RUN npm ci

# Copy the rest of the application code
COPY . .

# Expose the port (Documentary only, Railway overrides this)
EXPOSE 3000

# Start the app
CMD [ "node", "server.js" ]
