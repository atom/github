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



class GitHistory
  commits: {}
  numberCommits: 10

  constructor: ->
    @repoPromise = Git.Repository.open(atom.project.getPaths()[0])

  addCommit: (commit) -> @commits[commit.sha()] = commit

  getCommit: (sha) -> @commits[sha]

  walkHistory: (commitCallback) ->
    walk = (repo, walker, numberCommits, callback) ->
      return if numberCommits == 0
      walker.next().then (oid) =>
        repo.getCommit(oid).then(callback)
        walk(repo, walker, numberCommits - 1, callback)

    @repoPromise.then (repo) =>
      repo.getHeadCommit().then (commit) =>
        walker = repo.createRevWalk()
        walker.push(commit.id())
        walk repo, walker, @numberCommits, (commit) =>
          @addCommit(commit)
          commitCallback(commit)



class TemplateHelper
  @addTemplate: (parent, htmlString) ->
    template = document.createElement('template')
    template.innerHTML = htmlString
    parent.appendChild(template)
    template

  @renderTemplate: (template) ->
    document.importNode(template.content, true)



class DiffsView extends HTMLElement
  createdCallback: ->
    window.diffsView = this

    @history = new GitHistory()

    @innerHTML = BaseTemplate
    @historyNode = @querySelector('.history')
    @diffsNode = @querySelector('.diffs')

    @commitTemplate = TemplateHelper.addTemplate(this, CommitTemplateString)

    @renderHistory().catch (error) ->
      console.error error.message, error
      console.error error.stack

  getTitle: ->
    'Yeah, view that diff!'

  renderCommit: (commit) ->
    console.log 'commit', commit.sha(), commit.author().name(), commit.message()

    # We still dont have a good view framework yet
    commitNode = TemplateHelper.renderTemplate(@commitTemplate)
    commitNode.querySelector('.sha').textContent = commit.sha()
    commitNode.querySelector('.author').textContent = commit.author().name()
    commitNode.querySelector('.message').textContent = commit.message().split('\n')[0]

    @historyNode.appendChild(commitNode)

  renderHistory: ->
    @history.walkHistory (commit) => @renderCommit(commit)

module.exports = document.registerElement 'git-experiment-diffs-view', prototype: DiffsView.prototype
