# TensAI Office Add-in - Complete Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Development Environment](#development-environment)
4. [Production Deployment](#production-deployment)
5. [Office 365 Integration](#office-365-integration)
6. [Testing Procedures](#testing-procedures)
7. [Troubleshooting](#troubleshooting)
8. [Maintenance & Updates](#maintenance--updates)

---

## Prerequisites

### System Requirements
- **Operating System**: Windows 10/11, macOS 10.14+, or Linux
- **Node.js**: Version 16.x or higher
- **npm**: Version 8.x or higher
- **Office Applications**: Office 365, Office 2019, or Office 2021
- **Browser**: Modern browser with JavaScript enabled
- **Internet Connection**: Required for API calls and Office integration

### Required Accounts & Services
- **Microsoft 365 Developer Account** (for testing)
- **Azure Active Directory** (for authentication)
- **Office 365 Admin Center** access
- **TensAI API Access** (with valid credentials)
- **Web Hosting Service** (Azure, AWS, or similar)

### Development Tools
- **Visual Studio Code** (recommended)
- **Office Add-in Development Tools**
- **Git** (for version control)
- **SSL Certificate** (for HTTPS hosting)

---

## Environment Setup

### Step 1: Clone and Navigate to Project
```bash
# Navigate to the Office Add-in directory
cd /Users/vinaykumar/AgentsToolkitProjects/TensAIBotFinal/TensAI_Office_Addon

# Verify project structure
ls -la
```

### Step 2: Install Dependencies
```bash
# Install all required packages
npm install

# Verify installation
npm list --depth=0
```

### Step 3: Environment Configuration
Create your environment file:
```bash
# Copy the example environment file
cp env.example .env

# Edit the environment file
nano .env
```

**Required Environment Variables:**
```env
# TensAI API Configuration
TENSAI_BASE_URL=https://dev2.tens-ai.com
TENSAI_API_KEY=your_api_key_here

# Office Add-in Configuration
OFFICE_ADDIN_ID=your_addin_id_here
OFFICE_ADDIN_VERSION=1.0.0

# Development Settings
NODE_ENV=development
PORT=3000

# Production Settings (for deployment)
PRODUCTION_URL=https://your-domain.com
SSL_CERT_PATH=/path/to/ssl/cert.pem
SSL_KEY_PATH=/path/to/ssl/private.key
```

### Step 4: Verify Project Structure
Ensure you have the following structure:
```
TensAI_Office_Addon/
├── manifest.xml
├── package.json
├── webpack.config.js
├── .env
├── src/
│   ├── taskpane/
│   │   ├── taskpane.html
│   │   ├── taskpane.css
│   │   └── taskpane.js
│   ├── commands/
│   │   ├── commands.html
│   │   └── commands.js
│   ├── services/
│   │   └── apiService.js
│   └── utils/
│       └── officeUtils.js
├── assets/
│   ├── icon-16.png
│   ├── icon-32.png
│   ├── icon-64.png
│   └── icon-80.png
└── dist/ (generated after build)
```

---

## Development Environment

### Step 1: Start Development Server
```bash
# Start the development server
npm run dev

# The server will start on http://localhost:3000
# You should see output like:
# "Office Add-in development server running on port 3000"
```

### Step 2: Test Local Development
1. **Open Office Application** (Word, Excel, PowerPoint, or Outlook)
2. **Go to Insert Tab** → **Add-ins** → **My Add-ins**
3. **Upload Custom Add-in** → **Upload from File**
4. **Select manifest.xml** from your project directory
5. **Verify Add-in Loads** without errors

### Step 3: Enable Developer Mode (Optional)
For advanced debugging:
```bash
# Enable Office Developer Mode
# In Office: File → Options → Trust Center → Trust Center Settings
# → Trusted Add-in Catalogs → Add your development URL
```

### Step 4: Test API Connectivity
```bash
# Test API connection
curl -X GET "https://dev2.tens-ai.com/api/health" \
  -H "Authorization: Bearer your_api_key"

# Expected response: {"status": "healthy"}
```

---

## Production Deployment

### Step 1: Build Production Bundle
```bash
# Create production build
npm run build

# Verify build output
ls -la dist/
# Should contain: taskpane.html, taskpane.js, commands.html, commands.js
```

### Step 2: Prepare for Hosting
```bash
# Create deployment package
mkdir deployment
cp -r dist/* deployment/
cp manifest.xml deployment/
cp -r assets deployment/

# Create deployment archive
tar -czf tensai-office-addon-v1.0.0.tar.gz deployment/
```

### Step 3: Deploy to Web Server

#### Option A: Azure App Service
```bash
# Install Azure CLI
npm install -g azure-cli

# Login to Azure
az login

# Create resource group
az group create --name TensAI-Office-Addon-RG --location "East US"

# Create App Service plan
az appservice plan create --name TensAI-Addon-Plan \
  --resource-group TensAI-Office-Addon-RG \
  --sku B1 --is-linux

# Create web app
az webapp create --resource-group TensAI-Office-Addon-RG \
  --plan TensAI-Addon-Plan --name tensai-office-addon \
  --runtime "NODE|16-lts"

# Deploy files
az webapp deployment source config-zip \
  --resource-group TensAI-Office-Addon-RG \
  --name tensai-office-addon \
  --src tensai-office-addon-v1.0.0.tar.gz
```

#### Option B: AWS S3 + CloudFront
```bash
# Install AWS CLI
pip install awscli

# Configure AWS credentials
aws configure

# Create S3 bucket
aws s3 mb s3://tensai-office-addon

# Upload files
aws s3 sync deployment/ s3://tensai-office-addon/

# Create CloudFront distribution
aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json
```

#### Option C: Traditional Web Hosting
1. **Upload Files** to your web server via FTP/SFTP
2. **Configure SSL Certificate** for HTTPS
3. **Set Proper MIME Types**:
   ```apache
   # .htaccess file
   AddType application/xml .xml
   AddType text/html .html
   AddType application/javascript .js
   AddType text/css .css
   ```

### Step 4: Update Manifest for Production
Edit `manifest.xml` to point to production URLs:
```xml
<!-- Update these URLs to your production domain -->
<SourceLocation DefaultValue="https://your-domain.com/taskpane.html"/>
<SourceLocation DefaultValue="https://your-domain.com/commands.html"/>
```

### Step 5: Configure HTTPS
Ensure your production server has:
- **Valid SSL Certificate** (Let's Encrypt, DigiCert, etc.)
- **HTTPS Redirect** (all HTTP traffic redirected to HTTPS)
- **Security Headers**:
  ```apache
  # Security headers
  Header always set X-Content-Type-Options nosniff
  Header always set X-Frame-Options DENY
  Header always set X-XSS-Protection "1; mode=block"
  Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
  ```

---

## Office 365 Integration

### Step 1: Register Add-in in Office 365 Admin Center

1. **Login to Office 365 Admin Center**
   - Go to https://admin.microsoft.com
   - Login with admin credentials

2. **Navigate to Settings**
   - Go to **Settings** → **Services & add-ins**
   - Click **Deploy Add-in**

3. **Upload Manifest**
   - Select **Upload from file**
   - Choose your `manifest.xml` file
   - Click **Next**

4. **Configure Distribution**
   - **Everyone**: Available to all users
   - **Specific users**: Select individual users
   - **Specific groups**: Select security groups

5. **Review and Deploy**
   - Review settings
   - Click **Deploy**

### Step 2: Configure App Permissions

1. **Go to Azure Portal**
   - Navigate to https://portal.azure.com
   - Go to **Azure Active Directory**

2. **Register Application**
   - Go to **App registrations**
   - Click **New registration**
   - Name: "TensAI Office Add-in"
   - Redirect URI: Your add-in URL

3. **Configure API Permissions**
   - Go to **API permissions**
   - Add permissions for:
     - Microsoft Graph (User.Read)
     - Office 365 APIs (Files.ReadWrite)

4. **Grant Admin Consent**
   - Click **Grant admin consent**
   - Confirm permissions

### Step 3: Test Office Integration

1. **Open Office Application**
2. **Go to Insert Tab** → **Add-ins**
3. **Look for "TensAI"** in available add-ins
4. **Click to Install** the add-in
5. **Verify Installation** in task pane

---

## Testing Procedures

### Step 1: Functional Testing

#### Test WebGPT Module
```javascript
// Test in browser console or Office task pane
const apiService = new ApiService();

// Test WebGPT query
apiService.callModuleAPI('WebGPT', {
  query: 'What is artificial intelligence?',
  temperature: 0.7
}).then(response => {
  console.log('WebGPT Response:', response);
}).catch(error => {
  console.error('WebGPT Error:', error);
});
```

#### Test Media Studio Module
```javascript
// Test Image Generation
apiService.callModuleAPI('Media Studio', {
  generationType: 'image_generator',
  prompt: 'A beautiful sunset over mountains',
  model: 'dall-e-3',
  size: '1024x1024'
}).then(response => {
  console.log('Image Generation Response:', response);
});
```

#### Test Translator Module
```javascript
// Test Text Translation
apiService.callModuleAPI('Translator', {
  action: 'translate',
  query: 'Hello, how are you?',
  targetLanguage: 'Spanish'
}).then(response => {
  console.log('Translation Response:', response);
});
```

### Step 2: Office Integration Testing

#### Test in Word
1. **Open Word Document**
2. **Insert Add-in** from ribbon
3. **Test Text Selection** and processing
4. **Verify Content Insertion** works correctly

#### Test in Excel
1. **Open Excel Spreadsheet**
2. **Select Cells** with data
3. **Use Add-in** to process data
4. **Verify Results** are inserted correctly

#### Test in PowerPoint
1. **Open PowerPoint Presentation**
2. **Select Slide Content**
3. **Use Add-in** for content generation
4. **Verify Content** appears in presentation

#### Test in Outlook
1. **Open Outlook**
2. **Compose New Email**
3. **Use Add-in** for content assistance
4. **Verify Content** is inserted in email

### Step 3: Cross-Platform Testing

#### Test on Windows
- **Office 365 Desktop**
- **Office 365 Web**
- **Office 2019/2021**

#### Test on macOS
- **Office 365 for Mac**
- **Office 365 Web**

#### Test on Mobile
- **Office Mobile Apps**
- **Office 365 Web (Mobile)**

### Step 4: Performance Testing

#### Load Testing
```bash
# Install artillery for load testing
npm install -g artillery

# Create load test configuration
cat > load-test.yml << EOF
config:
  target: 'https://your-domain.com'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "API Load Test"
    requests:
      - get:
          url: "/api/health"
EOF

# Run load test
artillery run load-test.yml
```

#### Response Time Testing
```javascript
// Test API response times
const startTime = Date.now();
apiService.callModuleAPI('WebGPT', {
  query: 'Test query'
}).then(response => {
  const endTime = Date.now();
  console.log(`Response time: ${endTime - startTime}ms`);
});
```

### Step 5: Security Testing

#### Test HTTPS
```bash
# Test SSL certificate
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Test security headers
curl -I https://your-domain.com
```

#### Test Authentication
```javascript
// Test API authentication
fetch('https://dev2.tens-ai.com/api/health', {
  headers: {
    'Authorization': 'Bearer invalid_token'
  }
}).then(response => {
  if (response.status === 401) {
    console.log('Authentication working correctly');
  }
});
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: Add-in Not Loading
**Symptoms**: Add-in doesn't appear in Office applications
**Solutions**:
1. **Check Manifest URL**: Ensure URLs in manifest.xml are accessible
2. **Verify HTTPS**: All URLs must use HTTPS in production
3. **Check CORS**: Ensure server allows cross-origin requests
4. **Review Console**: Check browser console for JavaScript errors

#### Issue 2: API Calls Failing
**Symptoms**: "Network error" or "API unavailable" messages
**Solutions**:
1. **Check API Endpoints**: Verify TensAI API URLs are correct
2. **Test API Connectivity**: Use curl or Postman to test APIs
3. **Check API Keys**: Ensure valid API credentials
4. **Review Network**: Check firewall and proxy settings

#### Issue 3: Office Integration Issues
**Symptoms**: Add-in loads but doesn't interact with Office
**Solutions**:
1. **Check Office.js**: Ensure Office.js is loaded correctly
2. **Verify Permissions**: Check manifest permissions
3. **Update Office**: Ensure Office applications are up to date
4. **Clear Cache**: Clear Office add-in cache

#### Issue 4: Content Not Inserting
**Symptoms**: Generated content doesn't appear in Office documents
**Solutions**:
1. **Check Selection**: Ensure content is selected in Office
2. **Verify Permissions**: Check document permissions
3. **Test Insertion**: Use Office.js insertion methods
4. **Review Errors**: Check console for JavaScript errors

### Debugging Tools

#### Browser Developer Tools
```javascript
// Enable Office.js debugging
Office.onReady(() => {
  console.log('Office.js loaded successfully');
});

// Debug API calls
const originalFetch = window.fetch;
window.fetch = function(...args) {
  console.log('API Call:', args);
  return originalFetch.apply(this, args);
};
```

#### Office Add-in Debugger
1. **Open Office Application**
2. **Press F12** to open developer tools
3. **Go to Console Tab**
4. **Look for Error Messages**
5. **Use Network Tab** to monitor API calls

#### Logging and Monitoring
```javascript
// Add comprehensive logging
class Logger {
  static log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${level}: ${message}`, data);
    
    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoring(level, message, data);
    }
  }
  
  static sendToMonitoring(level, message, data) {
    // Implement monitoring service integration
    fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, message, data, timestamp: new Date().toISOString() })
    });
  }
}
```

---

## Maintenance & Updates

### Step 1: Version Management
```bash
# Update version in package.json
npm version patch  # for bug fixes
npm version minor  # for new features
npm version major  # for breaking changes

# Update manifest.xml version
# Change <Version>1.0.0</Version> to new version
```

### Step 2: Update Deployment
```bash
# Build new version
npm run build

# Deploy to staging
npm run deploy:staging

# Test staging environment
npm run test:staging

# Deploy to production
npm run deploy:production
```

### Step 3: Monitor Performance
```javascript
// Add performance monitoring
class PerformanceMonitor {
  static trackAPICall(module, startTime, endTime) {
    const duration = endTime - startTime;
    console.log(`API Call to ${module}: ${duration}ms`);
    
    // Alert if response time is too high
    if (duration > 10000) {
      console.warn(`Slow API response: ${module} took ${duration}ms`);
    }
  }
  
  static trackUserAction(action, details) {
    console.log(`User Action: ${action}`, details);
    // Send to analytics service
  }
}
```

### Step 4: Backup and Recovery
```bash
# Create backup of current deployment
tar -czf backup-$(date +%Y%m%d).tar.gz deployment/

# Store backup in secure location
aws s3 cp backup-$(date +%Y%m%d).tar.gz s3://tensai-backups/

# Recovery procedure
tar -xzf backup-20240101.tar.gz
# Deploy recovered files
```

### Step 5: Security Updates
```bash
# Check for security vulnerabilities
npm audit

# Fix security issues
npm audit fix

# Update dependencies
npm update

# Test after updates
npm test
```

---

## Support and Documentation

### User Documentation
Create user guides for:
- **Getting Started** with the add-in
- **Module Usage** (WebGPT, Media Studio, etc.)
- **Troubleshooting** common issues
- **Best Practices** for each Office application

### Developer Documentation
Maintain documentation for:
- **API Integration** details
- **Code Architecture** overview
- **Deployment Procedures**
- **Testing Guidelines**

### Support Channels
- **Email Support**: support@tens-ai.com
- **Documentation**: https://docs.tens-ai.com
- **Issue Tracking**: GitHub Issues or Jira
- **Community Forum**: For user discussions

---

## Conclusion

This comprehensive deployment guide covers all aspects of deploying, integrating, and testing the TensAI Office Add-in. Follow each step carefully, and ensure thorough testing before deploying to production.

For additional support or questions, refer to the troubleshooting section or contact the development team.

**Last Updated**: January 2024
**Version**: 1.0.0
**Maintained By**: TensAI Development Team
