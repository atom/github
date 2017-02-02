import util from 'util';

export default class EventLogger {
  constructor(name) {
    this.name = name;
    this.path = '<unknown>';
    this.enabled = !!process.env.ATOM_GITHUB_FS_EVENT_LOG;

    if (this.enabled) {
      // eslint-disable-next-line no-console
      console.log(`Creating logger for ${this.name}`);
    }
  }

  showStarted(path) {
    this.path = path;

    if (!this.enabled) {
      return;
    }

    // eslint-disable-next-line no-console
    console.log(`${this.name} started watcher at path [${path}]`);
  }

  showEvents(events) {
    if (!this.enabled) {
      return;
    }

    const prettyPrinted = util.inspect(events);

    // eslint-disable-next-line no-console
    console.log(`${this.name} @ [${this.path}] received events:\n${prettyPrinted}`);
  }

  showWorkdirOrHeadEvents() {
    if (!this.enabled) {
      return;
    }

    // eslint-disable-next-line no-console
    console.log(`${this.name} @ [${this.path}] about to broadcast did-change-workdir-or-head`);
  }

  showStopped() {
    if (!this.enabled) {
      return;
    }

    // eslint-disable-next-line no-console
    console.log(`${this.name} stopped watcher at path [${this.path}]`);
  }
}
