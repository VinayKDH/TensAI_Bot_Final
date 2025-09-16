# TensAI Teams Chatbot

> **AI-Powered Microsoft Teams Bot for Enhanced Productivity**

The TensAI Teams Chatbot is a comprehensive Microsoft Teams bot that provides AI-driven capabilities directly within Teams conversations. It offers five powerful modules for text generation, media creation, translation, summarization, and document analysis.

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your configuration

# 3. Start development server
npm run dev

# 4. Test in Teams
# Upload appPackage/manifest.json to Teams
```

---

## 🎨 Features

### 🤖 WebGPT
- AI-powered text generation and conversation
- Context-aware responses
- Multi-language support
- Conversation history

### 🎨 Media Studio
- **Image Generator**: Create images from text prompts
- **Video Generator**: Generate videos from descriptions  
- **Audio Generator**: Create audio content
- **Image to Image**: Edit and transform existing images

### 🌍 Translator
- **Text Translation**: Translate selected text
- **Document Translation**: Translate entire documents
- **Multi-language Support**: 100+ languages
- **Context Preservation**: Maintain formatting

### 📝 Summarizer
- **Intelligent Summarization**: Extract key points
- **Customizable Length**: Short, medium, or long summaries
- **Multiple Formats**: Bullet points, paragraphs, structured
- **Context Awareness**: Understand document context

### 🔍 OmniQuest
- **Document Analysis**: Deep document understanding
- **Q&A System**: Ask questions about your documents
- **Multi-format Support**: PDF, Word, Excel, PowerPoint
- **Intelligent Search**: Find relevant information quickly

---

## 🛠️ Technical Stack

- **Framework**: Microsoft Teams AI SDK
- **Runtime**: Node.js with Express.js
- **UI**: Adaptive Cards
- **API Integration**: TensAI REST APIs
- **Authentication**: Microsoft Bot Framework
- **Deployment**: Azure Bot Service

---

## 📋 Prerequisites

- **Node.js**: 16.x or higher
- **npm**: 8.x or higher
- **Microsoft Teams**: Personal or business account
- **Azure Bot Service**: Bot registration
- **TensAI API**: Valid API credentials

---

## 🔧 Installation

### 1. Clone and Setup
```bash
git clone <repository-url>
cd TensAI_Chatbot
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Development
```bash
npm run dev
# Bot will be available for testing
```

### 4. Deploy to Azure
```bash
./deploy.sh
# Follow deployment prompts
```

---

## 📚 Documentation

- **[Code Overview](CODE_OVERVIEW.md)** - Complete codebase overview
- **[API Integration](API_INTEGRATION_SUMMARY.md)** - API endpoints and integration
- **[Deployment Guide](FINAL_DEPLOYMENT_SUMMARY.md)** - Production deployment
- **[Production Config](PRODUCTION_CONFIG.md)** - Production configuration
- **[WebGPT Implementation](WEBGPT_IMPLEMENTATION_SUMMARY.md)** - WebGPT module details

---

## 🚀 Deployment

### Azure Bot Service
1. **Register Bot** in Azure Portal
2. **Configure App Settings** with your credentials
3. **Deploy Code** to Azure App Service
4. **Update Bot Endpoint** in Azure Bot Service
5. **Upload Manifest** to Teams Admin Center

### Environment Variables
```env
MICROSOFT_APP_ID=your_bot_id
MICROSOFT_APP_PASSWORD=your_bot_password
TENSAI_BASE_URL=https://dev2.tens-ai.com
TENSAI_API_KEY=your_api_key
```

---

## 🧪 Testing

### Development Testing
```bash
# Start development server
npm run dev

# Test in Teams
# Use Bot Framework Emulator or Teams client
```

### Production Testing
1. **Deploy to staging** environment
2. **Test all modules** thoroughly
3. **Verify API connectivity**
4. **Test user workflows**
5. **Deploy to production**

---

## 🔒 Security

- **Bot Authentication**: Microsoft Bot Framework
- **API Security**: Token-based authentication
- **Input Validation**: Comprehensive data sanitization
- **HTTPS Enforcement**: All communications encrypted
- **Rate Limiting**: Prevent abuse

---

## 📊 Monitoring

- **Application Insights**: Performance and error tracking
- **Bot Analytics**: Usage statistics and insights
- **API Monitoring**: Response times and error rates
- **User Feedback**: Built-in feedback system

---

## 🆘 Support

### Documentation
- **Complete guides** in the documentation files
- **API reference** for all endpoints
- **Troubleshooting** for common issues

### Getting Help
- **Email**: support@tens-ai.com
- **Documentation**: https://docs.tens-ai.com
- **GitHub Issues**: For bug reports

---

## 🔄 Updates

### Version Management
```bash
# Update version
npm version patch|minor|major

# Update dependencies
npm update

# Security audit
npm audit fix
```

### Release Process
1. **Update version** in package.json
2. **Run tests** to ensure quality
3. **Deploy to staging** for validation
4. **Deploy to production** and monitor
5. **Notify users** of new features

---

## 📈 Roadmap

### Upcoming Features
- **Enhanced AI Models**: More powerful language models
- **Additional Languages**: Extended translation support
- **Advanced Analytics**: Usage insights and reporting
- **Team Collaboration**: Shared workspaces and permissions

### Long-term Goals
- **Enterprise Features**: Advanced security and compliance
- **Custom Integrations**: Third-party service connections
- **AI Training**: Custom model training capabilities
- **Advanced Workflows**: Automated document processing

---

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. **Fork the repository**
2. **Create a feature branch**
3. **Make your changes**
4. **Add tests** for new functionality
5. **Submit a pull request**

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Microsoft** for Teams platform and Bot Framework
- **TensAI** for providing the AI services
- **Open Source Community** for various libraries and tools
- **Contributors** who help improve the project

---

## 📞 Contact

- **Project Maintainer**: TensAI Development Team
- **Email**: support@tens-ai.com
- **Website**: https://tens-ai.com
- **Documentation**: https://docs.tens-ai.com

---

**Ready to enhance your Teams experience with AI? Get started now! 🚀**

---

*Last Updated: January 2024*
*Version: 1.0.0*