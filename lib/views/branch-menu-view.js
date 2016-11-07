/** @babel */
/** @jsx etch.dom */

import etch from 'etch'
import {CompositeDisposable} from 'atom'

import {GitError} from '../git-shell-out-strategy'

export default class BranchMenuView {
  constructor (props) {
    this.props = props
    this.didSelectItem = this.didSelectItem.bind(this)
    this.createBranch = this.createBranch.bind(this)
    this.cancelCreateNewBranch = this.cancelCreateNewBranch.bind(this)
    const TextEditor = props.workspace.buildTextEditor
    this.textEditorWidget =
      <TextEditor
        ref='editor'
        mini={true}
        softWrapped={true}
        placeholderText='enter new branch name'
        lineNumberGutterVisible={false}
        showInvisibles={false}
        scrollPastEnd={false}
      />
    this.createNew = false
    etch.initialize(this)
    this.subscriptions = new CompositeDisposable(
      atom.commands.add('.git-BranchMenuView-editor atom-text-editor[mini]', {
        'tool-panel:unfocus': this.cancelCreateNewBranch,
        'core:cancel': this.cancelCreateNewBranch,
        'core:confirm': this.createBranch
      })
    )
  }

  update (props) {
    this.props = Object.assign({}, this.props, props)
    this.createNew = false
    this.errorMessage = ''
    return etch.update(this)
  }

  async didSelectItem () {
    const branchName = this.refs.list.selectedOptions[0].text
    try {
      await this.props.checkout(branchName)
    } catch (e) {
      if (!(e instanceof GitError)) throw e
      if (e.stdErr.match(/local changes.*would be overwritten/)) {
        const files = e.stdErr.split(/\r?\n/).filter(l => l.startsWith('\t'))
        this.errorMessage = `
          Checkout aborted due to local changes that would be overwritten.<br>
          Please commit or stash changes to the following: <br>
          ${files.join('<br>')}
        `
        this.refs.list.selectedIndex = this.props.branches.indexOf(this.props.branchName)
      } else {
        this.errorMessage = e.stdErr
      }
      return etch.update(this)
    }
  }

  async createBranch () {
    if (this.createNew) {
      const branchName = this.refs.editor.getText().trim()
      try {
        await this.props.checkout(branchName, {createNew: true})
      } catch (e) {
        if (!(e instanceof GitError)) throw e
        if (e.stdErr.match(/branch.*already exists/)) {
          this.errorMessage = `Cannot create branch "${branchName}" as it already exists`
        } else if (e.stdErr.match(/error: you need to resolve your current index first/)) {
          this.errorMessage = 'You must resolve merge conflicts before creating a new branch'
        } else {
          this.errorMessage = e.stdErr
        }
        this.createNew = false
        return etch.update(this)
      }
    } else {
      this.createNew = true
      return etch.update(this).then(() => {
        this.refs.editor.element.focus()
      })
    }
  }

  cancelCreateNewBranch () {
    this.createNew = false
    etch.update(this)
  }

  render () {
    const newBranchEditor = (
      <div className='git-BranchMenuView-item git-BranchMenuView-editor'>
        {this.textEditorWidget}
      </div>
    )

    const selectBranchView = (
      <select ref='list' className='git-BranchMenuView-item git-BranchMenuView-select input-select' onchange={this.didSelectItem}>
        {this.props.branches.map(branch => {
          return <option value={branch} selected={branch === this.props.branchName}>{branch}</option>
        })}
      </select>
    )

    return (
      <div className='git-BranchMenuView'>
        <div className='git-BranchMenuView-selector'>
          <span className='git-BranchMenuView-item icon icon-git-branch'/>
          { this.createNew ? newBranchEditor : selectBranchView }
          <button ref='newBranchButton' className='git-BranchMenuView-item git-BranchMenuView-button btn'
          onclick={this.createBranch}> Create New Branch </button>
        </div>
        <div className='git-BranchMenuView-message' ref='message' innerHTML={this.errorMessage}></div>
      </div>
    )
  }

  destroy () {
    this.subscriptions.dispose()
    etch.destroy(this)
  }
}
