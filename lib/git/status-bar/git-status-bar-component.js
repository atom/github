/* @flow */
/** @jsx etch.dom */

import etch from 'etch'
import DOMListener from 'dom-listener'
import {CompositeDisposable} from 'atom'

import type GitStatusBarViewModel from './git-status-bar-view-model'

type ClickFunction = (component: GitStatusBarComponent, event: Event) => void

export default class GitStatusBarComponent {
  element: HTMLElement;
  viewModel: GitStatusBarViewModel;
  subscriptions: CompositeDisposable;
  listener: DOMListener;

  constructor (viewModel: GitStatusBarViewModel, onClick: ClickFunction) {
    this.viewModel = viewModel
    this.subscriptions = new CompositeDisposable()

    this.subscriptions.add(viewModel.onDidUpdate(() => etch.update(this)))

    etch.initialize(this)

    this.subscriptions.add(atom.tooltips.add(this.element, {title: 'View changed files'}))

    this.listener = new DOMListener(this.element)
    this.subscriptions.add(this.listener.add(this.element, 'click', e => onClick(this, e)))
  }

  destroy (): Promise<void> {
    this.subscriptions.dispose()
    this.listener.destroy()

    return etch.destroy(this)
  }

  render () {
    const fileCount = this.viewModel.getChangedFileCount()
    const fileLabel = fileCount === 1 ? '1 file' : `${fileCount} files`
    return (
      <a className='git-status-bar inline-block icon icon-diff'>{fileLabel}</a>
    )
  }

  update (props: {}, children: Array<any>): Promise<void> {
    return etch.update(this)
  }
}
