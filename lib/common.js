/* @flow */

interface FromStringable { // eslint-disable-line
  fromString(s: string): any;
}

export const DiffURI = 'atom://git/diff/'

export function createObjectsFromString <T: FromStringable> (diffString: string, markerString: string, classToCreate: T): Array<T> {
  let objects = []
  let lines = diffString.split('\n')
  let objectLines = null

  function createObject (lines) {
    if (!lines) return

    let obj = classToCreate.fromString(lines.join('\n'))
    objects.push(obj)
  }

  for (let line of lines) {
    if (line.startsWith(markerString)) {
      createObject(objectLines)
      objectLines = []
    }
    if (objectLines) objectLines.push(line)
  }
  createObject(objectLines)

  return objects
}

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
