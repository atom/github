/** @babel */
/** @jsx etch.dom */

import {CompositeDisposable} from 'atom'
import etch from 'etch'

export default class CommitView {
  constructor (props) {
    this.props = props
    const TextEditor = props.workspace.buildTextEditor
    this.textEditorWidget =
      <TextEditor
        ref='editor'
        softWrapped={true}
        placeholderText='Commit message'
        lineNumberGutterVisible={false}
        showInvisibles={false}
        autoHeight={false}
        scrollPastEnd={false} />
    etch.initialize(this)
    this.editor = this.refs.editor
    this.subscriptions = new CompositeDisposable(
      this.editor.onDidChangeCursorPosition(() => { etch.update(this) }),
      this.editor.getBuffer().onDidChangeText(() => { etch.update(this) }),
      props.commandRegistry.add(this.element, {'git:commit': () => this.commit()})
    )
  }

  destroy () {
    this.subscriptions.dispose()
    etch.destroy(this)
  }

  update (props) {
    this.props = props
    return etch.update(this)
  }

  render () {
    let remainingCharactersClassName = ''
    if (this.getRemainingCharacters() < 0) {
      remainingCharactersClassName = 'is-error'
    } else if (this.getRemainingCharacters() < this.props.maximumCharacterLimit / 4) {
      remainingCharactersClassName = 'is-warning'
    }
    return (
      <div className='git-CommitView' ref='CommitView'>
        <div className='git-CommitView-editor'>
          {this.textEditorWidget}
        </div>
        <footer className='git-CommitView-bar'>
          <button ref='commitButton' className='btn git-CommitView-button'
                  onclick={this.commit.bind(this)}
                  disabled={this.isCommitButtonDisabled()}>Commit {this.props.branchName ? `to ${this.props.branchName}` : ''}</button>
          <div ref='remainingCharacters' className={`git-CommitView-remaining-characters ${remainingCharactersClassName}`}>
            {this.getRemainingCharacters()}
          </div>
        </footer>
      </div>
    )
  }

  commit () {
    if (this.isCommitButtonDisabled()) {
      return Promise.resolve()
    } else {
      this.lastCommitPromise = this.isCommitButtonDisabled() ? Promise.resolve() : this.performCommit()
      return this.lastCommitPromise
    }
  }

  async performCommit () {
    await this.props.repository.commit(this.editor.getText())
    this.editor.setText('')
    return etch.update(this)
  }

  getRemainingCharacters () {
    if (this.editor != null) {
      if (this.editor.getCursorBufferPosition().row === 0) {
        return (this.props.maximumCharacterLimit - this.editor.lineTextForBufferRow(0).length).toString()
      } else {
        return '∞'
      }
    } else {
      return this.props.maximumCharacterLimit
    }
  }

  isCommitButtonDisabled () {
    return this.props.stagedChanges.length === 0 || this.editor == null || this.editor.getText().length === 0
  }
}
