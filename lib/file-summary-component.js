/* @flow */
/** @jsx etch.dom */

import etch from 'etch'
import DOMListener from 'dom-listener'
import {CompositeDisposable} from 'atom'

import type FileDiffViewModel from './file-diff-view-model'

type ActionType = (c: FileSummaryComponent) => void

export default class FileSummaryComponent {
  index: number;
  viewModel: FileDiffViewModel;
  element: HTMLElement;
  listener: DOMListener;
  subscriptions: CompositeDisposable;
  selected: boolean;

  constructor ({viewModel, selected, index, clickAction, doubleClickAction, toggleAction}: {viewModel: FileDiffViewModel, selected: boolean, index: number, clickAction: ActionType, doubleClickAction: ActionType, toggleAction: ActionType}) {
    this.index = index
    this.selected = selected
    this.viewModel = viewModel
    this.subscriptions = new CompositeDisposable()

    etch.initialize(this)

    this.listener = new DOMListener(this.element)
    this.subscriptions.add(this.listener.add('.stage-status', 'click', () => toggleAction(this)))
    this.subscriptions.add(this.listener.add(this.element, 'click', () => clickAction(this)))
    this.subscriptions.add(this.listener.add(this.element, 'dblclick', () => doubleClickAction(this)))
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
