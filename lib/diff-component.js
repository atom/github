/** @babel */
/** @jsx etch.dom */

import etch from 'etch'
import DOMListener from 'dom-listener'
import {CompositeDisposable} from 'atom'
import FileDiffComponent from './file-diff-component'
import DiffSelection from './diff-selection'

export default class DiffComponent {
  constructor ({diffViewModel}) {
    this.diffViewModel = diffViewModel
    etch.createElement(this)

    let update = () => etch.updateElement(this)
    this.diffViewModel.onDidChange(update)

    let listener = this.listener = new DOMListener(this.element)

    let onMousedownLine = this.onMousedownLine.bind(this)
    let onMousemoveLine = this.onMousemoveLine.bind(this)
    let onMouseupLine = this.onMouseupLine.bind(this)
    this.subscriptions = new CompositeDisposable
    this.subscriptions.add(listener.add('.old-line-number', 'mousedown', onMousedownLine))
    this.subscriptions.add(listener.add('.new-line-number', 'mousedown', onMousedownLine))
    this.subscriptions.add(listener.add('.old-line-number', 'mousemove', onMousemoveLine))
    this.subscriptions.add(listener.add('.new-line-number', 'mousemove', onMousemoveLine))
    this.subscriptions.add(listener.add('.old-line-number', 'mouseup', onMouseupLine))
    this.subscriptions.add(listener.add('.new-line-number', 'mouseup', onMouseupLine))

    atom.commands.add(this.element, {
      'core:move-up': () => this.diffViewModel.moveSelectionUp(),
      'core:move-down': () => this.diffViewModel.moveSelectionDown(),
      'core:confirm': () => this.diffViewModel.toggleSelectedLinesStageStatus(),
      'git:expand-selection-up': () => this.diffViewModel.expandSelectionUp(),
      'git:expand-selection-down': () => this.diffViewModel.expandSelectionDown(),
      'git:toggle-selection-mode': () => this.diffViewModel.toggleSelectionMode()
    })
  }

  focus() {
    this.element.focus()
  }

  destroy() {
    this.subscriptions.dispose()
    this.subscriptions = null
    this.listener.destroy()
  }

  onMousedownLine(event) {
    let lineElement = this.getLineElementFromTarget(event.target)
    let linePosition = this.getLinePositionFromElement(lineElement)
    this.currentMouseSelection = new DiffSelection(this.diffViewModel, {
      mode: 'line',
      headPosition: linePosition
    })

    this.diffViewModel.setSelection(this.currentMouseSelection)

    console.log('mouse down', event.target, linePosition);
  }

  onMousemoveLine(event) {
    if (!this.currentMouseSelection) return

    let lineElement = this.getLineElementFromTarget(event.target)
    let linePosition = this.getLinePositionFromElement(lineElement)

    if (linePosition)
      this.currentMouseSelection.setTailPosition(linePosition)
  }

  onMouseupLine(event) {
    let lineElement = this.getLineElementFromTarget(event.target)
    let linePosition = this.getLinePositionFromElement(lineElement)


    this.currentMouseSelection = null
    console.log('mouse up', event.target, linePosition);
  }

  getLineElementFromTarget(targetElement) {
    return targetElement.closest('.git-hunk-line')
  }

  getLinePositionFromElement(lineElement) {
    let lineComponent = lineElement.component
    if (!lineComponent || !lineComponent.getPosition)
      return null
    return lineElement.component.getPosition()
  }

  render() {
    let fontFamily = atom.config.get('editor.fontFamily')
    let fontSize = atom.config.get('editor.fontSize')
    let style = {
      'font-family': fontFamily,
      'font-size': fontSize + 'px'
    }
    return (
      <div className="git-diff-container" tabIndex="-1" style={style}>{
        this.diffViewModel.getFileDiffs().map((fileDiff, index) =>
          <FileDiffComponent fileDiff={fileDiff} fileIndex={index} diffViewModel={this.diffViewModel}/>
        )
      }</div>
    )
  }
}
