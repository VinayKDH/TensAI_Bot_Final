# TensAI Office Add-in - Integration Guide

## Table of Contents
1. [Office 365 Integration](#office-365-integration)
2. [Azure Active Directory Setup](#azure-active-directory-setup)
3. [API Integration](#api-integration)
4. [Webhook Integration](#webhook-integration)
5. [Third-Party Integrations](#third-party-integrations)
6. [Custom Integrations](#custom-integrations)
7. [Troubleshooting Integration Issues](#troubleshooting-integration-issues)

---

## Office 365 Integration

### Step 1: Register Add-in in Office 365 Admin Center

#### Prerequisites
- Office 365 Global Administrator access
- Valid Office 365 tenant
- Add-in manifest file ready

#### Registration Process
1. **Access Admin Center**
   ```
   URL: https://admin.microsoft.com
   Login: Use Global Administrator credentials
   ```

2. **Navigate to Add-ins**
   ```
   Settings → Services & add-ins → Deploy Add-in
   ```

3. **Upload Manifest**
   ```
   Click "Upload from file"
   Select manifest.xml
   Click "Next"
   ```

4. **Configure Distribution**
   ```
   Distribution Options:
   - Everyone: All users in tenant
   - Specific users: Individual user selection
   - Specific groups: Security group selection
   ```

5. **Deploy Add-in**
   ```
   Review settings
   Click "Deploy"
   Wait for deployment confirmation
   ```

### Step 2: Configure App Permissions

#### Required Permissions
```xml
<!-- manifest.xml permissions -->
<Permissions>ReadWriteDocument</Permissions>
<Permissions>ReadWriteMailbox</Permissions>
<Permissions>ReadWriteItem</Permissions>
```

#### Office.js API Permissions
```javascript
// Required Office.js APIs
Office.context.document.getSelectedDataAsync()
Office.context.document.setSelectedDataAsync()
Office.context.mailbox.item.body.getAsync()
Office.context.mailbox.item.body.setAsync()
```

### Step 3: Test Office Integration

#### Test in Word
```javascript
// Test Word integration
Office.onReady(() => {
  if (Office.context.host === Office.HostType.Word) {
    console.log('Word integration ready');
    
    // Test document interaction
    Office.context.document.getSelectedDataAsync(
      Office.CoercionType.Text,
      (result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
          console.log('Selected text:', result.value);
        }
      }
    );
  }
});
```

#### Test in Excel
```javascript
// Test Excel integration
Office.onReady(() => {
  if (Office.context.host === Office.HostType.Excel) {
    console.log('Excel integration ready');
    
    // Test range selection
    Excel.run(async (context) => {
      const range = context.workbook.getSelectedRange();
      range.load('values');
      await context.sync();
      console.log('Selected range values:', range.values);
    });
  }
});
```

#### Test in PowerPoint
```javascript
// Test PowerPoint integration
Office.onReady(() => {
  if (Office.context.host === Office.HostType.PowerPoint) {
    console.log('PowerPoint integration ready');
    
    // Test slide interaction
    Office.context.document.getSelectedDataAsync(
      Office.CoercionType.SlideRange,
      (result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
          console.log('Selected slides:', result.value);
        }
      }
    );
  }
});
```

#### Test in Outlook
```javascript
// Test Outlook integration
Office.onReady(() => {
  if (Office.context.host === Office.HostType.Outlook) {
    console.log('Outlook integration ready');
    
    // Test mail item interaction
    Office.context.mailbox.item.body.getAsync(
      Office.CoercionType.Text,
      (result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
          console.log('Mail body:', result.value);
        }
      }
    );
  }
});
```

---

## Azure Active Directory Setup

### Step 1: Register Application in Azure AD

#### Prerequisites
- Azure AD Global Administrator access
- Azure subscription
- Application manifest ready

#### Registration Process
1. **Access Azure Portal**
   ```
   URL: https://portal.azure.com
   Navigate: Azure Active Directory → App registrations
   ```

2. **Create New Registration**
   ```
   Name: TensAI Office Add-in
   Supported account types: Accounts in this organizational directory only
   Redirect URI: Web - https://your-domain.com/auth/callback
   ```

3. **Configure Authentication**
   ```
   Platform configurations:
   - Web: https://your-domain.com/auth/callback
   - Single-page application: https://your-domain.com
   ```

4. **Set API Permissions**
   ```
   Microsoft Graph:
   - User.Read (Delegated)
   - Files.ReadWrite (Delegated)
   - Mail.ReadWrite (Delegated)
   
   Office 365 APIs:
   - Files.ReadWrite (Delegated)
   - Mail.ReadWrite (Delegated)
   ```

### Step 2: Configure Authentication Flow

#### Implicit Grant Flow
```javascript
// Authentication configuration
const authConfig = {
  clientId: 'your-client-id',
  authority: 'https://login.microsoftonline.com/your-tenant-id',
  redirectUri: 'https://your-domain.com/auth/callback',
  scopes: ['User.Read', 'Files.ReadWrite', 'Mail.ReadWrite']
};
```

#### MSAL Integration
```javascript
// Install MSAL
npm install @azure/msal-browser

// Initialize MSAL
import { PublicClientApplication } from '@azure/msal-browser';

const msalInstance = new PublicClientApplication({
  auth: {
    clientId: authConfig.clientId,
    authority: authConfig.authority,
    redirectUri: authConfig.redirectUri
  }
});

// Login function
const login = async () => {
  try {
    const response = await msalInstance.loginPopup({
      scopes: authConfig.scopes
    });
    return response.accessToken;
  } catch (error) {
    console.error('Login failed:', error);
  }
};
```

### Step 3: Token Management

#### Token Storage
```javascript
// Secure token storage
class TokenManager {
  static setToken(token) {
    // Store in secure storage (not localStorage for production)
    sessionStorage.setItem('access_token', token);
  }
  
  static getToken() {
    return sessionStorage.getItem('access_token');
  }
  
  static clearToken() {
    sessionStorage.removeItem('access_token');
  }
  
  static isTokenValid(token) {
    if (!token) return false;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now() / 1000;
      return payload.exp > now;
    } catch (error) {
      return false;
    }
  }
}
```

#### Token Refresh
```javascript
// Automatic token refresh
const refreshToken = async () => {
  try {
    const response = await msalInstance.acquireTokenSilent({
      scopes: authConfig.scopes
    });
    TokenManager.setToken(response.accessToken);
    return response.accessToken;
  } catch (error) {
    // Fallback to interactive login
    return await login();
  }
};
```

---

## API Integration

### Step 1: TensAI API Configuration

#### Base Configuration
```javascript
// API service configuration
class ApiService {
  constructor() {
    this.baseUrl = process.env.TENSAI_BASE_URL || 'https://dev2.tens-ai.com';
    this.apiKey = process.env.TENSAI_API_KEY;
    this.timeout = 30000;
    this.retries = 3;
  }
  
  // Request interceptor
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'X-Request-ID': this.generateRequestId()
      },
      timeout: this.timeout,
      ...options
    };
    
    return this.retryRequest(url, config);
  }
}
```

#### Endpoint Configuration
```javascript
// API endpoints mapping
const endpoints = {
  WebGPT: {
    url: '/api/webchat',
    method: 'POST',
    payload: {
      query: 'string',
      temperature: 0.7,
      history: []
    }
  },
  MediaStudio: {
    imageGeneration: '/api/generate-image',
    audioGeneration: '/api/audiogen',
    videoGeneration: '/api/generate-video',
    imageEditing: '/api/edit-image'
  },
  Translator: {
    textTranslate: '/api/translate',
    docTranslate: '/api/docTranslator'
  },
  Summarizer: {
    url: '/api/webchat',
    method: 'POST'
  },
  OmniQuest: {
    url: '/api/omniQuest',
    upload: '/api/upload',
    status: '/api/status'
  }
};
```

### Step 2: Error Handling and Retry Logic

#### Retry Implementation
```javascript
// Retry logic with exponential backoff
async retryRequest(url, config, attempt = 1) {
  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    if (attempt < this.retries) {
      const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.retryRequest(url, config, attempt + 1);
    }
    throw error;
  }
}
```

#### Error Classification
```javascript
// Error handling
class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = 'ApiError';
  }
}

const handleApiError = (error) => {
  if (error.status === 401) {
    // Unauthorized - refresh token
    return refreshToken();
  } else if (error.status === 429) {
    // Rate limited - wait and retry
    return new Promise(resolve => setTimeout(resolve, 5000));
  } else if (error.status >= 500) {
    // Server error - retry with backoff
    throw new ApiError('Server error', error.status, 'SERVER_ERROR');
  } else {
    // Client error - don't retry
    throw new ApiError('Client error', error.status, 'CLIENT_ERROR');
  }
};
```

### Step 3: API Testing and Validation

#### Health Check
```javascript
// API health check
const checkApiHealth = async () => {
  try {
    const response = await fetch(`${baseUrl}/api/health`);
    const data = await response.json();
    return data.status === 'healthy';
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
};
```

#### API Validation
```javascript
// Validate API responses
const validateApiResponse = (response, expectedSchema) => {
  // Implement schema validation
  const isValid = validateSchema(response, expectedSchema);
  if (!isValid) {
    throw new Error('Invalid API response format');
  }
  return response;
};
```

---

## Webhook Integration

### Step 1: Webhook Configuration

#### Webhook Endpoint Setup
```javascript
// Webhook endpoint for real-time updates
const webhookEndpoint = '/api/webhooks/tensai';

// Webhook payload structure
const webhookPayload = {
  event: 'generation.completed',
  data: {
    jobId: 'job-123',
    status: 'completed',
    result: {
      imageUrl: 'https://example.com/image.jpg',
      metadata: {}
    }
  },
  timestamp: '2024-01-01T00:00:00Z'
};
```

#### Webhook Security
```javascript
// Webhook signature verification
const verifyWebhookSignature = (payload, signature, secret) => {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return signature === expectedSignature;
};
```

### Step 2: Real-time Updates

#### WebSocket Integration
```javascript
// WebSocket for real-time updates
class WebSocketManager {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }
  
  connect() {
    this.ws = new WebSocket(this.url);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };
    
    this.ws.onclose = () => {
      this.reconnect();
    };
  }
  
  reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => this.connect(), 1000 * this.reconnectAttempts);
    }
  }
}
```

---

## Third-Party Integrations

### Step 1: Analytics Integration

#### Google Analytics
```javascript
// Google Analytics integration
const gtag = (...args) => {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(args);
};

// Track add-in usage
const trackAddinUsage = (module, action) => {
  gtag('event', 'addin_usage', {
    event_category: 'Office Add-in',
    event_label: module,
    custom_parameter_1: action
  });
};
```

#### Microsoft Application Insights
```javascript
// Application Insights integration
import { ApplicationInsights } from '@microsoft/applicationinsights-web';

const appInsights = new ApplicationInsights({
  config: {
    connectionString: 'your-connection-string'
  }
});

appInsights.loadAppInsights();
appInsights.trackPageView();
```

### Step 2: Content Delivery Network (CDN)

#### CDN Configuration
```javascript
// CDN integration for static assets
const cdnConfig = {
  baseUrl: 'https://cdn.tens-ai.com',
  assets: {
    images: '/images',
    scripts: '/scripts',
    styles: '/styles'
  }
};

// Load assets from CDN
const loadAsset = (type, filename) => {
  return `${cdnConfig.baseUrl}${cdnConfig.assets[type]}/${filename}`;
};
```

### Step 3: External API Integrations

#### OpenAI Integration
```javascript
// OpenAI API integration
class OpenAIService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.openai.com/v1';
  }
  
  async generateText(prompt, options = {}) {
    const response = await fetch(`${this.baseUrl}/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        prompt: prompt,
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7
      })
    });
    
    return await response.json();
  }
}
```

---

## Custom Integrations

### Step 1: Custom API Integration

#### Custom API Service
```javascript
// Custom API integration template
class CustomApiService {
  constructor(config) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.timeout = config.timeout || 30000;
  }
  
  async callCustomEndpoint(endpoint, data) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(data),
      timeout: this.timeout
    });
    
    if (!response.ok) {
      throw new Error(`Custom API error: ${response.statusText}`);
    }
    
    return await response.json();
  }
}
```

### Step 2: Database Integration

#### Database Connection
```javascript
// Database integration (example with MongoDB)
const { MongoClient } = require('mongodb');

class DatabaseService {
  constructor(connectionString) {
    this.connectionString = connectionString;
    this.client = null;
  }
  
  async connect() {
    this.client = new MongoClient(this.connectionString);
    await this.client.connect();
  }
  
  async saveUserData(userId, data) {
    const db = this.client.db('tensai');
    const collection = db.collection('user_data');
    
    return await collection.updateOne(
      { userId },
      { $set: { ...data, updatedAt: new Date() } },
      { upsert: true }
    );
  }
}
```

### Step 3: File Storage Integration

#### Azure Blob Storage
```javascript
// Azure Blob Storage integration
const { BlobServiceClient } = require('@azure/storage-blob');

class BlobStorageService {
  constructor(connectionString) {
    this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  }
  
  async uploadFile(containerName, fileName, fileData) {
    const containerClient = this.blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);
    
    return await blockBlobClient.upload(fileData, fileData.length);
  }
  
  async downloadFile(containerName, fileName) {
    const containerClient = this.blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);
    
    return await blockBlobClient.downloadToBuffer();
  }
}
```

---

## Troubleshooting Integration Issues

### Common Integration Problems

#### Problem 1: Office.js Not Loading
**Symptoms**: Add-in loads but Office.js APIs not available
**Solutions**:
```javascript
// Check Office.js loading
Office.onReady((info) => {
  if (info.host === Office.HostType.Unknown) {
    console.error('Office.js not loaded properly');
  }
});

// Fallback loading
if (typeof Office === 'undefined') {
  const script = document.createElement('script');
  script.src = 'https://appsforoffice.microsoft.com/lib/1/hosted/office.js';
  document.head.appendChild(script);
}
```

#### Problem 2: CORS Issues
**Symptoms**: API calls blocked by CORS policy
**Solutions**:
```javascript
// Server-side CORS configuration
app.use(cors({
  origin: ['https://your-domain.com', 'https://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

#### Problem 3: Authentication Failures
**Symptoms**: API calls return 401 Unauthorized
**Solutions**:
```javascript
// Token validation and refresh
const validateAndRefreshToken = async () => {
  const token = TokenManager.getToken();
  
  if (!TokenManager.isTokenValid(token)) {
    const newToken = await refreshToken();
    TokenManager.setToken(newToken);
    return newToken;
  }
  
  return token;
};
```

#### Problem 4: API Rate Limiting
**Symptoms**: API calls return 429 Too Many Requests
**Solutions**:
```javascript
// Rate limiting handling
const rateLimitHandler = async (error) => {
  if (error.status === 429) {
    const retryAfter = error.headers['retry-after'] || 60;
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    return true; // Retry the request
  }
  return false;
};
```

### Debugging Tools

#### Integration Debugging
```javascript
// Debug integration issues
class IntegrationDebugger {
  static logApiCall(endpoint, request, response, error) {
    console.group(`API Call: ${endpoint}`);
    console.log('Request:', request);
    console.log('Response:', response);
    if (error) console.error('Error:', error);
    console.groupEnd();
  }
  
  static logOfficeInteraction(action, result) {
    console.group(`Office Interaction: ${action}`);
    console.log('Result:', result);
    console.groupEnd();
  }
}
```

#### Network Monitoring
```javascript
// Monitor network requests
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const startTime = Date.now();
  
  return originalFetch.apply(this, args).then(response => {
    const endTime = Date.now();
    console.log(`Network request: ${args[0]} - ${endTime - startTime}ms`);
    return response;
  });
};
```

---

## Integration Best Practices

### Security Best Practices
1. **Use HTTPS** for all communications
2. **Validate all inputs** before processing
3. **Implement proper authentication** and authorization
4. **Use secure token storage** (not localStorage)
5. **Implement rate limiting** to prevent abuse
6. **Log security events** for monitoring

### Performance Best Practices
1. **Implement caching** for frequently accessed data
2. **Use connection pooling** for database connections
3. **Implement retry logic** with exponential backoff
4. **Monitor API response times** and optimize slow endpoints
5. **Use CDN** for static assets
6. **Implement lazy loading** for large datasets

### Error Handling Best Practices
1. **Implement comprehensive error handling** at all levels
2. **Provide meaningful error messages** to users
3. **Log errors** for debugging and monitoring
4. **Implement fallback mechanisms** for critical operations
5. **Use circuit breakers** for external service calls
6. **Implement graceful degradation** when services are unavailable

---

## Conclusion

This integration guide provides comprehensive instructions for integrating the TensAI Office Add-in with various services and platforms. Follow the step-by-step procedures and best practices to ensure successful integration and optimal performance.

**Last Updated**: January 2024
**Version**: 1.0.0
**Maintained By**: TensAI Development Team
