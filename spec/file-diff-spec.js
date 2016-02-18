/** @babel */

import FileDiff from '../lib/file-diff'
import {createFileDiffsFromPath} from './helpers'

describe('FileDiff', function () {
  it('roundtrips toString and fromString', function () {
    let file = FileStr
    let fileDiff = FileDiff.fromString(file)
    expect(fileDiff.toString()).toEqual(file)
  })

  it('stages all hunks with ::stage() and unstages all hunks with ::unstage()', function () {
    let fileDiff = createFileDiffsFromPath('fixtures/two-file-diff.txt')[0]
    expect(fileDiff.getStageStatus()).toBe('unstaged')

    let changeHandler = jasmine.createSpy()
    fileDiff.onDidChange(changeHandler)

    fileDiff.stage()

    expect(changeHandler).toHaveBeenCalled()
    let args = changeHandler.mostRecentCall.args
    expect(args[0].file).toBe(fileDiff)
    expect(args[0].events).toHaveLength(3)
    expect(args[0].events[0].hunk).toBe(fileDiff.getHunks()[0])

    expect(fileDiff.getStageStatus()).toBe('staged')
    expect(fileDiff.getHunks()[0].getStageStatus()).toBe('staged')
    expect(fileDiff.getHunks()[1].getStageStatus()).toBe('staged')
    expect(fileDiff.getHunks()[2].getStageStatus()).toBe('staged')

    fileDiff.unstage()
    expect(fileDiff.getStageStatus()).toBe('unstaged')
    expect(fileDiff.getHunks()[0].getStageStatus()).toBe('unstaged')
    expect(fileDiff.getHunks()[1].getStageStatus()).toBe('unstaged')
    expect(fileDiff.getHunks()[2].getStageStatus()).toBe('unstaged')
  })

  it('stages all hunks with ::stage() and unstages all hunks with ::unstage()', function () {
    let fileDiff = createFileDiffsFromPath('fixtures/two-file-diff.txt')[0]
    expect(fileDiff.getStageStatus()).toBe('unstaged')

    let changeHandler = jasmine.createSpy()
    fileDiff.onDidChange(changeHandler)

    fileDiff.getHunks()[1].stage()

    expect(changeHandler).toHaveBeenCalled()
    let args = changeHandler.mostRecentCall.args
    expect(args[0].file).toBe(fileDiff)
    expect(args[0].events).toHaveLength(1)
    expect(args[0].events[0].hunk).toBe(fileDiff.getHunks()[1])
    expect(args[0].events[0].events[0].line).toBe(fileDiff.getHunks()[1].getLines()[3])

    fileDiff.getHunks()[1].getLines()[3].unstage()
    args = changeHandler.mostRecentCall.args
    expect(args[0].file).toBe(fileDiff)
    expect(args[0].events).toHaveLength(1)
    expect(args[0].events[0].hunk).toBe(fileDiff.getHunks()[1])
    expect(args[0].events[0].events[0].line).toBe(fileDiff.getHunks()[1].getLines()[3])
  })

  it('returns "partial" from getStageStatus() when some of the hunks are staged', function () {
    let fileDiff = createFileDiffsFromPath('fixtures/two-file-diff.txt')[0]
    expect(fileDiff.getStageStatus()).toBe('unstaged')

    fileDiff.getHunks()[1].stage()
    expect(fileDiff.getStageStatus()).toBe('partial')

    fileDiff.getHunks()[1].unstage()
    expect(fileDiff.getStageStatus()).toBe('unstaged')
  })

  it('emits an event when FileDiff::fromString() is called', function () {
    let changeHandler = jasmine.createSpy()
    let file = FileStr
    let fileDiff = new FileDiff()
    fileDiff.onDidChange(changeHandler)

    fileDiff.fromString(file)
    expect(changeHandler).toHaveBeenCalled()
    expect(fileDiff.toString()).toEqual(file)
  })

  it('emits one change event when the file is staged', function () {
    let changeHandler = jasmine.createSpy()
    let fileDiff = createFileDiffsFromPath('fixtures/two-file-diff.txt')[0]
    fileDiff.onDidChange(changeHandler)

    fileDiff.stage()
    expect(changeHandler.callCount).toBe(1)
  })

  it('emits a change event when a hunk is staged', function () {
    let changeHandler = jasmine.createSpy()
    let fileDiff = createFileDiffsFromPath('fixtures/two-file-diff.txt')[0]
    fileDiff.onDidChange(changeHandler)

    fileDiff.getHunks()[1].stage()
    expect(changeHandler).toHaveBeenCalled()
  })
})

const FileStr = `FILE src/config.coffee - modified - unstaged
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
