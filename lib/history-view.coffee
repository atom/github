TemplateHelper = require './template-helper'
GitHistory = require './git-history'
PatchView = require './patch-view'
CommitHeaderView = require './commit-header-view'
timeago = require 'timeago'
_ = require 'underscore-contrib'
$ = require 'jquery'

BaseTemplate = """
  <div class="data" tabindex="-1">
    <div class="column-header">
      <span class="icon icon-git-branch"></span>
      <span class="branch-name"></span>
    </div>
    <div class="scroller"></div>
  </div>
  <div class="diffs"></div>
"""

CommitSummaryTemplateString = """
  <div class="commit">
    <div class="avatar">
      <img src="" />
    </div>
    <div class="message"></div>
    <div class="meta">
      <div>
        <span class="time"></span> by
        <span class="author"></span>
      </div>
      <div class="sha"></div>
    </div>
  </div>
"""

class HistoryView extends HTMLElement
  createdCallback: ->
    atom.commands.add 'git-experiment-history-view .data',
      'core:move-down': => @moveSelectionDown()
      'core:move-up': => @moveSelectionUp()

    window.diffsView = this

    @history = new GitHistory()

    @innerHTML = BaseTemplate
    @historyNode = @querySelector('.scroller')
    @diffsNode = @querySelector('.diffs')

    @historyNode.addEventListener 'click', (e) =>
      commitNode = e.target
      while commitNode? && !commitNode.classList?.contains('commit')
        commitNode = commitNode.parentNode
      if commitNode?
        sha = commitNode.querySelector('.sha').dataset['sha']
        @renderCommitDetail(sha)

    @commitTemplate = TemplateHelper.addTemplate(this, CommitSummaryTemplateString)

    $(window).on 'focus', =>
      @renderHistory()

    atom.workspace.onDidChangeActivePaneItem (pane) =>
      @renderHistory() if pane == @

    @history.getBranch().then (branch) =>
      name = branch.name().replace('refs/heads/', '')
      @querySelector('.branch-name').textContent = name

  getTitle: ->
    'Git History View'

  renderHistory: ->
    new Promise (resolve, reject) =>
      @historyNode.innerHTML = ''
      @history.walkHistory (commit) =>
        promise = @renderCommitSummary(commit)
        resolve(commit)
        promise
    .then (firstCommit) =>
      @historyNode.focus()
      @renderCommitDetail(firstCommit.sha())

  renderCommitSummary: (commit) ->
    # We still dont have a good view framework yet
    commitNode = TemplateHelper.renderTemplate(@commitTemplate)
    commitNode.querySelector('.sha').textContent = commit.sha().slice(0,8)
    commitNode.querySelector('.sha').dataset['sha'] = commit.sha()
    commitNode.querySelector('.author').textContent = commit.author().name()
    commitNode.querySelector('.time').textContent = timeago(commit.date())
    commitNode.querySelector('.message').textContent = commit.message().split('\n')[0]
    commitNode.querySelector('.avatar img').src = GitHistory.authorAvatar(commit.author().email())
    commitNode.firstElementChild.id = "sha-#{commit.sha()}"
    @historyNode.appendChild(commitNode)

  renderCommitDetail: (sha) ->
    diffsNode = @diffsNode
    headerView = new CommitHeaderView
    headerView.setData(@history.getCommit(sha))

    diffsNode.innerHTML = ''
    diffsNode.appendChild(headerView)

    @selectCommit(@querySelector("#sha-#{sha}"))

    setImmediate =>
      @history.getDiff(sha).then (diffList) ->
        window.actionTimestamp = actionTimestamp = Date.now()

        chunkSize = 5
        promise = Promise.resolve()
        diffList.forEach (diff) ->
          _.chunkAll(diff.patches(), chunkSize).forEach (patches) ->
            promise = promise.then -> new Promise (resolve) ->
              return unless actionTimestamp == window.actionTimestamp
              setImmediate ->
                patches.forEach (patch) ->
                    patchView = new PatchView
                    patchView.setPatch(patch)
                    diffsNode.appendChild(patchView)
                    diffsNode.style.webkitTransform = 'scale(1)' # fixes redraw issues
                resolve()

  selectCommit: (el) ->
    return unless el

    for commitNode in @querySelectorAll('.commit')
      commitNode.classList.remove('selected')

    el.classList.add('selected')

    if @historyNode.offsetHeight + @historyNode.scrollTop - el.offsetTop - el.offsetHeight < 0
      el.scrollIntoView(false) # off the bottom of the scroll
    else if el.offsetTop < @historyNode.scrollTop
      el.scrollIntoView()

  moveSelectionUp: ->
    @querySelector(".commit.selected").previousElementSibling?.click()

  moveSelectionDown: ->
    @querySelector(".commit.selected").nextElementSibling?.click()

module.exports = document.registerElement 'git-experiment-history-view', prototype: HistoryView.prototype
