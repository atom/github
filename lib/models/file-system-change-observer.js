/** @babel */

import {Emitter} from 'atom'
import nsfw from 'nsfw'

export default class FileSystemChangeObserver {
  constructor () {
    this.emitter = new Emitter()
  }

  async start () {
    this.started = true
    await this.watchActiveRepository()
  }

  async stop () {
    await this.stopCurrentFileWatcher()
    this.started = false
  }

  onDidChange (callback) {
    return this.emitter.on('did-change', callback)
  }

  async setActiveRepository (repository) {
    this.activeRepository = repository
    if (this.started) {
      await this.stopCurrentFileWatcher()
      await this.watchActiveRepository()
    }
  }

  async watchActiveRepository () {
    if (this.activeRepository) {
      this.lastFileChangePromise = new Promise((resolve) => { this.resolveLastFileChangePromise = resolve })
      this.currentFileWatcher = await nsfw(this.activeRepository.getWorkingDirectoryPath(), async (events) => {
        events = events.filter(e => e.file !== 'index.lock')
        if (events.length) {
          this.emitter.emit('did-change')
          this.resolveLastFileChangePromise()
          this.lastFileChangePromise = new Promise((resolve) => { this.resolveLastFileChangePromise = resolve })
        }
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
