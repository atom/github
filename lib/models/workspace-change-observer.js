/** @babel */

import {CompositeDisposable, Disposable, Emitter} from 'atom';
import nsfw from 'nsfw';

export default class WorkspaceChangeObserver {
  constructor(window, workspace, repositoryPromise) {
    this.window = window;
    this.repositoryPromise = repositoryPromise;
    this.workspace = workspace;
    this.observedBuffers = new WeakSet();
    this.emitter = new Emitter();
  }

  async start() {
    this.started = true;
    const handler = async () => {
      if (await this.repositoryPromise) {
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
    return this;
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

  onDidChangeWorkdirOrHead(callback) {
    return this.emitter.on('did-change-workdir-or-head', callback);
  }

  getRepository() {
    return this.repositoryPromise;
  }

  getLastChangePromise() {
    return this.lastIndexChangePromise;
  }

  async watchActiveRepositoryGitDirectory() {
    const repository = await this.getRepository();
    if (repository) {
      this.lastIndexChangePromise = new Promise(resolve => { this.resolveLastIndexChangePromise = resolve; });
      this.currentFileWatcher = await nsfw(
        await repository.getGitDirectoryPath(),
        events => {
          const filteredEvents = events.filter(e => e.file !== 'index.lock');
          if (filteredEvents.length) {
            this.emitter.emit('did-change');
            const workdirOrHeadEvent = filteredEvents.filter(e => !['config', 'index'].includes(e.file));
            if (workdirOrHeadEvent) {
              this.emitter.emit('did-change-workdir-or-head');
            }
            this.resolveLastIndexChangePromise();
            this.lastIndexChangePromise = new Promise(resolve => { this.resolveLastIndexChangePromise = resolve; });
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
