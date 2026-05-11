// Shared post category options used by compose flows and backend validation helpers.
export const POST_CATEGORIES = ['Tips', 'Events', 'Funny', 'Food', 'Study Spots']
export const DEFAULT_POST_CATEGORY = POST_CATEGORIES[0]

/**
 * Check whether a category string matches one of the supported post categories.
 *
 * @param {string} category
 * @returns {boolean}
 */
export function isValidPostCategory(category) {
  return POST_CATEGORIES.includes(category)
}
