Git = require 'nodegit'

BaseTemplate = """
  <div class="history"></div>
  <div class="diffs"></div>
"""

CommitTemplateString = """
  <div class="commit">
    <div class="sha"></div>
    <div class="author"></div>
    <div class="message"></div>
  </div>
"""

class DiffsView extends HTMLElement
  createdCallback: ->
    window.diffsView = this

    @innerHTML = BaseTemplate
    @historyNode = @querySelector('.history')
    @diffsNode = @querySelector('.diffs')

    @commitTemplate = @addTemplate(CommitTemplateString)

    Git.Repository.open(atom.project.getPaths()[0])
      .then (@repo) =>
        console.log 'repo', @repo
        @repo.getCurrentBranch().then (@branch) =>
          console.log 'branch', @branch
        @renderHistory()
      .catch (error) ->
        console.log 'error', error
        console.log error.stack

  getTitle: ->
    'Yeah, view that diff!'

  addTemplate: (htmlString) ->
    template = document.createElement('template')
    template.innerHTML = htmlString
    @appendChild(template)
    template

  renderTemplate: (template) ->
    document.importNode(template.content, true)

  renderCommit: (commit) ->
    console.log 'commit', commit.sha(), commit.author().name(), commit.message()

    # We still dont have a good view framework yet
    commitNode = @renderTemplate(@commitTemplate)
    commitNode.querySelector('.sha').textContent = commit.sha()
    commitNode.querySelector('.author').textContent = commit.author().name()
    commitNode.querySelector('.message').textContent = commit.message().split('\n')[0]

    @historyNode.appendChild(commitNode)

  renderHistory: ->
    @walkHistory (commit) => @renderCommit(commit)

  walkHistory: (commitCallback) ->
    numberCommits=10
    @repo.getHeadCommit().then (commit) =>
      walker = @repo.createRevWalk()
      walker.push(commit.id())
      @walk(walker, numberCommits, commitCallback)

  walk: (walker, numberCommits, callback) ->
    return if numberCommits == 0
    walker.next().then (oid) =>
      @repo.getCommit(oid).then(callback)
      @walk(walker, numberCommits - 1, callback)

module.exports = document.registerElement 'git-experiment-diffs-view', prototype: DiffsView.prototype
