import {remote} from 'electron';
import {CompositeDisposable, Disposable} from 'event-kit';
import {autobind} from 'core-decorators';

export default class DeferredCallbackQueue {
  constructor(wait, callback, options = {}) {
    this.wait = wait;
    const currentWindow = remote.getCurrentWindow();

    const onDidFocus = options.onDidFocus || function(cb) {
      currentWindow.on('focus', cb);
      return new Disposable(() => {
        currentWindow.removeListener('focus', cb);
      });
    };
    const onDidBlur = options.onDidBlur || function(cb) {
      if (atom.inSpecMode()) {
        return new Disposable();
      }
      currentWindow.on('blur', cb);
      return new Disposable(() => {
        currentWindow.removeListener('blur', cb);
      });
    };

    this.callback = callback;
    this.subscriptions = new CompositeDisposable();
    this.items = new Set();

    this.paused = !currentWindow.isFocused() && !atom.inSpecMode();
    this.subscriptions.add(onDidFocus(this.resume));
    this.subscriptions.add(onDidBlur(this.pause));
  }

  @autobind
  pause() {
    if (this.paused) { return; }
    this.paused = true;
  }

  @autobind
  resume() {
    if (!this.paused) { return; }
    this.paused = false;
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.flush();
  }

  resetTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(this.flush, this.wait);
  }

  @autobind
  flush() {
    delete this.timer;
    if (this.items.size) {
      this.callback([...this.items]);
      this.items.clear();
    }
  }

  push(...items) {
    if (this.paused) {
      items.forEach(item => this.items.add(item));
      this.resetTimer();
    } else {
      this.callback(items);
    }
  }

  destroy() {
    this.subscriptions.dispose();
  }
}
