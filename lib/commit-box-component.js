/* @flow */
/** @jsx etch.dom */

import {CompositeDisposable} from 'atom'
import etch from 'etch'
import DOMListener from 'dom-listener'

import type {TextEditorElement} from 'atom'
import type CommitBoxViewModel from './commit-box-view-model'

export default class CommitBoxComponent {
  subscriptions: CompositeDisposable;
  listener: DOMListener;
  element: HTMLElement;
  refs: {editor: TextEditorElement};
  viewModel: CommitBoxViewModel;
  committingPromise: Promise<void>;

  constructor ({viewModel}: {viewModel: CommitBoxViewModel}) {
    this.viewModel = viewModel

    etch.createElement(this)

    this.listener = new DOMListener(this.element)
    this.subscriptions = new CompositeDisposable()

    this.committingPromise = Promise.resolve()

    atom.commands.add(this.element, {
      'git:commit': () => this.commit()
    })

    this.bindEventHandlers()
  }

  bindEventHandlers () {
    this.subscriptions.add(this.listener.add('.commit-button', 'click', () => this.commit()))
    this.subscriptions.add(this.viewModel.onDidChange(() => etch.updateElement(this)))
  }

  render () {
    return (
      <div className='git-commit-message-view'>
        <atom-text-editor ref='editor' placeholderText='Commit message'></atom-text-editor>
        <button type='button' className='btn commit-button'>Commit to {this.viewModel.getBranchName()}</button>
      </div>
    )
  }

  async commit (): Promise<void> {
    const textEditor = this.refs.editor.getModel()
    const message = textEditor.getText()
    textEditor.setText('')

    try {
      this.committingPromise = this.viewModel.commit(message)
      await this.committingPromise
    } catch (e) {
      // TODO: Display this to the user.
      console.error(e)
      textEditor.setText(message)
    }
  }
}
