/* @flow */
/** @jsx etch.dom */

import etch from 'etch'
import DOMListener from 'dom-listener'
import {CompositeDisposable} from 'atom'
// $FlowFixMe: Yes, we know this isn't a React component :\
import FileDiffComponent from './file-diff-component'
import DiffSelection from './diff-selection'

import type DiffViewModel from './diff-view-model'
import type {EtchElement} from './common'
import type HunkLineComponent from './hunk-line-component'
import type {Position} from './diff-selection'

export default class DiffComponent {
  diffViewModel: DiffViewModel;
  element: EtchElement<DiffComponent>;
  listener: DOMListener;
  subscriptions: CompositeDisposable;
  currentMouseSelection: ?DiffSelection;

  constructor ({diffViewModel}: {diffViewModel: DiffViewModel}) {
    this.diffViewModel = diffViewModel
    etch.createElement(this)

    let update = () => etch.updateElement(this)
    this.diffViewModel.onDidChange(update)

    let listener = this.listener = new DOMListener(this.element)

    let onMousedownLine = this.onMousedownLine.bind(this)
    let onMousemoveLine = this.onMousemoveLine.bind(this)
    let onMouseupLine = this.onMouseupLine.bind(this)
    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(listener.add('.git-hunk-line', 'mousedown', onMousedownLine))
    this.subscriptions.add(listener.add('.git-hunk-line', 'mousemove', onMousemoveLine))
    this.subscriptions.add(listener.add('.git-hunk-line', 'mouseup', onMouseupLine))

    atom.commands.add(this.element, {
      'core:move-up': () => this.diffViewModel.moveSelectionUp(),
      'core:move-down': () => this.diffViewModel.moveSelectionDown(),
      'core:confirm': () => this.diffViewModel.toggleSelectedLinesStageStatus(),
      'git:expand-selection-up': () => this.diffViewModel.expandSelectionUp(),
      'git:expand-selection-down': () => this.diffViewModel.expandSelectionDown(),
      'git:toggle-selection-mode': () => this.diffViewModel.toggleSelectionMode(),
      'git:open-file-to-line': () => this.diffViewModel.openFileAtSelection()
    })
  }

  focus () {
    this.element.focus()
  }

  destroy () {
    this.subscriptions.dispose()
    this.listener.destroy()
  }

  onMousedownLine (event: Event) {
    let lineElement = this.getLineElementFromTarget(event.target)
    let linePosition = this.getLinePositionFromElement(lineElement)
    this.currentMouseSelection = new DiffSelection(this.diffViewModel, {
      mode: 'line',
      headPosition: linePosition
    })

    if (event.shiftKey) {
      this.diffViewModel.addSelection(this.currentMouseSelection)
    } else {
      this.diffViewModel.setSelection(this.currentMouseSelection)
    }
  }

  onMousemoveLine (event: Event) {
    if (!this.currentMouseSelection) return

    let lineElement = this.getLineElementFromTarget(event.target)
    let linePosition = this.getLinePositionFromElement(lineElement)

    if (linePosition && this.currentMouseSelection) {
      this.currentMouseSelection.setTailPosition(linePosition)
    }
  }

  onMouseupLine (event: Event) {
    this.currentMouseSelection = null
  }

  getLineElementFromTarget (targetElement: EventTarget): EtchElement<HunkLineComponent> {
    // $FlowFixMe: jQuery adds .closest I guess?
    return targetElement.closest('.git-hunk-line')
  }

  getLinePositionFromElement (lineElement: EtchElement<HunkLineComponent>): ?Position {
    let lineComponent = lineElement.component
    if (!lineComponent || !lineComponent.getPosition) {
      return null
    }
    return lineElement.component.getPosition()
  }

  render () {
    let fontFamily = atom.config.get('editor.fontFamily')
    let fontSize = atom.config.get('editor.fontSize')
    let style = {
      'font-family': fontFamily,
      'font-size': fontSize + 'px'
    }
    return (
      <div className='git-diff-container' tabIndex='-1' style={style}>{
        this.diffViewModel.getFileDiffs().map((fileDiff, index) =>
          <FileDiffComponent fileDiff={fileDiff} fileIndex={index} diffViewModel={this.diffViewModel}/>
        )
      }</div>
    )
  }
}
