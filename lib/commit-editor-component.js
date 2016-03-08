/* @flow */
/** @jsx etch.dom */

import etch from 'etch'

import type {TextEditor} from 'atom'
const TextEditorComponent = atom.workspace.buildTextEditor

export default class CommitEditorComponent {
  element: HTMLElement;
  refs: {editor: ?TextEditor};

  constructor () {
    try {
      etch.initialize(this)
    } catch (e) {
      // We depend on some changes to `buildTextEditor` that aren't in a release
      // yet. So ignore errors that happen on CI because of that.
      if (!process.env.TRAVIS) throw e
    }
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

  update (props: {}, children: Array<any>): Promise<void> {
    // Don't re-render.
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
