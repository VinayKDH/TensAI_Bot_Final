# 🚀 TensAI Teams Chatbot - Deployment Configuration

## 📋 **Environment Variables Configuration**

### **Production Environment (.env.production)**

```bash
# TensAI Teams Chatbot Environment Configuration - Production
# Azure Bot Service Configuration
MICROSOFT_APP_ID=your-bot-app-id
MICROSOFT_APP_PASSWORD=your-bot-password
MICROSOFT_APP_TENANT_ID=your-tenant-id

# Bot Messaging Endpoint
BOT_MESSAGING_ENDPOINT=https://your-domain.com/api/messages

# TensAI API Configuration - Production Backend Server
TENSAI_BASE_URL=https://your-api-domain.com
TENSAI_PUBLIC_API_URL=https://your-api-domain.com
TENSAI_API_KEY=your-api-key
TENSAI_CHAT_ENDPOINT=https://your-api-domain.com/api/webchat
TENSAI_WEBCHAT_ENDPOINT=https://your-api-domain.com/api/webchat
TENSAI_HEALTH_ENDPOINT=https://your-api-domain.com/health

# API Endpoints - Production (Based on API Documentation)
VITE_PUBLIC_API_URL=https://your-api-domain.com/
VITE_WEBCHAT_ENDPOINT=https://your-api-domain.com/api/webchat
VITE_TRANSLATE_API_URL=https://your-api-domain.com/api/translate
VITE_DOC_TRANSLATOR_URL=https://your-api-domain.com/api/docTranslator
VITE_UPLOAD_URL=https://your-api-domain.com/api/upload
VITE_OMNIQUEST_URL=https://your-api-domain.com/api/omniQuest
VITE_OMNIQUEST_STATUS_URL=https://your-api-domain.com/api/status
VITE_IMAGE_GENERATION_ENDPOINT=https://your-api-domain.com/api/generate-image
VITE_AUDIO_GENERATION_ENDPOINT=https://your-api-domain.com/api/audiogen
VITE_VIDEO_GENERATION_ENDPOINT=https://your-api-domain.com/api/generate-video
VITE_VIDEO_STATUS_ENDPOINT=https://your-api-domain.com/api/video-status
VITE_IMAGE_EDIT_ENDPOINT=https://your-api-domain.com/api/edit-image

# Server Configuration
PORT=3978
NODE_ENV=production
PUBLIC_BASE_URL=https://your-domain.com

# Default Module Configuration
DEFAULT_MODULE_NAME=WebGPT

# Optional: M365 Agents Toolkit
M365_AGENT_ENABLED=true
```

## 🔧 **API Integration Summary**

### **Updated API Endpoints (Based on Documentation)**

| Module | Endpoint | Method | Payload Format |
|--------|----------|--------|----------------|
| **WebGPT** | `/api/webchat` | POST | `{"query": "string", "temperature": 0.7, "history": []}` |
| **Translator (Text)** | `/api/translate` | POST | `{"query": "string", "target_language": "string"}` |
| **Translator (Document)** | `/api/docTranslator` | POST | `{"toLanguage": "string", "filename": "string"}` |
| **Summarizer** | `/api/webchat` | POST | `{"query": "string", "temperature": 0.7, "history": []}` |
| **OmniQuest** | `/api/omniQuest` | POST | `{"query": "string", "file_names": [], "top_k": 3, "temperature": 0.5, "feature_type": "string", "history": []}` |
| **Media Studio (Image)** | `/api/generate-image` | POST | `{"model": "string", "prompt": "string", "size": "string", "number_of_images": 1, "quality": "high", "addons": "string"}` |
| **Media Studio (Audio)** | `/api/audiogen` | POST | `{"model": "string", "prompt": "string", "language": "string", "voice": "string", "negative_prompt": "string"}` |
| **Media Studio (Video)** | `/api/generate-video` | POST | `{"model": "string", "prompt": "string"}` |
| **Media Studio (Image Edit)** | `/api/edit-image` | POST | `{"model": "string", "prompt": "string", "imagename": "string", "size": "string", "quality": "string", "operation_type": "string"}` |
| **File Upload** | `/api/upload` | POST | `{"files": fileinput, "feature_type": "string"}` |
| **OmniQuest Status** | `/api/status/{job_id}` | GET | Header: `job_id` |
| **Video Status** | `/api/video-status` | POST | `{"operation_id": "string"}` |

## 🏗️ **Deployment Steps**

### **1. Environment Setup**
```bash
# Create production environment file
cp env/.env.local env/.env.production

# Update with production values
nano env/.env.production
```

### **2. Install Dependencies**
```bash
npm install
```

### **3. Build and Start**
```bash
# For development
npm run dev

# For production
npm start
```

### **4. Azure Bot Registration**
1. Register bot in Azure Portal
2. Configure messaging endpoint: `https://your-domain.com/api/messages`
3. Set up authentication
4. Download app registration details

### **5. Teams App Manifest**
1. Update `appPackage/manifest.json` with production URLs
2. Update bot ID and other identifiers
3. Package and upload to Teams

## 🔐 **Authentication Requirements**

### **API Authentication**
- **API Key**: Set `TENSAI_API_KEY` environment variable
- **Headers**: API key should be included in request headers
- **Rate Limiting**: Implement proper rate limiting
- **CORS**: Configure CORS for your domain

### **Bot Authentication**
- **Microsoft App ID**: Azure Bot Service registration
- **App Password**: Bot Framework authentication
- **Tenant ID**: Azure AD tenant configuration

## 📁 **File Upload Configuration**

### **Supported File Types**
- **Documents**: PDF, DOC, DOCX, TXT, RTF
- **Images**: JPG, PNG, GIF, WebP
- **Media**: MP4, MP3, WAV (for OmniQuest)

### **Upload Endpoints**
- **OmniQuest**: `feature_type: "omniquest_docs"`
- **Translator**: `feature_type: "translate"`
- **Media Studio**: `feature_type: "imgedit"`

## 🚀 **Production Deployment Checklist**

### **Pre-Deployment**
- [ ] Update all environment variables
- [ ] Configure API endpoints
- [ ] Set up authentication
- [ ] Test all modules locally
- [ ] Verify file upload functionality

### **Deployment**
- [ ] Deploy to production server
- [ ] Configure SSL certificates
- [ ] Set up domain and DNS
- [ ] Register bot in Azure
- [ ] Upload Teams app manifest

### **Post-Deployment**
- [ ] Test all bot functionalities
- [ ] Verify API integrations
- [ ] Monitor error logs
- [ ] Set up monitoring and alerts
- [ ] Document deployment process

## 🔍 **Testing Commands**

### **Health Check**
```bash
curl -X GET https://your-domain.com/health
```

### **API Test**
```bash
# Test WebGPT
curl -X POST https://your-api-domain.com/api/webchat \
  -H "Content-Type: application/json" \
  -d '{"query": "Hello", "temperature": 0.7, "history": []}'
```

### **Bot Test**
1. Install bot in Teams
2. Send test messages
3. Verify all module responses
4. Test file uploads
5. Check error handling

## 📞 **Support Information**

### **Logs Location**
- Application logs: Console output
- Error logs: Check server logs
- API logs: Backend service logs

### **Monitoring**
- Set up application monitoring
- Monitor API response times
- Track user interactions
- Monitor error rates

---

**The bot is now ready for production deployment with the correct API specifications!** 🎉
