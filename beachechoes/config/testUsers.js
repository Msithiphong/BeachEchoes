/**
 * Test User Configuration Module
 * 
 * Provides test user credentials from environment variables for dev-only
 * quick sign-in functionality in the Admin Dashboard.
 * 
 * These credentials are used for testing friend request edge cases and
 * multi-user interactions without manual login.
 * 
 * Security Notes:
 * - Never commit real credentials to version control
 * - These are loaded from .env file (which should be gitignored)
 * - The sign-in UI is only shown when SHOW_ADMIN_TEST_BUTTONS=true or in __DEV__ mode
 * 
 * @module config/testUsers
 */

/**
 * Test User A credentials
 * @type {{email: string|undefined, password: string|undefined}}
 */
export const TEST_USER_A = {
  email: process.env.EXPO_PUBLIC_TEST_USER_A_EMAIL,
  password: process.env.EXPO_PUBLIC_TEST_USER_A_PASSWORD,
}

/**
 * Test User B credentials
 * @type {{email: string|undefined, password: string|undefined}}
 */
export const TEST_USER_B = {
  email: process.env.EXPO_PUBLIC_TEST_USER_B_EMAIL,
  password: process.env.EXPO_PUBLIC_TEST_USER_B_PASSWORD,
}

/**
 * Flag to show admin test buttons in UI
 * Keeps quick sign-in helpers gated behind explicit dev/test intent.
 * @type {boolean}
 */
export const SHOW_ADMIN_TEST_BUTTONS = process.env.EXPO_PUBLIC_SHOW_ADMIN_TEST_BUTTONS === 'true'
