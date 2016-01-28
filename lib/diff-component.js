/** @babel */
/** @jsx etch.dom */

import etch from 'etch'
import DOMListener from 'dom-listener'
import {CompositeDisposable} from 'atom'
import FileDiffComponent from './file-diff-component'

export default class DiffComponent {
  constructor ({diffViewModel}) {
    this.diffViewModel = diffViewModel
    etch.createElement(this)

    let update = () => etch.updateElement(this)
    this.diffViewModel.onDidChange(update)

    let listener = this.listener = new DOMListener(this.element)

    let selectClickedLine = this.selectClickedLine.bind(this)
    this.subscriptions = new CompositeDisposable
    this.subscriptions.add(listener.add('.old-line-number', 'click', selectClickedLine))
    this.subscriptions.add(listener.add('.new-line-number', 'click', selectClickedLine))

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

  selectClickedLine(event) {
    let lineElement = this.getLineElementFromTarget(event.target)
    let linePosition = this.getLinePositionFromElement(lineElement)
    console.log('click', event.target, linePosition);
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
