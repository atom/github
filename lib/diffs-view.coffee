Git = require 'nodegit'

class DiffsView extends HTMLElement
  createdCallback: ->
    window.diffsView = this

    # @addAttribute('tabindex', -1)

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

  renderCommit: (commit) ->
    # sorry for the DOM API noise. We dont have a good view framework yet
    console.log 'commit', commit.sha(), commit.author().name(), commit.message()
    commitNode = document.createElement('div')
    commitNode.classList.add('commit')

    node = document.createElement('div')
    node.textContent = commit.sha()
    node.classList.add('sha')
    commitNode.appendChild(node)

    node = document.createElement('div')
    node.textContent = commit.author().name()
    node.classList.add('name')
    commitNode.appendChild(node)

    node = document.createElement('div')
    node.textContent = commit.message().split('\n')[0]
    node.classList.add('message')
    commitNode.appendChild(node)

    @historyNode.appendChild(commitNode)

  renderHistory: ->
    @historyNode = document.createElement('div')
    @historyNode.classList.add('history')
    @appendChild(@historyNode)
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
