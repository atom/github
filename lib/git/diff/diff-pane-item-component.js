/* @flow */
/** @jsx etch.dom */

import etch from 'etch'
import {Disposable, CompositeDisposable} from 'atom'
// $FlowBug: Yes, we know this isn't a React component :\
import DiffComponent from './diff-component'

import type DiffViewModel from './diff-view-model'

type DiffPaneItemComponentProps = {diffViewModel: DiffViewModel}

export default class DiffPaneItemComponent {
  diffViewModel: DiffViewModel;
  element: HTMLElement;
  refs: {diffComponent: HTMLElement};
  subscriptions: CompositeDisposable;

  constructor (props: DiffPaneItemComponentProps) {
    this.acceptProps(props)

    atom.commands.add(this.element, 'core:copy', () => {
      // FIXME: I don't love that we have to implement this ourselves.
      const text = window.getSelection().toString()
      atom.clipboard.write(text)
    })
  }

  destroy (): Promise<void> {
    this.subscriptions.dispose()

    return etch.destroy(this)
  }

  acceptProps ({diffViewModel}: DiffPaneItemComponentProps): Promise<void> {
    this.diffViewModel = diffViewModel

    let updatePromise = Promise.resolve()
    if (this.element) {
      updatePromise = etch.update(this)
    } else {
      etch.initialize(this)
    }

    if (this.subscriptions) this.subscriptions.dispose()
    this.subscriptions = new CompositeDisposable()

    const onFocus = () => this.refs.diffComponent.focus()
    this.element.addEventListener('focus', onFocus)
    this.subscriptions.add(new Disposable(() => this.element.removeEventListener('focus', onFocus)))
    this.subscriptions.add(this.diffViewModel.onDidUpdate(() => etch.update(this)))

    return updatePromise
  }

  update (props: DiffPaneItemComponentProps, children: Array<any>): Promise<void> {
    return this.acceptProps(props)
  }

  render () {
    return (
      <div className='pane-item' tabIndex='-1'>{
        <DiffComponent ref='diffComponent' diffViewModel={this.diffViewModel}/>
      }</div>
    )
  }
}
