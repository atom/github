$ = require 'jquery'
GitHistory = require './git-history'
CommitSummaryView = require './commit-summary-view'

BaseTemplate = """
<div class="column-header">
  <span class="icon icon-git-branch"></span>
  <span class="branch-name"></span>
</div>
<div class="scroller"></div>
"""

class CommitListView extends HTMLElement
  createdCallback: ->
    @el = $(@)
    @tabIndex       = -1
    @innerHTML      = BaseTemplate
    @branchNameNode = @querySelector('.branch-name')
    @commitsNode    = @querySelector('.scroller')

    @git = new GitHistory

  attachedCallback: ->
    @base = @el.closest('.git-experiment-root-view')
    @handleEvents()

  handleEvents: ->
    @el.on 'click keyup', '.btn-load-more', @loadMoreCommits.bind(@)
    @el.on 'click', 'git-experiment-commit-summary-view', @clickedCommitSummary.bind(@)

    atom.commands.add "git-experiment-commit-list-view",
      'core:move-down':  @moveSelectionDown
      'core:move-up':    @moveSelectionUp

  update: ->
    @git.getBranch().then (name) =>
      @branchNameNode.textContent = name

    @git.walkHistory()
    .then (oids) =>
      @commitsNode.innerHTML = ''
      @addCommitSummaries(oids)

  addCommitSummaries: (oids) ->
    @removeLoadMoreButton()

    commitPromises = []

    for oid in oids
      commitSummaryView = new CommitSummaryView
      commitPromises.push(commitSummaryView.setId(oid))
      @commitsNode.appendChild(commitSummaryView)

    Promise.all(commitPromises).then =>
      @selectDefaultCommit()
      @addLoadMoreButton()
      @focus()

  removeLoadMoreButton: ->
    button = @commitsNode.querySelector('.btn')
    @commitsNode.removeChild(button) if button

  addLoadMoreButton: ->
    last = @commitsNode.querySelector('git-experiment-commit-summary-view:last-child')
    parent = last.dataset.parent
    base = @git.currentBase?.toString()
    if parent != base
      button = document.createElement('button')
      button.classList.add('btn')
      button.classList.add('btn-load-more')
      button.dataset.sha = parent
      button.textContent = "Load more commits"
      button.tabIndex = -1
      @commitsNode.appendChild(button)

  loadMoreCommits: (e) ->
    return if e.keyCode and e.keyCode != 13
    sha = e.currentTarget.dataset.sha
    @git.walkHistory(sha)
    .then (oids) =>
      @removeLoadMoreButton()
      @addCommitSummaries(oids)

  selectDefaultCommit: ->
    return if @selectedCommit()
    node = @querySelector("[data-sha='#{@selectedSha}']") or
           @commitsNode.firstElementChild
    @selectCommit(node)

  selectCommit: (node) ->
    return unless node?.dataset.sha
    selected = @selectedCommit()
    selected?.classList.remove('selected')
    node.classList.add('selected')
    sha = node.dataset.sha
    @selectedSha = sha
    @base.trigger('render-commit', [sha])
    @scrollIntoView(node)

  selectedCommit: ->
    @querySelector('.selected')

  clickedCommitSummary: (e) ->
    @selectCommit(e.currentTarget)

  moveSelectionDown: ->
    selected = @selectedCommit()
    next = selected.nextElementSibling
    return unless next?
    if next.tagName == 'BUTTON'
      next.focus()
    else
      @selectCommit(next)

  moveSelectionUp: ->
    if document.activeElement == @
      selected = @selectedCommit()
      previous = selected.previousElementSibling
      @selectCommit(previous) if previous?
    else
      @focus()

  scrollIntoView: (entry) ->
    scrollBottom = @commitsNode.offsetHeight + @commitsNode.scrollTop
    entryTop     = entry.offsetTop
    entryBottom  = entryTop + entry.offsetHeight

    if entryBottom > scrollBottom
      entry.scrollIntoView(false)
    else if entry.offsetTop < @commitsNode.scrollTop
      entry.scrollIntoView(true)


module.exports = document.registerElement 'git-experiment-commit-list-view',
  prototype: CommitListView.prototype
