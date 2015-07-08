ChangesElement = require '../../lib/changes/changes-element.coffee'
Changes = require '../../lib/changes/changes.coffee'
GitIndex = require '../../lib/changes/git-changes'


describe 'ChangesElement', ->
  beforeEach ->
    @changesElement = new ChangesElement
    @model = new Changes(gitIndex: new GitIndex)

  it 'sets width on initialize when valid', ->
    @changesElement.initialize(width: 1000, model: @model)
    expect(@changesElement.width()).toEqual(1000)

  it 'does not set width on initialize when invalid', ->
    @changesElement.initialize(width: 'puppies', model: @model)
    expect(@changesElement.width()).toEqual(0)

  it 'triggers a repo update on initialize', ->
    spyOn(@model, 'updateRepository')
    @changesElement.initialize(model: @model)
    expect(@model.updateRepository).toHaveBeenCalled()
