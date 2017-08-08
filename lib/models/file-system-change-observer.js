import {Emitter} from 'event-kit';
import nsfw from 'nsfw';
import {watchPath} from 'atom';

import path from 'path';

import EventLogger from './event-logger';

const actionText = new Map([
  [nsfw.actions.CREATED, 'created'],
  [nsfw.actions.DELETED, 'deleted'],
  [nsfw.actions.MODIFIED, 'modified'],
  [nsfw.actions.RENAMED, 'renamed'],
]);

export default class FileSystemChangeObserver {
  constructor(repository) {
    this.hasAtomAPI = watchPath !== undefined;

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

    if (this.hasAtomAPI) {
      // Atom with watchPath API

      this.currentFileWatcher = await watchPath(this.repository.getWorkingDirectoryPath(), {}, handleEvents);
      this.logger.showStarted(this.repository.getWorkingDirectoryPath(), 'Atom watchPath');
    } else {
      // Atom pre-watchPath API

      this.currentFileWatcher = await nsfw(
        this.repository.getWorkingDirectoryPath(),
        events => {
          const translated = events.map(event => {
            const payload = {
              action: actionText.get(event.action) || `(Unknown action: ${event.action})`,
              path: path.join(event.directory, event.file || event.newFile),
            };

            if (event.oldFile) {
              payload.oldPath = path.join(event.directory, event.oldFile);
            }

            return payload;
          });

          handleEvents(translated);
        },
        {
          debounceMS: 100,
          errorCallback: errors => {
            const workingDirectory = this.repository.getWorkingDirectoryPath();
            // eslint-disable-next-line no-console
            console.warn(`Error in FileSystemChangeObserver in ${workingDirectory}:`, errors);
            this.stopCurrentFileWatcher();
          },
        },
      );
      await this.currentFileWatcher.start();
      this.logger.showStarted(this.repository.getWorkingDirectoryPath(), 'direct nsfw');
    }
  }

  async stopCurrentFileWatcher() {
    if (this.currentFileWatcher) {
      if (this.hasAtomAPI) {
        this.currentFileWatcher.dispose();
      } else {
        const stopPromise = this.currentFileWatcher.stop();
        this.currentFileWatcher = null;
        await stopPromise;
        this.logger.showStopped();
      }
    }
  }
}
