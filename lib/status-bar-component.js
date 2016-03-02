/* @flow */
/** @jsx etch.dom */

import etch from 'etch'
import DOMListener from 'dom-listener'
import {CompositeDisposable} from 'atom'

import type StatusBarViewModel from './status-bar-view-model'

type ClickFunction = (component: StatusBarComponent, event: Event) => void

export default class StatusBarComponent {
  element: HTMLElement;
  viewModel: StatusBarViewModel;
  subscriptions: CompositeDisposable;
  listener: DOMListener;

  constructor (viewModel: StatusBarViewModel, onClick: ClickFunction) {
    this.viewModel = viewModel
    this.subscriptions = new CompositeDisposable()

    this.subscriptions.add(viewModel.onDidChange(() => etch.update(this)))

    etch.initialize(this)

    this.subscriptions.add(atom.tooltips.add(this.element, {title: 'View changed files'}))

    this.listener = new DOMListener(this.element)
    this.subscriptions.add(this.listener.add(this.element, 'click', e => onClick(this, e)))
  }

  destroy () {
    this.subscriptions.dispose()
  }

  render () {
    return (
      <div className='git-status-bar inline-block'>
        <a className='icon icon-diff inline-block'>{this.viewModel.getChangedFileCount()} files</a>
      </div>
    )
  }
}
