export const POST_CATEGORIES = ['Tips', 'Events', 'Funny', 'Food', 'Study Spots']
export const DEFAULT_POST_CATEGORY = POST_CATEGORIES[0]

export function isValidPostCategory(category) {
  return POST_CATEGORIES.includes(category)
}
