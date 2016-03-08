/* @flow */
/** @jsx etch.dom */

import etch from 'etch'
import {CompositeDisposable} from 'atom'
// $FlowBug: Yes, we know this isn't a React component :\
import FileDiffComponent from './file-diff-component'
import DiffSelection from './diff-selection'

import type DiffViewModel from './diff-view-model'
import type HunkLineComponent from './hunk-line-component'

type DiffComponentProps = {diffViewModel: DiffViewModel}

export default class DiffComponent {
  diffViewModel: DiffViewModel;
  element: HTMLElement;
  currentMouseSelection: ?DiffSelection;
  subscriptions: CompositeDisposable;

  constructor (props: DiffComponentProps) {
    this.subscriptions = new CompositeDisposable()

    this.acceptProps(props)
  }

  acceptProps ({diffViewModel}: DiffComponentProps): Promise<void> {
    this.diffViewModel = diffViewModel

    let updatePromise = Promise.resolve()
    if (this.element) {
      updatePromise = etch.update(this)
    } else {
      etch.initialize(this)
    }

    this.subscriptions.dispose()
    this.subscriptions.add(this.diffViewModel.onDidChange(() => etch.update(this)))

    this.subscriptions.add(atom.commands.add(this.element, {
      'core:move-up': () => this.diffViewModel.moveSelectionUp(),
      'core:move-down': () => this.diffViewModel.moveSelectionDown(),
      'core:confirm': () => this.diffViewModel.toggleSelectedLinesStageStatus(),
      'git:expand-selection-up': () => this.diffViewModel.expandSelectionUp(),
      'git:expand-selection-down': () => this.diffViewModel.expandSelectionDown(),
      'git:toggle-selection-mode': () => this.diffViewModel.toggleSelectionMode(),
      'git:open-file-to-line': () => this.diffViewModel.openFileAtSelection()
    }))

    return updatePromise
  }

  update (props: DiffComponentProps, children: Array<any>): Promise<void> {
    return this.acceptProps(props)
  }

  focus () {
    this.element.focus()
  }

  onMouseDown (component: HunkLineComponent, event: Event) {
    this.currentMouseSelection = new DiffSelection(this.diffViewModel, {
      mode: 'line',
      headPosition: component.getPosition()
    })

    if (event.shiftKey) {
      this.diffViewModel.addSelection(this.currentMouseSelection)
    } else {
      this.diffViewModel.setSelection(this.currentMouseSelection)
    }
  }

  onMouseMoved (component: HunkLineComponent, event: Event) {
    const currentSelection = this.currentMouseSelection
    if (currentSelection) {
      currentSelection.setTailPosition(component.getPosition())
    }
  }

  onMouseUp (component: HunkLineComponent, event: Event) {
    this.currentMouseSelection = null
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
          <FileDiffComponent
            fileDiff={fileDiff}
            fileIndex={index}
            diffViewModel={this.diffViewModel}
            mouseDownAction={(c, e) => this.onMouseDown(c, e)}
            mouseUpAction={(c, e) => this.onMouseUp(c, e)}
            mouseMovedAction={(c, e) => this.onMouseMoved(c, e)}
          />
        )
      }</div>
    )
  }
}
