/* @flow */
/** @jsx etch.dom */

import {CompositeDisposable} from 'atom'
import etch from 'etch'
import DOMListener from 'dom-listener'

import type {TextEditor} from 'atom'
const TextEditorComponent = atom.workspace.buildTextEditor

const MessageLength = 72

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

  getModel (): ?TextEditor {
    return this.refs.editor
  }

  getText (): string {
    const textEditor = this.getModel()
    if (!textEditor) return ''

    return textEditor.getText()
  }

  setText (t: string) {
    const textEditor = this.getModel()
    if (!textEditor) return

    textEditor.setText(t)
  }

  getCountdownNumber (): number {
    const msg = this.getText()
    const len = msg.length
    return MessageLength - len
  }

  getCountdown (): string {
    return this.getCountdownNumber().toString()
  }

  getCountdownStyle (): Object {
    return {

    }
  }

  update (props: {}, children: Array<any>): Promise<void> {
    return etch.update(this)
  }

  render () {
    return (
      <div className='editor-component'>
        <div className='message-countdown' style={this.getCountdownStyle()}>{this.getCountdown()}</div>
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
