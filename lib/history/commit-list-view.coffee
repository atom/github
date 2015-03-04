$ = require 'jquery'
GitHistory = require './git-history'
CommitSummaryView = require './commit-summary-view'

BaseTemplate = """
<div class="column-header">
  <span class="icon icon-git-branch"></span>
  <span class="branch-name"></span>
  <span class="loading loading-spinner-tiny"></span>
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

    @base.on 'focus-commit-list', @focus.bind(@)

    @commands = atom.commands.add "git-experiment-commit-list-view",
      'core:move-down':  @moveSelectionDown
      'core:move-up':    @moveSelectionUp
      'git-experiment:focus-commit-details': @focusCommitDetails

  detachedCallback: ->
    @el.off 'click keyup', '.btn-load-more'
    @el.off 'click', 'git-experiment-commit-summary-view'
    @base.off 'focus-commit-list'

    if @commands
      @commands.dispose()
      @commands = null

  update: ->
    @focus()

    @git.getBranch().then (name) =>
      @branchNameNode.textContent = name

    @loadCommits().then (oids) =>
      @commitsNode.innerHTML = ''
      @addCommitSummaries(oids)

  loadCommits: (fromSha) ->
    @classList.add('loading-data')
    @git.walkHistory(fromSha).then (oids) =>
      @classList.remove('loading-data')
      oids

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
    @loadCommits(sha)
    .then (oids) =>
      @removeLoadMoreButton()
      @addCommitSummaries(oids)

  selectDefaultCommit: ->
    return if @selectedCommit()
    node = @querySelector("[data-sha='#{@selectedSha}']") or
           @commitsNode.firstElementChild
    @selectCommit(node)

  selectCommit: (node) ->
    return unless node?.tagName == 'GIT-EXPERIMENT-COMMIT-SUMMARY-VIEW'
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

  focusCommitDetails: ->
    @base.trigger('focus-commit-details')


module.exports = document.registerElement 'git-experiment-commit-list-view',
  prototype: CommitListView.prototype
