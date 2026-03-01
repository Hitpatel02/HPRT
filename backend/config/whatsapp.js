// const { Client, LocalAuth } = require("whatsapp-web.js");
// const qrcode = require("qrcode-terminal");
// const path = require("path");
// const fs = require('fs');
// const { logger } = require('../utils/logger');

// // Create an absolute path outside the backend directory to store WhatsApp session data
// const sessionPath = path.resolve(__dirname, '../../whatsapp-data');

// // Ensure the directory exists
// if (!fs.existsSync(sessionPath)) {
//     console.log(`Creating WhatsApp session directory at: ${sessionPath}`);
//     fs.mkdirSync(sessionPath, { recursive: true });
// }

// // Configuration for retries and timeouts
// const MAX_CONNECTION_ATTEMPTS = 3;  // Maximum number of full connection attempts
// const MAX_QR_RETRIES = 5;           // Increased from 3 to 5
// const QR_REFRESH_INTERVAL = 45000;  // Increased from 30000 to 45000 ms
// const CONNECTION_TIMEOUT = 120000;  // 2 minutes total connection timeout

// // WhatsApp Client Setup with improved configuration for hosted environments
// const client = new Client({
//     authStrategy: new LocalAuth({ 
//         dataPath: sessionPath,
//         clientId: 'hpfp-client' // Add a consistent client ID
//     }),
//     puppeteer: { 
//         headless: true, // Run in headless mode for server deployment
//         args: [
//             "--no-sandbox", 
//             "--disable-setuid-sandbox",
//             "--disable-dev-shm-usage",
//             "--disable-accelerated-2d-canvas",
//             "--no-first-run",
//             "--no-zygote",
//             "--disable-gpu",
//             "--disable-extensions",
//             "--disable-component-extensions-with-background-pages",
//             "--disable-default-apps",
//             "--mute-audio",
//             "--hide-scrollbars",
//             // Additional args to improve reliability
//             "--disable-web-security",
//             "--allow-running-insecure-content",
//             "--disable-features=site-per-process",
//             "--ignore-certificate-errors"
//         ],
//         executablePath: process.env.PUPPETEER_EXECUTABLE_PATH, // Can set Chrome path in env variable
//         timeout: CONNECTION_TIMEOUT // Increase connection timeout
//     },
//     restartOnAuthFail: true, // Automatically restart if authentication fails
//     qrMaxRetries: MAX_QR_RETRIES,
//     qrRefreshIntervalMs: QR_REFRESH_INTERVAL
// });

// // Flag to track initialization state
// let isInitializing = false;
// let isReady = false;
// let closeInProgress = false;
// let connectionAttempts = 0;
// let connectionTimeout = null;
// let manualAuthCallback = null;

// // Generate QR Code for first-time login
// client.on("qr", (qr) => {
//     logger.info("📱 Scan this QR code to log in to WhatsApp (will timeout in 60 seconds)");
//     console.log("📱 Scan this QR code to log in to WhatsApp (will timeout in 60 seconds):");
//     qrcode.generate(qr, { small: true });
    
//     // Save QR code to a file for easier access if needed
//     const qrFilePath = path.join(sessionPath, 'latest-qr.txt');
//     fs.writeFileSync(qrFilePath, qr);
//     logger.info(`QR code also saved to: ${qrFilePath}`);
// });

// client.on("ready", () => {
//     logger.info("WhatsApp client initialized successfully");
//     console.log("✅ WhatsApp client is ready!");
//     isReady = true;
//     isInitializing = false;
//     closeInProgress = false;
//     connectionAttempts = 0;
    
//     // Clear any pending timeouts
//     if (connectionTimeout) {
//         clearTimeout(connectionTimeout);
//         connectionTimeout = null;
//     }
    
//     // Save successful connection time
//     const connectionFile = path.join(sessionPath, 'last-connection.json');
//     fs.writeFileSync(connectionFile, JSON.stringify({
//         timestamp: new Date().toISOString(),
//         status: 'connected'
//     }));
// });

// client.on("auth_failure", (error) => {
//     logger.error(`WhatsApp authentication failed: ${error.message}`);
//     console.error("❌ WhatsApp authentication failed:", error);
//     isInitializing = false;
//     isReady = false;
//     closeInProgress = false;
    
//     // Clear session data on authentication failure
//     try {
//         logger.info("Attempting to clear WhatsApp session data");
//         console.log("🧹 Attempting to clear session data...");
//         const { clearAuthDataFromLocalStorage } = client.authStrategy;
//         if (typeof clearAuthDataFromLocalStorage === 'function') {
//             clearAuthDataFromLocalStorage();
//             logger.info("WhatsApp session data cleared successfully");
//             console.log("✅ Session data cleared successfully");
//         }
//     } catch (err) {
//         logger.error(`Error clearing WhatsApp session data: ${err.message}`);
//         console.error("❌ Error clearing session data:", err);
//     }
    
//     // Try reconnection if under max attempts
//     if (connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
//         const backoffDelay = Math.pow(2, connectionAttempts) * 5000; // Exponential backoff
//         logger.info(`Scheduling reconnection attempt in ${backoffDelay/1000} seconds...`);
//         console.log(`⏱️ Scheduling reconnection attempt in ${backoffDelay/1000} seconds...`);
        
//     setTimeout(() => {
//             logger.info(`Auto-reconnection attempt ${connectionAttempts + 1}/${MAX_CONNECTION_ATTEMPTS}`);
//             console.log(`🔄 Auto-reconnection attempt ${connectionAttempts + 1}/${MAX_CONNECTION_ATTEMPTS}`);
//         initializeWhatsApp();
//         }, backoffDelay);
//     } else {
//         // If we've reached max attempts, notify about manual connection needed
//         logger.error(`Maximum connection attempts (${MAX_CONNECTION_ATTEMPTS}) reached. Manual intervention required.`);
//         console.error(`⚠️ Maximum connection attempts (${MAX_CONNECTION_ATTEMPTS}) reached. Manual intervention required.`);
        
//         // Notify through callback if registered
//         if (manualAuthCallback && typeof manualAuthCallback === 'function') {
//             manualAuthCallback('max_attempts_reached');
//         }
//     }
// });

// client.on('disconnected', (reason) => {
//     logger.info(`WhatsApp client was disconnected: ${reason}`);
//     console.log('🔌 WhatsApp client was disconnected', reason);
//     isReady = false;
//     isInitializing = false;
//     closeInProgress = false;
    
//     // Save disconnection info
//     const connectionFile = path.join(sessionPath, 'last-connection.json');
//     fs.writeFileSync(connectionFile, JSON.stringify({
//         timestamp: new Date().toISOString(),
//         status: 'disconnected',
//         reason: reason
//     }));
// });

// // Add more error handling for browser/page issues
// client.on('change_state', state => {
//     logger.info(`WhatsApp client state changed to: ${state}`);
//     console.log(`👀 WhatsApp client state changed to: ${state}`);
// });

// // Handle browser close
// client.on('change_battery', batteryInfo => {
//     logger.debug(`WhatsApp battery info updated: ${JSON.stringify(batteryInfo)}`);
//     console.log('🔋 Battery info updated:', batteryInfo);
// });

// /**
//  * Initialize WhatsApp client
//  * @param {boolean} forceNew - Force new initialization even if already initializing
//  * @returns {Promise<boolean>} - Returns true if initialization started
//  */
// const initializeWhatsApp = async (forceNew = false) => {
//     if (isInitializing && !forceNew) {
//         logger.info("WhatsApp client is already initializing");
//         console.log("⏳ WhatsApp client is already initializing...");
//         return true;
//     }
    
//     if (isReady && !forceNew) {
//         logger.info("WhatsApp client is already initialized");
//         console.log("✅ WhatsApp client is already initialized.");
//         return true;
//     }
    
//     if (closeInProgress) {
//         logger.info("WhatsApp client is currently shutting down, can't initialize now");
//         console.log("⚠️ WhatsApp client is currently shutting down, can't initialize now");
//         return false;
//     }
    
//     // Increment connection attempts counter
//     connectionAttempts++;
    
//     logger.info(`Initializing WhatsApp client (attempt ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS})`);
//     console.log(`🚀 Initializing WhatsApp client (attempt ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS})...`);
//     console.log(`Using session data path: ${sessionPath}`);
//     isInitializing = true;
//     isReady = false;
    
//     // Set a global timeout for connection
//     if (connectionTimeout) {
//         clearTimeout(connectionTimeout);
//     }
    
//     connectionTimeout = setTimeout(() => {
//         if (!isReady && isInitializing) {
//             logger.error(`WhatsApp connection timed out after ${CONNECTION_TIMEOUT/1000} seconds`);
//             console.error(`⏱️ WhatsApp connection timed out after ${CONNECTION_TIMEOUT/1000} seconds`);
            
//             // Force reset the state
//             isInitializing = false;
            
//             // Try reconnection if under max attempts
//             if (connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
//                 const backoffDelay = Math.pow(2, connectionAttempts) * 5000; // Exponential backoff
//                 logger.info(`Scheduling reconnection attempt in ${backoffDelay/1000} seconds...`);
//                 console.log(`⏱️ Scheduling reconnection attempt in ${backoffDelay/1000} seconds...`);
                
//                 setTimeout(() => {
//                     logger.info(`Auto-reconnection attempt ${connectionAttempts + 1}/${MAX_CONNECTION_ATTEMPTS}`);
//                     console.log(`🔄 Auto-reconnection attempt ${connectionAttempts + 1}/${MAX_CONNECTION_ATTEMPTS}`);
//                     initializeWhatsApp(true);
//                 }, backoffDelay);
//             } else {
//                 // If we've reached max attempts, notify about manual connection needed
//                 logger.error(`Maximum connection attempts (${MAX_CONNECTION_ATTEMPTS}) reached. Manual intervention required.`);
//                 console.error(`⚠️ Maximum connection attempts (${MAX_CONNECTION_ATTEMPTS}) reached. Manual intervention required.`);
                
//                 // Notify through callback if registered
//                 if (manualAuthCallback && typeof manualAuthCallback === 'function') {
//                     manualAuthCallback('connection_timeout');
//                 }
//             }
//         }
//     }, CONNECTION_TIMEOUT);
    
//     try {
//         client.initialize().catch(err => {
//             logger.error(`Error in WhatsApp initialization: ${err.message}`);
//             console.error("❌ Error in WhatsApp initialization:", err);
//             isInitializing = false;
//             isReady = false;
            
//             // Try to recover by clearing browser/puppeteer state
//             if (client.pupBrowser) {
//                 try {
//                     client.pupBrowser.close().catch(() => {}); // Silently ignore errors
//                 } catch (e) {}
//             }
            
//             // If we're under max attempts, schedule retry
//             if (connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
//                 const backoffDelay = Math.pow(2, connectionAttempts) * 5000; // Exponential backoff
//                 logger.info(`Error recovery: retrying in ${backoffDelay/1000} seconds...`);
//                 console.log(`🔄 Error recovery: retrying in ${backoffDelay/1000} seconds...`);
                
//                 setTimeout(() => {
//                     initializeWhatsApp(true);
//                 }, backoffDelay);
//             }
//         });
//         return true;
//     } catch (error) {
//         logger.error(`Error starting WhatsApp client: ${error.message}`);
//         console.error("❌ Error starting WhatsApp client:", error);
//         isInitializing = false;
//         isReady = false;
//         return false;
//     }
// };

// /**
//  * Register a callback for manual authentication notification
//  * @param {Function} callback - Function to call when manual auth is needed
//  */
// const registerManualAuthCallback = (callback) => {
//     if (typeof callback === 'function') {
//         manualAuthCallback = callback;
//     }
// };

// /**
//  * Check if client is ready
//  * @returns {boolean} - Whether the client is ready
//  */
// const isWhatsAppReady = () => {
//     return isReady && client.info;
// };

// /**
//  * Get connection status information
//  * @returns {Object} - Connection status details
//  */
// const getConnectionInfo = () => {
//     return {
//         isReady,
//         isInitializing,
//         closeInProgress,
//         connectionAttempts,
//         maxConnectionAttempts: MAX_CONNECTION_ATTEMPTS,
//         timestamp: new Date().toISOString()
//     };
// };

// /**
//  * Reset the client state flags
//  */
// const resetClientState = () => {
//     isInitializing = false;
//     isReady = false;
//     closeInProgress = false;
//     connectionAttempts = 0;
    
//     if (connectionTimeout) {
//         clearTimeout(connectionTimeout);
//         connectionTimeout = null;
//     }
    
//     logger.info('WhatsApp client state has been reset');
//     console.log('🔄 WhatsApp client state has been reset');
// };

// /**
//  * Close the WhatsApp client
//  * @returns {Promise<boolean>} - Whether client was closed successfully
//  */
// const closeWhatsAppClient = async () => {
//     if (closeInProgress) {
//         logger.info("WhatsApp client close already in progress");
//         console.log("⏳ WhatsApp client close already in progress");
//         return true;
//     }
    
//     if (!isReady && !isInitializing) {
//         logger.info("No active WhatsApp client to close");
//         console.log("ℹ️ No active WhatsApp client to close");
//         return true;
//     }
    
//     try {
//         logger.info("Closing WhatsApp client");
//         console.log("🔄 Closing WhatsApp client...");
//         closeInProgress = true;
        
//         // Clear any pending timeouts
//         if (connectionTimeout) {
//             clearTimeout(connectionTimeout);
//             connectionTimeout = null;
//         }
        
//         // First try to destroy the client
//         if (client && client.pupBrowser && typeof client.pupBrowser.close === 'function') {
//             await client.pupBrowser.close();
//             logger.info("WhatsApp browser closed successfully");
//             console.log("✅ WhatsApp browser closed successfully");
//         }

//         // Reset state
//         isReady = false;
//         isInitializing = false;
//         closeInProgress = false;
//         connectionAttempts = 0;
        
//         logger.info("WhatsApp client closed successfully");
//         console.log("✅ WhatsApp client closed successfully");
//         return true;
//     } catch (error) {
//         logger.error(`Error closing WhatsApp client: ${error.message}`);
//         console.error("❌ Error closing WhatsApp client:", error);
//         closeInProgress = false;
//         return false;
//     }
// };

// /**
//  * Force restart the WhatsApp client (close and initialize again)
//  * @returns {Promise<boolean>} - Whether restart was successful
//  */
// const restartWhatsAppClient = async () => {
//     logger.info("Attempting to restart WhatsApp client");
//     console.log("🔄 Attempting to restart WhatsApp client...");
    
//     try {
//         // First close the client
//         await closeWhatsAppClient();
        
//         // Reset connection attempts to give a fresh start
//         connectionAttempts = 0;
        
//         // Wait a moment before restarting
//         await new Promise(resolve => setTimeout(resolve, 2000));
        
//         // Initialize again
//         return await initializeWhatsApp(true);
//     } catch (error) {
//         logger.error(`Error restarting WhatsApp client: ${error.message}`);
//         console.error("❌ Error restarting WhatsApp client:", error);
//         return false;
//     }
// };

// module.exports = { 
//     client, 
//     initializeWhatsApp, 
//     isWhatsAppReady, 
//     resetClientState,
//     closeWhatsAppClient,
//     restartWhatsAppClient,
//     registerManualAuthCallback,
//     getConnectionInfo
// }; 




const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const path = require("path");
const fs = require('fs');
const { logger } = require('../utils/logger');

// Create an absolute path outside the backend directory to store WhatsApp session data
const sessionPath = path.resolve(__dirname, '../../whatsapp-data');

// Ensure the directory exists
if (!fs.existsSync(sessionPath)) {
    console.log(`Creating WhatsApp session directory at: ${sessionPath}`);
    fs.mkdirSync(sessionPath, { recursive: true });
}

// WhatsApp Client Setup with improved configuration for hosted environments
const client = new Client({
    authStrategy: new LocalAuth({ 
        dataPath: sessionPath,
        clientId: 'hpfp-client' // Add a consistent client ID
    }),
    puppeteer: { 
        headless: true, // Run in headless mode for server deployment
        args: [
            "--no-sandbox", 
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--disable-gpu",
            "--disable-extensions",
            "--disable-component-extensions-with-background-pages",
            "--disable-default-apps",
            "--mute-audio",
            "--hide-scrollbars",
            // Additional args to improve reliability
            "--disable-web-security",
            "--allow-running-insecure-content",
            "--disable-features=site-per-process",
            "--ignore-certificate-errors"
        ],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH, // Can set Chrome path in env variable
    },
    restartOnAuthFail: false, // Disable automatic restart - we'll handle it manually
});

// Flag to track initialization state
let isInitializing = false;
let isReady = false;
let closeInProgress = false;
let loadingInterval = null;
let qrGenerated = false;

// Loading animation function
const showLoadingAnimation = (message) => {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let i = 0;
    
    if (loadingInterval) {
        clearInterval(loadingInterval);
    }
    
    loadingInterval = setInterval(() => {
        process.stdout.write(`\r${frames[i]} ${message}`);
        i = (i + 1) % frames.length;
    }, 100);
};

const stopLoadingAnimation = () => {
    if (loadingInterval) {
        clearInterval(loadingInterval);
        loadingInterval = null;
        process.stdout.write('\r'); // Clear the line
    }
};

// Generate QR Code for first-time login (only once)
client.on("qr", (qr) => {
    if (!qrGenerated) {
        stopLoadingAnimation();
        logger.info("📱 Scan this QR code to log in to WhatsApp");
        console.log("\n📱 Scan this QR code to log in to WhatsApp:");
        qrcode.generate(qr, { small: true });
        
        // Save QR code to a file for easier access if needed
        const qrFilePath = path.join(sessionPath, 'latest-qr.txt');
        fs.writeFileSync(qrFilePath, qr);
        logger.info(`QR code also saved to: ${qrFilePath}`);
        
        qrGenerated = true;
        console.log("🔄 Waiting for QR code to be scanned...");
        showLoadingAnimation("Waiting for QR code scan");
    }
});

client.on("ready", () => {
    stopLoadingAnimation();
    logger.info("WhatsApp client initialized successfully");
    console.log("\n✅ WhatsApp client is ready!");
    isReady = true;
    isInitializing = false;
    closeInProgress = false;
    qrGenerated = false;
    
    // Save successful connection time
    const connectionFile = path.join(sessionPath, 'last-connection.json');
    fs.writeFileSync(connectionFile, JSON.stringify({
        timestamp: new Date().toISOString(),
        status: 'connected'
    }));
});

client.on("auth_failure", (error) => {
    stopLoadingAnimation();
    logger.error(`WhatsApp authentication failed: ${error.message}`);
    console.error("\n❌ WhatsApp authentication failed:", error);
    isInitializing = false;
    isReady = false;
    closeInProgress = false;
    qrGenerated = false;
    
    // Clear session data on authentication failure
    try {
        logger.info("Attempting to clear WhatsApp session data");
        console.log("🧹 Attempting to clear session data...");
        const { clearAuthDataFromLocalStorage } = client.authStrategy;
        if (typeof clearAuthDataFromLocalStorage === 'function') {
            clearAuthDataFromLocalStorage();
            logger.info("WhatsApp session data cleared successfully");
            console.log("✅ Session data cleared successfully");
        }
    } catch (err) {
        logger.error(`Error clearing WhatsApp session data: ${err.message}`);
        console.error("❌ Error clearing session data:", err);
    }
    
    console.log("💡 Please try running the application again to generate a new QR code");
});

client.on('disconnected', (reason) => {
    stopLoadingAnimation();
    logger.info(`WhatsApp client was disconnected: ${reason}`);
    console.log('\n🔌 WhatsApp client was disconnected', reason);
    isReady = false;
    isInitializing = false;
    closeInProgress = false;
    qrGenerated = false;
    
    // Save disconnection info
    const connectionFile = path.join(sessionPath, 'last-connection.json');
    fs.writeFileSync(connectionFile, JSON.stringify({
        timestamp: new Date().toISOString(),
        status: 'disconnected',
        reason: reason
    }));
});

// Add more error handling for browser/page issues
client.on('change_state', state => {
    logger.info(`WhatsApp client state changed to: ${state}`);
    console.log(`\n👀 WhatsApp client state changed to: ${state}`);
    
    if (state === 'OPENING' && !qrGenerated) {
        showLoadingAnimation("Initializing WhatsApp connection");
    }
});

// Handle browser close
client.on('change_battery', batteryInfo => {
    logger.debug(`WhatsApp battery info updated: ${JSON.stringify(batteryInfo)}`);
    console.log('\n🔋 Battery info updated:', batteryInfo);
});

/**
 * Initialize WhatsApp client - will wait indefinitely until connection is established
 * @param {boolean} forceNew - Force new initialization even if already initializing
 * @returns {Promise<boolean>} - Returns true if initialization started
 */
const initializeWhatsApp = async (forceNew = false) => {
    if (isInitializing && !forceNew) {
        logger.info("WhatsApp client is already initializing");
        console.log("⏳ WhatsApp client is already initializing...");
        return true;
    }
    
    if (isReady && !forceNew) {
        logger.info("WhatsApp client is already initialized");
        console.log("✅ WhatsApp client is already initialized.");
        return true;
    }
    
    if (closeInProgress) {
        logger.info("WhatsApp client is currently shutting down, can't initialize now");
        console.log("⚠️ WhatsApp client is currently shutting down, can't initialize now");
        return false;
    }
    
    logger.info("Initializing WhatsApp client");
    console.log("🚀 Initializing WhatsApp client...");
    console.log(`Using session data path: ${sessionPath}`);
    isInitializing = true;
    isReady = false;
    qrGenerated = false;
    
    // Show loading animation
    showLoadingAnimation("Starting WhatsApp client");
    
    try {
        await client.initialize();
        return true;
    } catch (error) {
        stopLoadingAnimation();
        logger.error(`Error starting WhatsApp client: ${error.message}`);
        console.error("\n❌ Error starting WhatsApp client:", error);
        isInitializing = false;
        isReady = false;
        qrGenerated = false;
        return false;
    }
};

/**
 * Wait for WhatsApp to be ready with a promise
 * @returns {Promise<boolean>} - Resolves when WhatsApp is ready
 */
const waitForWhatsAppReady = () => {
    return new Promise((resolve) => {
        if (isReady) {
            resolve(true);
            return;
        }
        
        const checkReady = () => {
            if (isReady) {
                resolve(true);
            } else {
                setTimeout(checkReady, 1000); // Check every second
            }
        };
        
        checkReady();
    });
};

/**
 * Check if client is ready
 * @returns {boolean} - Whether the client is ready
 */
const isWhatsAppReady = () => {
    return isReady && client.info;
};

/**
 * Get connection status information
 * @returns {Object} - Connection status details
 */
const getConnectionInfo = () => {
    return {
        isReady,
        isInitializing,
        closeInProgress,
        qrGenerated,
        timestamp: new Date().toISOString()
    };
};

/**
 * Reset the client state flags
 */
const resetClientState = () => {
    stopLoadingAnimation();
    isInitializing = false;
    isReady = false;
    closeInProgress = false;
    qrGenerated = false;
    
    logger.info('WhatsApp client state has been reset');
    console.log('🔄 WhatsApp client state has been reset');
};

/**
 * Close the WhatsApp client
 * @returns {Promise<boolean>} - Whether client was closed successfully
 */
const closeWhatsAppClient = async () => {
    if (closeInProgress) {
        logger.info("WhatsApp client close already in progress");
        console.log("⏳ WhatsApp client close already in progress");
        return true;
    }
    
    if (!isReady && !isInitializing) {
        logger.info("No active WhatsApp client to close");
        console.log("ℹ️ No active WhatsApp client to close");
        return true;
    }
    
    try {
        logger.info("Closing WhatsApp client");
        console.log("🔄 Closing WhatsApp client...");
        closeInProgress = true;
        
        // Stop any loading animations
        stopLoadingAnimation();
        
        // First try to destroy the client
        if (client && client.pupBrowser && typeof client.pupBrowser.close === 'function') {
            await client.pupBrowser.close();
            logger.info("WhatsApp browser closed successfully");
            console.log("✅ WhatsApp browser closed successfully");
        }

        // Reset state
        isReady = false;
        isInitializing = false;
        closeInProgress = false;
        qrGenerated = false;
        
        logger.info("WhatsApp client closed successfully");
        console.log("✅ WhatsApp client closed successfully");
        return true;
    } catch (error) {
        logger.error(`Error closing WhatsApp client: ${error.message}`);
        console.error("❌ Error closing WhatsApp client:", error);
        closeInProgress = false;
        return false;
    }
};

/**
 * Force restart the WhatsApp client (close and initialize again)
 * @returns {Promise<boolean>} - Whether restart was successful
 */
const restartWhatsAppClient = async () => {
    logger.info("Attempting to restart WhatsApp client");
    console.log("🔄 Attempting to restart WhatsApp client...");
    
    try {
        // First close the client
        await closeWhatsAppClient();
        
        // Wait a moment before restarting
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Initialize again
        return await initializeWhatsApp(true);
    } catch (error) {
        logger.error(`Error restarting WhatsApp client: ${error.message}`);
        console.error("❌ Error restarting WhatsApp client:", error);
        return false;
    }
};

module.exports = { 
    client, 
    initializeWhatsApp, 
    isWhatsAppReady, 
    resetClientState,
    closeWhatsAppClient,
    restartWhatsAppClient,
    getConnectionInfo,
    waitForWhatsAppReady
};