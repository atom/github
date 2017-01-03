import {CompositeDisposable, Disposable, Emitter} from 'atom';

import nsfw from 'nsfw';
import {autobind} from 'core-decorators';

export default class WorkspaceChangeObserver {
  constructor(window, workspace) {
    this.window = window;
    this.workspace = workspace;
    this.observedBuffers = new WeakSet();
    this.emitter = new Emitter();
  }

  async start() {
    this.started = true;
    const handler = () => {
      if (this.activeRepository) {
        this.emitter.emit('did-change');
      }
    };
    this.window.addEventListener('focus', handler);
    this.disposables = new CompositeDisposable();
    this.disposables.add(
      this.workspace.observeTextEditors(this.observeTextEditor),
      new Disposable(() => this.window.removeEventListener('focus', handler)),
    );
    await this.watchActiveRepositoryGitDirectory();
  }

  async stop() {
    await this.stopCurrentFileWatcher();
    this.disposables.dispose();
    this.observedBuffers = new WeakSet();
    this.started = false;
  }

  onDidChange(callback) {
    return this.emitter.on('did-change', callback);
  }

  async setActiveRepository(repository) {
    this.activeRepository = repository;
    if (this.started) {
      await this.stopCurrentFileWatcher();
      await this.watchActiveRepositoryGitDirectory();
    }
  }

  getActiveRepository() {
    return this.activeRepository;
  }

  async watchActiveRepositoryGitDirectory() {
    if (this.activeRepository) {
      this.lastIndexChangePromise = new Promise(resolve => { this.resolveLastIndexChangePromise = resolve; });
      this.currentFileWatcher = await nsfw(
        await this.activeRepository.getGitDirectoryPath(),
        events => {
          const filteredEvents = events.filter(e => e.file !== 'index.lock');
          if (filteredEvents.length) {
            this.emitter.emit('did-change');
            this.resolveLastIndexChangePromise();
            this.lastIndexChangePromise = new Promise(resolve => { this.resolveLastIndexChangePromise = resolve; });
          }
        },
        {
          debounceMS: 100,
          errorCallback: errors => {
            const workingDirectory = this.activeRepository.getWorkingDirectoryPath();
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
    if (this.activeRepository) {
      return path.indexOf(this.activeRepository.getWorkingDirectoryPath()) !== -1;
    } else {
      return false;
    }
  }

  @autobind
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
