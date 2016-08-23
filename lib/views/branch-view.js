/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

export default class BranchView {
  constructor (props) {
    this.props = props
    this.didSelectItem = this.didSelectItem.bind(this)
    const TextEditor = props.workspace.buildTextEditor
    this.textEditorWidget =
      <TextEditor
        ref='editor'
        softWrapped={true}
        placeholderText='enter new branch name'
        lineNumberGutterVisible={false}
        showInvisibles={false}
        scrollPastEnd={false}
      />
    etch.initialize(this)
    this.editor = this.refs.editor
    this.subscriptions = atom.commands.add(this.element, {
      'core:confirm': this.createBranch.bind(this)
    })
  }

  update (props) {
    this.props = Object.assign({}, this.props, props)
    return etch.update(this)
  }

  didSelectItem () {
    const branchName = this.refs.list.selectedOptions[0].text
    this.props.checkout(branchName)
  }

  createBranch () {
    const branchName = this.editor.getText().trim()
    this.props.checkout(branchName, {createNew: true})
  }

  render () {
    return (
      <div className='git-BranchView'>
        <span className='git-BranchView-item icon icon-git-branch'/>
        <select className='git-BranchView-item git-BranchView-select input-select' ref='list' onchange={this.didSelectItem}>
          {this.props.branches.map(branch => {
            return <option value={branch} selected={branch === this.props.branchName}>{branch}</option>
          })}
        </select>
        <div className='git-BranchView-item git-BranchView-input input-text'>
          {this.textEditorWidget}
        </div>
        <button ref='newBranchButton' className='git-BranchView-item git-BranchView-button btn'
                onclick={this.createBranch.bind(this)}> Create New Branch </button>
      </div>
    )
  }

  destroy () {
    etch.destroy(this)
  }
}
