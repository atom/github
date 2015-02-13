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
    <div class="unstaged column-header">
      Unstaged changes
      <button class="btn btn-xs">Stage all</button>
    </div>
    <div class="unstaged files"></div>
    <div class="staged column-header">
      Staged changes
      <button class="btn btn-xs">Unstage all</button>
    </div>
    <div class="staged files"></div>
    <div class="staged column-header">Commit message</div>
    <div class="commit-message-box">
      <atom-text-editor class="commit-description" gutter-hidden data-placeholder="Enter the commit message describing your changes." style="height: 120px"></atom-text-editor>
<button class="btn btn-commit">Commit</button>
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
      'core:move-down': =>
        console.log this
        @moveSelectionDown()
      'core:move-up': =>
        console.log this
        @moveSelectionUp()

    atom.commands.add 'git-experiment-changes-view atom-text-editor',
      'core:confirm': (event) =>
        @commit()

    @changes = new GitChanges()

    @innerHTML = BaseTemplate
    @unstagedChangesNode = @querySelector('.unstaged.files')
    @stagedChangesNode = @querySelector('.staged.files')
    @commitNode = @querySelector('.commit')
    @diffsNode = @querySelector('.diffs')
    @commitMessageNode = @querySelector('atom-text-editor')
    @commitMessageModel = @commitMessageNode.getModel()

    @commitMessageModel.setSoftWrapped(true)
    @commitMessageModel.setPlaceholderText(@commitMessageNode.dataset['placeholder'])

    @selectedPath = @selectedState = null

    $(@).on 'click', '.change', (e) =>
      el = e.currentTarget
      path = el.dataset['path']
      state = el.dataset['state']
      @renderChangeDetail(path, state)

    $(@).on 'click', '.column-header.unstaged .btn', => @stageAll()
    $(@).on 'click', '.column-header.staged .btn', => @unstageAll()

    $(window).on 'blur', =>
      @watch() if atom.workspace.getActivePaneItem() == @

    $(window).on 'focus', =>
      @renderChanges() if atom.workspace.getActivePaneItem() == @
      @unwatch()

    $(@).on 'click', '.change .btn', (e) =>
      el = $(e.target).closest('.change').get(0)
      path = el.dataset['path']
      state = el.dataset['state']
      promise = if state == 'unstaged'
        @changes.stagePath(path)
      else
        @changes.unstagePath(path)

      promise.then =>
        @renderChanges()

      e.stopPropagation()

    $(@).on 'click', '.btn-commit', =>
      @commit()

    @changeTemplate = TemplateHelper.addTemplate(this, ChangeSummaryTemplateString)

    atom.workspace.onDidChangeActivePaneItem (pane) =>
      @renderChanges() if pane == @


    @renderChanges()

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
    @changes.getStatuses().then (statuses) =>
      @stagedChangesNode.innerHTML = ''
      @unstagedChangesNode.innerHTML = ''

      statuses.forEach (status) =>
        if @changeIsUnstaged(status)
          @renderChangeSummary(status, 'unstaged')

        if @changeIsStaged(status)
          @renderChangeSummary(status, 'staged')

      @querySelector('.change')?.click() unless @querySelector('.change.selected')
      @diffsNode.innerHTML = '' unless @querySelector('.change.selected')

  renderChangeSummary: (change, state) =>
    changeNode = TemplateHelper.renderTemplate(@changeTemplate)
    changeNode.querySelector('.path').textContent = change.path()
    changeNode.firstElementChild.dataset['path'] = change.path()
    changeNode.firstElementChild.dataset['state'] = state
    changeNode.firstElementChild.classList.add('selected') if @selectedPath == change.path() and @selectedState == state
    changeNode.querySelector('button').textContent = if state == 'unstaged' then 'Stage' else 'Unstage'
    node = if state == 'staged' then @stagedChangesNode else @unstagedChangesNode
    node.appendChild(changeNode)

  renderChangeDetail: (path, state) ->
    diffsNode = @diffsNode
    diffsNode.innerHTML = ''

    @selectChange @querySelector("[data-path='#{path}'][data-state='#{state}']")

    @changes.getPatch(path, state).then (patch) =>
      if patch
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

    @selectedPath = el.dataset['path']
    @selectedState = el.dataset['state']

    if @unstagedChangesNode.offsetHeight + @unstagedChangesNode.scrollTop - el.offsetTop - el.offsetHeight < 0
      el.scrollIntoView(false) # off the bottom of the scroll
    else if el.offsetTop < @unstagedChangesNode.scrollTop
      el.scrollIntoView()

  moveSelectionUp: ->
    @querySelector(".change.selected").previousElementSibling?.click()

  moveSelectionDown: ->
    @querySelector(".change.selected").nextElementSibling?.click()

  stageAll: =>
    paths = $(@).find('.unstaged .change').map( ->
      this.dataset['path']
    ).get()

    @changes.stageAllPaths(paths).then =>
      @renderChanges()
    false

  unstageAll: =>
    paths = $(@).find('.staged .change').map( ->
      this.dataset['path']
    ).get()

    @changes.unstageAllPaths(paths).then =>
      @renderChanges()
    false

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

  commit: ->
    commitPromise = @changes.commit(@commitMessageModel.getText()).then =>
      @commitMessageModel.setText('')
      @renderChanges()

module.exports = document.registerElement 'git-experiment-changes-view', prototype: ChangesView.prototype
