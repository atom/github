/* @flow */
/** @jsx etch.dom */

import {CompositeDisposable} from 'atom'
import etch from 'etch'
import DOMListener from 'dom-listener'

import type {TextEditor} from 'atom'
const TextEditorComponent = atom.workspace.buildTextEditor

export default class CommitEditorComponent {
  subscriptions: CompositeDisposable;
  listener: DOMListener;
  element: HTMLElement;
  refs: {editor: TextEditor};

  constructor () {
    try {
      etch.initialize(this)
    } catch (e) {
      // We depend on some changes to `buildTextEditor` that aren't in a release
      // yet. So ignore errors that happen on CI because of that.
      if (!process.env.TRAVIS) throw e
    }

    this.listener = new DOMListener(this.element)
    this.subscriptions = new CompositeDisposable()
  }

  destroy () {
    this.subscriptions.dispose()
  }

  getModel (): TextEditor {
    return this.refs.editor
  }

  render () {
    return (
      <div className='editor-component'>
        <TextEditorComponent
          ref='editor'
          placeholderText='Commit message'
          lineNumberGutterVisible={false}
          grammar={atom.grammars.grammarForScopeName('text.git-commit')}
          showInvisibles={false}
          autoHeight={false}
          scrollPastEnd={false}/>
      </div>
    )
  }
}
