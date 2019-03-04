import {Emitter} from 'event-kit';

export default class ReviewCommentCounter {
  constructor() {
    this.emitter = new Emitter();
    this.totalCount = 0;
    this.resolvedCount = 0;
  }

  countAll(commentThreads) {
    this.totalCount += commentThreads.length;
    this.resolvedCount += commentThreads.filter(thread => thread.isResolved).length;
    if (commentThreads.length > 0) {
      this.emitter.emit('did-change');
    }
  }

  onDidChange(callback) {
    return this.emitter.on('did-change', callback);
  }

  getTotalCount() {
    return this.totalCount;
  }

  getResolvedCount() {
    return this.resolvedCount;
  }
}
