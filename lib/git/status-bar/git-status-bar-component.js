/* @flow */
/** @jsx etch.dom */

import etch from 'etch'
import DOMListener from 'dom-listener'
import {CompositeDisposable} from 'atom'

import type GitStatusBarViewModel from './git-status-bar-view-model'

type ClickFunction = (component: GitStatusBarComponent, event: Event) => void

type GitStatusBarComponentProps = {statusBarViewModel: GitStatusBarViewModel}

export default class GitStatusBarComponent {
  element: HTMLElement;
  viewModel: GitStatusBarViewModel;
  subscriptions: CompositeDisposable;
  viewModelSubscriptions: CompositeDisposable;
  listener: DOMListener;

  constructor (props: GitStatusBarComponentProps, onClick: ClickFunction) {
    this.acceptProps(props)

    etch.initialize(this)

    this.subscriptions = new CompositeDisposable()
    this.listener = new DOMListener(this.element)
    this.subscriptions.add(this.listener.add(this.element, 'click', e => onClick(this, e)))
    this.subscriptions.add(atom.tooltips.add(this.element, {title: 'View changed files'}))
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

  update (props: GitStatusBarComponentProps, children: Array<any>): Promise<void> {
    this.acceptProps(props)
    return etch.update(this)
  }

  acceptProps ({statusBarViewModel}: GitStatusBarComponentProps) {
    if (this.viewModelSubscriptions != null) {
      this.viewModelSubscriptions.dispose()
    }

    this.viewModel = statusBarViewModel
    this.viewModelSubscriptions = new CompositeDisposable()
    this.viewModelSubscriptions.add(this.viewModel.onDidUpdate(() => etch.update(this)))
  }

  getViewModel (): GitStatusBarViewModel {
    return this.viewModel
  }
}
