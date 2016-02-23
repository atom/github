/* @flow */

import type {Emitter} from 'atom'

let ID = 0

type Transaction = {didChange: boolean, eventName?: string, events: Array<Object>}

// Implements event transactions--roll several events into one!
export default class EventTransactor {
  emitter: Emitter;
  id: number;
  baseEvent: Object;
  transactions: Array<Transaction>;

  constructor (emitter: Emitter, baseEvent: Object = {}) {
    this.id = ++ID
    this.emitter = emitter
    this.baseEvent = baseEvent
    this.transactions = []
  }

  transact (fn: Function) {
    this.transactions.push({
      didChange: false,
      events: []
    })
    fn()
    const transaction = this.transactions.pop()
    if (transaction && transaction.didChange) {
      // $FlowFixMe: It's not clear how this works?
      this.recordEvent(transaction.eventName, {events: transaction.events})
    }
  }

  didChange (event: ?Object) {
    this.recordEvent('did-change', event)
  }

  recordEvent (eventName: string, event: ?Object) {
    // TODO: we could roll up all the events at some point if we need to know
    // what changed.
    const transaction = this.getLastTransaction()
    if (transaction) {
      transaction.didChange = true
      transaction.eventName = eventName // TODO: not ideal, but for now, everything is `did-change`
      // $FlowFixMe: Sure
      transaction.events.push(event)
    } else {
      // $FlowFixMe: Sure
      this.emitEvent(eventName, event)
    }
  }

  emitEvent (eventName: string, event: Object) {
    if (event) {
      // TODO: the id will make sure to only roll up events from this
      // transactor. Maybe not the best solution.
      if (!event.events || (event.tid && event.tid !== this)) {
        event = {events: [event]}
      }
      // $FlowFixMe: It's fiiiiine
      event.tid = this.id
      Object.assign(event, this.baseEvent)
    }
    this.emitter.emit(eventName, event)
  }

  getLastTransaction (): ?Transaction {
    return this.transactions[this.transactions.length - 1]
  }
}
