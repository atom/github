/* @flow */
/** @jsx etch.dom */

import {CompositeDisposable} from 'atom'
import etch from 'etch'
import DOMListener from 'dom-listener'
// $FlowBug: REACT
import CommitEditorComponent from './commit-editor-component'

import type CommitBoxViewModel from './commit-box-view-model'

type CommitBoxComponentProps = {viewModel: CommitBoxViewModel}

export default class CommitBoxComponent {
  subscriptions: CompositeDisposable;
  listener: DOMListener;
  element: HTMLElement;
  refs: {editor: CommitEditorComponent};
  viewModel: CommitBoxViewModel;
  committingPromise: Promise<void>;

  constructor (props: CommitBoxComponentProps) {
    this.subscriptions = new CompositeDisposable()
    this.committingPromise = Promise.resolve()

    this.acceptProps(props)
  }

  acceptProps ({viewModel}: CommitBoxComponentProps): Promise<void> {
    this.viewModel = viewModel

    let updatePromise = Promise.resolve()
    if (this.element) {
      updatePromise = etch.update(this)
    } else {
      etch.initialize(this)
      this.listener = new DOMListener(this.element)
    }

    this.subscriptions.dispose()
    this.subscriptions.add(this.listener.add('.commit-button', 'click', () => this.commit()))
    this.subscriptions.add(this.viewModel.onDidChange(() => etch.update(this)))

    this.subscriptions.add(atom.commands.add(this.element, {
      'git:commit': () => this.commit()
    }))

    return updatePromise
  }

  render () {
    return (
      <div className='git-commit-message-view'>
        <CommitEditorComponent ref='editor'/>
        <button type='button' className='btn commit-button'>Commit to {this.viewModel.getBranchName()}</button>
      </div>
    )
  }

  update (props: CommitBoxComponentProps, children: Array<any>): Promise<void> {
    return this.acceptProps(props)
  }

  async commit (): Promise<void> {
    const message = this.refs.editor.getText()
    this.refs.editor.setText('')

    try {
      this.committingPromise = this.viewModel.commit(message)
      await this.committingPromise
    } catch (e) {
      // TODO: Display this to the user.
      console.error(e)
      this.refs.editor.setText(message)
    }
  }
}
