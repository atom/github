ChangesElement = require '../../lib/changes/changes-element.coffee'
Changes = require '../../lib/changes/changes.coffee'

describe 'ChangesElement', ->
  beforeEach ->
    @changesElement = new ChangesElement

  it 'sets width on initialize when valid', ->
    @changesElement.initialize(width: 1000)
    expect(@changesElement.width()).toEqual(1000)

  it 'does not set width on initialize when invalid', ->
    @changesElement.initialize(width: 'puppies')
    expect(@changesElement.width()).toEqual(0)

  it 'triggers a repo update on initialize', ->
    @changesElement.model = new Changes
    spyOn(@changesElement.model, 'updateRepository')
    @changesElement.initialize({})
    expect(@changesElement.model.updateRepository).toHaveBeenCalled()
