/** @babel */

let ID = 0

// Implements event transactions--roll several events into one!
export default class EventTransactor {
  constructor (emitter, baseEvent = {}) {
    this.id = ++ID
    this.emitter = emitter
    this.baseEvent = baseEvent
    this.transactions = []
  }

  transact (fn) {
    this.transactions.push({
      didChange: false,
      events: []
    })
    fn()
    const transaction = this.transactions.pop()
    if (transaction && transaction.didChange) {
      this.recordEvent(transaction.eventName, {events: transaction.events}, transaction.emitFn)
    }
  }

  didChange (event) {
    this.recordEvent('did-change', event)
  }

  recordEvent (eventName, event) {
    // TODO: we could roll up all the events at some point if we need to know
    // what changed.
    const transaction = this.getLastTransaction()
    if (transaction) {
      transaction.didChange = true
      transaction.eventName = eventName // TODO: not ideal, but for now, everything is `did-change`
      transaction.events.push(event)
    } else {
      this.emitEvent(eventName, event)
    }
  }

  emitEvent (eventName, event) {
    if (event) {
      // TODO: the id will make sure to only roll up events from this
      // transactor. Maybe not the best solution.
      if (!event.events || (event.tid && event.tid !== this)) {
        event = {events: [event]}
      }
      event.tid = this.id
      Object.assign(event, this.baseEvent)
    }
    this.emitter.emit(eventName, event)
  }

  getLastTransaction () {
    return this.transactions[this.transactions.length - 1]
  }
}
