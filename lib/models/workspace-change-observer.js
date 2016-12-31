/** @babel */

import {CompositeDisposable, Disposable, Emitter} from 'atom';
import nsfw from 'nsfw';

export default class WorkspaceChangeObserver {
  constructor(window, workspace, repository) {
    this.window = window;
    this.repository = repository;
    this.workspace = workspace;
    this.observedBuffers = new WeakSet();
    this.emitter = new Emitter();
  }

  async start() {
    this.started = true;
    const handler = () => {
      if (this.repository) {
        this.emitter.emit('did-change');
      }
    };
    this.window.addEventListener('focus', handler);
    this.disposables = new CompositeDisposable();
    this.disposables.add(
      this.workspace.observeTextEditors(this.observeTextEditor.bind(this)),
      new Disposable(() => this.window.removeEventListener('focus', handler)),
    );
    await this.watchActiveRepositoryGitDirectory();
  }

  async destroy() {
    this.started = false;
    this.observedBuffers = new WeakSet();
    this.emitter.dispose();
    this.disposables.dispose();
    await this.stopCurrentFileWatcher();
  }

  onDidChange(callback) {
    return this.emitter.on('did-change', callback);
  }

  onDidUpdateHeadOrMergeHead(callback) {
    return this.emitter.on('did-update-head-or-merge-head', callback);
  }

  getRepository() {
    return this.repository;
  }

  getLastChangePromise() {
    return this.lastIndexChangePromise;
  }

  async watchActiveRepositoryGitDirectory() {
    if (this.repository) {
      this.lastIndexChangePromise = new Promise(resolve => { this.resolveLastIndexChangePromise = resolve; });
      this.currentFileWatcher = await nsfw(
        await this.repository.getGitDirectoryPath(),
        events => {
          const filteredEvents = events.filter(e => e.file !== 'index.lock');
          if (filteredEvents.length) {
            this.emitter.emit('did-change');
            for (let i = 0; i < filteredEvents.length; i++) {
              if (['HEAD', 'MERGE_HEAD'].includes(filteredEvents[i].file)) {
                this.emitter.emit('did-update-head-or-merge-head');
                break;
              }
            }
            this.resolveLastIndexChangePromise();
            this.lastIndexChangePromise = new Promise(resolve => { this.resolveLastIndexChangePromise = resolve; });
          }
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
    }
  }

  async stopCurrentFileWatcher() {
    if (this.currentFileWatcher) {
      await this.currentFileWatcher.stop();
      this.currentFileWatcher = null;
    }
  }

  activeRepositoryContainsPath(path) {
    if (this.repository) {
      return path.indexOf(this.repository.getWorkingDirectoryPath()) !== -1;
    } else {
      return false;
    }
  }

  observeTextEditor(editor) {
    const buffer = editor.getBuffer();
    if (!this.observedBuffers.has(buffer)) {
      this.observedBuffers.add(buffer);
      const disposables = new CompositeDisposable(
        buffer.onDidSave(() => {
          if (this.activeRepositoryContainsPath(buffer.getPath())) { this.emitter.emit('did-change'); }
        }),
        buffer.onDidReload(() => {
          if (this.activeRepositoryContainsPath(buffer.getPath())) { this.emitter.emit('did-change'); }
        }),
        buffer.onDidDestroy(() => {
          if (this.activeRepositoryContainsPath(buffer.getPath())) { this.emitter.emit('did-change'); }
          disposables.dispose();
        }),
      );
      this.disposables.add(disposables);
    }
  }
}
