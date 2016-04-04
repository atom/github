/* @flow */

export const DiffURI = 'atom://git/diff/'

export type ObjectMap<V> = { [key: string]: V }

export function ifNotNull <T, U> (a: ?T, fn: (a: T) => U): ?U {
  if (a) {
    return fn(a)
  } else {
    return null
  }
}

export function unnull <T> (x: ?T): T {
  // The whole point of this function is to coerce a nullable to a non-null,
  // which isn't type safe. So tell Flow to keep quiet about it.
  // $FlowSilence
  return x
}

export function findFirst <T> (array: Array<T>, pred: (arg: T) => boolean): ?T {
  for (const item of array) {
    if (pred(item)) return item
  }

  return null
}
