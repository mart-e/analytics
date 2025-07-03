import { matchBy } from './match-by'

describe(`${matchBy.name}`, () => {
  it('matches arrays with exact structure and values', () => {
    const matcher = matchBy(['a', 'b', 'c'])
    expect(matcher(['a', 'b', 'c'])).toBe(true)
    expect(matcher(['a', 'b', 'd'])).toBe(false)
    expect(matcher(['a', 'b'])).toBe(false)
    expect(matcher(['a', 'b', 'c', 'd'])).toBe(false)
  })

  it('matches arrays with undefined as wildcard', () => {
    const matcher = matchBy([matchBy._, 'goal', [matchBy._]])
    expect(matcher(['contains', 'goal', ['some value']])).toBe(true)
    expect(matcher(['is', 'goal', ['some value', 'another value']])).toBe(false)
    expect(matcher(['contains', 'goal', ['x']])).toBe(true)
    expect(matcher(['contains', 'goal', []])).toBe(false)
  })

  it('matches nested arrays recursively', () => {
    const matcher = matchBy(['a', [matchBy._, 'b'], 'c'])
    expect(matcher(['a', ['x', 'b'], 'c'])).toBe(true)
    expect(matcher(['a', ['x', 'c'], 'c'])).toBe(false)
    expect(matcher(['a', ['x', 'b', 'y'], 'c'])).toBe(false)
  })

  it('matches with all wildcards', () => {
    const matcher = matchBy([matchBy._, matchBy._, matchBy._])
    expect(matcher([1, 2, 3])).toBe(true)
    expect(matcher(['a', 'b', 'c'])).toBe(true)
    expect(matcher([null, false, undefined])).toBe(true)
    expect(matcher([1, 2])).toBe(false)
  })

  it('matches empty arrays', () => {
    const matcher = matchBy([])
    expect(matcher([])).toBe(true)
    expect(matcher([1])).toBe(false)
  })

  it('matches arrays with different types', () => {
    const matcher = matchBy([1, 'a', true, null])
    expect(matcher([1, 'a', true, null])).toBe(true)
    expect(matcher([1, 'a', false, null])).toBe(false)
  })

  it('does not match non-arrays', () => {
    const matcher = matchBy([1, 2, 3])
    expect(matcher('not an array')).toBe(false)
    expect(matcher(123)).toBe(false)
    expect(matcher({})).toBe(false)
    expect(matcher(null)).toBe(false)
    expect(matcher(undefined)).toBe(false)
  })
})
