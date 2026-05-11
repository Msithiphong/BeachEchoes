// Keeps the auth email validator contract intentionally small and easy to reason about.
import { emailValidator } from '../../helpers/emailValidator'

describe('emailValidator', () => {
  it('returns error for empty email', () => {
    expect(emailValidator('')).toBeTruthy()
  })

  it('returns error for invalid email', () => {
    expect(emailValidator('notanemail')).toBeTruthy()
  })

  it('returns no error for valid email', () => {
    expect(emailValidator('test@example.com')).toBeFalsy()
  })
})
