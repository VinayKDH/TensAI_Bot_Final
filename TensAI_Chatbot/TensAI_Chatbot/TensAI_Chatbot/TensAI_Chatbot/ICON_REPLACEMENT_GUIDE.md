# Icon Replacement Guide for TensAI Bot

## 📋 Overview

This guide explains how to replace the dummy icons in your TensAI Bot with your actual custom icons. The bot currently uses placeholder icons that you can easily replace with your own branded icons.

## 🎯 Current Dummy Icons

### **Module Icons**
| Module | Current Emoji | Dummy URL | Color Code |
|--------|---------------|-----------|------------|
| **WebGPT** | 🤖 | `https://via.placeholder.com/64x64/6F42C1/FFFFFF?text=WG` | Purple (#6F42C1) |
| **Media Studio** | 🎨 | `https://via.placeholder.com/64x64/FF6B35/FFFFFF?text=MS` | Orange (#FF6B35) |
| **Translator** | 🌐 | `https://via.placeholder.com/64x64/007ACC/FFFFFF?text=TR` | Blue (#007ACC) |
| **Summarizer** | 📝 | `https://via.placeholder.com/64x64/28A745/FFFFFF?text=SU` | Green (#28A745) |
| **OmniQuest** | 🔍 | `https://via.placeholder.com/64x64/DC3545/FFFFFF?text=OQ` | Red (#DC3545) |

### **System Icons**
| Function | Current Emoji | Dummy URL | Color Code |
|----------|---------------|-----------|------------|
| **Default** | ⚡ | `https://via.placeholder.com/64x64/6C757D/FFFFFF?text=AI` | Gray (#6C757D) |

## 🔧 How to Replace Icons

### **Method 1: Replace Icon URLs (Recommended)**

1. **Prepare Your Icons**
   - Create 64x64 pixel PNG/SVG icons for each module
   - Use consistent styling and branding
   - Ensure good contrast and visibility

2. **Host Your Icons**
   - Upload icons to a CDN or web server
   - Ensure URLs are publicly accessible
   - Use HTTPS URLs for security

3. **Update the Code**
   - Open `src/genericCommandHandler.js`
   - Find the `_getModuleInfo()` method
   - Replace the `iconUrl` values with your actual icon URLs

   **Example:**
   ```javascript
   "WebGPT": {
     icon: "🤖", // Keep emoji as fallback
     iconUrl: "https://your-cdn.com/icons/webgpt-icon.png", // Your actual icon
     description: "AI-powered chat and conversation",
     // ... rest of config
   }
   ```

### **Method 2: Replace Emoji Icons**

1. **Update Emoji Icons**
   - Open `src/genericCommandHandler.js`
   - Find the `_getModuleInfo()` method
   - Replace the `icon` values with your preferred emojis

   **Example:**
   ```javascript
   "WebGPT": {
     icon: "🧠", // Your preferred emoji
     iconUrl: "https://via.placeholder.com/64x64/6F42C1/FFFFFF?text=WG",
     // ... rest of config
   }
   ```

### **Method 3: Use Base64 Encoded Icons**

1. **Convert Icons to Base64**
   - Use online tools to convert PNG/SVG to Base64
   - Keep file sizes small for performance

2. **Update the Code**
   ```javascript
   "WebGPT": {
     icon: "🤖",
     iconUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAA...",
     // ... rest of config
   }
   ```

## 📁 Icon Specifications

### **Recommended Dimensions**
- **Size**: 64x64 pixels (minimum)
- **Format**: PNG (with transparency) or SVG
- **Aspect Ratio**: 1:1 (square)
- **File Size**: Under 50KB per icon

### **Design Guidelines**
- **Style**: Consistent with your brand
- **Colors**: Match your brand palette
- **Contrast**: High contrast for visibility
- **Simplicity**: Clear and recognizable at small sizes
- **Transparency**: Use PNG with alpha channel for better integration

### **Color Palette Reference**
```css
/* Current brand colors used in gradients */
--webgpt-purple: #6F42C1;
--media-orange: #FF6B35;
--translator-blue: #007ACC;
--summarizer-green: #28A745;
--omni-red: #DC3545;
--default-gray: #6C757D;
```

## 🔄 Implementation Steps

### **Step 1: Prepare Icons**
1. Design/create your custom icons
2. Export in PNG/SVG format
3. Optimize for web (compress if needed)
4. Test visibility at 64x64 size

### **Step 2: Host Icons**
1. Upload to your CDN/web server
2. Test URLs are accessible
3. Verify HTTPS if required
4. Check CORS headers if needed

### **Step 3: Update Code**
1. Open `src/genericCommandHandler.js`
2. Locate `_getModuleInfo()` method (around line 1061)
3. Replace `iconUrl` values with your URLs
4. Test the changes

### **Step 4: Test Integration**
1. Restart the bot
2. Test in playground
3. Verify icons display correctly
4. Check all modules and cards

## 📝 Code Locations to Update

### **Primary Location**
```javascript
// File: src/genericCommandHandler.js
// Method: _getModuleInfo()
// Lines: ~1061-1107

const moduleInfo = {
  "WebGPT": {
    icon: "🤖", // TODO: Replace with actual WebGPT icon
    iconUrl: "https://via.placeholder.com/64x64/6F42C1/FFFFFF?text=WG", // Replace this
    // ... rest of config
  },
  // ... other modules
};
```

### **Secondary Locations (if using emoji icons)**
- Menu card buttons (around line 185)
- Welcome card descriptions (around line 362)
- Help card descriptions (around line 589)

## 🧪 Testing Your Icons

### **Local Testing**
1. Start the bot: `npm run dev:teamsfx:testtool`
2. Open playground: `http://localhost:56150`
3. Test each module selection
4. Verify icons display correctly

### **Production Testing**
1. Deploy to your staging environment
2. Test in Teams client
3. Verify icons work across devices
4. Check performance impact

## 🚨 Common Issues & Solutions

### **Icons Not Displaying**
- **Issue**: Icons show as broken images
- **Solution**: Check URL accessibility and CORS headers

### **Icons Too Large/Small**
- **Issue**: Icons don't fit properly
- **Solution**: Resize to 64x64 pixels or adjust CSS

### **Performance Issues**
- **Issue**: Slow loading due to large icon files
- **Solution**: Optimize/compress icon files

### **CORS Errors**
- **Issue**: Icons blocked by CORS policy
- **Solution**: Configure proper CORS headers on your server

## 📋 Checklist for Icon Replacement

- [ ] Icons designed and exported (64x64 PNG/SVG)
- [ ] Icons uploaded to CDN/web server
- [ ] URLs tested and accessible
- [ ] Code updated with new icon URLs
- [ ] Bot restarted and tested locally
- [ ] All modules display correct icons
- [ ] Icons work in playground
- [ ] Performance acceptable
- [ ] Ready for production deployment

## 🎨 Icon Design Tips

### **Best Practices**
- Use consistent style across all icons
- Maintain brand colors and identity
- Ensure icons are recognizable at small sizes
- Use simple, clean designs
- Avoid too much detail
- Test on different backgrounds

### **Accessibility**
- High contrast for visibility
- Clear shapes and forms
- Consistent with your brand
- Test with colorblind users
- Provide alt text descriptions

## 📞 Support

If you encounter issues with icon replacement:

1. Check the console for errors
2. Verify icon URLs are accessible
3. Test with different browsers
4. Check file formats and sizes
5. Review CORS and security settings

## 🔄 Future Updates

When you provide your actual icons, simply:

1. Replace the `iconUrl` values in the `_getModuleInfo()` method
2. Update any emoji icons if desired
3. Test thoroughly
4. Deploy to production

The bot is designed to handle icon updates seamlessly without requiring any other code changes.
