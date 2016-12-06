/** @babel */
/** @jsx etch.dom */

import {Emitter, CompositeDisposable} from 'atom'
import etch from 'etch'

import FilePatchView from '../views/file-patch-view'

export default class FilePatchController {
  constructor (props) {
    this.props = props
    this.emitter = new Emitter()
    this.stageHunk = this.stageHunk.bind(this)
    this.unstageHunk = this.unstageHunk.bind(this)
    this.stageLines = this.stageLines.bind(this)
    this.unstageLines = this.unstageLines.bind(this)
    etch.initialize(this)
  }

  async update (props) {
    this.props = Object.assign({}, this.props, props)
    this.emitter.emit('did-change-title', this.getTitle())
    return etch.update(this)
  }

  destroy () {
    this.emitter.emit('did-destroy')
    return etch.destroy(this)
  }

  render () {
    const hunks = this.props.filePatch.getHunks()
    if (!hunks.length) {
      return <div className='git-PaneView pane-item is-blank'><span className='icon icon-info'>File has no contents</span></div>
    } else {
      // NOTE: Outer div is required for etch to render elements correctly
      return (
        <div className='git-PaneView pane-item'>
          <FilePatchView
          ref='filePatchView'
          stageHunk={this.stageHunk}
          unstageHunk={this.unstageHunk}
          stageLines={this.stageLines}
          unstageLines={this.unstageLines}
          hunks={hunks}
          stagingStatus={this.props.stagingStatus}
          registerHunkView={this.props.registerHunkView}
          />
        </div>
      )
    }
  }

  stageHunk (hunk) {
    return this.props.repository.applyPatchToIndex(
      this.props.filePatch.getStagePatchForHunk(hunk)
    )
  }

  unstageHunk (hunk) {
    return this.props.repository.applyPatchToIndex(
      this.props.filePatch.getUnstagePatchForHunk(hunk)
    )
  }

  stageLines (lines) {
    return this.props.repository.applyPatchToIndex(
      this.props.filePatch.getStagePatchForLines(lines)
    )
  }

  unstageLines (lines) {
    return this.props.repository.applyPatchToIndex(
      this.props.filePatch.getUnstagePatchForLines(lines)
    )
  }

  getTitle () {
    let title = this.props.stagingStatus === 'staged' ? 'Staged' : 'Unstaged'
    title += ' Changes: '
    title += this.props.filePatch.getPath()
    return title
  }

  onDidChangeTitle (callback) {
    return this.emitter.on('did-change-title', callback)
  }

  onDidDestroy (callback) {
    return this.emitter.on('did-destroy', callback)
  }

  didUpdateFilePatch () {
    // FilePatch was mutated so all we need to do is re-render
    return etch.update(this)
  }

  didDestroyFilePatch () {
    this.destroy()
  }

  focus () {
    if (this.refs.filePatchView) {
      this.refs.filePatchView.focus()
    }
  }
}
