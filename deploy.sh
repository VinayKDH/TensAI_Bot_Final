#!/bin/bash

# TensAI Teams Chatbot Deployment Script
# This script helps deploy the bot to production

echo "🚀 TensAI Teams Chatbot Deployment Script"
echo "=========================================="

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    echo "📝 Please create .env file with your configuration:"
    echo "   cp PRODUCTION_CONFIG.md .env"
    echo "   nano .env"
    echo ""
    echo "Required variables:"
    echo "   MICROSOFT_APP_PASSWORD=your-bot-password"
    echo "   TENSAI_API_KEY=your-api-key"
    exit 1
fi

# Check if required environment variables are set
if ! grep -q "MICROSOFT_APP_PASSWORD=" .env || ! grep -q "TENSAI_API_KEY=" .env; then
    echo "❌ Missing required environment variables!"
    echo "📝 Please update .env file with:"
    echo "   MICROSOFT_APP_PASSWORD=your-bot-password"
    echo "   TENSAI_API_KEY=your-api-key"
    exit 1
fi

echo "✅ Environment configuration found"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Run tests
echo "🧪 Running tests..."
npm test

if [ $? -ne 0 ]; then
    echo "❌ Tests failed"
    exit 1
fi

echo "✅ All tests passed"
echo ""

# Start the bot
echo "🚀 Starting TensAI Teams Chatbot..."
echo "📍 Bot will be available at: https://dev2.tens-ai.com"
echo "📍 Messaging endpoint: https://dev2.tens-ai.com/api/messages"
echo ""
echo "Press Ctrl+C to stop the bot"
echo ""

npm start
