TemplateHelper = require './template-helper'
GitChanges = require './git-changes'
Git = require 'nodegit'
PatchView = require './patch-view'
CommitHeaderView = require './commit-header-view'
PathWatcher = require 'pathwatcher'
timeago = require 'timeago'
_ = require 'underscore-contrib'
$ = require 'jquery'

BaseTemplate = """
  <div class="data" tabindex="-1">
    <div class="unstaged column-header"></div>
    <div class="unstaged files"></div>
    <div class="staged column-header"></div>
    <div class="staged files"></div>
    <div class="commit">

    </div>
  </div>
  <div class="diffs"></div>
"""

ChangeSummaryTemplateString = """
  <div class="change" data-path="">
    <div class="path"></div>
    <button class="btn btn-xs"></button>
  </div>
"""

class ChangesView extends HTMLElement
  createdCallback: ->
    atom.commands.add 'git-experiment-changes-view .data',
      'core:move-down': => @moveSelectionDown()
      'core:move-up': => @moveSelectionUp()

    @changes = new GitChanges()

    @innerHTML = BaseTemplate
    @unstagedChangesNode = @querySelector('.unstaged.files')
    @stagedChangesNode = @querySelector('.staged.files')
    @diffsNode = @querySelector('.diffs')

    $(@).on 'click', '.change', (e) =>
      el = e.currentTarget
      path = el.dataset['path']
      state = el.dataset['state']
      @renderChangeDetail(path, state)

    $(@).on 'click', '.change .btn', (e) =>
      el = $(e.target).closest('.change').get(0)
      path = el.dataset['path']
      state = el.dataset['state']
      promise = if state == 'unstaged'
        @changes.stagePath(path)
      else
        @changes.unstagePath(path)

      console.log path, state, promise
      promise.then =>
        @renderChanges()

      e.stopPropagation()

    @changeTemplate = TemplateHelper.addTemplate(this, ChangeSummaryTemplateString)

    $(window).on 'focus', =>
      @renderChanges() if atom.workspace.getActivePane() == @

    atom.workspace.onDidChangeActivePaneItem (pane) =>
      if pane == @
        @renderChanges()
        @watch()
      else
        @unwatch()

    @renderChanges()
    @watch()

  getTitle: ->
    'Commit Changes'

  updateColumnHeader: (count, state) ->
    @querySelector(".#{state}.column-header").textContent = "#{count} #{state} file#{if count == 1 then '' else 's'}"

  changeIsStaged: (change) ->
    bit = change.statusBit()
    codes = Git.Status.STATUS

    return bit & codes.INDEX_NEW ||
           bit & codes.INDEX_MODIFIED ||
           bit & codes.INDEX_DELETED ||
           bit & codes.INDEX_RENAMED ||
           bit & codes.INDEX_TYPECHANGE

  changeIsUnstaged: (change) ->
    bit = change.statusBit()
    codes = Git.Status.STATUS

    return bit & codes.WT_NEW ||
           bit & codes.WT_MODIFIED ||
           bit & codes.WT_DELETED ||
           bit & codes.WT_RENAMED ||
           bit & codes.WT_TYPECHANGE

  renderChanges: ->
    change.classList.add('old') for change in @querySelectorAll('.change')

    @changes.getStatuses().then (statuses) =>
      statuses.forEach (status) =>
        if @changeIsUnstaged(status)
          @renderChangeSummary(status, 'unstaged')

        if @changeIsStaged(status)
          @renderChangeSummary(status, 'staged')

      change.remove() for change in @querySelectorAll('.change.old')

      unstagedCount = @querySelectorAll('.unstaged .change').length
      stagedCount = @querySelectorAll('.staged .change').length

      @updateColumnHeader(unstagedCount, 'unstaged')
      @updateColumnHeader(stagedCount, 'staged')

      @unstagedChangesNode.firstElementChild?.click()
      @unstagedChangesNode.focus()

  renderChangeSummary: (change, state) =>
    if existingChange = @querySelector(".change[data-path='#{change.path()}'][data-state='#{state}']")
      existingChange.classList.remove('old')
    else
      changeNode = TemplateHelper.renderTemplate(@changeTemplate)
      changeNode.querySelector('.path').textContent = change.path()
      changeNode.firstElementChild.dataset['path'] = change.path()
      changeNode.firstElementChild.dataset['state'] = state
      changeNode.querySelector('button').textContent = if state == 'unstaged' then 'Stage' else 'Unstage'
      node = if state == 'staged' then @stagedChangesNode else @unstagedChangesNode
      node.appendChild(changeNode)

  renderChangeDetail: (path, state) ->
    diffsNode = @diffsNode
    diffsNode.innerHTML = ''

    @selectChange @querySelector("[data-path='#{path}'][data-state='#{state}']")

    @changes.getPatch(path, state).then (patch) =>
      console.log patch
      setImmediate ->
        patchView = new PatchView
        patchView.setPatch(patch)
        diffsNode.appendChild(patchView)
        diffsNode.style.webkitTransform = 'scale(1)' # fixes redraw issues

  selectChange: (el) ->
    return unless el

    for commitNode in @querySelectorAll('.change')
      commitNode.classList.remove('selected')

    el.classList.add('selected')

    if @unstagedChangesNode.offsetHeight + @unstagedChangesNode.scrollTop - el.offsetTop - el.offsetHeight < 0
      el.scrollIntoView(false) # off the bottom of the scroll
    else if el.offsetTop < @unstagedChangesNode.scrollTop
      el.scrollIntoView()

  moveSelectionUp: ->
    @querySelector(".change.selected").previousElementSibling?.click()

  moveSelectionDown: ->
    @querySelector(".change.selected").nextElementSibling?.click()

  unwatch: ->
    if @watchSubscription?
      @watchSubscription.close()
      @watchSubscription = null

  # Public: Watch this directory for changes.
  watch: ->
    try
      @watchSubscription ?= PathWatcher.watch "#{atom.project.getPaths()[0]}/.git", (eventType) =>
        setTimeout( =>
          @renderChanges()
        , 10)

module.exports = document.registerElement 'git-experiment-changes-view', prototype: ChangesView.prototype
