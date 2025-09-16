# TensAI Project Structure

## 📁 Directory Overview

```
TensAIBotFinal/
├── 📁 TensAI_Chatbot/                    # Microsoft Teams Bot
│   ├── 📁 src/                          # Bot source code
│   │   ├── 📁 adaptiveCards/            # Adaptive card templates
│   │   ├── 📁 internal/                 # Internal utilities
│   │   ├── 📁 services/                 # API services
│   │   ├── 📄 adminCommandHandler.js    # Admin commands
│   │   ├── 📄 genericCommandHandler.js  # Main command handler
│   │   ├── 📄 index.js                  # Bot entry point
│   │   ├── 📄 teamsBot.js               # Teams bot configuration
│   │   └── 📄 feedback_store.json       # Feedback storage
│   ├── 📁 appPackage/                   # Teams app package
│   │   ├── 📄 manifest.json             # Teams app manifest
│   │   ├── 📄 color.png                 # App icon (color)
│   │   └── 📄 outline.png               # App icon (outline)
│   ├── 📁 infra/                        # Azure infrastructure
│   │   ├── 📁 botRegistration/          # Bot registration templates
│   │   ├── 📄 azure.bicep               # Azure infrastructure
│   │   └── 📄 azure.parameters.json     # Azure parameters
│   ├── 📁 env/                          # Environment configurations
│   ├── 📁 __tests__/                    # Test files
│   ├── 📁 devTools/                     # Development tools
│   ├── 📄 package.json                  # Bot dependencies
│   ├── 📄 package-lock.json             # Dependency lock file
│   ├── 📄 web.config                    # IIS configuration
│   ├── 📄 m365agents.yml                # M365 Agents config
│   ├── 📄 m365agents.local.yml          # Local development config
│   ├── 📄 m365agents.playground.yml     # Playground config
│   ├── 📄 .gitignore                    # Git ignore rules
│   ├── 📄 .localConfigs                 # Local configuration
│   ├── 📄 .localConfigs.playground      # Playground configuration
│   ├── 📄 .appserviceIgnore             # App service ignore
│   ├── 📄 deploy.sh                     # Deployment script
│   ├── 📄 README.md                     # Bot documentation
│   ├── 📄 CODE_OVERVIEW.md              # Code overview
│   ├── 📄 API_INTEGRATION_SUMMARY.md    # API integration guide
│   ├── 📄 FINAL_DEPLOYMENT_SUMMARY.md   # Deployment guide
│   ├── 📄 PRODUCTION_CONFIG.md          # Production configuration
│   ├── 📄 DEPLOYMENT_CONFIG.md          # Deployment configuration
│   ├── 📄 DEPLOYMENT_ARCHITECTURE.md    # Architecture overview
│   ├── 📄 WEBGPT_IMPLEMENTATION_SUMMARY.md # WebGPT module details
│   ├── 📄 WEBGPT_CONVERSATION_FLOW.md   # Conversation flow
│   ├── 📄 DUMMY_ICONS_SUMMARY.md        # Icon information
│   ├── 📄 ICON_REPLACEMENT_GUIDE.md     # Icon replacement guide
│   └── 📄 BEAUTIFICATION_SUMMARY.md     # UI improvements
│
├── 📁 TensAI_Office_Addon/              # Office Add-in
│   ├── 📁 src/                          # Add-in source code
│   │   ├── 📁 taskpane/                 # Task pane interface
│   │   │   ├── 📄 taskpane.html         # HTML structure
│   │   │   ├── 📄 taskpane.css          # Styling
│   │   │   └── 📄 taskpane.js           # Main logic
│   │   ├── 📁 commands/                 # Ribbon commands
│   │   │   ├── 📄 commands.html         # Command interface
│   │   │   └── 📄 commands.js           # Command logic
│   │   ├── 📁 services/                 # API services
│   │   │   └── 📄 apiService.js         # TensAI API integration
│   │   └── 📁 utils/                    # Utility functions
│   │       └── 📄 officeUtils.js        # Office.js helpers
│   ├── 📁 assets/                       # Icons and images
│   │   ├── 📄 icon-16.png               # 16x16 icon
│   │   ├── 📄 icon-32.png               # 32x32 icon
│   │   ├── 📄 icon-64.png               # 64x64 icon
│   │   └── 📄 icon-80.png               # 80x80 icon
│   ├── 📁 dist/                         # Built files (generated)
│   ├── 📁 test-results/                 # Test outputs (generated)
│   ├── 📁 coverage/                     # Test coverage (generated)
│   ├── 📁 node_modules/                 # Dependencies (generated)
│   ├── 📄 manifest.xml                  # Office add-in manifest
│   ├── 📄 package.json                  # Add-in dependencies
│   ├── 📄 package-lock.json             # Dependency lock file
│   ├── 📄 webpack.config.js             # Build configuration
│   ├── 📄 env.example                   # Environment template
│   ├── 📄 deploy.sh                     # Deployment script
│   ├── 📄 test.sh                       # Testing script
│   ├── 📄 README.md                     # Add-in documentation
│   ├── 📄 COMPLETE_DEPLOYMENT_GUIDE.md  # Full deployment guide
│   ├── 📄 DEPLOYMENT_CHECKLIST.md       # Deployment checklist
│   ├── 📄 DEPLOYMENT_SUMMARY.md         # Deployment overview
│   ├── 📄 INTEGRATION_GUIDE.md          # Integration guide
│   ├── 📄 QUICK_START_GUIDE.md          # Quick start guide
│   ├── 📄 TESTING_PROCEDURES.md         # Testing procedures
│   ├── 📄 DEPLOYMENT.md                 # Basic deployment guide
│   └── 📄 OFFICE_ADDON_SUMMARY.md       # Add-in summary
│
├── 📄 README.md                         # Main project README
├── 📄 PROJECT_STRUCTURE.md              # This file
├── 📄 .gitignore                        # Git ignore rules
└── 📄 apis.pdf                          # API documentation
```

---

## 🎯 Project Separation

### TensAI_Chatbot
**Purpose**: Microsoft Teams bot for chat-based AI interactions
- **Target Platform**: Microsoft Teams
- **Interface**: Adaptive Cards in chat
- **Deployment**: Azure Bot Service
- **Use Case**: Team collaboration, quick AI assistance

### TensAI_Office_Addon
**Purpose**: Office add-in for document-based AI interactions
- **Target Platform**: Microsoft Office (Word, Excel, PowerPoint, Outlook)
- **Interface**: Task pane and ribbon commands
- **Deployment**: Web hosting (Azure, AWS, custom)
- **Use Case**: Document creation, content enhancement

---

## 🔧 Development Workflow

### Working on Teams Chatbot
```bash
cd TensAI_Chatbot
npm install
npm run dev
# Test in Teams or Bot Framework Emulator
```

### Working on Office Add-in
```bash
cd TensAI_Office_Addon
npm install
npm run dev
# Test in Office applications
```

### Working on Both Projects
```bash
# Terminal 1 - Teams Bot
cd TensAI_Chatbot && npm run dev

# Terminal 2 - Office Add-in
cd TensAI_Office_Addon && npm run dev
```

---

## 📦 Dependencies

### Shared Dependencies
- **Node.js**: 16.x or higher
- **npm**: 8.x or higher
- **TensAI API**: Valid API credentials

### Teams Chatbot Specific
- **Microsoft Teams AI SDK**
- **Express.js**
- **Azure Bot Service**

### Office Add-in Specific
- **Office.js**
- **Webpack**
- **Office 365 APIs**

---

## 🚀 Deployment

### Teams Chatbot Deployment
1. **Azure Bot Service** registration
2. **App Service** deployment
3. **Teams App** registration
4. **Manifest** upload to Teams

### Office Add-in Deployment
1. **Web hosting** setup (Azure/AWS/custom)
2. **HTTPS** configuration
3. **Office 365** admin center registration
4. **Manifest** upload to Office 365

---

## 🧪 Testing

### Teams Chatbot Testing
- **Bot Framework Emulator**
- **Teams client** testing
- **Unit tests** for command handlers
- **Integration tests** for API calls

### Office Add-in Testing
- **Office applications** testing
- **Cross-platform** compatibility
- **Unit tests** for utilities
- **Integration tests** for Office.js

---

## 📚 Documentation

### Project-Level Documentation
- **README.md**: Main project overview
- **PROJECT_STRUCTURE.md**: This file

### Teams Chatbot Documentation
- **README.md**: Bot setup and usage
- **CODE_OVERVIEW.md**: Codebase overview
- **API_INTEGRATION_SUMMARY.md**: API integration
- **FINAL_DEPLOYMENT_SUMMARY.md**: Deployment guide

### Office Add-in Documentation
- **README.md**: Add-in setup and usage
- **COMPLETE_DEPLOYMENT_GUIDE.md**: Full deployment guide
- **QUICK_START_GUIDE.md**: 15-minute setup
- **TESTING_PROCEDURES.md**: Testing guide
- **INTEGRATION_GUIDE.md**: Office 365 integration

---

## 🔒 Security

### Common Security Measures
- **API authentication** with tokens
- **Input validation** and sanitization
- **HTTPS enforcement** for all communications
- **Rate limiting** to prevent abuse

### Teams Chatbot Security
- **Bot Framework** authentication
- **Azure AD** integration
- **Secure token** storage

### Office Add-in Security
- **Azure AD** authentication
- **CORS** configuration
- **Security headers** implementation

---

## 📊 Monitoring

### Teams Chatbot Monitoring
- **Application Insights** integration
- **Bot analytics** and usage tracking
- **Error logging** and monitoring

### Office Add-in Monitoring
- **Performance monitoring** for API calls
- **Error tracking** and reporting
- **Usage analytics** for user interactions

---

## 🔄 Maintenance

### Regular Updates
- **Dependency updates** for security
- **API endpoint** updates
- **Feature enhancements** and bug fixes
- **Documentation** updates

### Version Management
- **Semantic versioning** for both projects
- **Changelog** maintenance
- **Release notes** for users

---

## 🆘 Support

### Getting Help
- **Documentation**: Comprehensive guides in each project
- **Email**: support@tens-ai.com
- **GitHub Issues**: For bug reports and feature requests
- **Community Forum**: For user discussions

### Troubleshooting
- **Common issues** documented in each project's README
- **Debug guides** for development
- **Performance optimization** tips

---

*Last Updated: January 2024*
*Version: 1.0.0*
