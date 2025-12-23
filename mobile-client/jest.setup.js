// Define React Native global variables for Jest
global.__DEV__ = true;

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to suppress console methods in tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};
