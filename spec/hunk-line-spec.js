/** @babel */

import HunkLine from '../lib/hunk-line'

describe("HunkLine", function() {
  it("roundtrips toString and fromString", function() {
    let line = '  89 --- - # default, the type it should be, etc. A simple example:'
    let hunkLine = HunkLine.fromString(line)
    expect(hunkLine.toString()).toEqual(line)

    line = '  435 432         scopeDescriptor = options.scope'
    hunkLine = HunkLine.fromString(line)
    expect(hunkLine.toString()).toEqual(line)

    line = '  --- 434 +     # Some new linesssss'
    hunkLine = HunkLine.fromString(line)
    expect(hunkLine.toString()).toEqual(line)

    line = '✓ --- 434 +     # Some new linesssss'
    hunkLine = HunkLine.fromString(line)
    expect(hunkLine.toString()).toEqual(line)

    line = '  85 85   #'
    hunkLine = HunkLine.fromString(line)
    expect(hunkLine.toString()).toEqual(line)
  })
})
