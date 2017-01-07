import {CompositeDisposable, Disposable, Emitter} from 'atom';

import nsfw from 'nsfw';
import {autobind} from 'core-decorators';

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
      this.workspace.observeTextEditors(this.observeTextEditor),
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

  async watchActiveRepositoryGitDirectory() {
    const repository = await this.getRepository();
    if (repository) {
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

  async activeRepositoryContainsPath(path) {
    const repository = await this.getRepository();
    if (repository) {
      return path.indexOf(repository.getWorkingDirectoryPath()) !== -1;
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
        buffer.onDidSave(async () => {
          if (await this.activeRepositoryContainsPath(buffer.getPath())) { this.emitter.emit('did-change'); }
        }),
        buffer.onDidReload(async () => {
          if (await this.activeRepositoryContainsPath(buffer.getPath())) { this.emitter.emit('did-change'); }
        }),
        buffer.onDidDestroy(async () => {
          if (await this.activeRepositoryContainsPath(buffer.getPath())) { this.emitter.emit('did-change'); }
          disposables.dispose();
        }),
      );
      this.disposables.add(disposables);
    }
  }
}
