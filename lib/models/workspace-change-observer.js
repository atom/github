/** @babel */

import {CompositeDisposable, Disposable, Emitter} from 'atom'

export default class WorkspaceChangeObserver {
  constructor (window, workspace, project) {
    this.window = window
    this.workspace = workspace
    this.project = project
    this.observedBuffers = new WeakSet()
    this.emitter = new Emitter()
  }

  start () {
    const handler = () => {
      if (this.activeDirectoryPath) this.emitter.emit('did-change')
    }
    this.window.addEventListener('focus', handler)
    this.disposables = new CompositeDisposable()
    this.disposables.add(
      this.workspace.observeTextEditors(this.observeTextEditor.bind(this)),
      new Disposable(() => this.window.removeEventListener('focus', handler))
    )
    return Promise.resolve()
  }

  stop () {
    this.disposables.dispose()
    this.observedBuffers = new WeakSet()
    return Promise.resolve()
  }

  onDidChange (callback) {
    return this.emitter.on('did-change', callback)
  }

  setActiveDirectoryPath (path) {
    this.activeDirectoryPath = path
  }

  isActivePath (path) {
    return this.project.relativizePath(path)[0] === this.activeDirectoryPath
  }

  observeTextEditor (editor) {
    const buffer = editor.getBuffer()
    if (!this.observedBuffers.has(buffer)) {
      this.observedBuffers.add(buffer)
      const disposables = new CompositeDisposable(
        buffer.onDidSave(() => {
          if (this.isActivePath(buffer.getPath())) this.emitter.emit('did-change')
        }),
        buffer.onDidReload(() => {
          if (this.isActivePath(buffer.getPath())) this.emitter.emit('did-change')
        }),
        buffer.onDidDestroy(() => {
          if (this.isActivePath(buffer.getPath())) this.emitter.emit('did-change')
          disposables.dispose()
        })
      )
      this.disposables.add(disposables)
    }
  }
}
