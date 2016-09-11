/** @babel */

import sinon from 'sinon'

import Hunk from '../../lib/models/hunk'
import HunkLine from '../../lib/models/hunk-line'
import HunkView from '../../lib/views/hunk-view'

describe('HunkView', () => {
  it('renders the hunk header and its lines', async () => {
    const hunk1 = new Hunk(5, 5, 2, 1, [
      new HunkLine('line-1', 'unchanged', 5, 5),
      new HunkLine('line-2', 'deleted', 6, -1),
      new HunkLine('line-3', 'deleted', 7, -1),
      new HunkLine('line-4', 'added', -1, 6)
    ])
    const view = new HunkView({hunk: hunk1, selectedLines: new Set()})
    const element = view.element
    let [line1, line2, line3, line4] = Array.from(element.querySelectorAll('.git-HunkView-line'))

    assert.equal(view.refs.header.textContent, hunk1.getHeader())
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
      new HunkLine('line-1', 'deleted', 8, -1),
      new HunkLine('line-2', 'added', -1, 8)
    ])
    const lines = Array.from(element.querySelectorAll('.git-HunkView-line'))
    line1 = lines[0]
    line2 = lines[1]

    await view.update({hunk: hunk2, selectedLines: new Set()})

    assert.equal(view.refs.header.textContent, hunk2.getHeader())
    assertHunkLineElementEqual(
      line1,
      {oldLineNumber: '8', newLineNumber: ' ', origin: '-', content: 'line-1', isSelected: false}
    )
    assertHunkLineElementEqual(
      line2,
      {oldLineNumber: ' ', newLineNumber: '8', origin: '+', content: 'line-2', isSelected: false}
    )

    await view.update({hunk: hunk2, selectedLines: new Set([hunk2.getLines()[1]])})
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
    const view = new HunkView({hunk, selectedLines: new Set(), isSelected: true})
    assert(view.element.classList.contains('is-selected'))

    await view.update({hunk: hunk, selectedLines: new Set(), isSelected: false})
    assert(!view.element.classList.contains('is-selected'))
  })

  it('updates the button label based on the number of selected lines', async () => {
    const hunk = new Hunk(5, 5, 2, 1, [
      new HunkLine('line-1', 'unchanged', 5, 5),
      new HunkLine('line-2', 'deleted', 6, -1)
    ])
    const view = new HunkView({hunk, selectedLines: new Set(), stageButtonLabelPrefix: 'Stage'})
    assert.equal(view.refs.stageButton.textContent, 'Stage Hunk')

    await view.update({hunk, stageButtonLabelPrefix: 'Stage', selectedLines: new Set([hunk.getLines()[0]])})
    assert.equal(view.refs.stageButton.textContent, 'Stage Selection')

    await view.update({hunk, stageButtonLabelPrefix: 'Stage', selectedLines: new Set(hunk.getLines())})
    assert.equal(view.refs.stageButton.textContent, 'Stage Selection')
  })

  it('calls the didClickStageButton handler when the staging button is clicked', async () => {
    const hunk = new Hunk(5, 5, 2, 1, [new HunkLine('line-1', 'unchanged', 5, 5)])
    const didClickStageButton1 = sinon.spy()
    const view = new HunkView({hunk, selectedLines: new Set(), didClickStageButton: didClickStageButton1})
    view.refs.stageButton.dispatchEvent(new MouseEvent('click'))
    assert(didClickStageButton1.calledOnce)

    const didClickStageButton2 = sinon.spy()
    await view.update({didClickStageButton: didClickStageButton2, hunk, selectedLines: new Set()})
    view.refs.stageButton.dispatchEvent(new MouseEvent('click'))
    assert(didClickStageButton2.calledOnce)
  })

  describe('line selection', () => {
    it('calls the selectLine handler on mousemove & mouseup events when selectionEnabled prop is true and line is a non-context line', async () => {
      const hunk = new Hunk(1234, 1234, 1234, 1234, [
        new HunkLine('line-1', 'added', 1234, 1234),
        new HunkLine('line-2', 'added', 1234, 1234),
        new HunkLine('line-3', 'added', 1234, 1234),
        new HunkLine('line-4', 'unchanged', 1234, 1234),
        new HunkLine('line-5', 'deleted', 1234, 1234)
      ])

      const selectLine = sinon.spy()
      // selectLine callback not called when selectionEnabled = false
      let view = new HunkView({hunk, selectedLines: new Set(), selectLine: selectLine, selectionEnabled: false})
      let element = view.element
      let lines = Array.from(element.querySelectorAll('.git-HunkView-line'))
      lines[0].dispatchEvent(new MouseEvent('mousemove'))
      assert.isFalse(selectLine.called)

      // selectLine callback called only once when selectionEnabled = true
      view = new HunkView({hunk, selectedLines: new Set(), selectLine: selectLine, selectionEnabled: true})
      element = view.element
      lines = Array.from(element.querySelectorAll('.git-HunkView-line'))
      lines[0].dispatchEvent(new MouseEvent('mousemove'))
      assert.isTrue(selectLine.calledOnce)
      assert.deepEqual(selectLine.args[0][0], hunk.getLines()[0])

      selectLine.reset()
      lines[1].dispatchEvent(new MouseEvent('mouseup')) // simulates a mouse click (no drag)
      assert.isTrue(selectLine.calledOnce)
      assert.deepEqual(selectLine.args[0][0], hunk.getLines()[1])

      // subsequent mouse events for a given line are muted
      selectLine.reset()
      lines[2].dispatchEvent(new MouseEvent('mousemove'))
      lines[2].dispatchEvent(new MouseEvent('mousemove'))
      lines[2].dispatchEvent(new MouseEvent('up'))
      assert.isTrue(selectLine.calledOnce)
      assert.deepEqual(selectLine.args[0][0], hunk.getLines()[2])

      // selectLine callback not called when selected line is a context line
      selectLine.reset()
      lines[3].dispatchEvent(new MouseEvent('mousemove'))
      assert.isFalse(selectLine.called)

      // simulate mousing over entire hunk
      selectLine.reset()
      lines[0].dispatchEvent(new MouseEvent('mousemove'))
      lines[0].dispatchEvent(new MouseEvent('mousemove'))
      assert.equal(selectLine.callCount, 1)
      lines[1].dispatchEvent(new MouseEvent('mousemove'))
      lines[1].dispatchEvent(new MouseEvent('mousemove'))
      assert.equal(selectLine.callCount, 2)
      lines[2].dispatchEvent(new MouseEvent('mousemove'))
      lines[2].dispatchEvent(new MouseEvent('mousemove'))
      assert.equal(selectLine.callCount, 3)
      lines[3].dispatchEvent(new MouseEvent('mousemove'))
      lines[3].dispatchEvent(new MouseEvent('mousemove'))
      assert.equal(selectLine.callCount, 3) // context line
      lines[4].dispatchEvent(new MouseEvent('mousemove'))
      lines[4].dispatchEvent(new MouseEvent('mousemove'))
      assert.equal(selectLine.callCount, 4)
    })
  })
})

function assertHunkLineElementEqual (lineElement, {oldLineNumber, newLineNumber, origin, content, isSelected}) {
  assert.equal(lineElement.querySelector('.git-HunkView-lineNumber.is-old').textContent, oldLineNumber)
  assert.equal(lineElement.querySelector('.git-HunkView-lineNumber.is-new').textContent, newLineNumber)
  assert.equal(lineElement.querySelector('.git-HunkView-lineContent').textContent, origin + content)
  assert.equal(lineElement.classList.contains('is-selected'), isSelected)
}
