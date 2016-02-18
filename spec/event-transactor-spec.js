/** @babel */

import EventTransactor from '../lib/event-transactor'

describe('EventTransactor', function () {
  let emitter, transactor

  beforeEach(function () {
    emitter = {
      emit: jasmine.createSpy('emit')
    }
    transactor = new EventTransactor(emitter)
  })

  it('emits one event when didChange is called', function () {
    transactor.didChange()
    expect(emitter.emit.callCount).toBe(1)
    let args = emitter.emit.mostRecentCall.args
    expect(args[0]).toBe('did-change')
  })

  it('emits one event when didChange is called multiple times in an transaction', function () {
    transactor.transact(() => {
      transactor.didChange({line: 1})
      transactor.didChange({line: 2})
      transactor.didChange({line: 3})
    })

    expect(emitter.emit.callCount).toBe(1)
    let args = emitter.emit.mostRecentCall.args
    let eventObj = args[1]
    expect(args[0]).toBe('did-change')
    expect(eventObj.events).toHaveLength(3)
    expect(eventObj.events[0].line).toBe(1)
    expect(eventObj.events[2].line).toBe(3)
  })

  it('emits one event when transactions are nested', function () {
    transactor.transact(() => {
      transactor.transact(() => {
        transactor.didChange()
        transactor.didChange()
        transactor.didChange()
      })
      transactor.transact(() => {
        transactor.didChange()
        transactor.didChange()
        transactor.didChange()
      })
    })
    expect(emitter.emit.callCount).toBe(1)
    let args = emitter.emit.mostRecentCall.args
    expect(args[0]).toBe('did-change')
  })

  it('does not emit when an empty transaction is executed', function () {
    transactor.transact(() => {})
    expect(emitter.emit).not.toHaveBeenCalled()
  })
})
