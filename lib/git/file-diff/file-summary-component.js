/* @flow */
/** @jsx etch.dom */

import etch from 'etch'
import DOMListener from 'dom-listener'
import {CompositeDisposable} from 'atom'

import type FileDiffViewModel from './file-diff-view-model'

type ActionType = (c: FileSummaryComponent) => void

type FileSummaryComponentProps = {viewModel: FileDiffViewModel, selected: boolean, index: number, clickAction: ActionType, doubleClickAction: ActionType, toggleAction: ActionType}

export default class FileSummaryComponent {
  index: number;
  viewModel: FileDiffViewModel;
  element: HTMLElement;
  listener: DOMListener;
  subscriptions: CompositeDisposable;
  selected: boolean;

  constructor (props: FileSummaryComponentProps) {
    this.acceptProps(props)
  }

  destroy (): Promise<void> {
    this.subscriptions.dispose()
    this.listener.destroy()

    return etch.destroy(this)
  }

  acceptProps ({viewModel, selected, index, clickAction, doubleClickAction, toggleAction}: FileSummaryComponentProps): Promise<void> {
    this.index = index
    this.selected = selected
    this.viewModel = viewModel

    let updatePromise = Promise.resolve()
    if (this.element) {
      updatePromise = etch.update(this)
    } else {
      etch.initialize(this)
      this.listener = new DOMListener(this.element)
    }

    if (this.subscriptions) this.subscriptions.dispose()
    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(this.listener.add('.git-FileSummary-checkbox', 'click', () => toggleAction(this)))
    this.subscriptions.add(this.listener.add(this.element, 'click', () => clickAction(this)))
    this.subscriptions.add(this.listener.add(this.element, 'dblclick', () => doubleClickAction(this)))

    return updatePromise
  }

  getIndex (): number {
    return this.index
  }

  render () {
    return (
      <div className={`git-FileSummary ${this.getSelectedClass()}`}>
        {this.renderStagingCheckbox()}
        <span className='git-FileSummary-path'>{this.viewModel.getTitle()}</span>
        {this.renderIcon()}
      </div>
    )
  }

  update (props: FileSummaryComponentProps, children: Array<any>): Promise<void> {
    return this.acceptProps(props)
  }

  getSelectedClass (): string {
    return this.selected ? 'is-selected' : ''
  }

  renderStagingCheckbox () {
    let stageStatus = this.viewModel.getStageStatus()
    return (
      <span className={`git-FileSummary-checkbox git-Checkbox is-${stageStatus}`}></span>
    )
  }

  renderIcon () {
    let changeStatus = this.viewModel.getChangeStatus()
    return (
      <span className={`git-FileSummary-icon icon icon-diff-${changeStatus} status-${changeStatus}`}></span>
    )
  }
}
