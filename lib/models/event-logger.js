import util from 'util';

export default class EventLogger {
  constructor(name) {
    this.name = name;
    this.enabled = !!process.env.ATOM_GITHUB_FS_EVENT_LOG;

    if (this.enabled) {
      // eslint-disable-next-line no-console
      console.log(`Creating logger for ${this.name}`);
    }
  }

  showEvents(events) {
    if (!this.enabled) {
      return;
    }

    const prettyPrinted = util.inspect(events);

    // eslint-disable-next-line no-console
    console.log(`${this.name} received events:\n${prettyPrinted}`);
  }

  showWorkdirOrHeadEvents() {
    if (!this.enabled) {
      return;
    }

    // eslint-disable-next-line no-console
    console.log(`${this.name} about to broadcast did-change-workdir-or-head`);
  }
}
