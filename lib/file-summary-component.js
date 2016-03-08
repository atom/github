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
    this.subscriptions = new CompositeDisposable()

    this.acceptProps(props)
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

    this.subscriptions.dispose()
    this.subscriptions.add(this.listener.add('.stage-status', 'click', () => toggleAction(this)))
    this.subscriptions.add(this.listener.add(this.element, 'click', () => clickAction(this)))
    this.subscriptions.add(this.listener.add(this.element, 'dblclick', () => doubleClickAction(this)))

    return updatePromise
  }

  getIndex (): number {
    return this.index
  }

  render () {
    return (
      <div className={`file-summary ${this.getSelectedClass()}`}>
        {this.renderStagingCheckbox()}
        <span className='path'>{this.viewModel.getTitle()}</span>
        {this.renderIcon()}
      </div>
    )
  }

  getSelectedClass (): string {
    return this.selected ? 'selected' : ''
  }

  renderStagingCheckbox () {
    let stageStatus = this.viewModel.getStageStatus()
    return (
      <span className={`stage-status stage-status-${stageStatus}`}></span>
    )
  }

  renderIcon () {
    let changeStatus = this.viewModel.getChangeStatus()
    return (
      <span className={`icon icon-diff-${changeStatus} status-${changeStatus}`}></span>
    )
  }
}
