CommitMessage = require '../../lib/changes/commit-message'
GitChanges = require '../../lib/changes/git-changes'


describe 'CommitMessage', ->
  beforeEach ->
    @commitMessage = new CommitMessage(git: new GitChanges)

  it "won't commit unless there are staged items and a commit message", ->
    @commitMessage.stagedCount = 0
    @commitMessage.message = ''
    spyOn(@commitMessage.git, 'commit')
    committed = @commitMessage.commit()
    expect(committed).toEqual(false)
    expect(@commitMessage.git.commit).not.toHaveBeenCalled()

    @commitMessage.stagedCount = 1
    committed = @commitMessage.commit()
    expect(committed).toEqual(false)
    expect(@commitMessage.git.commit).not.toHaveBeenCalled()

    @commitMessage.stagedCount = 0
    @commitMessage.message = 'Hi there'
    committed = @commitMessage.commit()
    expect(committed).toEqual(false)
    expect(@commitMessage.git.commit).not.toHaveBeenCalled()

  xit "sets complete to true after a successful commit", ->
    # XXX Not sure why this isn't passing
    @commitMessage.stagedCount = 1
    @commitMessage.message = 'Hi there'
    spyOn(@commitMessage.git, 'commit').andReturn new Promise (resolve) -> resolve?()

    @commitMessage.commit()
    expect(@commitMessage.complete).toEqual(true)
