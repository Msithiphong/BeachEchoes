import { passwordValidator } from '../../helpers/passwordValidator'

describe('passwordValidator', () => {
  it('returns error for empty password', () => {
    expect(passwordValidator('')).toBeTruthy()
  })

  it('returns error for short password', () => {
    expect(passwordValidator('123')).toBeTruthy()
  })

  it('returns no error for strong password', () => {
    expect(passwordValidator('Password123!')).toBeFalsy()
  })
})
