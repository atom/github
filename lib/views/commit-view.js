/** @babel */
/** @jsx etch.dom */

import {CompositeDisposable} from 'atom'
import etch from 'etch'

export default class CommitView {
  constructor ({workspace, repository, maximumCharacterLimit}) {
    this.setRepository(repository)
    this.maximumCharacterLimit = maximumCharacterLimit
    const TextEditor = workspace.buildTextEditor
    this.textEditorView =
      <TextEditor
        ref='editor'
        softWrapped={true}
        placeholderText='Commit message'
        lineNumberGutterVisible={false}
        showInvisibles={false}
        autoHeight={false}
        scrollPastEnd={false} />
    etch.initialize(this)
  }

  destroy () {
    if (this.subscriptions) this.subscriptions.dispose()
    etch.destroy(this)
  }

  update ({maximumCharacterLimit, repository}) {
    this.setRepository(repository)
    this.maximumCharacterLimit = maximumCharacterLimit
    return etch.update(this)
  }

  render () {
    if (this.modelData == null) {
      return <div></div>
    } else {
      let remainingCharactersClassName = ''
      if (this.getRemainingCharacters() < 0) {
        remainingCharactersClassName = 'is-error'
      } else if (this.getRemainingCharacters() < this.maximumCharacterLimit / 4) {
        remainingCharactersClassName = 'is-warning'
      }
      return (
        <div className='git-Panel-item git-CommitBox' ref='commitBox'>
          <div className='git-CommitBox-editor'>
            {this.textEditorView}
          </div>
          <footer className='git-CommitBox-bar'>
            <button ref='commitButton' className='btn git-CommitBox-button'
                    onclick={this.commit.bind(this)}
                    disabled={this.isCommitButtonDisabled()}>Commit</button>
            <div ref='remainingCharacters' className={`git-CommitBox-remaining-characters ${remainingCharactersClassName}`}>
              {this.getRemainingCharacters()}
            </div>
          </footer>
        </div>
      )
    }
  }

  setRepository (repository) {
    if (this.repository !== repository) {
      this.repository = repository
      if (this.repositorySubscription) {
        this.repositorySubscription.dispose()
        this.repositorySubscription = null
      }
      if (repository) {
        this.refreshModelData()
        this.repositorySubscription = repository.onDidUpdate(this.refreshModelData.bind(this))
      }
    }
  }

  async refreshModelData () {
    this.lastModelDataRefreshPromise = this.performModelDataRefresh()
    return this.lastModelDataRefreshPromise
  }

  async performModelDataRefresh () {
    this.modelData = {
      stagedChanges: await this.repository.getStagedChanges()
    }
    await etch.update(this)
    if (this.editor == null) {
      this.editor = this.refs.editor
      this.subscriptions = new CompositeDisposable(
        this.editor.onDidChangeCursorPosition(() => { etch.update(this) }),
        this.editor.getBuffer().onDidChangeText(() => { etch.update(this) })
      )
    }
  }

  commit () {
    this.lastCommitPromise = this.performCommit()
    return this.lastCommitPromise
  }

  async performCommit () {
    await this.repository.commit(this.editor.getText())
    this.editor.setText('')
    return etch.update(this)
  }

  getRemainingCharacters () {
    if (this.editor != null) {
      if (this.editor.getCursorBufferPosition().row === 0) {
        return (this.maximumCharacterLimit - this.editor.lineTextForBufferRow(0).length).toString()
      } else {
        return '∞'
      }
    } else {
      return this.maximumCharacterLimit
    }
  }

  isCommitButtonDisabled () {
    return (
      this.modelData == null || this.modelData.stagedChanges.length === 0 ||
      this.editor == null || this.editor.getText().length === 0
    )
  }
}
