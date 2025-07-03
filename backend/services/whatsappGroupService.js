// const { 
//     client, 
//     isWhatsAppReady, 
//     resetClientState, 
//     initializeWhatsApp, 
//     closeWhatsAppClient,
//     restartWhatsAppClient,
//     getConnectionInfo 
// } = require('../config/whatsapp');
// const { logger } = require('../utils/logger');
// const { 
//     validateGroupId, 
//     getGroupIdFromMessage 
// } = require('../utils/whatsappUtils');
// const whatsappQueries = require('../queries/whatsappQueries');
// const whatsappUtils = require('../utils/whatsappUtils');
// const loggingService = require('./loggingService');

// // Track if the client is in group ID retrieval mode
// let groupIdRetrievalMode = false;
// let groupIdCallback = null;
// let connectionRetryTimer = null;
// let maxRetryAttemptsReached = false;
// let lastQrCodeTime = null;

// /**
//  * Start WhatsApp client in group ID retrieval mode
//  * @returns {Promise<boolean>} - Whether the client started successfully
//  */
// const startGroupIdRetrieval = async () => {
//     try {
//         logger.info('Starting WhatsApp client in group ID retrieval mode');
        
//         // Check if we were already in this mode
//         if (groupIdRetrievalMode && isWhatsAppReady()) {
//             logger.info('WhatsApp client already running in group ID retrieval mode');
            
//             // Just in case, ensure message handler is set up
//             setupGroupIdMessageHandler();
            
//             return true;
//         }
        
//         // Check if there was a previous connection attempt that failed
//         if (maxRetryAttemptsReached) {
//             // Force restart the client to give it a fresh start
//             logger.info('Previous connection attempts failed, forcing restart of WhatsApp client');
//             await restartWhatsAppClient();
//             maxRetryAttemptsReached = false;
//         }
        
//         // Set mode flag before initialization
//         groupIdRetrievalMode = true;
        
//         // Initialize the WhatsApp client
//         const initialized = await initializeWhatsApp();
        
//         if (!initialized) {
//             logger.error('Failed to start WhatsApp initialization for group ID retrieval');
//             return false;
//         }
        
//         // Wait up to 30 seconds for client to be ready
//         let attempts = 0;
//         const maxAttempts = 15;
//         const checkInterval = 2000; // 2 seconds
        
//         while (attempts < maxAttempts && !isWhatsAppReady()) {
//             logger.info(`Waiting for WhatsApp client to be ready (attempt ${attempts + 1}/${maxAttempts})`);
//             await new Promise(resolve => setTimeout(resolve, checkInterval));
//             attempts++;
            
//             // If QR code hasn't been shown for more than 30 seconds, we might be stuck
//             const now = Date.now();
//             if (lastQrCodeTime && (now - lastQrCodeTime) > 30000) {
//                 logger.warn('QR code timeout detected. Attempting to restart client');
                
//                 // Clear the timer value to avoid multiple restarts
//                 lastQrCodeTime = null;
                
//                 // Try to restart the client
//                 restartWhatsAppClient().catch(err => {
//                     logger.error(`Error during client restart: ${err.message}`);
//                 });
                
//                 // Reset our counter to give more time
//                 attempts = 0;
//             }
//         }
        
//         if (!isWhatsAppReady()) {
//             logger.error('WhatsApp client initialization timed out');
            
//             // Set a flag to indicate we've hit max attempts
//             maxRetryAttemptsReached = true;
            
//             // Schedule a retry after a delay if needed
//             if (!connectionRetryTimer) {
//                 connectionRetryTimer = setTimeout(async () => {
//                     logger.info('Attempting automatic WhatsApp reconnection after timeout');
//                     connectionRetryTimer = null;
                    
//                     // Don't reset the mode flag
//                     await startGroupIdRetrieval();
//                 }, 60000); // Try again after 1 minute
//             }
            
//             return false;
//         }
        
//         // Setup message handler for group ID retrieval
//         setupGroupIdMessageHandler();
        
//         logger.info('WhatsApp client started in group ID retrieval mode');
//         return true;
//     } catch (error) {
//         logger.error('Error starting WhatsApp client in group ID retrieval mode:', error);
//         groupIdRetrievalMode = false;
//         return false;
//     }
// };

// /**
//  * Stop WhatsApp client group ID retrieval mode
//  * @returns {Promise<boolean>} - Whether the client stopped successfully
//  */
// const stopGroupIdRetrieval = async () => {
//     try {
//         logger.info('Stopping WhatsApp client group ID retrieval mode');
        
//         // Clear any pending retry timers
//         if (connectionRetryTimer) {
//             clearTimeout(connectionRetryTimer);
//             connectionRetryTimer = null;
//         }
        
//         groupIdRetrievalMode = false;
//         groupIdCallback = null;
//         maxRetryAttemptsReached = false;
        
//         // If no other processes need the client, close it
//         if (!isWhatsAppNeeded()) {
//             await closeWhatsAppClient();
//             logger.info('WhatsApp client closed after group ID retrieval');
//         }
        
//         return true;
//     } catch (error) {
//         logger.error('Error stopping WhatsApp client group ID retrieval:', error);
//         return false;
//     }
// };

// /**
//  * Check if WhatsApp client is needed for any process
//  * @returns {boolean} - Whether the client is needed
//  */
// const isWhatsAppNeeded = () => {
//     // Add other conditions here if needed (e.g., reminder process running)
//     return groupIdRetrievalMode;
// };

// /**
//  * Setup message handler for group ID retrieval
//  */
// const setupGroupIdMessageHandler = () => {
//     if (!isWhatsAppReady() || !client) return;
    
//     // Remove existing listeners to avoid duplicates
//     client.removeAllListeners('message');
    
//     // Add listeners for tracking QR code display
//     client.on('qr', () => {
//         lastQrCodeTime = Date.now();
//     });
    
//     // Add new listener for group ID messages
//     client.on('message', async (message) => {
//         if (message.body === '!groupid') {
//             const groupId = message.from;
            
//             if (validateGroupId(groupId)) {
//                 logger.info(`Group ID retrieved: ${groupId}`);
                
//                 // Send confirmation message to the group
//                 try {
//                     await client.sendMessage(
//                         groupId,
//                         `Group ID: ${groupId}\n\nYou can use this ID to configure client reminders and notifications.\n\nThis is a test message.\nPLEASE DO NOT REPLY TO THIS MESSAGE.\nPLEASE IGNORE. THANKS 🙏\n\nઆ એક પરીક્ષણ સંદેશ છે.\nકૃપા કરીને આ સંદેશનો જવાબ ન આપો.\nઆભાર 🙏`
//                     );
                    
//                     // Log this retrieval
//                     await loggingService.logWhatsAppMessage({
//                         client_id: null,
//                         group_id: groupId,
//                         message: '!groupid', 
//                         status: 'received',
//                     });
                    
//                     // Notify callback if registered
//                     if (groupIdCallback) {
//                         groupIdCallback(groupId);
//                     }
//                 } catch (error) {
//                     logger.error(`Error sending group ID confirmation: ${error.message}`);
//                 }
//             }
//         }
//     });
// };

// /**
//  * Register a callback for when a group ID is retrieved
//  * @param {Function} callback - The callback function
//  */
// const onGroupIdRetrieved = (callback) => {
//     groupIdCallback = callback;
// };

// /**
//  * Send a test message to a WhatsApp group
//  * @param {string} groupId - The WhatsApp group ID
//  * @returns {Promise<boolean>} - Whether the message was sent successfully
//  */
// const sendTestMessage = async (groupId) => {
//     try {
//         if (!validateGroupId(groupId)) {
//             logger.error(`Invalid group ID format: ${groupId}`);
//             return false;
//         }
        
//         if (!isWhatsAppReady()) {
//             logger.error('WhatsApp client not ready when trying to send test message');
//             const initialized = await initializeWhatsApp();
            
//             if (!initialized || !isWhatsAppReady()) {
//                 logger.error('Failed to initialize WhatsApp for sending test message');
//                 return false;
//             }
//         }
        
//         // The test message
//         const message = `🔔 This is a test message.\nTime: ${new Date().toLocaleString()}\n\nIf you're seeing this, your WhatsApp notifications are properly configured.`;
        
//         await client.sendMessage(groupId, message);
        
//         // Log the test message
//         await loggingService.logWhatsAppMessage({
//             client_id: null,
//             group_id: groupId,
//             message: 'Test message from HPRT', 
//             status: 'sent',
//         });
        
//         logger.info(`Test message sent to group ${groupId}`);
//         return true;
//     } catch (error) {
//         logger.error(`Error sending test message to group ${groupId}:`, error);
        
//         // Log the error
//         try {
//             await loggingService.logWhatsAppMessage({
//                 client_id: null,
//                 group_id: groupId,
//                 message: 'Test message from HPRT', 
//                 status: 'failed',
//                 error_message: error.toString()
//             });
//         } catch (logErr) {
//             logger.error('Error logging WhatsApp error:', logErr);
//         }
        
//         return false;
//     }
// };

// /**
//  * Get current WhatsApp client status
//  * @returns {Object} - Status information
//  */
// const getWhatsAppStatus = () => {
//     const isReady = isWhatsAppReady();
//     const connInfo = getConnectionInfo();
    
//     return {
//         isReady,
//         inGroupIdRetrievalMode: groupIdRetrievalMode,
//         lastError: connInfo.lastError,
//         lastConnection: connInfo.lastConnection,
//         lastDisconnect: connInfo.lastDisconnect,
//         connectionRetryScheduled: !!connectionRetryTimer,
//         maxRetryAttemptsReached
//     };
// };

// /**
//  * Force reconnect the WhatsApp client
//  * @returns {Promise<boolean>} - Whether the reconnect was initiated successfully
//  */
// const forceReconnect = async () => {
//     try {
//         logger.info('Force reconnecting WhatsApp client');
        
//         // Reset retry flags
//         maxRetryAttemptsReached = false;
//         lastQrCodeTime = null;
        
//         // Clear any pending retry timers
//         if (connectionRetryTimer) {
//             clearTimeout(connectionRetryTimer);
//             connectionRetryTimer = null;
//         }
        
//         // Attempt to restart client
//         await restartWhatsAppClient();
        
//         logger.info('WhatsApp client reconnection initiated');
//         return true;
//     } catch (error) {
//         logger.error('Error during forced WhatsApp reconnection:', error);
//         return false;
//     }
// };

// module.exports = {
//     sendTestMessage,
//     startGroupIdRetrieval,
//     stopGroupIdRetrieval,
//     onGroupIdRetrieved,
//     getWhatsAppStatus,
//     forceReconnect
// }; 


const { 
    client, 
    isWhatsAppReady,
    initializeWhatsApp, 
    closeWhatsAppClient,
    restartWhatsAppClient,
    getConnectionInfo 
} = require('../config/whatsapp');
const { logger } = require('../utils/logger');
const { 
    validateGroupId, 
    getGroupIdFromMessage 
} = require('../utils/whatsappUtils');
const whatsappQueries = require('../queries/whatsappQueries');
const whatsappUtils = require('../utils/whatsappUtils');
const loggingService = require('./loggingService');

// Track if the client is in group ID retrieval mode
let groupIdRetrievalMode = false;
let groupIdCallback = null;
let isConnecting = false;
let connectionStartTime = null;

/**
 * Start WhatsApp client in group ID retrieval mode
 * @returns {Promise<boolean>} - Whether the client started successfully
 */
const startGroupIdRetrieval = async () => {
    try {
        logger.info('Starting WhatsApp client in group ID retrieval mode');
        
        // Check if we were already in this mode
        if (groupIdRetrievalMode && isWhatsAppReady()) {
            logger.info('WhatsApp client already running in group ID retrieval mode');
            
            // Just in case, ensure message handler is set up
            setupGroupIdMessageHandler();
            
            return true;
        }
        
        // Set mode flag before initialization
        groupIdRetrievalMode = true;
        isConnecting = true;
        connectionStartTime = Date.now();
        
        logger.info('🔄 Connecting to WhatsApp... Please wait');
        
        // Initialize the WhatsApp client
        const initialized = await initializeWhatsApp();
        
        if (!initialized) {
            logger.error('Failed to start WhatsApp initialization for group ID retrieval');
            isConnecting = false;
            return false;
        }
        
        // Wait indefinitely for client to be ready
        logger.info('⏳ Waiting for WhatsApp connection...');
        
        while (!isWhatsAppReady()) {
            // Show loading indicator periodically
            const elapsedTime = Math.floor((Date.now() - connectionStartTime) / 1000);
            if (elapsedTime % 10 === 0) { // Log every 10 seconds
                logger.info(`⏳ Still connecting to WhatsApp... (${elapsedTime}s elapsed)`);
            }
            
            // Wait 2 seconds before checking again
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Connection successful
        isConnecting = false;
        logger.info('✅ WhatsApp client connected successfully!');
        
        // Setup message handler for group ID retrieval
        setupGroupIdMessageHandler();
        
        logger.info('WhatsApp client started in group ID retrieval mode');
        return true;
    } catch (error) {
        logger.error('Error starting WhatsApp client in group ID retrieval mode:', error);
        groupIdRetrievalMode = false;
        isConnecting = false;
        return false;
    }
};

/**
 * Stop WhatsApp client group ID retrieval mode
 * @returns {Promise<boolean>} - Whether the client stopped successfully
 */
const stopGroupIdRetrieval = async () => {
    try {
        logger.info('Stopping WhatsApp client group ID retrieval mode');
        
        groupIdRetrievalMode = false;
        groupIdCallback = null;
        isConnecting = false;
        connectionStartTime = null;
        
        // If no other processes need the client, close it
        if (!isWhatsAppNeeded()) {
            await closeWhatsAppClient();
            logger.info('WhatsApp client closed after group ID retrieval');
        }
        
        return true;
    } catch (error) {
        logger.error('Error stopping WhatsApp client group ID retrieval:', error);
        return false;
    }
};

/**
 * Check if WhatsApp client is needed for any process
 * @returns {boolean} - Whether the client is needed
 */
const isWhatsAppNeeded = () => {
    // Add other conditions here if needed (e.g., reminder process running)
    return groupIdRetrievalMode;
};

/**
 * Setup message handler for group ID retrieval
 */
const setupGroupIdMessageHandler = () => {
    if (!isWhatsAppReady() || !client) return;
    
    // Remove existing listeners to avoid duplicates
    client.removeAllListeners('message');
    
    // Add new listener for group ID messages
    client.on('message', async (message) => {
        if (message.body === '!groupid') {
            const groupId = message.from;
            
            if (validateGroupId(groupId)) {
                logger.info(`Group ID retrieved: ${groupId}`);
                
                // Send confirmation message to the group
                try {
                    await client.sendMessage(
                        groupId,
                        `Group ID: ${groupId}\n\nYou can use this ID to configure client reminders and notifications.\n\nThis is a test message.\nPLEASE DO NOT REPLY TO THIS MESSAGE.\nPLEASE IGNORE. THANKS 🙏\n\nઆ એક પરીક્ષણ સંદેશ છે.\nકૃપા કરીને આ સંદેશનો જવાબ ન આપો.\nઆભાર 🙏`
                    );
                    
                    // Log this retrieval
                    await loggingService.logWhatsAppMessage({
                        client_id: null,
                        group_id: groupId,
                        message: '!groupid', 
                        status: 'received',
                    });
                    
                    // Notify callback if registered
                    if (groupIdCallback) {
                        groupIdCallback(groupId);
                    }
                } catch (error) {
                    logger.error(`Error sending group ID confirmation: ${error.message}`);
                }
            }
        }
    });
};

/**
 * Register a callback for when a group ID is retrieved
 * @param {Function} callback - The callback function
 */
const onGroupIdRetrieved = (callback) => {
    groupIdCallback = callback;
};

/**
 * Send a test message to a WhatsApp group
 * @param {string} groupId - The WhatsApp group ID
 * @returns {Promise<boolean>} - Whether the message was sent successfully
 */
const sendTestMessage = async (groupId) => {
    try {
        if (!validateGroupId(groupId)) {
            logger.error(`Invalid group ID format: ${groupId}`);
            return false;
        }
        
        if (!isWhatsAppReady()) {
            logger.info('⏳ WhatsApp client not ready, initializing...');
            
            isConnecting = true;
            connectionStartTime = Date.now();
            
            const initialized = await initializeWhatsApp();
            
            if (!initialized) {
                logger.error('Failed to initialize WhatsApp for sending test message');
                isConnecting = false;
                return false;
            }
            
            // Wait for connection
            logger.info('⏳ Waiting for WhatsApp connection...');
            
            while (!isWhatsAppReady()) {
                const elapsedTime = Math.floor((Date.now() - connectionStartTime) / 1000);
                if (elapsedTime % 10 === 0) {
                    logger.info(`⏳ Still connecting to WhatsApp... (${elapsedTime}s elapsed)`);
                }
                
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
            isConnecting = false;
            logger.info('✅ WhatsApp client connected successfully!');
        }
        
        // The test message
        const message = `🔔 This is a test message.\nTime: ${new Date().toLocaleString()}\n\nIf you're seeing this, your WhatsApp notifications are properly configured.`;
        
        await client.sendMessage(groupId, message);
        
        // Log the test message
        await loggingService.logWhatsAppMessage({
            client_id: null,
            group_id: groupId,
            message: 'Test message from HPRT', 
            status: 'sent',
        });
        
        logger.info(`Test message sent to group ${groupId}`);
        return true;
    } catch (error) {
        logger.error(`Error sending test message to group ${groupId}:`, error);
        
        // Log the error
        try {
            await loggingService.logWhatsAppMessage({
                client_id: null,
                group_id: groupId,
                message: 'Test message from HPRT', 
                status: 'failed',
                error_message: error.toString()
            });
        } catch (logErr) {
            logger.error('Error logging WhatsApp error:', logErr);
        }
        
        return false;
    }
};

/**
 * Get current WhatsApp client status
 * @returns {Object} - Status information
 */
const getWhatsAppStatus = () => {
    const isReady = isWhatsAppReady();
    const connInfo = getConnectionInfo();
    
    return {
        isReady,
        inGroupIdRetrievalMode: groupIdRetrievalMode,
        isConnecting,
        connectionStartTime,
        lastError: connInfo.lastError,
        lastConnection: connInfo.lastConnection,
        lastDisconnect: connInfo.lastDisconnect,
        elapsedConnectionTime: connectionStartTime ? Math.floor((Date.now() - connectionStartTime) / 1000) : null
    };
};

/**
 * Force reconnect the WhatsApp client
 * @returns {Promise<boolean>} - Whether the reconnect was initiated successfully
 */
const forceReconnect = async () => {
    try {
        logger.info('Force reconnecting WhatsApp client');
        
        // Reset connection state
        isConnecting = true;
        connectionStartTime = Date.now();
        
        // Attempt to restart client
        await restartWhatsAppClient();
        
        logger.info('🔄 WhatsApp client reconnection initiated');
        return true;
    } catch (error) {
        logger.error('Error during forced WhatsApp reconnection:', error);
        isConnecting = false;
        return false;
    }
};

module.exports = {
    sendTestMessage,
    startGroupIdRetrieval,
    stopGroupIdRetrieval,
    onGroupIdRetrieved,
    getWhatsAppStatus,
    forceReconnect
};