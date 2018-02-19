import {Emitter} from 'event-kit';
import {watchPath} from 'atom';

import path from 'path';

import EventLogger from './event-logger';

export default class FileSystemChangeObserver {
  constructor(repository) {
    this.emitter = new Emitter();
    this.repository = repository;
    this.logger = new EventLogger('fs watcher');

    this.started = false;
  }

  async start() {
    await this.watchRepository();
    this.started = true;
    return this;
  }

  async destroy() {
    this.started = false;
    this.emitter.dispose();
    await this.stopCurrentFileWatcher();
  }

  isStarted() {
    return this.started;
  }

  didChange(payload) {
    this.emitter.emit('did-change', payload);
  }

  didChangeWorkdirOrHead() {
    this.emitter.emit('did-change-workdir-or-head');
  }

  onDidChange(callback) {
    return this.emitter.on('did-change', callback);
  }

  onDidChangeWorkdirOrHead(callback) {
    return this.emitter.on('did-change-workdir-or-head', callback);
  }

  getRepository() {
    return this.repository;
  }

  async watchRepository() {
    const handleEvents = events => {
      const isNonGitFile = event => !event.path.split(path.sep).includes('.git');
      const isWatchedGitFile = event => {
        return ['config', 'index', 'HEAD', 'MERGE_HEAD'].includes(path.basename(event.path)) ||
          event.path.includes(path.join('.git', 'refs'));
      };
      const filteredEvents = events.filter(e => isNonGitFile(e) || isWatchedGitFile(e));
      if (filteredEvents.length) {
        this.logger.showEvents(filteredEvents);
        this.didChange(filteredEvents);
        const workdirOrHeadEvent = filteredEvents.find(e => !['config', 'index'].includes(path.basename(e.path)));
        if (workdirOrHeadEvent) {
          this.logger.showWorkdirOrHeadEvents();
          this.didChangeWorkdirOrHead();
        }
      }
    };

    this.currentFileWatcher = await watchPath(this.repository.getWorkingDirectoryPath(), {}, handleEvents);
    this.logger.showStarted(this.repository.getWorkingDirectoryPath(), 'Atom watchPath');
  }

  stopCurrentFileWatcher() {
    if (this.currentFileWatcher) {
      this.currentFileWatcher.dispose();
      this.logger.showStopped();
    }
    return Promise.resolve();
  }
}
