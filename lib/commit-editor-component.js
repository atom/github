/* @flow */
/** @jsx etch.dom */

import etch from 'etch'
import {CompositeDisposable} from 'atom'

import type {TextEditor, Point, Cursor} from 'atom'
const TextEditorComponent = atom.workspace.buildTextEditor

type CursorPositionChangedFn = (event: {oldBufferPosition: Point, oldScreenPosition: Point, newBufferPosition: Point, newScreenPosition: Point, textChanged: boolean, cursor: Cursor}) => void

type CommitEditorComponentProps = {onDidChange: Function, onDidChangeCursorPosition: CursorPositionChangedFn}

export default class CommitEditorComponent {
  element: HTMLElement;
  refs: {editor: ?TextEditor};
  subscriptions: CompositeDisposable;
  onDidChange: Function;
  onDidChangeCursorPosition: CursorPositionChangedFn;

  constructor (props: CommitEditorComponentProps) {
    this.subscriptions = new CompositeDisposable()

    this.acceptProps(props)

    try {
      etch.initialize(this)

      // $FlowSilence: We know it won't be null here since we just initialized.
      const editor: TextEditor = this.refs.editor
      this.subscriptions.add(editor.onDidChange(() => this.onDidChange()))
      this.subscriptions.add(editor.onDidChangeCursorPosition(event => this.onDidChangeCursorPosition(event)))
    } catch (e) {
      // We depend on some changes to `buildTextEditor` that aren't in a release
      // yet. So ignore errors that happen on CI because of that.
      if (!process.env.TRAVIS) throw e
    }
  }

  destroy (): Promise<void> {
    this.subscriptions.dispose()

    return etch.destroy(this)
  }

  acceptProps ({onDidChange, onDidChangeCursorPosition}: CommitEditorComponentProps) {
    this.onDidChange = onDidChange
    this.onDidChangeCursorPosition = onDidChangeCursorPosition
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
