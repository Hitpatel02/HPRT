const msal = require('@azure/msal-node');
require('dotenv').config();

const config = {
  auth: {
    clientId: process.env.CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.TENANT_ID}`,
    clientSecret: process.env.CLIENT_SECRET,
  },
};

const tokenRequest = {
  scopes: ['https://graph.microsoft.com/.default'],
};

const getToken = async () => {
  try {
    const cca = new msal.ConfidentialClientApplication(config);
    const tokenResponse = await cca.acquireTokenByClientCredential(tokenRequest);
    return tokenResponse;
  } catch (error) {
    console.error('Error acquiring token:', error);
    throw error;
  }
};

module.exports = { getToken, tokenRequest }; 