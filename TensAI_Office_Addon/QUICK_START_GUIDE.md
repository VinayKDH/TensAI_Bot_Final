# TensAI Office Add-in - Quick Start Guide

## 🚀 Get Started in 15 Minutes

This guide will help you get the TensAI Office Add-in up and running quickly for development and testing.

---

## Prerequisites Checklist

Before you begin, ensure you have:

- [ ] **Node.js 16.x+** installed ([Download here](https://nodejs.org/))
- [ ] **Office 365** account (personal or business)
- [ ] **Code editor** (VS Code recommended)
- [ ] **Internet connection** for API calls
- [ ] **TensAI API access** (contact support for credentials)

---

## Step 1: Setup (5 minutes)

### 1.1 Navigate to Project
```bash
cd /Users/vinaykumar/AgentsToolkitProjects/TensAIBotFinal/TensAI_Office_Addon
```

### 1.2 Install Dependencies
```bash
npm install
```

### 1.3 Configure Environment
```bash
# Copy environment template
cp env.example .env

# Edit with your settings
nano .env
```

**Minimum required settings:**
```env
TENSAI_BASE_URL=https://dev2.tens-ai.com
TENSAI_API_KEY=your_api_key_here
NODE_ENV=development
```

---

## Step 2: Start Development Server (2 minutes)

### 2.1 Start the Server
```bash
npm run dev
```

**Expected output:**
```
Office Add-in development server running on port 3000
TensAI Office Add-in ready for testing
```

### 2.2 Verify Server is Running
Open your browser and go to: `http://localhost:3000`

You should see the TensAI add-in interface.

---

## Step 3: Test in Office (5 minutes)

### 3.1 Open Office Application
- Open **Word**, **Excel**, **PowerPoint**, or **Outlook**
- Go to **Insert** tab → **Add-ins** → **My Add-ins**

### 3.2 Upload Add-in
- Click **Upload from file**
- Select `manifest.xml` from your project folder
- Click **Upload**

### 3.3 Launch Add-in
- The TensAI add-in should appear in your add-ins list
- Click on it to launch the task pane

---

## Step 4: Test Basic Functionality (3 minutes)

### 4.1 Test WebGPT Module
1. **Select text** in your Office document
2. **Click "WebGPT"** in the add-in
3. **Enter a query**: "Summarize this text"
4. **Click "Generate"**
5. **Verify response** appears in the task pane

### 4.2 Test Content Insertion
1. **Click "Insert into Document"**
2. **Verify content** is inserted at cursor position
3. **Check formatting** is preserved

---

## 🎉 Success!

If you've completed all steps successfully, you should see:
- ✅ Add-in loads without errors
- ✅ WebGPT module responds to queries
- ✅ Content can be inserted into Office documents
- ✅ No console errors in browser developer tools

---

## 🔧 Troubleshooting

### Common Issues

#### Issue: Add-in doesn't load
**Solution:**
```bash
# Check if server is running
curl http://localhost:3000

# Restart development server
npm run dev
```

#### Issue: API calls failing
**Solution:**
```bash
# Test API connectivity
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://dev2.tens-ai.com/api/health

# Check environment variables
cat .env
```

#### Issue: Office.js errors
**Solution:**
- Ensure you're using a supported Office version
- Check browser console for JavaScript errors
- Try refreshing the add-in

### Debug Mode
```bash
# Enable debug logging
export DEBUG=true
npm run dev
```

---

## 📚 Next Steps

### For Development
1. **Read the full documentation**: `README.md`
2. **Explore the codebase**: `src/` folder
3. **Test all modules**: WebGPT, Media Studio, Translator, etc.
4. **Customize for your needs**: Modify `src/taskpane/taskpane.js`

### For Production
1. **Follow deployment guide**: `COMPLETE_DEPLOYMENT_GUIDE.md`
2. **Set up production environment**: `PRODUCTION_CONFIG.md`
3. **Configure Office 365**: `INTEGRATION_GUIDE.md`
4. **Run comprehensive tests**: `TESTING_PROCEDURES.md`

---

## 🆘 Need Help?

### Quick Support
- **Documentation**: Check the `README.md` and other guides
- **Code Issues**: Review the troubleshooting section
- **API Problems**: Verify your API credentials and connectivity

### Getting More Help
- **Email**: support@tens-ai.com
- **Documentation**: https://docs.tens-ai.com
- **Issues**: Create a GitHub issue for bugs

---

## 📋 Quick Reference

### Essential Commands
```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm test            # Run tests

# Office Integration
# Upload manifest.xml to Office 365 Admin Center
# Or use "Upload from file" in Office applications
```

### Key Files
- `manifest.xml` - Office add-in configuration
- `src/taskpane/taskpane.js` - Main add-in logic
- `src/services/apiService.js` - API integration
- `.env` - Environment configuration

### Important URLs
- **Development**: http://localhost:3000
- **TensAI API**: https://dev2.tens-ai.com
- **Office Admin**: https://admin.microsoft.com

---

## 🎯 What's Next?

Now that you have the basic setup working, you can:

1. **Explore all modules** (Media Studio, Translator, Summarizer, OmniQuest)
2. **Customize the interface** to match your needs
3. **Integrate with your Office 365 tenant**
4. **Deploy to production** for your users

**Happy coding! 🚀**

---

*Last updated: January 2024*
*Version: 1.0.0*
