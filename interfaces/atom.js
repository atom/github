declare module 'atom' {
  declare class Disposable {
    dispose(): void;
  }

  declare class CompositeDisposable extends Disposable {
    add(disposable: Disposable): void;
  }

  declare class Emitter {
    on(name: string, callback: Function): Disposable;
    emit(name: string): void;
  }
}
