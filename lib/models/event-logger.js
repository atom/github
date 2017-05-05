import path from 'path';
import nsfw from 'nsfw';

const actionText = new Map();
actionText.set(nsfw.actions.CREATED, 'created');
actionText.set(nsfw.actions.DELETED, 'deleted');
actionText.set(nsfw.actions.MODIFIED, 'modified');
actionText.set(nsfw.actions.RENAMED, 'renamed');

export default class EventLogger {
  constructor(kind) {
    this.kind = kind;
    this.directory = '<unknown>';
    this.shortDirectory = '<unknown>';
  }

  showStarted(directory) {
    this.directory = directory;
    this.shortDirectory = path.basename(directory);

    if (!this.isEnabled()) {
      return;
    }

    this.shortLog('watcher started');
  }

  showEvents(events) {
    if (!this.isEnabled()) {
      return;
    }

    const uniqueRelativeNames = new Set(events.map(event => {
      const fullPath = path.join(event.directory, event.file || event.newFile);
      return path.relative(this.directory, fullPath);
    }));

    const fileNames = Array.from(uniqueRelativeNames).slice(0, 3);
    const elipses = uniqueRelativeNames.size > 3 ? '...' : '';
    const summary = `${this.getShortName()}: ${fileNames.join(', ')}${elipses}`;

    /* eslint-disable no-console */
    console.groupCollapsed(summary);
    console.table(events.map(event => ({
      directory: event.directory,
      file: event.file,
      newFile: event.newFile,
      action: actionText.get(event.action) || `(unknown: ${event.action})`,
    })), ['directory', 'action', 'file', 'newFile']);
    console.groupEnd();
    /* eslint-enable no-console */
  }

  showFocusEvent() {
    if (!this.isEnabled()) {
      return;
    }

    this.shortLog('focus triggered');
  }

  showWorkdirOrHeadEvents() {
    if (!this.isEnabled()) {
      return;
    }

    this.shortLog('working directory or HEAD change');
  }

  showStopped() {
    if (!this.isEnabled()) {
      return;
    }

    this.shortLog('stopped');
  }

  isEnabled() {
    return atom.config.get('github.filesystemEventDiagnostics');
  }

  getShortName() {
    return `${this.kind} @ ${this.shortDirectory}`;
  }

  shortLog(line) {
    // eslint-disable-next-line no-console
    console.log('%c%s%c: %s',
      'font-weight: bold; color: blue;',
      this.getShortName(),
      'font-weight: normal; color: black;',
      line,
    );
  }
}
