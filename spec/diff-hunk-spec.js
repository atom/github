/** @babel */

import DiffHunk from '../lib/diff-hunk'

describe("DiffHunk", function() {
  it("roundtrips toString and fromString", function() {
    let hunk = HunkStr
    let diffHunk = DiffHunk.fromString(hunk)
    expect(diffHunk.toString()).toEqual(hunk)
  })

  it("stages all lines with ::stage() and unstages all lines with ::unstage()", function() {
    let diffHunk = DiffHunk.fromString(HunkStr)
    expect(diffHunk.getStageStatus()).toBe('unstaged')

    diffHunk.stage()
    expect(diffHunk.getStageStatus()).toBe('staged')
    expect(diffHunk.getLines()[3].isStaged()).toBe(true)
    expect(diffHunk.getLines()[4].isStaged()).toBe(true)
    expect(diffHunk.getLines()[5].isStaged()).toBe(true)

    diffHunk.unstage()
    expect(diffHunk.getStageStatus()).toBe('unstaged')
    expect(diffHunk.getLines()[3].isStaged()).toBe(false)
    expect(diffHunk.getLines()[4].isStaged()).toBe(false)
    expect(diffHunk.getLines()[5].isStaged()).toBe(false)
  })

  it("returns 'partial' from getStageStatus() when some of the lines are staged", function() {
    let diffHunk = DiffHunk.fromString(HunkStr)
    expect(diffHunk.getStageStatus()).toBe('unstaged')

    diffHunk.getLines()[3].stage()
    expect(diffHunk.getStageStatus()).toBe('partial')

    diffHunk.getLines()[3].unstage()
    expect(diffHunk.getStageStatus()).toBe('unstaged')
  })
})

HunkStr = `HUNK @@ -85,9 +85,6 @@ ScopeDescriptor = require './scope-descriptor'
  85 85   #
  86 86   # ## Config Schemas
  87 87   #
  88 --- - # We use [json schema](http://json-schema.org) which allows you to define your value's
  89 --- - # default, the type it should be, etc. A simple example:
  90 --- - #
  91 88   # \`\`\`coffee
  92 89   # # We want to provide an \`enableThing\`, and a \`thingVolume\`
  93 90   # config:`
