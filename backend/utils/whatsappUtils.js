/**
 * WhatsApp utility functions
 */

/**
 * Validate WhatsApp group ID format
 * @param {string} groupId - The group ID to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validateGroupId(groupId) {
  if (!groupId) return false;
  return groupId.includes('@g.us');
}

/**
 * Format a template-based WhatsApp message
 * @param {string} template - The message template with placeholders
 * @param {Object} variables - The variables to replace in the template
 * @returns {string} - The formatted message
 */
function formatWhatsAppMessage(template, variables) {
  let message = template;

  // Replace variables in the message
  for (const [key, value] of Object.entries(variables)) {
    message = message.replace(new RegExp(`{${key}}`, 'g'), value);
  }

  return message;
}

/**
 * Create a WhatsApp document send option
 * @param {Buffer} file - File buffer
 * @param {string} filename - Name of the file
 * @param {string} caption - Optional caption
 * @returns {Object} - WhatsApp document options
 */
function createDocumentSendOptions(file, filename, caption = '') {
  return {
    media: file,
    fileName: filename,
    caption: caption
  };
}

/**
 * Format phone number for WhatsApp
 * @param {string} phoneNumber - Phone number
 * @returns {string} - Formatted phone number for WhatsApp
 */
function formatPhoneNumber(phoneNumber) {
  // Remove any non-digit characters
  const digits = phoneNumber.replace(/\D/g, '');

  // Ensure number starts with country code
  if (digits.startsWith('91')) {
    return `${digits}@c.us`;
  } else if (digits.length === 10) {
    return `91${digits}@c.us`;
  }

  // Default fallback
  return `${digits}@c.us`;
}

module.exports = {
  validateGroupId,
  formatWhatsAppMessage,
  createDocumentSendOptions,
  formatPhoneNumber,
}; 