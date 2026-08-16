#!/bin/bash
# SENZO MD — Railway start script
echo "Installing dependencies..."
npm install --no-audit --no-fund
echo "Starting SENZO MD..."
node index.js
