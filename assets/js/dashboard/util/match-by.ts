type ReplaceUndefinedWithUnknown<T> = T extends readonly unknown[]
  ? {
      [K in keyof T]: T[K] extends undefined
        ? unknown
        : ReplaceUndefinedWithUnknown<T[K]>
    }
  : T

/**
 * `matchBy` creates a function that checks if an array matches a given array structure (including exact length). Works recursively.
 * @param mustMatchArray - The array structure to match. Can contain `undefined` elements, which will match any value in the array being checked.
 *
 * Examples
 * `matchBy([matchBy._, 'goal', [matchBy._]])(['contains', 'goal', ['some value']])` // true
 * `matchBy([matchBy._, 'goal', [matchBy._]])(['is', 'goal', ['some value', 'another value']])` // false
 */
function matchBy<T extends readonly unknown[]>(mustMatchArray: T) {
  return (
    arrayToCheck: unknown
  ): arrayToCheck is ReplaceUndefinedWithUnknown<T> => {
    return (
      Array.isArray(arrayToCheck) &&
      arrayToCheck.length === mustMatchArray.length &&
      arrayToCheck.every((elementToCheck, index) => {
        const mustMatchElement = mustMatchArray[index]
        // undefined element matches any value in the array tested
        if (mustMatchElement === undefined) {
          return true
        }
        // matches arrays recursively
        if (Array.isArray(elementToCheck) && Array.isArray(mustMatchElement)) {
          return matchBy(mustMatchElement)(elementToCheck)
        }
        // matches null, booleans, numbers and strings exactly
        return elementToCheck === mustMatchElement
      })
    )
  }
}

matchBy._ = undefined

export { matchBy }
