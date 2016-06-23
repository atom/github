/** @babel */

import Hunk from '../lib/hunk'
import HunkLine from '../lib/hunk-line'
import HunkComponent from '../lib/hunk-component'

describe('HunkComponent', () => {
  it('renders the hunk header and its lines', async () => {
    const hunk1 = new Hunk(5, 5, 2, 1, [
      new HunkLine('line-1', 'unchanged', 5, 5),
      new HunkLine('line-2', 'removed', 6, -1),
      new HunkLine('line-3', 'removed', 7, -1),
      new HunkLine('line-4', 'added', -1, 6)
    ])
    const component = new HunkComponent({hunk: hunk1})
    const element = component.element
    var [line1, line2, line3, line4] = Array.from(element.querySelectorAll('.git-HunkComponent-line'))

    assert.equal(element.querySelector('.git-HunkComponent-header').textContent, hunk1.getHeader())
    assertHunkLineElementEqual(
      line1,
      {oldLineNumber: '5', newLineNumber: '5', origin: ' ', content: 'line-1'}
    )
    assertHunkLineElementEqual(
      line2,
      {oldLineNumber: '6', newLineNumber: ' ', origin: '-', content: 'line-2'}
    )
    assertHunkLineElementEqual(
      line3,
      {oldLineNumber: '7', newLineNumber: ' ', origin: '-', content: 'line-3'}
    )
    assertHunkLineElementEqual(
      line4,
      {oldLineNumber: ' ', newLineNumber: '6', origin: '+', content: 'line-4'}
    )

    const hunk2 = new Hunk(8, 8, 1, 1, [
      new HunkLine('line-1', 'removed', 8, -1),
      new HunkLine('line-2', 'added', -1, 8)
    ])
    var [line1, line2] = Array.from(element.querySelectorAll('.git-HunkComponent-line'))

    await component.update({hunk: hunk2})

    assert.equal(element.querySelector('.git-HunkComponent-header').textContent, hunk2.getHeader())
    assertHunkLineElementEqual(
      line1,
      {oldLineNumber: '8', newLineNumber: ' ', origin: '-', content: 'line-1'}
    )
    assertHunkLineElementEqual(
      line2,
      {oldLineNumber: ' ', newLineNumber: '8', origin: '+', content: 'line-2'}
    )
  })

  it('selects lines and invokes the specified handler when the selection changes', async () => {
    const hunk = new Hunk(1234, 1234, 1234, 1234, [
      new HunkLine('line-1', 'added', 1234, 1234),
      new HunkLine('line-2', 'added', 1234, 1234),
      new HunkLine('line-3', 'added', 1234, 1234),
      new HunkLine('line-4', 'unchanged', 1234, 1234),
      new HunkLine('line-5', 'removed', 1234, 1234),
      new HunkLine('line-6', 'removed', 1234, 1234)
    ])
    let selectedLines = []
    const component = new HunkComponent({hunk, onDidChangeSelectedLines: (lines) => selectedLines = lines})
    const element = component.element
    const [line1, line2, line3, line4, line5, line6] = Array.from(element.querySelectorAll('.git-HunkComponent-line'))

    // clicking lines
    line5.dispatchEvent(new MouseEvent('mousedown'))
    line5.dispatchEvent(new MouseEvent('mouseup'))
    assert.deepEqual(selectedLines, hunk.getLines().slice(4, 5))
    line1.dispatchEvent(new MouseEvent('mousedown'))
    line1.dispatchEvent(new MouseEvent('mouseup'))
    assert.deepEqual(selectedLines, hunk.getLines().slice(0, 1))

    // clearing the selection
    await component.clearSelection()
    assert.deepEqual(selectedLines, [])

    // moving the mouse without dragging is a no-op
    line2.dispatchEvent(new MouseEvent('mousemove'))
    assert.deepEqual(selectedLines, [])

    // start dragging
    line2.dispatchEvent(new MouseEvent('mousedown'))
    assert.deepEqual(selectedLines, hunk.getLines().slice(1, 2))
    // dragging the mouse within the same line is idempotent
    line2.dispatchEvent(new MouseEvent('mousemove'))
    assert.deepEqual(selectedLines, hunk.getLines().slice(1, 2))
    // dragging the mouse to the next adjacent lines selects them
    line3.dispatchEvent(new MouseEvent('mousemove'))
    assert.deepEqual(selectedLines, hunk.getLines().slice(1, 3))
    line6.dispatchEvent(new MouseEvent('mousemove'))
    assert.deepEqual(selectedLines, hunk.getLines().slice(1, 6))
    // dragging the mouse to a line before the first selected one selects the adjacent lines in the middle
    line1.dispatchEvent(new MouseEvent('mousemove'))
    assert.deepEqual(selectedLines, hunk.getLines().slice(0, 2))
  })

  function assertHunkLineElementEqual (element, {oldLineNumber, newLineNumber, origin, content}) {
    assert.equal(element.querySelector('.git-HunkComponent-oldLineNumber').textContent, oldLineNumber)
    assert.equal(element.querySelector('.git-HunkComponent-newLineNumber').textContent, newLineNumber)
    assert.equal(element.querySelector('.git-HunkComponent-lineContent').textContent, origin + content)
  }
})
