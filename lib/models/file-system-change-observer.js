import {Emitter} from 'atom';
import nsfw from 'nsfw';

import path from 'path';

import EventLogger from './event-logger';

export default class FileSystemChangeObserver {
  constructor(repositoryPromise) {
    this.emitter = new Emitter();
    this.repositoryPromise = repositoryPromise;
    this.logger = new EventLogger('FileSystemChangeObserver');
  }

  async start() {
    this.started = true;
    await this.watchRepository();
    return this;
  }

  async destroy() {
    this.started = false;
    this.emitter.dispose();
    await this.stopCurrentFileWatcher();
  }

  onDidChange(callback) {
    return this.emitter.on('did-change', callback);
  }

  onDidChangeWorkdirOrHead(callback) {
    return this.emitter.on('did-change-workdir-or-head', callback);
  }

  getRepository() {
    return this.repositoryPromise;
  }

  async watchRepository() {
    const repository = await this.getRepository();
    if (repository) {
      this.currentFileWatcher = await nsfw(
        repository.getWorkingDirectoryPath(),
        events => {
          const isNonGitFile = event => !event.directory.split(path.sep).includes('.git') && event.file !== '.git';
          const isWatchedGitFile = event => {
            return ['config', 'index', 'HEAD', 'MERGE_HEAD'].includes(event.file) ||
              event.directory.includes(path.join('.git', 'refs', 'remotes'));
          };
          const filteredEvents = events.filter(e => isNonGitFile(e) || isWatchedGitFile(e));
          if (filteredEvents.length) {
            this.logger.showEvents(filteredEvents);
            this.emitter.emit('did-change');
            const workdirOrHeadEvent = filteredEvents.find(e => !['config', 'index'].includes(e.file));
            if (workdirOrHeadEvent) {
              this.logger.showWorkdirOrHeadEvents();
              this.emitter.emit('did-change-workdir-or-head');
            }
          }
        },
        {
          debounceMS: 100,
          errorCallback: errors => {
            const workingDirectory = repository.getWorkingDirectoryPath();
            // eslint-disable-next-line no-console
            console.warn(`Error in FileSystemChangeObserver in ${workingDirectory}:`, errors);
            this.stopCurrentFileWatcher();
          },
        },
      );
      await this.currentFileWatcher.start();
      this.logger.showStarted(repository.getWorkingDirectoryPath());
    }
  }

  async stopCurrentFileWatcher() {
    if (this.currentFileWatcher) {
      await this.currentFileWatcher.stop();
      this.currentFileWatcher = null;
      this.logger.showStopped();
    }
  }
}
