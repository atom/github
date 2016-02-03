/** @babel */

// Implements event transactions--roll several events into one!
export default class EventTransactor {
  constructor(emitter) {
    this.emitter = emitter
    this.transactions = []
  }

  transact(fn) {
    this.transactions.push({didChange: false})
    fn()
    const transaction = this.transactions.pop()
    if (transaction && transaction.didChange)
      this.recordEvent(transaction.eventName)
  }

  didChange() {
    this.recordEvent('did-change')
  }

  recordEvent(eventName) {
    // TODO: we could roll up all the events at some point if we need to know
    // what changed.
    const transaction = this.getLastTransaction()
    if (transaction) {
      transaction.didChange = true
      transaction.eventName = eventName // TODO: not ideal, but for now, everything is `did-change`
    }
    else
      this.emitEvent(eventName)
  }

  emitEvent(eventName) {
    this.emitter.emit(eventName)
  }

  getLastTransaction() {
    return this.transactions[this.transactions.length - 1]
  }
}
