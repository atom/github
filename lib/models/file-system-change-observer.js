/** @babel */

import {Emitter} from 'atom'
import nsfw from 'nsfw'

import path from 'path'

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

  getActiveRepository () {
    return this.activeRepository
  }

  async watchActiveRepository () {
    if (this.activeRepository) {
      this.lastFileChangePromise = new Promise((resolve) => { this.resolveLastFileChangePromise = resolve })
      this.currentFileWatcher = await nsfw(this.activeRepository.getWorkingDirectoryPath(), async (events) => {
        const isNonGitFile = (event) => !event.directory.split(path.sep).includes('.git') && event.file !== '.git'
        const isWatchedGitFile = (event) => ['index', 'HEAD', 'config'].includes(event.file) || event.directory.includes(path.join('.git', 'refs', 'remotes'))
        events = events.filter(e => isNonGitFile(e) || isWatchedGitFile(e))
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
