'use babel'

import {createRunner} from 'atom-mocha-test-runner'
import {assert} from 'chai'
global.assert = assert

module.exports = createRunner({
  overrideTestPaths: [/spec$/, /test/]
})
