# TensAI Office Add-in

A comprehensive AI-powered Office Add-in that integrates with Outlook, Word, PowerPoint, and Excel to provide intelligent assistance through various AI modules.

## 🚀 Features

### Core AI Modules
- **WebGPT**: AI-powered assistant for answering questions and providing information
- **Media Studio**: Generate images, videos, audio, and edit images using AI
- **Translator**: Translate text between multiple languages
- **Summarizer**: Summarize long documents and text content
- **OmniQuest**: Upload documents and ask questions using RAG (Retrieval-Augmented Generation)

### Office Integration
- **Outlook**: AI assistance for email composition and content generation
- **Word**: Document enhancement, translation, and summarization
- **PowerPoint**: Presentation content generation and media creation
- **Excel**: Data analysis assistance and content generation

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Office 365 subscription
- TensAI API access

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd TensAI_Office_Addon
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and configuration
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

## 🚀 Development

### Start Development Server
```bash
npm run dev-server
```

### Validate Manifest
```bash
npm run validate
```

### Sideload Add-in
```bash
npm run sideload
```

## 📁 Project Structure

```
TensAI_Office_Addon/
├── src/
│   ├── taskpane/
│   │   ├── taskpane.html      # Main UI
│   │   ├── taskpane.css       # Styles
│   │   └── taskpane.js        # Main logic
│   ├── commands/
│   │   ├── commands.html      # Commands UI
│   │   └── commands.js        # Commands logic
│   ├── services/
│   │   └── apiService.js      # API integration
│   └── utils/
│       └── officeUtils.js     # Office.js utilities
├── assets/
│   ├── icon-16.png           # 16x16 icon
│   ├── icon-32.png           # 32x32 icon
│   ├── icon-64.png           # 64x64 icon
│   └── icon-80.png           # 80x80 icon
├── manifest.xml              # Office Add-in manifest
├── webpack.config.js         # Webpack configuration
├── package.json              # Dependencies and scripts
└── README.md                 # This file
```

## 🔧 Configuration

### Environment Variables
Create a `.env` file with the following variables:

```env
# TensAI API Configuration
TENSAI_BASE_URL=https://dev2.tens-ai.com/api
TENSAI_API_KEY=your-api-key-here

# Development Configuration
DEV_SERVER_PORT=3000
DEV_SERVER_HTTPS=true
```

### API Endpoints
The add-in integrates with the following TensAI API endpoints:

- **WebGPT**: `/api/webchat`
- **Translator**: `/api/translate`
- **Summarizer**: `/api/summarize`
- **Media Studio**: 
  - Image Generation: `/api/generate-image`
  - Video Generation: `/api/generate-video`
  - Audio Generation: `/api/audiogen`
  - Image Editing: `/api/edit-image`
- **OmniQuest**: `/api/omniQuest`
- **File Upload**: `/api/upload`

## 📱 Usage

### Installing the Add-in

1. **Development Installation**
   - Run `npm run sideload` to sideload the add-in for development
   - The add-in will appear in the Office ribbon

2. **Production Installation**
   - Deploy the add-in to your web server
   - Update the manifest.xml with production URLs
   - Install through Office 365 Admin Center

### Using the Add-in

1. **Open Office Application** (Word, Excel, PowerPoint, or Outlook)
2. **Click TensAI Assistant** in the ribbon
3. **Select AI Module** from the main menu
4. **Follow the prompts** for each module

### Module-Specific Usage

#### WebGPT
- Type your question in the text area
- Click "Ask WebGPT" to get AI-powered responses
- Insert responses directly into your document

#### Media Studio
- Choose media type (Image, Video, Audio, Image to Image)
- Enter prompts for generation
- Upload base images for editing
- Insert generated media into documents

#### Translator
- Select text in your document
- Choose target language
- Click "Translate Selected Text"
- Replace original text with translation

#### Summarizer
- Select text to summarize
- Click "Summarize Selected Text"
- Insert summary into document

#### OmniQuest
- Upload document (PDF, Word, Excel, PowerPoint, etc.)
- Ask questions about the document
- Get AI-powered answers based on document content

## 🔒 Security

- All API calls use HTTPS
- API keys are stored securely
- File uploads are validated
- Content is processed securely

## 🐛 Troubleshooting

### Common Issues

1. **Add-in not loading**
   - Check manifest.xml for correct URLs
   - Ensure HTTPS is enabled
   - Verify Office.js is loading

2. **API calls failing**
   - Check API key configuration
   - Verify network connectivity
   - Check API endpoint URLs

3. **Office integration issues**
   - Ensure Office.js is properly initialized
   - Check Office application version
   - Verify permissions in manifest

### Debug Mode

Enable debug mode by setting:
```javascript
window.DEBUG = true;
```

## 📊 API Integration

### Request Format
All API requests follow this format:

```javascript
{
  "endpoint": "/api/endpoint",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json",
    "Authorization": "Bearer your-api-key"
  },
  "body": {
    // Request data
  }
}
```

### Response Format
API responses follow this format:

```javascript
{
  "success": true,
  "data": {
    // Response data
  },
  "error": null
}
```

## 🚀 Deployment

### Development Deployment
1. Run `npm run build`
2. Start development server: `npm run dev-server`
3. Sideload add-in: `npm run sideload`

### Production Deployment
1. Build production version: `npm run build`
2. Deploy to web server
3. Update manifest.xml with production URLs
4. Install through Office 365 Admin Center

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For support and questions:
- Email: support@tens-ai.com
- Documentation: https://docs.tens-ai.com
- Issues: GitHub Issues

## 🔄 Updates

### Version 1.0.0
- Initial release
- Support for all 5 AI modules
- Integration with Outlook, Word, PowerPoint, Excel
- Full Office.js integration
- Responsive UI design

---

**TensAI Office Add-in** - Bringing AI-powered productivity to Microsoft Office applications.
