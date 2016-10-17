/** @babel */
/** @jsx etch.dom */

import {CompositeDisposable, TextEditor} from 'atom'
import etch from 'etch'
import {shortenSha} from '../helpers'

export default class CommitView {
  constructor (props) {
    this.props = props
    this.abortMerge = this.abortMerge.bind(this)
    this.handleAmendBoxClick = this.handleAmendBoxClick.bind(this)
    etch.initialize(this)
    this.editor = this.refs.editor
    if (this.props.message) {
      this.editor.setText(this.props.message)
    }
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
    this.props = Object.assign({}, this.props, props)
    if (this.props.message && this.editor.getText().length === 0) {
      this.editor.setText(this.props.message)
    }
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
          <TextEditor
            ref='editor'
            softWrapped={true}
            placeholderText='Commit message'
            lineNumberGutterVisible={false}
            showInvisibles={false}
            autoHeight={false}
            scrollPastEnd={false}
          />
        </div>
        <footer className='git-CommitView-bar'>
          <button ref='abortMergeButton' className='btn git-CommitView-button is-secondary'
                  onclick={this.abortMerge}
                  style={{display: this.props.isMerging ? '' : 'none'}}>Abort Merge</button>
          <label className='git-CommitView-label input-label' style={{display: this.props.isMerging ? 'none' : ''}}><input ref='amend' className='input-checkbox' type='checkbox' onclick={this.handleAmendBoxClick}/> Amend </label>
          <button ref='commitButton' className='btn git-CommitView-button'
                  onclick={this.commit.bind(this)}
                  disabled={!this.isCommitButtonEnabled()}>{this.commitButtonText()}</button>
          <div ref='remainingCharacters' className={`git-CommitView-remaining-characters ${remainingCharactersClassName}`}>
            {this.getRemainingCharacters()}
          </div>
        </footer>
      </div>
    )
  }

  async abortMerge () {
    const choice = atom.confirm({
      message: 'Abort merge',
      detailedMessage: 'Are you sure?',
      buttons: ['Abort', 'Cancel']
    })
    if (choice !== 0) return

    try {
      await this.props.abortMerge()
      this.editor.setText('')
    } catch (e) {
      if (e.code === 'EDIRTYSTAGED') {
        this.props.notificationManager.addError(`Cannot abort because ${e.path} is both dirty and staged.`)
      }
    }
    return etch.update(this)
  }

  async handleAmendBoxClick () {
    const checked = this.refs.amend.checked
    const currentMessage = this.editor.getText()
    const lastCommitMessage = this.props.lastCommit ? this.props.lastCommit.message : ''

    if (this.props.setAmending) await this.props.setAmending(checked)

    if (checked) {
      if (currentMessage && currentMessage !== lastCommitMessage) {
        const choice = atom.confirm({
          message: 'Would you like to discard the current commit message?',
          detailedMessage: checked ? 'It will be replaced with the most recent commit message' : '',
          buttons: ['Keep current', 'Replace']
        })
        if (choice !== 0) {
          this.editor.setText(lastCommitMessage)
        }
      } else {
        this.editor.setText(lastCommitMessage)
      }
    } else if (currentMessage === lastCommitMessage) {
      this.editor.setText('')
    }

    return etch.update(this)
  }

  async commit () {
    if (this.isCommitButtonEnabled()) {
      try {
        const checked = this.refs.amend.checked
        await this.props.commit(this.editor.getText(), {amend: checked})
        this.editor.setText('')
      } catch (e) {
        if (e.code === 'ECONFLICT') {
          this.props.notificationManager.addError('Cannot commit without resolving all the merge conflicts first.')
        }
      }
    }
    this.refs.amend.checked = false
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

  isCommitButtonEnabled () {
    return this.props.stagedChangesExist && !this.props.mergeConflictsExist && this.editor && this.editor.getText().length !== 0
  }

  commitButtonText () {
    if (this.props.isAmending) {
      return `Amend commit ${shortenSha(this.props.lastCommit.sha)})`
    } else {
      if (this.props.branchName) {
        return `Commit to ${this.props.branchName}`
      } else {
        return 'Commit'
      }
    }
  }
}
