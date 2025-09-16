# TensAI Bot Deployment Architecture

## Overview

The TensAI Bot is designed as a **Teams Bot Service** that acts as a conversational interface to various AI-powered modules. It follows a **microservices architecture** where the bot handles user interactions and delegates specific tasks to dedicated API services.

## Architecture Components

### 1. **Teams Bot Service** (This Application)
- **Purpose**: Conversational interface and user interaction handling
- **Technology**: Node.js + Microsoft Teams AI SDK
- **Deployment**: Azure App Service or similar cloud platform
- **Port**: 3978 (default Teams bot port)

### 2. **Backend API Services** (Separate Applications)
- **WebGPT API**: Chat and conversation management
- **Media Studio API**: Image/video/audio generation
- **Translator API**: Language translation services
- **Summarizer API**: Text summarization
- **OmniQuest API**: Multi-purpose AI tasks

## How API Calls Work

### Current Implementation

```javascript
// When user selects a module (e.g., WebGPT)
const apiResponse = await this.apiService.callModuleAPI(moduleName, {
  message: `User selected ${moduleName}`,
  action: 'initialize'
}, userId);
```

### API Call Flow

1. **User Interaction**: User selects a module in Teams
2. **Bot Processing**: Bot receives the selection via Teams Bot Framework
3. **API Service**: Bot calls the appropriate backend API
4. **Response Handling**: Bot formats the API response into Teams adaptive cards
5. **User Feedback**: User can provide feedback (thumbs up/down)

### API Service Features

- **Retry Logic**: Automatic retry with exponential backoff
- **Timeout Handling**: Configurable timeouts per module
- **Error Handling**: Graceful error messages for users
- **Request Tracking**: Unique request IDs for debugging
- **Health Checks**: Module availability monitoring

## Deployment Options

### Option 1: Separate Bot and API Services (Recommended)

```
┌─────────────────┐    HTTP/HTTPS    ┌─────────────────┐
│   Teams Bot     │ ──────────────── │   WebGPT API    │
│   (Azure App)   │                  │   (Azure App)   │
└─────────────────┘                  └─────────────────┘
         │                                    │
         │                                    │
         ▼                                    ▼
┌─────────────────┐                  ┌─────────────────┐
│   Media Studio  │                  │   Translator    │
│   API           │                  │   API           │
└─────────────────┘                  └─────────────────┘
```

**Advantages:**
- Independent scaling
- Separate deployment cycles
- Better fault isolation
- Technology flexibility per service

### Option 2: Monolithic Deployment

```
┌─────────────────────────────────────────────────────┐
│              Single Azure App Service               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │ Teams Bot   │  │ WebGPT API  │  │ Other APIs  │  │
│  │ Logic       │  │ Endpoints   │  │ Endpoints   │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────┘
```

**Advantages:**
- Simpler deployment
- Single codebase
- Easier local development

**Disadvantages:**
- Harder to scale individual components
- Single point of failure
- Technology lock-in

## Environment Configuration

### Bot Environment Variables

```bash
# Bot Configuration
MICROSOFT_APP_ID=your-bot-app-id
MICROSOFT_APP_PASSWORD=your-bot-password
MICROSOFT_APP_TENANT_ID=your-tenant-id

# API Endpoints
VITE_WEBGPT_GET_CHATS=https://webgpt-api.azurewebsites.net/getChats
VITE_IMAGE_GENERATION_ENDPOINT=https://media-api.azurewebsites.net/generate-image
VITE_TRANSLATE_API_URL=https://translator-api.azurewebsites.net/translate
VITE_WEBCHAT_ENDPOINT=https://summarizer-api.azurewebsites.net/api/webchat
VITE_OMNIQUEST=https://omni-api.azurewebsites.net/omniQuest

# Optional: Cosmos DB for conversation state
COSMOS_DB_ENDPOINT=https://your-cosmos.documents.azure.com:443/
COSMOS_DB_KEY=your-cosmos-key
```

## Deployment Steps

### 1. Deploy Backend APIs First

```bash
# Deploy each API service to Azure App Service
# Example for WebGPT API
az webapp deployment source config-zip \
  --resource-group your-rg \
  --name webgpt-api \
  --src webgpt-api.zip
```

### 2. Deploy Teams Bot

```bash
# Deploy bot to Azure App Service
az webapp deployment source config-zip \
  --resource-group your-rg \
  --name tensai-bot \
  --src bot-app.zip
```

### 3. Configure Bot Registration

```bash
# Register bot in Azure Bot Service
az bot create \
  --resource-group your-rg \
  --name tensai-bot \
  --appid your-bot-app-id \
  --password your-bot-password
```

## API Integration Patterns

### 1. **Synchronous API Calls** (Current)
- Bot waits for API response
- Good for quick operations
- User sees loading state

### 2. **Asynchronous API Calls** (Future Enhancement)
- Bot initiates API call and returns immediately
- Uses webhooks for results
- Better for long-running operations

### 3. **Streaming Responses** (Future Enhancement)
- Real-time response streaming
- Good for chat-like interactions
- Requires WebSocket or Server-Sent Events

## Security Considerations

### 1. **API Authentication**
```javascript
// Add API keys to requests
headers: {
  "Authorization": `Bearer ${process.env.API_KEY}`,
  "X-API-Key": process.env.API_SECRET
}
```

### 2. **HTTPS Only**
- All API calls must use HTTPS
- Teams requires HTTPS for bot endpoints

### 3. **Rate Limiting**
- Implement rate limiting per user
- Use Azure API Management for enterprise scenarios

## Monitoring and Logging

### 1. **Application Insights**
```javascript
// Add to bot for telemetry
const appInsights = require('applicationinsights');
appInsights.setup(process.env.APPINSIGHTS_INSTRUMENTATIONKEY);
```

### 2. **Structured Logging**
```javascript
// Log API calls with context
console.log(`[API] ${moduleName} call for user ${userId}: ${response.status}`);
```

## Scaling Considerations

### 1. **Horizontal Scaling**
- Multiple bot instances behind load balancer
- Stateless bot design (use external storage for state)

### 2. **API Rate Limits**
- Monitor API usage per module
- Implement circuit breakers for failing APIs

### 3. **Caching**
- Cache frequently accessed data
- Use Redis for session state

## Development Workflow

### 1. **Local Development**
```bash
# Start bot locally
npm run dev:teamsfx:testtool

# Start individual API services
cd webgpt-api && npm start
cd media-api && npm start
```

### 2. **Testing**
```bash
# Run bot tests
npm test

# Test API integrations
npm run test:integration
```

### 3. **Deployment Pipeline**
```yaml
# Azure DevOps pipeline example
- stage: DeployAPIs
  jobs:
  - job: DeployWebGPT
    steps:
    - task: AzureWebApp@1
      inputs:
        appName: 'webgpt-api'
        
- stage: DeployBot
  dependsOn: DeployAPIs
  jobs:
  - job: DeployBot
    steps:
    - task: AzureWebApp@1
      inputs:
        appName: 'tensai-bot'
```

## Conclusion

The TensAI Bot follows a **service-oriented architecture** where:

1. **Bot handles user interactions** and provides a conversational interface
2. **Backend APIs handle specific AI tasks** and business logic
3. **Communication happens via HTTP/HTTPS** with proper error handling
4. **Each service can be deployed and scaled independently**

This architecture provides flexibility, maintainability, and scalability while keeping the bot focused on its core responsibility: providing an excellent user experience in Microsoft Teams.
