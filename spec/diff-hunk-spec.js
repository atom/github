/** @babel */

import DiffHunk from '../lib/diff-hunk'

describe("DiffHunk", function() {
  let diffHunk
  beforeEach(function() {
    diffHunk = DiffHunk.fromString(HunkStr)
  })

  it("roundtrips toString and fromString", function() {
    expect(diffHunk.toString()).toEqual(HunkStr)
  })

  it("emits an event when created from a string on an empty object", function() {
    let changeHandler = jasmine.createSpy()
    diffHunk = new DiffHunk()
    diffHunk.onDidChange(changeHandler)

    diffHunk.fromString(HunkStr)
    expect(changeHandler).toHaveBeenCalled()
    expect(diffHunk.toString()).toEqual(HunkStr)
  })

  it("stages all lines with ::stage() and unstages all lines with ::unstage()", function() {
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
    expect(diffHunk.getStageStatus()).toBe('unstaged')

    diffHunk.getLines()[3].stage()
    expect(diffHunk.getStageStatus()).toBe('partial')

    diffHunk.getLines()[3].unstage()
    expect(diffHunk.getStageStatus()).toBe('unstaged')
  })

  it("emits one change event when the hunk is staged", function() {
    let changeHandler = jasmine.createSpy()
    diffHunk.onDidChange(changeHandler)

    diffHunk.stage()
    expect(changeHandler.callCount).toBe(1)
  })

  it("emits a change event when a line is staged", function() {
    let changeHandler = jasmine.createSpy()
    diffHunk.onDidChange(changeHandler)

    diffHunk.getLines()[3].stage()
    expect(changeHandler).toHaveBeenCalled()
  })

  it("emits events when the header and lines change", function() {
    let changeHandler = jasmine.createSpy()
    diffHunk.onDidChange(changeHandler)

    diffHunk.setHeader('@@ -85,9 +85,6 @@ someline ok yeah')
    expect(changeHandler).toHaveBeenCalled()

    changeHandler.reset()
    diffHunk.setLines([])
    expect(changeHandler).toHaveBeenCalled()
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
