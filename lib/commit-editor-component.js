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
    etch.initialize(this)

    this.listener = new DOMListener(this.element)
    this.subscriptions = new CompositeDisposable()
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
