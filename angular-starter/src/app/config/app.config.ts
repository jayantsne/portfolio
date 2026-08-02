/**
 * Application Configuration
 * Central configuration file for all app-wide settings
 */

export interface AppConfig {
  splashScreen: {
    enabled: boolean;
    minDurationMs: number;
  };
  features: {
    analytics: boolean;
  };
  api: {
    baseUrl: string;
    timeout: number;
  };
}

/**
 * Default Application Configuration
 * Modify these values to change app behavior
 */
export const APP_CONFIG: AppConfig = {
  // Splash Screen Configuration
  splashScreen: {
    enabled: false, // Set to true to enable splash screen
    minDurationMs: 4000 // Duration in milliseconds
  },

  // Feature Flags
  features: {
    analytics: true, // Google Analytics tracking
  },

  // API Configuration
  api: {
    baseUrl: 'http://76.13.244.113:5000', // Backend API URL
    timeout: 30000 // Request timeout in milliseconds
  }
};

/**
 * Get configuration value by path
 * Example: getConfig('splashScreen.enabled')
 */
export function getConfig(path: string): any {
  return path.split('.').reduce((obj: any, key) => obj?.[key], APP_CONFIG);
}
