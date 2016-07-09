/** @babel */
/** @jsx etch.dom */

import {Emitter, CompositeDisposable} from 'atom'
import etch from 'etch'

import FilePatchView from '../views/file-patch-view'

export default class FilePatchController {
  constructor (props) {
    this.props = props
    this.emitter = new Emitter()
    this.applyPatchToIndex = this.applyPatchToIndex.bind(this)
    this.observeFilePatch()
    etch.initialize(this)
  }

  update (props) {
    this.props = props
    this.observeFilePatch()
    this.emitter.emit('did-change-title', this.getTitle())
    return etch.update(this)
  }

  observeFilePatch () {
    if (this.filePatchSubscriptions) this.filePatchSubscriptions.dispose()
    this.filePatchSubscriptions = new CompositeDisposable(
      this.props.filePatch.onDidUpdate(this.didUpdateFilePatch.bind(this)),
      this.props.filePatch.onDidDestroy(this.didDestroyFilePatch.bind(this))
    )
  }

  destroy () {
    this.emitter.emit('did-destroy')
    this.filePatchSubscriptions.dispose()
    return etch.destroy(this)
  }

  render () {
    return (
      <FilePatchView
        ref='filePatchView'
        applyPatchToIndex={this.applyPatchToIndex}
        filePatch={this.props.filePatch}
        stagingStatus={this.props.stagingStatus}
        registerHunkView={this.props.registerHunkView}
      />
    )
  }

  applyPatchToIndex (patch) {
    return this.props.repository.applyPatchToIndex(patch)
  }

  getTitle () {
    let title = this.props.stagingStatus === 'staged' ? 'Staged' : 'Unstaged'
    title += ' Changes: '
    title += this.props.filePatch.getDescriptionPath()
    return title
  }

  onDidChangeTitle (callback) {
    return this.emitter.on('did-change-title', callback)
  }

  onDidDestroy (callback) {
    return this.emitter.on('did-destroy', callback)
  }

  didUpdateFilePatch () {
    this.refs.filePatchView.didUpdateFilePatch()
  }

  didDestroyFilePatch () {
    this.destroy()
  }
}
