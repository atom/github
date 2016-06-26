/** @babel */

import sinon from 'sinon'
import etch from 'etch'

import Hunk from '../../lib/models/hunk'
import HunkLine from '../../lib/models/hunk-line'
import HunkComponent from '../../lib/views/hunk-component'

describe('HunkComponent', () => {
  it('renders the hunk header and its lines', async () => {
    const hunk1 = new Hunk(5, 5, 2, 1, [
      new HunkLine('line-1', 'unchanged', 5, 5),
      new HunkLine('line-2', 'removed', 6, -1),
      new HunkLine('line-3', 'removed', 7, -1),
      new HunkLine('line-4', 'added', -1, 6)
    ])
    const component = new HunkComponent({hunk: hunk1, selectedLines: new Set})
    const element = component.element
    var [line1, line2, line3, line4] = Array.from(element.querySelectorAll('.git-HunkComponent-line'))

    assert.equal(component.refs.header.textContent, hunk1.getHeader())
    assertHunkLineElementEqual(
      line1,
      {oldLineNumber: '5', newLineNumber: '5', origin: ' ', content: 'line-1', isSelected: false}
    )
    assertHunkLineElementEqual(
      line2,
      {oldLineNumber: '6', newLineNumber: ' ', origin: '-', content: 'line-2', isSelected: false}
    )
    assertHunkLineElementEqual(
      line3,
      {oldLineNumber: '7', newLineNumber: ' ', origin: '-', content: 'line-3', isSelected: false}
    )
    assertHunkLineElementEqual(
      line4,
      {oldLineNumber: ' ', newLineNumber: '6', origin: '+', content: 'line-4', isSelected: false}
    )

    const hunk2 = new Hunk(8, 8, 1, 1, [
      new HunkLine('line-1', 'removed', 8, -1),
      new HunkLine('line-2', 'added', -1, 8)
    ])
    var [line1, line2] = Array.from(element.querySelectorAll('.git-HunkComponent-line'))

    await component.update({hunk: hunk2, selectedLines: new Set})

    assert.equal(component.refs.header.textContent, hunk2.getHeader())
    assertHunkLineElementEqual(
      line1,
      {oldLineNumber: '8', newLineNumber: ' ', origin: '-', content: 'line-1', isSelected: false}
    )
    assertHunkLineElementEqual(
      line2,
      {oldLineNumber: ' ', newLineNumber: '8', origin: '+', content: 'line-2', isSelected: false}
    )

    await component.update({hunk: hunk2, selectedLines: new Set([hunk2.getLines()[1]])})
    assertHunkLineElementEqual(
      line1,
      {oldLineNumber: '8', newLineNumber: ' ', origin: '-', content: 'line-1', isSelected: false}
    )
    assertHunkLineElementEqual(
      line2,
      {oldLineNumber: ' ', newLineNumber: '8', origin: '+', content: 'line-2', isSelected: true}
    )
  })

  it('adds the is-selected class based on the isSelected property', async () => {
    const hunk = new Hunk(5, 5, 2, 1, [])
    const component = new HunkComponent({hunk, selectedLines: new Set, isSelected: true})
    assert(component.element.classList.contains('is-selected'))

    await component.update({hunk: hunk, selectedLines: new Set, isSelected: false})
    assert(!component.element.classList.contains('is-selected'))
  })

  it('updates the button label based on the number of selected lines', async () => {
    const hunk = new Hunk(5, 5, 2, 1, [
      new HunkLine('line-1', 'unchanged', 5, 5),
      new HunkLine('line-2', 'removed', 6, -1)
    ])
    const component = new HunkComponent({hunk, selectedLines: new Set, stageButtonLabelPrefix: 'Stage'})
    assert.equal(component.refs.stageButton.textContent, 'Stage Hunk')

    await component.update({hunk, selectedLines: new Set([hunk.getLines()[0]])})
    assert.equal(component.refs.stageButton.textContent, 'Stage Line')

    await component.update({hunk, selectedLines: new Set(hunk.getLines())})
    assert.equal(component.refs.stageButton.textContent, 'Stage Lines')
  })

  it('calls the didClickStagingButton handler when the staging button is clicked', async () => {
    const hunk = new Hunk(5, 5, 2, 1, [new HunkLine('line-1', 'unchanged', 5, 5)])
    const didClickStagingButton = sinon.spy()
    const component = new HunkComponent({hunk, selectedLines: new Set, didClickStageButton: didClickStagingButton})
    component.refs.stageButton.dispatchEvent(new MouseEvent('click'))
    assert(didClickStagingButton.calledOnce)
  })

  it('calls the didSelectLines handler when lines are selected with the mouse', async () => {
    const hunk = new Hunk(1234, 1234, 1234, 1234, [
      new HunkLine('line-1', 'added', 1234, 1234),
      new HunkLine('line-2', 'added', 1234, 1234),
      new HunkLine('line-3', 'added', 1234, 1234),
      new HunkLine('line-4', 'unchanged', 1234, 1234),
      new HunkLine('line-5', 'removed', 1234, 1234),
      new HunkLine('line-6', 'removed', 1234, 1234)
    ])

    const didSelectLines = sinon.spy()
    const component = new HunkComponent({hunk, selectedLines: new Set, onDidSelectLines: didSelectLines})
    const element = component.element
    const [line1, line2, line3, line4, line5, line6] = Array.from(element.querySelectorAll('.git-HunkComponent-line'))

    // clicking lines
    line5.dispatchEvent(new MouseEvent('mousedown'))
    line5.dispatchEvent(new MouseEvent('mouseup'))
    assert.deepEqual(Array.from(didSelectLines.args[0][0]), hunk.getLines().slice(4, 5))

    didSelectLines.reset()
    line1.dispatchEvent(new MouseEvent('mousedown'))
    line1.dispatchEvent(new MouseEvent('mouseup'))
    assert.deepEqual(Array.from(didSelectLines.args[0][0]), hunk.getLines().slice(0, 1))

    // moving the mouse without dragging is a no-op
    didSelectLines.reset()
    line2.dispatchEvent(new MouseEvent('mousemove'))
    assert(!didSelectLines.called)

    // start dragging
    didSelectLines.reset()
    line2.dispatchEvent(new MouseEvent('mousedown'))
    assert.deepEqual(Array.from(didSelectLines.args[0][0]), hunk.getLines().slice(1, 2))
    // dragging the mouse within the same line is idempotent
    didSelectLines.reset()
    line2.dispatchEvent(new MouseEvent('mousemove'))
    assert.deepEqual(Array.from(didSelectLines.args[0][0]), hunk.getLines().slice(1, 2))
    // dragging the mouse to the next adjacent lines selects them
    didSelectLines.reset()
    line3.dispatchEvent(new MouseEvent('mousemove'))
    assert.deepEqual(Array.from(didSelectLines.args[0][0]), hunk.getLines().slice(1, 3))
    didSelectLines.reset()
    line6.dispatchEvent(new MouseEvent('mousemove'))
    assert.deepEqual(Array.from(didSelectLines.args[0][0]), hunk.getLines().slice(1, 6))
    // dragging the mouse to a line before the first selected one selects the adjacent lines in the middle
    didSelectLines.reset()
    line1.dispatchEvent(new MouseEvent('mousemove'))
    assert.deepEqual(Array.from(didSelectLines.args[0][0]), hunk.getLines().slice(0, 2))
  })

  function assertHunkLineElementEqual (lineElement, {oldLineNumber, newLineNumber, origin, content, isSelected}) {
    assert.equal(lineElement.querySelector('.git-HunkComponent-oldLineNumber').textContent, oldLineNumber)
    assert.equal(lineElement.querySelector('.git-HunkComponent-newLineNumber').textContent, newLineNumber)
    assert.equal(lineElement.querySelector('.git-HunkComponent-lineContent').textContent, origin + content)
    assert.equal(lineElement.classList.contains('is-selected'), isSelected)
  }
})
