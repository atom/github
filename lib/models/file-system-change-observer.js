/** @babel */

import {Emitter} from 'atom'
import nsfw from 'nsfw'

export default class FileSystemChangeObserver {
  constructor () {
    this.emitter = new Emitter()
  }

  async start () {
    this.started = true
    await this.watchActiveDirectoryPath()
  }

  async stop () {
    await this.stopCurrentFileWatcher()
    this.started = false
  }

  onDidChange (callback) {
    return this.emitter.on('did-change', callback)
  }

  async setActiveDirectoryPath (path) {
    this.activeDirectoryPath = path
    if (this.started) {
      await this.stopCurrentFileWatcher()
      await this.watchActiveDirectoryPath()
    }
  }

  async watchActiveDirectoryPath () {
    if (this.activeDirectoryPath) {
      this.lastFileChangePromise = new Promise((resolve) => { this.resolveLastFileChangePromise = resolve })
      this.currentFileWatcher = await nsfw(this.activeDirectoryPath, async () => {
        this.emitter.emit('did-change')
        this.resolveLastFileChangePromise()
        this.lastFileChangePromise = new Promise((resolve) => { this.resolveLastFileChangePromise = resolve })
      })
      await this.currentFileWatcher.start()
    }
  }

  async stopCurrentFileWatcher () {
    if (this.currentFileWatcher) {
      await this.currentFileWatcher.stop()
      this.currentFileWatcher = null
    }
  }
}
