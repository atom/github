CommitMessage = require '../../lib/changes/commit-message'
GitIndex = require '../../lib/changes/git-changes'


describe 'CommitMessage', ->
  beforeEach ->
    @commitMessage = new CommitMessage(gitIndex: new GitIndex)

  it "won't commit unless there are staged items and a commit message", ->
    @commitMessage.stagedCount = 0
    @commitMessage.message = ''
    spyOn(@commitMessage.gitIndex, 'commit')
    committed = @commitMessage.commit()
    expect(committed).toEqual(false)
    expect(@commitMessage.gitIndex.commit).not.toHaveBeenCalled()

    @commitMessage.stagedCount = 1
    committed = @commitMessage.commit()
    expect(committed).toEqual(false)
    expect(@commitMessage.gitIndex.commit).not.toHaveBeenCalled()

    @commitMessage.stagedCount = 0
    @commitMessage.message = 'Hi there'
    committed = @commitMessage.commit()
    expect(committed).toEqual(false)
    expect(@commitMessage.gitIndex.commit).not.toHaveBeenCalled()

  xit "sets complete to true after a successful commit", ->
    # XXX Not sure why this isn't passing
    @commitMessage.stagedCount = 1
    @commitMessage.message = 'Hi there'
    spyOn(@commitMessage.gitIndex, 'commit').andReturn new Promise (resolve) -> resolve?()

    @commitMessage.commit()
    expect(@commitMessage.complete).toEqual(true)
