/** @babel */
/** @jsx etch.dom */

import etch from 'etch'
import {CompositeDisposable} from 'atom'

export default class BranchView {
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
    etch.initialize(this)
    this.subscriptions = new CompositeDisposable(
      atom.commands.add('.git-BranchView-editor atom-text-editor[mini]', {
        'tool-panel:unfocus': this.cancelCreateNewBranch,
        'core:cancel': this.cancelCreateNewBranch,
        'core:confirm': this.createBranch
      })
    )
    this.createNew = false
  }

  update (props) {
    this.props = Object.assign({}, this.props, props)
    this.createNew = false
    return etch.update(this)
  }

  didSelectItem () {
    const branchName = this.refs.list.selectedOptions[0].text
    this.props.checkout(branchName)
  }

  createBranch (e) {
    if (e) e.stopImmediatePropagation()
    if (this.createNew) {
      const branchName = this.refs.editor.getText().trim()
      this.props.checkout(branchName, {createNew: true})
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
      <div className='git-BranchView-item git-BranchView-editor input-text'>
        {this.textEditorWidget}
      </div>
    )

    const selectBranchView = (
      <select ref='list' className='git-BranchView-item git-BranchView-select input-select' onchange={this.didSelectItem}>
        {this.props.branches.map(branch => {
          return <option value={branch} selected={branch === this.props.branchName}>{branch}</option>
        })}
      </select>
    )

    return (
      <div className='git-BranchView'>
        <span className='git-BranchView-item icon icon-git-branch'/>
        { this.createNew ? newBranchEditor : selectBranchView }
        <button ref='newBranchButton' className='git-BranchView-item git-BranchView-button btn'
                onclick={this.createBranch}> Create New Branch </button>
      </div>
    )
  }

  destroy () {
    this.subscriptions.dispose()
    etch.destroy(this)
  }
}
