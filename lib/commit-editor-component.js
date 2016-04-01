/* @flow */
/** @jsx etch.dom */

import etch from 'etch'
import {CompositeDisposable} from 'atom'

import type {TextEditor, Point, Cursor} from 'atom'
import type {ComponentWidget} from 'etch'
const TextEditorComponent = atom.workspace.buildTextEditor

type CursorPositionChangedFn = (event: {oldBufferPosition: Point, oldScreenPosition: Point, newBufferPosition: Point, newScreenPosition: Point, textChanged: boolean, cursor: Cursor}) => void

type CommitEditorComponentProps = {
  onDidChange: Function,
  onDidChangeCursorPosition: CursorPositionChangedFn,
  className: string
}

export default class CommitEditorComponent {
  element: HTMLElement;
  refs: {editor: ?TextEditor};
  subscriptions: CompositeDisposable;
  onDidChange: Function;
  onDidChangeCursorPosition: CursorPositionChangedFn;
  className: string;

  textEditorComponent: ComponentWidget;

  constructor (props: CommitEditorComponentProps) {
    this.subscriptions = new CompositeDisposable()

    this.acceptProps(props)

    // $FlowFixMe: Yes, we know this isn't a React component.
    this.textEditorComponent = <TextEditorComponent
      ref='editor'
      placeholderText='Commit message'
      lineNumberGutterVisible={false}
      grammar={atom.grammars.grammarForScopeName('text.git-commit')}
      showInvisibles={false}
      autoHeight={false}
      scrollPastEnd={false}/>

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
    const editor = this.refs.editor
    if (editor) {
      editor.destroy()
    }

    return etch.destroy(this)
  }

  acceptProps ({onDidChange, onDidChangeCursorPosition, className}: CommitEditorComponentProps) {
    this.onDidChange = onDidChange
    this.onDidChangeCursorPosition = onDidChangeCursorPosition
    this.className = className
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

    return etch.update(this)
  }

  focus () {
    const editor = this.refs.editor
    if (editor) {
      editor.getElement().focus()
    }
  }

  render () {
    return (
      <div className={'git-CommitBox-editor ' + this.className}>
        {this.textEditorComponent}
      </div>
    )
  }
}
