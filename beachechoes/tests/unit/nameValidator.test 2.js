import { nameValidator } from '../../helpers/nameValidator'

describe('nameValidator', () => {
  it('returns error for empty name', () => {
    expect(nameValidator('')).toBeTruthy()
  })

  it('returns error for very short name', () => {
    expect(nameValidator('A')).toBeTruthy()
  })

  it('returns no error for valid name', () => {
    expect(nameValidator('Alice Johnson')).toBeFalsy()
  })
})
