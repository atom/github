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
      <div>
        <select ref='list' onchange={this.didSelectItem}>
          {this.props.branches.map(branch => <option value={branch}>{branch}</option>)}
        </select>
        <br />
        <div className='git-CommitView-editor'>
          {this.textEditorWidget}
        </div>
        <button ref='newBranchButton' className='btn git-BranchView-button'
                onclick={this.createBranch.bind(this)}> Create New Branch </button>
      </div>
    )
  }

  destroy () {
    etch.destroy(this)
  }
}
