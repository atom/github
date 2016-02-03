/** @babel */

import EventTransactor from '../lib/event-transactor'

describe("EventTransactor", function() {
  let emitter, transactor

  beforeEach(function() {
    emitter = {
      emit: jasmine.createSpy('emit')
    }
    transactor = new EventTransactor(emitter)
  })

  it("emits one event when didChange is called", function() {
    transactor.didChange()
    expect(emitter.emit).toHaveBeenCalledWith('did-change')
    expect(emitter.emit.callCount).toBe(1)
  })

  it("emits one event when didChange is called multiple times in an transaction", function() {
    transactor.transact(() => {
      transactor.didChange()
      transactor.didChange()
      transactor.didChange()
    })
    expect(emitter.emit).toHaveBeenCalledWith('did-change')
    expect(emitter.emit.callCount).toBe(1)
  })

  it("emits one event when transactions are nested", function() {
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
    expect(emitter.emit).toHaveBeenCalledWith('did-change')
    expect(emitter.emit.callCount).toBe(1)
  })

  it("does not emit when an empty transaction is executed", function() {
    transactor.transact(() => {})
    expect(emitter.emit).not.toHaveBeenCalled()
  })
})
