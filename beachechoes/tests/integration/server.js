const { setupServer } = require('msw/node');
const { handlers } = require('./handlers');

/**
 * MSW Server for Integration Tests
 * 
 * This server intercepts HTTP requests during tests and returns mocked responses.
 * Start it in beforeAll(), reset after each test, and close in afterAll().
 */
const server = setupServer(...handlers);

module.exports = { server };
