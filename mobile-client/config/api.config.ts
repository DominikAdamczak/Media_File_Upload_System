/**
 * API Configuration for Mobile Client
 * 
 * IMPORTANT: When testing on a physical device or emulator, you MUST use your
 * computer's IP address, NOT localhost or 127.0.0.1
 * 
 * To find your IP address:
 * - Windows: Run `ipconfig` in Command Prompt, look for IPv4 Address
 * - macOS/Linux: Run `ifconfig` or `ip addr`, look for inet address
 * - Example: 192.168.1.100
 */

// Development configuration
const DEV_CONFIG = {
  // CHANGE THIS to your computer's IP address when testing on devices
  // Example: 'http://192.168.1.100:8000/api'
  API_URL: 'http://10.0.2.2:8000/api',
  
  // Set to true to see detailed logs
  DEBUG: true,
};

// Production configuration
const PROD_CONFIG = {
  // CHANGE THIS to your production server URL
  API_URL: 'https://your-domain.com/api',
  DEBUG: false,
};

// Automatically select config based on environment
const isDevelopment = __DEV__;

export const API_CONFIG = isDevelopment ? DEV_CONFIG : PROD_CONFIG;

// Helper to check if using localhost (which won't work on devices)
export const isUsingLocalhost = (): boolean => {
  return API_CONFIG.API_URL.includes('127.0.0.1') || 
         API_CONFIG.API_URL.includes('localhost');
};

// Helper to get a user-friendly warning message
export const getConnectionWarning = (): string | null => {
  if (isUsingLocalhost()) {
    return 'Warning: Using localhost URL. This will not work on physical devices. Please update API_URL in config/api.config.ts with your computer\'s IP address.';
  }
  return null;
};
