# 🚀 TensAI Teams Chatbot - Production Configuration

## 📋 **Production Environment Variables**

Based on your Azure Bot Service configuration, here are the complete environment variables for production deployment:

### **Azure Bot Service Configuration**
```bash
# Azure Bot Service Configuration
MICROSOFT_APP_ID=bc44f95f-fb4b-4021-9eb9-218d9bd8bda1
MICROSOFT_APP_PASSWORD=YOUR_BOT_PASSWORD_HERE
MICROSOFT_APP_TENANT_ID=d78a8218-4135-4026-a3a8-1cdd7223b4d5

# Bot Messaging Endpoint
BOT_MESSAGING_ENDPOINT=https://dev2.tens-ai.com/api/messages

# Azure Resource Configuration
AZURE_SUBSCRIPTION_ID=9e953538-39e0-44fe-9d2d-e725fecb9108
AZURE_RESOURCE_GROUP=AZ-CI-RG-ACE-OPENAI-DEV-02
```

### **TensAI API Configuration**
```bash
# TensAI API Configuration - Production Backend Server
TENSAI_BASE_URL=https://dev2.tens-ai.com
TENSAI_PUBLIC_API_URL=https://dev2.tens-ai.com
TENSAI_API_KEY=YOUR_API_KEY_HERE
TENSAI_CHAT_ENDPOINT=https://dev2.tens-ai.com/api/webchat
TENSAI_WEBCHAT_ENDPOINT=https://dev2.tens-ai.com/api/webchat
TENSAI_HEALTH_ENDPOINT=https://dev2.tens-ai.com/health
```

### **API Endpoints Configuration**
```bash
# API Endpoints - Production (Based on API Documentation)
VITE_PUBLIC_API_URL=https://dev2.tens-ai.com/
VITE_WEBCHAT_ENDPOINT=https://dev2.tens-ai.com/api/webchat
VITE_TRANSLATE_API_URL=https://dev2.tens-ai.com/api/translate
VITE_DOC_TRANSLATOR_URL=https://dev2.tens-ai.com/api/docTranslator
VITE_UPLOAD_URL=https://dev2.tens-ai.com/api/upload
VITE_OMNIQUEST_URL=https://dev2.tens-ai.com/api/omniQuest
VITE_OMNIQUEST_STATUS_URL=https://dev2.tens-ai.com/api/status
VITE_IMAGE_GENERATION_ENDPOINT=https://dev2.tens-ai.com/api/generate-image
VITE_AUDIO_GENERATION_ENDPOINT=https://dev2.tens-ai.com/api/audiogen
VITE_VIDEO_GENERATION_ENDPOINT=https://dev2.tens-ai.com/api/generate-video
VITE_VIDEO_STATUS_ENDPOINT=https://dev2.tens-ai.com/api/video-status
VITE_IMAGE_EDIT_ENDPOINT=https://dev2.tens-ai.com/api/edit-image
```

### **Server Configuration**
```bash
# Server Configuration
PORT=3978
NODE_ENV=production
PUBLIC_BASE_URL=https://dev2.tens-ai.com

# Default Module Configuration
DEFAULT_MODULE_NAME=WebGPT

# Optional: M365 Agents Toolkit
M365_AGENT_ENABLED=true
```

## 🔧 **Complete Production Environment File**

Create a `.env.production` file with the following content:

```bash
# TensAI Teams Chatbot Environment Configuration - Production
# Azure Bot Service Configuration
MICROSOFT_APP_ID=bc44f95f-fb4b-4021-9eb9-218d9bd8bda1
MICROSOFT_APP_PASSWORD=YOUR_BOT_PASSWORD_HERE
MICROSOFT_APP_TENANT_ID=d78a8218-4135-4026-a3a8-1cdd7223b4d5

# Bot Messaging Endpoint
BOT_MESSAGING_ENDPOINT=https://dev2.tens-ai.com/api/messages

# Azure Resource Configuration
AZURE_SUBSCRIPTION_ID=9e953538-39e0-44fe-9d2d-e725fecb9108
AZURE_RESOURCE_GROUP=AZ-CI-RG-ACE-OPENAI-DEV-02

# TensAI API Configuration - Production Backend Server
TENSAI_BASE_URL=https://dev2.tens-ai.com
TENSAI_PUBLIC_API_URL=https://dev2.tens-ai.com
TENSAI_API_KEY=YOUR_API_KEY_HERE
TENSAI_CHAT_ENDPOINT=https://dev2.tens-ai.com/api/webchat
TENSAI_WEBCHAT_ENDPOINT=https://dev2.tens-ai.com/api/webchat
TENSAI_HEALTH_ENDPOINT=https://dev2.tens-ai.com/health

# API Endpoints - Production (Based on API Documentation)
VITE_PUBLIC_API_URL=https://dev2.tens-ai.com/
VITE_WEBCHAT_ENDPOINT=https://dev2.tens-ai.com/api/webchat
VITE_TRANSLATE_API_URL=https://dev2.tens-ai.com/api/translate
VITE_DOC_TRANSLATOR_URL=https://dev2.tens-ai.com/api/docTranslator
VITE_UPLOAD_URL=https://dev2.tens-ai.com/api/upload
VITE_OMNIQUEST_URL=https://dev2.tens-ai.com/api/omniQuest
VITE_OMNIQUEST_STATUS_URL=https://dev2.tens-ai.com/api/status
VITE_IMAGE_GENERATION_ENDPOINT=https://dev2.tens-ai.com/api/generate-image
VITE_AUDIO_GENERATION_ENDPOINT=https://dev2.tens-ai.com/api/audiogen
VITE_VIDEO_GENERATION_ENDPOINT=https://dev2.tens-ai.com/api/generate-video
VITE_VIDEO_STATUS_ENDPOINT=https://dev2.tens-ai.com/api/video-status
VITE_IMAGE_EDIT_ENDPOINT=https://dev2.tens-ai.com/api/edit-image

# Server Configuration
PORT=3978
NODE_ENV=production
PUBLIC_BASE_URL=https://dev2.tens-ai.com

# Default Module Configuration
DEFAULT_MODULE_NAME=WebGPT

# Optional: M365 Agents Toolkit
M365_AGENT_ENABLED=true
```

## 🔐 **Required Information to Complete Setup**

### **Missing Values to Fill In:**
1. **`MICROSOFT_APP_PASSWORD`** - Bot Framework app password from Azure
2. **`TENSAI_API_KEY`** - API key for your TensAI backend services

### **How to Get These Values:**

#### **1. Microsoft App Password**
1. Go to Azure Portal → App Registrations
2. Find your app: `bc44f95f-fb4b-4021-9eb9-218d9bd8bda1`
3. Go to "Certificates & secrets"
4. Create a new client secret
5. Copy the secret value to `MICROSOFT_APP_PASSWORD`

#### **2. TensAI API Key**
1. Contact your TensAI backend team
2. Request API key for bot integration
3. Add the key to `TENSAI_API_KEY`

## 🚀 **Deployment Steps**

### **1. Environment Setup**
```bash
# Create production environment file
cp .env.production .env

# Edit with your actual values
nano .env
```

### **2. Install and Start**
```bash
# Install dependencies
npm install

# Start the bot
npm start
```

### **3. Verify Deployment**
```bash
# Check if bot is running
curl -X GET https://dev2.tens-ai.com/health

# Test API endpoints
curl -X POST https://dev2.tens-ai.com/api/webchat \
  -H "Content-Type: application/json" \
  -d '{"query": "Hello", "temperature": 0.7, "history": []}'
```

## 🔍 **Azure Bot Service Configuration**

### **Bot Registration Details:**
- **App ID**: `bc44f95f-fb4b-4021-9eb9-218d9bd8bda1`
- **Tenant ID**: `d78a8218-4135-4026-a3a8-1cdd7223b4d5`
- **Messaging Endpoint**: `https://dev2.tens-ai.com/api/messages`
- **Subscription**: `9e953538-39e0-44fe-9d2d-e725fecb9108`
- **Resource Group**: `AZ-CI-RG-ACE-OPENAI-DEV-02`

### **Required Azure Configuration:**
1. **Messaging Endpoint**: Set to `https://dev2.tens-ai.com/api/messages`
2. **App Password**: Generate and add to environment variables
3. **CORS**: Allow `https://dev2.tens-ai.com` domain
4. **SSL Certificate**: Ensure HTTPS is properly configured

## 📱 **Teams App Manifest Update**

Update `appPackage/manifest.json` with your bot details:

```json
{
  "bots": [
    {
      "botId": "bc44f95f-fb4b-4021-9eb9-218d9bd8bda1",
      "scopes": ["personal", "team", "groupchat"],
      "supportsFiles": true,
      "isNotificationOnly": false
    }
  ]
}
```

## ✅ **Deployment Checklist**

### **Pre-Deployment**
- [ ] Fill in `MICROSOFT_APP_PASSWORD`
- [ ] Fill in `TENSAI_API_KEY`
- [ ] Verify all API endpoints are accessible
- [ ] Test bot locally with production config

### **Deployment**
- [ ] Deploy to `https://dev2.tens-ai.com`
- [ ] Configure SSL certificate
- [ ] Set up domain and DNS
- [ ] Update Azure Bot Service messaging endpoint

### **Post-Deployment**
- [ ] Test bot in Teams
- [ ] Verify all modules work
- [ ] Test file uploads
- [ ] Monitor error logs
- [ ] Set up monitoring and alerts

## 🎯 **Ready for Production!**

With your Azure Bot Service configuration, the bot is ready for immediate deployment to `https://dev2.tens-ai.com`. Just fill in the missing password and API key, and you're good to go! 🚀
