# 🤖 TensAI Teams Chatbot - Code Overview

## 📋 **Project Summary**

The TensAI Teams Chatbot is a sophisticated Microsoft Teams chatbot built with Node.js that integrates with multiple AI services. It provides 5 complete AI modules through a beautiful, user-friendly interface.

## 🏗️ **Architecture Overview**

### **Technology Stack**
- **Runtime**: Node.js with Express.js
- **Bot Framework**: Microsoft Bot Framework with Teams AI SDK
- **UI Framework**: Adaptive Cards with custom gradients
- **API Integration**: RESTful APIs with retry logic
- **Testing**: Jest test framework
- **Deployment**: Azure Bot Service integration

### **Project Structure**
```
TensAIBotFinal/
├── src/
│   ├── index.js                    # Main application entry point
│   ├── genericCommandHandler.js    # Core bot logic and conversation flows
│   ├── services/apiService.js      # API integration service
│   ├── teamsBot.js                 # Teams bot configuration
│   ├── helloworldCommandHandler.js # Hello world command handler
│   ├── adminCommandHandler.js      # Admin command handler
│   └── internal/                   # Internal utilities
│       ├── config.js               # Configuration management
│       ├── feedbackStore.js        # Feedback storage
│       └── initialize.js           # Bot initialization
├── appPackage/
│   ├── manifest.json               # Teams app manifest
│   ├── color.png                   # App icon (color)
│   └── outline.png                 # App icon (outline)
├── __tests__/                      # Test files
├── infra/                          # Infrastructure as code
├── env/                            # Environment configurations
└── Documentation files             # Comprehensive guides
```

## 🎯 **Core Components**

### **1. Main Application (`src/index.js`)**

The entry point that sets up the Express server and bot handlers:

```javascript
// Express server setup
const express = require("express");
const { GenericCommandHandler } = require("./genericCommandHandler");
const { adapter } = require("./internal/initialize");

// HTTP server creation
const expressApp = express();
expressApp.use(express.json());

const server = expressApp.listen(process.env.port || process.env.PORT || 3978, () => {
  console.log(`\nBot Started, ${expressApp.name} listening to`, server.address());
});

// Message handlers
app.message(genericCommandHandler.triggerPatterns, async (context, state) => {
  const reply = await genericCommandHandler.handleCommandReceived(context, state);
  await sendReply(context, reply);
});

// Submit action handlers for Adaptive Cards
app.activity("message", async (context, state) => {
  const v = context.activity.value;
  if (v && (v.module || v.__webgpt_query || v.__feedback || /* ... other actions */)) {
    const reply = await genericCommandHandler.handleCommandReceived(context, state);
    await sendReply(context, reply);
  }
});

// Bot Framework endpoint
expressApp.post("/api/messages", async (req, res) => {
  await adapter.process(req, res, async (context) => {
    await app.run(context);
  });
});
```

**Key Features:**
- **Express server** for HTTP handling
- **Message routing** for text and submit actions
- **Activity handling** for Adaptive Card interactions
- **File upload support** via `/upload` endpoint
- **Debug logging** for troubleshooting

### **2. Command Handler (`src/genericCommandHandler.js`)**

The brain of the bot that manages all conversation flows:

```javascript
class GenericCommandHandler {
  constructor() {
    this.apiService = new ApiService();
    this.triggerPatterns = new RegExp(/.*/); // Matches any message
  }

  async handleCommandReceived(context, state) {
    // Module selection handling
    if (context.activity.value && context.activity.value.module) {
      const moduleName = context.activity.value.module;
      
      switch (moduleName) {
        case "WebGPT":
          return this._createWebGPTQueryCard();
        case "Media Studio":
          return this._createMediaStudioOptionsCard();
        case "Translator":
          return this._createTranslatorOptionsCard();
        case "Summarizer":
          return this._createSummarizerInputCard();
        case "OmniQuest":
          return this._createOmniQuestOptionsCard();
        case "menu":
          return this._createMainMenuCard();
      }
    }

    // WebGPT query handling
    if (context.activity.value && context.activity.value.__webgpt_query) {
      const query = context.activity.value.__webgpt_query;
      try {
        const apiResponse = await this.apiService.callModuleAPI("WebGPT", {
          query: query,
          action: 'chat'
        }, context.activity.from?.id);
        return this._createWebGPTResponseCard(query, apiResponse);
      } catch (error) {
        return this._createWebGPTErrorCard(query, error);
      }
    }

    // Default: show main menu
    return this._createMainMenuCard();
  }
}
```

**Key Features:**
- **State management** for complex workflows
- **Module routing** for all 5 AI modules
- **API integration** through ApiService
- **Error handling** with user-friendly messages
- **Adaptive Card generation** with beautiful UI

### **3. API Service (`src/services/apiService.js`)**

Centralized API management with retry logic and error handling:

```javascript
class ApiService {
  constructor() {
    this.baseUrl = process.env.TENSAI_BASE_URL || 'http://localhost:5000';
    this.endpoints = {
      WebGPT: {
        url: `${this.baseUrl}/api/webchat`,
        method: 'POST',
        timeout: 15000,
        retries: 2
      },
      "Media Studio": {
        imageGeneration: `${this.baseUrl}/api/generate-image`,
        audioGeneration: `${this.baseUrl}/api/audiogen`,
        videoGeneration: `${this.baseUrl}/api/generate-video`,
        videoStatus: `${this.baseUrl}/api/video-status`,
        imageEdit: `${this.baseUrl}/api/edit-image`,
        upload: `${this.baseUrl}/api/upload`
      },
      Translator: {
        text: `${this.baseUrl}/api/translate`,
        document: `${this.baseUrl}/api/docTranslator`,
        upload: `${this.baseUrl}/api/upload`
      },
      Summarizer: {
        url: `${this.baseUrl}/api/webchat`
      },
      OmniQuest: {
        query: `${this.baseUrl}/api/omniQuest`,
        upload: `${this.baseUrl}/api/upload`,
        status: `${this.baseUrl}/api/status`
      }
    };
  }

  async callModuleAPI(moduleName, userInput = {}, userId = null) {
    // Build request body based on module and action
    let requestBody;
    let endpointUrl;
    
    if (moduleName === "WebGPT" && userInput.action === 'chat') {
      endpointUrl = endpoint.url;
      requestBody = {
        query: userInput.query || userInput.message,
        temperature: 0.7,
        history: userInput.history || []
      };
    }
    // ... other module handling

    // Retry logic with exponential backoff
    for (let attempt = 1; attempt <= endpoint.retries + 1; attempt++) {
      try {
        const response = await fetch(endpointUrl, {
          method: endpoint.method,
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "TensAI-Bot/1.0"
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const responseData = await response.json();
        return {
          success: true,
          data: responseData,
          module: moduleName,
          attempt: attempt,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        if (attempt <= endpoint.retries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
  }
}
```

**Key Features:**
- **Centralized endpoint management**
- **Retry logic** with exponential backoff
- **Error handling** and recovery
- **Request/response logging**
- **Timeout management**
- **File upload support**

### **4. Teams Bot Configuration (`src/teamsBot.js`)**

Teams-specific bot setup and conversation handling:

```javascript
const { MemoryStorage } = require("botbuilder");
const { Application } = require("@microsoft/teams-ai");

// Define storage and application
const storage = new MemoryStorage();
const app = new Application({
  storage,
  initial: {
    conversation: {
      omniQuest: {}, // Store OmniQuest state
      mediaStudio: {} // Store Media Studio state
    }
  }
});

// Handle conversation updates (auto-greeting)
app.activity("conversationUpdate", async (context, state) => {
  if (context.activity.membersAdded && context.activity.membersAdded.length > 0) {
    const botId = context.activity.recipient.id;
    const membersAdded = context.activity.membersAdded.filter(member => member.id !== botId);

    if (membersAdded.length > 0) {
      const genericHandler = new GenericCommandHandler();
      const welcomeMessage = genericHandler._createWelcomeCard();
      await context.sendActivity(welcomeMessage);
    }
  }
});
```

**Key Features:**
- **Memory storage** for conversation state
- **Auto-greeting** for new users
- **State management** for complex workflows
- **Teams-specific** activity handling

## 🎨 **UI/UX Features**

### **Adaptive Cards with Gradients**

The bot uses beautiful adaptive cards with custom SVG gradients:

```javascript
// Success gradient example
"backgroundImage": "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 80'%3E%3Cdefs%3E%3ClinearGradient id='success' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23198754;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%2320C997;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='80' fill='url(%23success)'/%3E%3C/svg%3E"

// Error gradient example
"backgroundImage": "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 80'%3E%3Cdefs%3E%3ClinearGradient id='error' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23DC3545;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%23E83E8C;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='80' fill='url(%23error)'/%3E%3C/svg%3E"
```

### **Card Types**
- **Main Menu Card**: Module selection with icons
- **Query Input Cards**: Text input for user questions
- **Response Cards**: API responses with feedback
- **Error Cards**: User-friendly error messages
- **Upload Cards**: File upload interfaces
- **Status Cards**: Progress and completion status

## 🔄 **Conversation Flows**

### **WebGPT Flow**
1. **User selects WebGPT** → Shows query input card
2. **User enters question** → Calls `/api/webchat` API
3. **API responds** → Shows response card with feedback
4. **User can try again** or go back to menu

### **OmniQuest Flow**
1. **User selects OmniQuest** → Shows resource type options
2. **User selects type** → Shows upload interface
3. **File upload** → Calls `/api/upload` with `feature_type: "omniquest_docs"`
4. **Status polling** → Polls `/api/status/{job_id}` until complete
5. **User asks questions** → Calls `/api/omniQuest` with RAG processing

### **Media Studio Flow**
1. **User selects Media Studio** → Shows generation type options
2. **User selects type** → Shows appropriate input interface
3. **For Image-to-Image**: File upload first, then prompt input
4. **Generation request** → Calls appropriate API endpoint
5. **For Video**: Status polling if needed

## 🛡️ **Error Handling**

### **Retry Logic with Exponential Backoff**
```javascript
for (let attempt = 1; attempt <= endpoint.retries + 1; attempt++) {
  try {
    const response = await fetch(endpointUrl, { /* ... */ });
    // Success handling
  } catch (error) {
    if (attempt <= endpoint.retries) {
      const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s...
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

### **User-Friendly Error Messages**
- **Beautiful error cards** with gradient backgrounds
- **Detailed error information** for debugging
- **Feedback collection** for error tracking
- **Retry options** for failed operations
- **Fallback mechanisms** for API failures

## 📊 **State Management**

### **Conversation State**
```javascript
// OmniQuest state management
const getOmni = () => {
  try {
    const existing = state?.conversation?.get('omniQuest');
    if (existing) return existing;
    const fresh = {};
    state?.conversation?.set('omniQuest', fresh);
    return fresh;
  } catch (_) {
    if (!state.omniQuest) state.omniQuest = {};
    return state.omniQuest;
  }
};

// Media Studio state management
const getMedia = () => {
  try {
    const existing = state?.conversation?.get('mediaStudio');
    if (existing) return existing;
    const fresh = {};
    state?.conversation?.set('mediaStudio', fresh);
    return fresh;
  } catch (_) {
    if (!state.mediaStudio) state.mediaStudio = {};
    return state.mediaStudio;
  }
};
```

### **State Persistence**
- **Memory storage** for conversation state
- **Module-specific state** (OmniQuest, Media Studio)
- **Lock mechanisms** to prevent multiple selections
- **Reset functionality** for changing module types

## 🔧 **API Integration**

### **Endpoint Configuration**
```javascript
// Production endpoints
TENSAI_BASE_URL=https://dev2.tens-ai.com

// API endpoints
/api/webchat          # WebGPT and Summarizer
/api/translate         # Text translation
/api/docTranslator     # Document translation
/api/omniQuest         # RAG-based querying
/api/generate-image    # Image generation
/api/audiogen          # Audio generation
/api/generate-video    # Video generation
/api/edit-image        # Image editing
/api/upload            # File uploads
/api/status/{job_id}   # Status checking
```

### **Request/Response Handling**
- **Standardized payloads** for each module
- **Error response handling** with retry logic
- **Timeout management** per module type
- **Request logging** for debugging
- **Response validation** and parsing

## 🧪 **Testing**

### **Test Structure**
```javascript
// Jest test example
describe('GenericCommandHandler', () => {
  let handler;
  beforeEach(() => {
    handler = new GenericCommandHandler();
    jest.clearAllMocks();
  });

  test('returns menu card for hi', async () => {
    const context = { activity: { text: 'hi', value: null } };
    const res = await handler.handleCommandReceived(context, {});
    expect(res).toHaveProperty('attachments');
    expect(res.text).toContain('Hi I am TensAI Chatbot');
  });

  test('records feedback when submit', async () => {
    const context = { 
      activity: { 
        text: '', 
        value: { __feedback: { type: 'up', module: 'WebGPT' } }, 
        from: { id: 'user1' } 
      } 
    };
    const res = await handler.handleCommandReceived(context, {});
    expect(res).toHaveProperty('attachments');
    expect(res.text).toContain('Thank you for the positive feedback!');
  });
});
```

### **Test Coverage**
- **Unit tests** for core functionality
- **Integration tests** for API calls
- **Error scenario testing**
- **Feedback system testing**
- **State management testing**

## 🚀 **Production Configuration**

### **Environment Variables**
```bash
# Azure Bot Service
MICROSOFT_APP_ID=bc44f95f-fb4b-4021-9eb9-218d9bd8bda1
MICROSOFT_APP_PASSWORD=your-bot-password
MICROSOFT_APP_TENANT_ID=d78a8218-4135-4026-a3a8-1cdd7223b4d5

# API Configuration
TENSAI_BASE_URL=https://dev2.tens-ai.com
TENSAI_API_KEY=your-api-key

# Server Configuration
PORT=3978
NODE_ENV=production
PUBLIC_BASE_URL=https://dev2.tens-ai.com
```

### **Teams App Manifest**
```json
{
  "id": "bc44f95f-fb4b-4021-9eb9-218d9bd8bda1",
  "bots": [{
    "botId": "bc44f95f-fb4b-4021-9eb9-218d9bd8bda1",
    "scopes": ["personal", "team", "groupChat"],
    "supportsFiles": true,
    "isNotificationOnly": false
  }],
  "validDomains": ["dev2.tens-ai.com"]
}
```

## 📈 **Performance Features**

### **Optimizations**
- **Connection pooling** for HTTP requests
- **Retry logic** with exponential backoff
- **Timeout management** per module
- **Error recovery** mechanisms
- **State caching** for conversation data

### **Monitoring**
- **Request/response logging**
- **Error tracking** and reporting
- **Performance metrics** collection
- **User feedback** aggregation
- **API health** monitoring

## 🔐 **Security Features**

### **Authentication**
- **Azure Bot Service** authentication
- **API key** authentication for backend services
- **HTTPS** enforcement for production
- **CORS** configuration
- **Input validation** and sanitization

### **Data Protection**
- **User data** handling compliance
- **File upload** security
- **API communication** encryption
- **Error message** sanitization
- **Logging** security

## 📚 **Documentation**

### **Comprehensive Guides**
- **API Integration Summary** - Complete API specifications
- **Production Configuration** - Deployment setup
- **Deployment Architecture** - Infrastructure details
- **Client Deployment Ready** - Client-specific guide
- **Final Deployment Summary** - Complete overview

### **Code Documentation**
- **Inline comments** for complex logic
- **JSDoc** documentation for functions
- **README files** for each component
- **API documentation** with examples
- **Troubleshooting guides**

---

## 🎯 **Summary**

The TensAI Teams Chatbot is a **production-ready, enterprise-grade application** that demonstrates:

✅ **Advanced Bot Framework** implementation
✅ **Multi-module AI integration** with 5 complete modules
✅ **Beautiful UI/UX** with adaptive cards and gradients
✅ **Robust error handling** and retry mechanisms
✅ **State management** for complex workflows
✅ **File upload support** for documents and images
✅ **Comprehensive testing** and documentation
✅ **Production deployment** readiness

The code is well-structured, follows best practices, and is ready for immediate deployment to Azure with your specific configuration! 🚀
