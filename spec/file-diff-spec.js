/** @babel */

import FileDiff from '../lib/file-diff'

describe("FileDiff", function() {
  it("roundtrips toString and fromString", function() {
    let file = FileStr
    let fileDiff = FileDiff.fromString(file)
    expect(fileDiff.toString()).toEqual(file)
  })
})

FileStr = `FILE src/config.coffee - modified - unstaged
HUNK @@ -85,9 +85,6 @@ ScopeDescriptor = require './scope-descriptor'
  85 85   #
  86 86   # ## Config Schemas
  87 87   #
  88 --- - # We use [json schema](http://json-schema.org) which allows you to define your value's
  89 --- - # default, the type it should be, etc. A simple example:
  90 --- - #
  91 88   # \`\`\`coffee
  92 89   # # We want to provide an \`enableThing\`, and a \`thingVolume\`
  93 90   # config:`
