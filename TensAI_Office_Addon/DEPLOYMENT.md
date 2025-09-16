# TensAI Office Add-in Deployment Guide

This guide provides step-by-step instructions for deploying the TensAI Office Add-in in both development and production environments.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Office 365 subscription
- Web server (for production)
- TensAI API access

### Installation
```bash
# Clone and install
git clone <repository-url>
cd TensAI_Office_Addon
npm install

# Configure environment
cp env.example .env
# Edit .env with your configuration

# Build and start
npm run build
npm run dev-server
```

## 🛠️ Development Deployment

### 1. Local Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev-server
```

The development server will start on `https://localhost:3000`

### 2. Sideload Add-in for Testing

```bash
# Sideload the add-in
npm run sideload
```

This will open Office and allow you to test the add-in locally.

### 3. Validate Manifest

```bash
# Validate the manifest file
npm run validate
```

## 🌐 Production Deployment

### 1. Build Production Version

```bash
# Build optimized production version
npm run build
```

This creates a `dist/` folder with optimized files.

### 2. Deploy to Web Server

Upload the contents of the `dist/` folder to your web server:

```bash
# Example using rsync
rsync -avz dist/ user@your-server.com:/var/www/tensai-office-addon/

# Example using scp
scp -r dist/* user@your-server.com:/var/www/tensai-office-addon/
```

### 3. Update Manifest for Production

Update `manifest.xml` with production URLs:

```xml
<!-- Change from localhost to production domain -->
<SourceLocation DefaultValue="https://your-domain.com/taskpane.html"/>
<bt:Url id="Commands.Url" DefaultValue="https://your-domain.com/commands.html"/>
<bt:Url id="Taskpane.Url" DefaultValue="https://your-domain.com/taskpane.html"/>
```

### 4. Configure Web Server

#### Apache Configuration
```apache
<VirtualHost *:443>
    ServerName your-domain.com
    DocumentRoot /var/www/tensai-office-addon
    
    SSLEngine on
    SSLCertificateFile /path/to/certificate.crt
    SSLCertificateKeyFile /path/to/private.key
    
    # CORS headers for Office Add-ins
    Header always set Access-Control-Allow-Origin "*"
    Header always set Access-Control-Allow-Methods "GET, POST, OPTIONS"
    Header always set Access-Control-Allow-Headers "Content-Type, Authorization"
    
    # MIME types
    AddType application/xml .xml
    AddType text/html .html
    AddType application/javascript .js
    AddType text/css .css
</VirtualHost>
```

#### Nginx Configuration
```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;
    root /var/www/tensai-office-addon;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    # CORS headers
    add_header Access-Control-Allow-Origin "*" always;
    add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
    
    # MIME types
    location ~* \.(xml|html|js|css)$ {
        add_header Content-Type application/xml;
    }
}
```

### 5. Install in Office 365

#### Method 1: Office 365 Admin Center
1. Go to [Office 365 Admin Center](https://admin.microsoft.com)
2. Navigate to **Settings** > **Integrated apps**
3. Click **Upload custom apps**
4. Upload your `manifest.xml` file
5. Assign to users or groups

#### Method 2: SharePoint App Catalog
1. Go to your SharePoint Admin Center
2. Navigate to **More features** > **Apps** > **App Catalog**
3. Upload your `manifest.xml` file
4. Deploy to your organization

#### Method 3: Centralized Deployment
1. Use PowerShell to deploy:
```powershell
# Connect to Office 365
Connect-MsolService

# Deploy the add-in
New-MsolServicePrincipal -ServicePrincipalNames @("https://your-domain.com/manifest.xml")
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file with your configuration:

```env
# TensAI API Configuration
TENSAI_BASE_URL=https://dev2.tens-ai.com/api
TENSAI_API_KEY=your-production-api-key

# Production URLs
OFFICE_APP_DOMAIN=https://your-domain.com
DEV_SERVER_PORT=3000
DEV_SERVER_HTTPS=true
```

### API Configuration

Update the API configuration in `src/taskpane/taskpane.js`:

```javascript
const API_CONFIG = {
    baseUrl: process.env.TENSAI_BASE_URL || 'https://dev2.tens-ai.com/api',
    apiKey: process.env.TENSAI_API_KEY || 'your-api-key-here',
    // ... other configuration
};
```

## 🔒 Security Considerations

### 1. HTTPS Requirements
- Office Add-ins require HTTPS in production
- Use valid SSL certificates
- Ensure all resources are served over HTTPS

### 2. API Security
- Store API keys securely
- Use environment variables for sensitive data
- Implement proper authentication

### 3. Content Security Policy
Add CSP headers to your web server:

```http
Content-Security-Policy: default-src 'self' https://appsforoffice.microsoft.com https://dev2.tens-ai.com; script-src 'self' 'unsafe-inline' https://appsforoffice.microsoft.com; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com;
```

### 4. CORS Configuration
Ensure proper CORS headers for Office Add-ins:

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

## 📊 Monitoring and Analytics

### 1. Error Tracking
Implement error tracking:

```javascript
// Add to your JavaScript files
window.addEventListener('error', function(e) {
    // Send error to your monitoring service
    console.error('Add-in Error:', e.error);
});
```

### 2. Usage Analytics
Track add-in usage:

```javascript
// Track module usage
function trackModuleUsage(module) {
    // Send analytics data
    console.log('Module used:', module);
}
```

### 3. Performance Monitoring
Monitor add-in performance:

```javascript
// Track API response times
const startTime = Date.now();
// ... API call
const endTime = Date.now();
console.log('API Response Time:', endTime - startTime);
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Add-in Not Loading
- Check manifest.xml URLs
- Verify HTTPS configuration
- Check browser console for errors
- Ensure Office.js is loading

#### 2. API Calls Failing
- Verify API key configuration
- Check network connectivity
- Validate API endpoint URLs
- Check CORS configuration

#### 3. Office Integration Issues
- Ensure Office.js is properly initialized
- Check Office application version
- Verify permissions in manifest
- Test in different Office applications

### Debug Mode

Enable debug mode for troubleshooting:

```javascript
// Add to your JavaScript files
window.DEBUG = true;

if (window.DEBUG) {
    console.log('Debug mode enabled');
    // Additional debug logging
}
```

### Logging

Implement proper logging:

```javascript
function log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
    
    // Send to logging service in production
    if (process.env.NODE_ENV === 'production') {
        // Send to your logging service
    }
}
```

## 🔄 Updates and Maintenance

### 1. Version Management
- Update version in `manifest.xml`
- Update version in `package.json`
- Document changes in CHANGELOG.md

### 2. Rolling Updates
- Deploy to staging environment first
- Test thoroughly before production
- Use blue-green deployment if possible

### 3. Rollback Plan
- Keep previous versions available
- Have rollback procedure documented
- Test rollback process regularly

## 📞 Support

### Getting Help
- Check the troubleshooting section
- Review Office Add-in documentation
- Contact TensAI support
- Check GitHub issues

### Reporting Issues
When reporting issues, include:
- Office application and version
- Browser and version
- Error messages
- Steps to reproduce
- Screenshots if applicable

---

**TensAI Office Add-in Deployment Guide** - Complete deployment instructions for development and production environments.
