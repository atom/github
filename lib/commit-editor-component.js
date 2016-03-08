/* @flow */
/** @jsx etch.dom */

import etch from 'etch'
import {CompositeDisposable} from 'atom'

import type {TextEditor} from 'atom'
const TextEditorComponent = atom.workspace.buildTextEditor

type CommitEditorComponentProps = {onDidChange: Function}

export default class CommitEditorComponent {
  element: HTMLElement;
  refs: {editor: ?TextEditor};
  subscriptions: CompositeDisposable;
  onDidChange: Function;

  constructor (props: CommitEditorComponentProps) {
    this.subscriptions = new CompositeDisposable()

    this.acceptProps(props)

    try {
      etch.initialize(this)
    } catch (e) {
      // We depend on some changes to `buildTextEditor` that aren't in a release
      // yet. So ignore errors that happen on CI because of that.
      if (!process.env.TRAVIS) throw e
    }

    const editor = this.refs.editor
    if (editor) {
      this.subscriptions.add(editor.onDidChange(() => this.onDidChange()))
    }
  }

  destroy (): Promise<void> {
    this.subscriptions.dispose()

    return etch.destroy(this)
  }

  acceptProps ({onDidChange}: CommitEditorComponentProps) {
    this.onDidChange = onDidChange
  }

  getText (): string {
    const textEditor = this.refs.editor
    if (!textEditor) return ''

    return textEditor.getText()
  }

  setText (t: string) {
    const textEditor = this.refs.editor
    if (!textEditor) return

    textEditor.setText(t)
  }

  update (props: CommitEditorComponentProps, children: Array<any>): Promise<void> {
    this.acceptProps(props)

    // Don't re-render. We'll update the editor in place.
    return Promise.resolve()
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
