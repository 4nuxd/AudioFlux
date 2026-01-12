#!/bin/bash

# Install dependencies
npm install

# Build if needed (none for this app)

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 config
pm2 save

# Set up PM2 to start on boot
pm2 startup

echo "Deployment complete. Backend running on port 3001."
