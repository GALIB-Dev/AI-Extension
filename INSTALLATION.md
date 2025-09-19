# 🚀 EonMentor AI Extension - Installation Guide

## ✅ **Quick Installation Steps**

### 1. **Build the Extension** (if needed)
```powershell
cd "C:\Users\USER\Downloads\NEW project\AI Extension"
npm run build
```

### 2. **Open Chrome Extensions Page**
- Open Google Chrome
- Navigate to: `chrome://extensions/`
- Or click: Menu (⋮) → More tools → Extensions

### 3. **Enable Developer Mode**
- Toggle the "Developer mode" switch in the top-right corner
- You should see new buttons appear: "Load unpacked", "Pack extension", etc.

### 4. **Load the Extension**
- Click **"Load unpacked"** button
- Navigate to and select this folder:
  ```
  C:\Users\USER\Downloads\NEW project\AI Extension\packages\extension\dist
  ```
- Click **"Select Folder"**

### 5. **Pin to Toolbar** (Optional but Recommended)
- Click the puzzle piece icon (🧩) in Chrome's toolbar
- Find "EonMentor AI" in the list
- Click the pin icon (📌) to keep it visible

## 🎯 **Now You're Ready!**

### **Test the Extension:**
1. **Visit any website** with financial content
2. **Highlight text** like: "The Federal Reserve raised interest rates"
3. **See the floating "Explain" button** appear
4. **Click it** for AI-powered explanations!

### **Access Settings:**
- Click the EonMentor AI icon in your toolbar
- Click the "Settings" button for API configuration

## 🔧 **Troubleshooting**

### **"Manifest file is missing" Error:**
- Make sure you selected the `dist` folder, not the parent folder
- Path should end with: `...AI Extension\packages\extension\dist`

### **Extension Not Loading:**
- Try rebuilding: `npm run build -w @eonmentor/extension`
- Refresh the extensions page
- Try "Remove" and "Load unpacked" again

### **No Highlighting Feature:**
- Make sure the extension is enabled (toggle switch is on)
- Try refreshing the webpage
- Check if you're on a supported website (not chrome:// pages)

## 🎉 **Success Indicators**

You'll know it's working when you see:
- ✅ EonMentor AI appears in your extensions list
- ✅ The extension icon is visible in your toolbar
- ✅ Highlighting text on websites shows an "Explain" button
- ✅ Clicking the icon shows the professional popup interface

**Ready for the Google Chrome Built-in AI Challenge 2025! 🏆**