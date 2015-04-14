CommitMessageElement = require '../../lib/changes/commit-message-element'
GitChanges = require '../../lib/changes/git-changes'

describe 'CommitMessageElement', ->
  beforeEach ->
    @commitMessageElement = new CommitMessageElement
    @commitMessageElement.initialize(changesView: {model: {git: new GitChanges}})

  it "disables the commit button when the commit cannot be made", ->
    @commitMessageElement.model.stagedCount = 0

    waitsFor ->
      @commitMessageElement.buttonNode.disabled
    runs ->
      expect(@commitMessageElement.buttonNode.disabled).toBe(true)

  it "enables the commit button when the commit can be made", ->
    @commitMessageElement.model.stagedCount = 1
    @commitMessageElement.model.message = "Hi there"

    waitsFor ->
      !@commitMessageElement.buttonNode.disabled
    runs ->
      expect(@commitMessageElement.buttonNode.disabled).toBe(false)
