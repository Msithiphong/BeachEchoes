export function nameValidator(name) {
  if (!name) return "Name can't be empty."
  if (name.length == 1) return "Name is too short"
  return ''
}
