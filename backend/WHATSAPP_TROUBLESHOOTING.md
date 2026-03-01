# WhatsApp Troubleshooting Guide

## Common Issues and Solutions

### 1. Connection Timeouts (10/10 attempts error)

If you're seeing the "WhatsApp client initialization timed out" error after 10/10 attempts, try these solutions:

#### Solution A: Use the Fix WhatsApp Script

We've created a specialized tool to fix WhatsApp connection issues:

```bash
# Navigate to backend directory
cd backend

# Run the fix script
node fix-whatsapp.js
```

This script will:
- Check for common issues with your WhatsApp connection
- Allow you to reset all session data
- Provide a simplified way to authenticate with a new QR code
- Diagnose and fix dependencies or configuration issues

#### Solution B: Manual Reset

If the script doesn't work, try these manual steps:

1. Stop the server completely
2. Delete the WhatsApp session data:
   ```
   rm -rf whatsapp-data/*
   ```
3. Restart the server and scan a fresh QR code

### 2. QR Code Never Appears

If the QR code doesn't appear:

1. Check that your server has necessary permissions
2. Verify that Puppeteer and its dependencies are installed:
   ```
   npm install puppeteer --save
   ```
3. Try using the non-headless mode by modifying `backend/config/whatsapp.js`:
   ```js
   // Change this line
   headless: false, // Set to false to see the browser
   ```

### 3. Authentication Failures

If you see "Authentication failed" errors:

1. Delete all session data using the fix script
2. Ensure your phone has a stable internet connection
3. Make sure WhatsApp on your phone is up to date
4. Try scanning with a different device if possible

### 4. Browser/Puppeteer Crashes

If you see browser-related errors:

1. Install all required dependencies:
   ```
   # For Ubuntu/Debian
   sudo apt-get install -y gconf-service libgbm-dev libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget
   
   # For CentOS
   sudo yum install pango.x86_64 libXcomposite.x86_64 libXcursor.x86_64 libXdamage.x86_64 libXext.x86_64 libXi.x86_64 libXtst.x86_64 cups-libs.x86_64 libXScrnSaver.x86_64 libXrandr.x86_64 GConf2.x86_64 alsa-lib.x86_64 atk.x86_64 gtk3.x86_64 ipa-gothic-fonts xorg-x11-fonts-100dpi xorg-x11-fonts-75dpi xorg-x11-utils xorg-x11-fonts-cyrillic xorg-x11-fonts-Type1 xorg-x11-fonts-misc
   
   # For Windows
   # No additional dependencies needed for most cases
   ```

2. Try reinstalling Puppeteer:
   ```
   npm uninstall puppeteer
   npm install puppeteer --save
   ```

### 5. Rate Limiting Issues

If you're experiencing rate limiting or message sending failures:

1. Add delays between messages (2-3 seconds minimum)
2. Limit the number of messages sent in quick succession
3. Ensure you're not sending identical messages repeatedly
4. Consider using the "Force Reconnect" button in the UI

## Advanced Troubleshooting

### Checking Logs

Check the application logs for detailed error messages:

```bash
# Check the last 100 lines of logs
tail -n 100 logs/app.log

# Search for WhatsApp-related errors
grep -i "whatsapp" logs/app.log | grep -i "error"
```

### Checking WhatsApp Web Status

Sometimes WhatsApp Web itself may have issues. Check if you can access [web.whatsapp.com](https://web.whatsapp.com/) directly from your server (if it has a browser).

### Environment Variables

You can configure some aspects of the WhatsApp client through environment variables:

```bash
# Disable WhatsApp service completely
DISABLE_WHATSAPP_SERVICE=true

# Set custom path for Chrome executable
PUPPETEER_EXECUTABLE_PATH=/path/to/chrome
```

## Need More Help?

If you're still experiencing issues:

1. Check that your WhatsApp account on your phone is active and working
2. Make sure you have a stable internet connection on both server and phone
3. Try the connection from a different network
4. Contact our support team with the error logs and details about your environment

---

This troubleshooting guide covers most common WhatsApp connectivity issues. If you continue to experience problems, please contact support with detailed information about your server environment and the specific errors you're seeing. 