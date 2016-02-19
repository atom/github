declare module 'atom' {
  declare class Disposable {
    dispose(): void;
  }

  declare class CompositeDisposable extends Disposable {
    add(disposable: Disposable): void;
  }

  declare class Emitter {
    on(name: string, callback: Function): Disposable;
    emit(name: string, context?: ?Object): void;
  }

  declare class GitRepositoryAsync {
    static Git: Object;
  }
}

declare class Workspace {
  open(uri: string, options?: Object): Promise<void>;
}

declare class AtomEnvironment {
  workspace: Workspace;
}

declare var atom: AtomEnvironment;
