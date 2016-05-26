'use babel'
// Lifted from Atom

// TODO: THIS IS A HACK!
// We're currently depending on the implicit behavior of loading
// this file first (because of loading files in alphabetical order,
// hence the filename of `_async-spec-helpers-spec.js`).
// Because forgetting to require the async spec helpers can cause
// silent and mysterious and frustrating bugs, we're ensuring
// that this file gets required before all the others.
global.describe('async spec helpers', function () {
  const suiteCount = this.env.currentRunner().suites().length
  global.it('runs before any other spec is defined', () => {
    expect(suiteCount).toBe(1)
  })
})

const {beforeEach, afterEach, runs, it, fit, ffit, fffit} = global
const original = {beforeEach, afterEach, runs, it, fit, ffit, fffit}

global.beforeEach = function (fn) {
  return original.beforeEach(function () {
    var result = fn()
    if (result instanceof Promise) {
      global.waitsForPromise(function () { return result })
    }
  })
}

global.afterEach = function (fn) {
  return original.afterEach(function () {
    var result = fn()
    if (result instanceof Promise) {
      global.waitsForPromise(function () { return result })
    }
  })
}

global.runs = function (fn) {
  return original.runs(function () {
    var result = fn()
    if (result instanceof Promise) {
      global.waitsForPromise(function () { return result })
    }
  })
}

var matchers = ['it', 'fit', 'ffit', 'fffit'] // inlining this makes things fail wtf.
matchers.forEach(function (name) {
  global[name] = function (description, fn) {
    return original[name](description, function () {
      var result = fn()
      if (result instanceof Promise) {
        global.waitsForPromise(function () { return result })
      }
    })
  }
})

// like `waitsFor` and `waitsForPromise` except you can `await` it
// to suspend/block an `async` test, and you don't have to use `runs`.
// Usage: `await until([description,] [timeout,] fn)`
//    Arguments can be supplied in any order
//
// E.g.:
//
//    await until('a thing happens', () => didThingHappen())
//    expect(thing).toBe(something)
global.until = (...args) => {
  const start = new Date().getTime()

  let latchFunction = null
  let message = null
  let timeout = null

  if (args.length > 3) {
    throw new Error('until only takes up to 3 args')
  }

  for (let arg of args) {
    switch (typeof arg) {
      case 'function':
        latchFunction = arg
        break
      case 'string':
        message = arg
        break
      case 'number':
        timeout = arg
        break
    }
  }

  message = message || 'something happens'
  timeout = timeout || 5000

  return new Promise((resolve, reject) => {
    const checker = () => {
      const result = latchFunction()
      if (result) return resolve(result)

      const now = new Date().getTime()
      const delta = now - start
      if (delta > timeout) {
        return reject(new Error(`timeout: timed out after ${timeout} msec waiting until ${message}`))
      } else {
        jasmine.currentEnv_.setTimeout(checker)
      }
    }
    checker()
  })
}

global.openAndActivated = async (filePath) => {
  const editor = await atom.workspace.open(filePath)
  // Wait after creating the editor so we don't inadvertently destroy
  // it on the same tick, which causes exceptions down in Atom's
  // decorations code.
  await oneTick()
  await until('editor is the active pane item', () => atom.workspace.getActivePaneItem() === editor)
  return editor
}

global.oneTick = () => {
  return new Promise(resolve => resolve())
}
