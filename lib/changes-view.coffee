TemplateHelper = require './template-helper'
GitChanges = require './git-changes'
Git = require 'nodegit'
PatchView = require './patch-view'
CommitHeaderView = require './commit-header-view'
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
      <atom-text-editor tabindex="-1" class="commit-description" gutter-hidden data-placeholder="Enter the commit message describing your changes." style="height: 120px"></atom-text-editor>
      <div class="commit-button">
        <button class="btn btn-commit">Commit</button>
      </div>
    </div>
    <div class="undo-last-commit-box">
      <div class="undo-wrapper">
        <button class="btn">Undo</button>
        <div class="description">Committed <span class="time"></span></div>
        <div class="title">Commit title</div>
      </div>
    </div>
  </div>
  <div class="diffs" tabindex="-1"></div>
"""

ChangeSummaryTemplateString = """
  <div class="change" data-path="">
    <div>
      <span class='icon'></span>
      <span class="path">
        <span class="dir"></span>
        <span class="filename"></span>
      </span>
    </div>
    <button class="btn btn-xs"></button>
  </div>
"""

class ChangesView extends HTMLElement
  @dragging: false
  @diffSelectionMode: 'hunk'
  @rendering: false

  initialize: ({@uri}) ->

  createdCallback: ->
    atom.commands.add 'git-experiment-changes-view .data',
      'core:move-down': =>
        @moveSelectionDown()
      'core:move-up': =>
        @moveSelectionUp()
      'core:move-right': =>
        @focusDiffsNode()
      'core:focus-commit-message': =>
        @commitMessageNode.focus()

    atom.commands.add 'git-experiment-changes-view .data atom-text-editor',
      'core:confirm': (event) =>
        @sidebarNode.focus()
        @commit()
      'core:focus-changes-list': (event) =>
        @sidebarNode.focus()

    atom.commands.add 'git-experiment-changes-view .diffs',
      'core:move-left': (e) =>
        @sidebarNode.focus()
      'core:clear-selections': (e) =>
        @clearKeyboardLineSelections()
      'core:move-up': (e) =>
        @moveDiffSelectionUp()
      'core:move-down': (e) =>
        @moveDiffSelectionDown()
      'core:change-diff-selection': (e) =>
        @switchDiffSelectionMode()
      'core:expand-line-selection-up': (e) =>
        @expandDiffSelectionUp()
      'core:expand-line-selection-down': (e) =>
        @expandDiffSelectionDown()
      'core:focus-commit-message': (e) =>
        @commitMessageNode.focus()
      'core:stage': (e) =>
        selected = $(@diffsNode).find('tr.selected:first').get(0)
        if selected
          @registerCurrentKeyboardPosition(selected)
          @processLinesStage(selected)
      'core:add-selected-lines': (e) =>
        lines = $(@).find('.keyboard-active')
        selected = lines.first().hasClass('selected')
        for line in lines
          if selected
            $(line).removeClass('selected')
          else
            $(line).addClass('selected')

      'core:add-line-range': (e) =>
        line = $(@).find('.keyboard-active').get(0)
        @processHunkSelection(line)

    @changes = new GitChanges()

    @innerHTML = BaseTemplate
    @sidebarNode = @querySelector('.data')
    @unstagedChangesNode = @querySelector('.unstaged.files')
    @stagedChangesNode = @querySelector('.staged.files')
    @commitNode = @querySelector('.commit')
    @diffsNode = @querySelector('.diffs')
    @commitMessageNode = @querySelector('atom-text-editor')
    @commitMessageModel = @commitMessageNode.getModel()
    @undoNode = @querySelector('.undo-wrapper')
    @commitButtonNode = @querySelector('.btn-commit')

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

    $(@).on 'click', '.undo-wrapper .btn', =>
      @changes.getLatestUnpushed().then (commit) =>
        @commitMessageModel.setText(commit.message())
        @changes.undoLastCommit().then =>
          @renderChanges()

    $(@).on 'mousedown', '.btn-stage-lines, .btn-unstage-lines', (e) ->
      e.stopPropagation()
      false

    $(@).on 'click', '.btn-stage-hunk, .btn-unstage-hunk', (e) =>
      @processHunkStage(e.currentTarget)

    $(@).on 'click', '.btn-stage-lines, .btn-unstage-lines', (e) =>
      @processLinesStage(e.currentTarget)
      e.stopPropagation()
      false

    $(@).on 'mouseenter', 'tr.deletion, tr.addition', (e) ->
      $(this).closest('.diff-hunk').find('td.hover').removeClass('active')
      $(this).addClass('active')

    $(@).on 'mouseleave', 'tr.deletion, tr.addition', (e) ->
      $(this).removeClass('active')

    $(@).on 'mouseenter', '.btn-stage-hunk', (e) ->
      $(this).closest('.diff-hunk').find('tr.addition, tr.deletion').addClass('active')

    $(@).on 'mouseleave', '.btn-stage-hunk', (e) ->
      $(this).closest('.diff-hunk').find('tr.addition, tr.deletion').removeClass('active')

    $(@).on 'mouseenter', '.btn-stage-lines', (e) ->
      $(this).closest('.diff-hunk').find('tr.selected').addClass('active')

    $(@).on 'mouseleave', '.btn-stage-lines', (e) ->
      $(this).closest('.diff-hunk').find('tr.selected').removeClass('active')

    $(@).on 'mouseenter', 'tr.deletion, tr.addition', (e) =>
      $(this).closest('.diff-hunk').find('td.hover').removeClass('active')
      $(this).addClass('active')
      @processHunkSelection(e.currentTarget) if @dragging

    $(@).on 'mousedown', 'tr.deletion, tr.addition', (e) =>
      el = e.currentTarget
      @dragging = true
      if !e.shiftKey and !e.ctrlKey and !e.metaKey
        @clearLineSelections(el)

      if !e.shiftKey
        @selectLineElement(el)

    $(@).on 'mouseup mouseleave', (e) =>
      @dragging = false
      el = $(e.target).closest('tr')
      return unless el.length and (el.hasClass('addition') or el.hasClass('deletion'))
      if e.shiftKey
        @processHunkSelection(el)
      else
        @clearDragging()

    $(window).on 'focus', =>
      @renderChanges() if atom.workspace.getActivePaneItem() == @

    stage = (e) =>
      el = if e.currentTarget
        e.stopPropagation()
        $(e.currentTarget).closest('.change').get(0)
      else
        e

      path = el.dataset['path']
      state = el.dataset['state']
      promise = if state == 'unstaged'
        @changes.stagePath(path)
      else
        @changes.unstagePath(path)

      promise.then =>
        @renderChanges()

    $(@).on 'click', '.change .btn', stage
    $(@).on 'dblclick', '.change', stage

    atom.commands.add 'git-experiment-changes-view .data',
      'change:stage': (e) =>
        change = @querySelector('.change.selected')
        stage(change) if change and e.currentTarget != @commitMessageNode

    $(@).on 'click', '.btn-commit', =>
      @commit()

    @commitMessageModel.onDidChange =>
      @updateCommitButton()

    @changeTemplate = TemplateHelper.addTemplate(this, ChangeSummaryTemplateString)

    process.nextTick =>
      # HACK: atom.workspace is weirdly not available when this is deserialized
      atom.workspace.onDidChangeActivePaneItem (pane) =>
        @renderChanges() if pane == @

  attachedCallback: ->
    @renderChanges()

  getTitle: ->
    'Commit Changes'

  getURI: -> @uri

  serialize: ->
    deserializer: 'GitChangesView'
    uri: @getURI()

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
    return if @rendering
    @rendering = true
    @changes.getStatuses().then (statuses) =>
      @stagedChangesNode.innerHTML = ''
      @unstagedChangesNode.innerHTML = ''

      statuses.forEach (status) =>
        if @changeIsUnstaged(status)
          @renderChangeSummary(status, 'unstaged')

        if @changeIsStaged(status)
          @renderChangeSummary(status, 'staged')

      for change, idx in $(@sidebarNode).find('.change')
        $(change).attr('data-change-index', idx)

      if current = @querySelector('.change.selected')
        current.click()
      else
        current = $(@sidebarNode).find(".change[data-change-index=#{@selectedIndex}], .change[data-change-index=#{@selectedIndex-1}]")
        if current.length
          current.last().click()
        else
          @querySelector('.change')?.click()

      @diffsNode.innerHTML = '' unless @querySelector('.change.selected')

      @updateCommitButton()

      @sidebarNode.focus()
      @rendering = false

    @changes.getLatestUnpushed().then (commit) =>
      if commit
        @undoNode.querySelector('.title').textContent = commit.message()
        @undoNode.querySelector('.time').textContent = timeago(commit.date())
        @undoNode.classList.add('show')
      else
        @undoNode.classList.remove('show')

  renderChangeSummary: (change, state) =>
    changeNode = TemplateHelper.renderTemplate(@changeTemplate)

    pathParts = change.path().split("/")
    if pathParts.length > 1
      filename = "/#{pathParts.pop()}"
      dir = "#{pathParts.join('/')}"
    else
      filename = pathParts[0]
      dir = ''

    changeNode.querySelector('.path .dir').textContent = dir
    changeNode.querySelector('.path .filename').textContent = filename
    changeNode.firstElementChild.dataset['path'] = change.path()
    changeNode.firstElementChild.dataset['state'] = state
    changeNode.firstElementChild.classList.add('selected') if @selectedPath == change.path() and @selectedState == state

    @addStatusClasses(change, state, changeNode.querySelector('.icon'))

    changeNode.querySelector('button').textContent = if state == 'unstaged' then 'Stage' else 'Unstage'
    node = if state == 'staged' then @stagedChangesNode else @unstagedChangesNode
    node.appendChild(changeNode)

  addStatusClasses: (change, state, node) ->
    bit = change.statusBit()
    codes = Git.Status.STATUS


    if state == 'unstaged'
      className = if bit & codes.WT_NEW
        'added'
      else if bit & codes.WT_RENAMED
        'renamed'
      else if bit & codes.WT_DELETED
        'removed'
      else
        'modified'
    else
      className = if bit & codes.INDEX_NEW
        'added'
      else if bit & codes.INDEX_RENAMED
        'renamed'
      else if bit & codes.INDEX_DELETED
        'removed'
      else
        'modified'

    node.classList.add("status-#{className}")
    node.classList.add("icon-diff-#{className}")

  renderChangeDetail: (path, state) ->
    top = @diffsNode.scrollTop
    selectedPath = @selectedPath
    selectedState = @selectedState

    diffsNode = @diffsNode
    diffsNode.innerHTML = ''

    @selectChange @querySelector("[data-path='#{path}'][data-state='#{state}']")

    @changes.getPatch(path, state).then (patch) =>
      if patch
        setImmediate =>
          patchView = new PatchView
          patchView.setPatch(patch, @, state) # third parameter adds stage buttons
          diffsNode.appendChild(patchView)
          # diffsNode.style.webkitTransform = 'scale(1)' # fixes redraw issues

          if selectedPath == @selectedPath && selectedState == @selectedState
            @diffsNode.scrollTop = top

            if @currentHunkIndex
              @diffSelectionMode = 'hunk'
              hunk = $(@).find(".diff-hunk[data-hunk-index=#{@currentHunkIndex}]")
              if !hunk.length and @currentHunkIndex > 0
                hunk = $(@).find(".diff-hunk[data-hunk-index=#{@currentHunkIndex-1}]")

              hunk.find('tr.addition, tr.deletion').addClass('selected')
              @diffsNode.focus()
              @currentHunkIndex = null #clear, will be reset on next keyboard stage

  selectChange: (el) ->
    return unless el

    for commitNode in @querySelectorAll('.change')
      commitNode.classList.remove('selected')

    el.classList.add('selected')

    @selectedPath = el.dataset['path']
    @selectedState = el.dataset['state']
    @selectedIndex = $(el).attr('data-change-index')

    if @unstagedChangesNode.offsetHeight + @unstagedChangesNode.scrollTop - el.offsetTop - el.offsetHeight < 0
      el.scrollIntoView(false) # off the bottom of the scroll
    else if el.offsetTop < @unstagedChangesNode.scrollTop
      el.scrollIntoView()

  moveSelectionUp: ->
    el = @querySelector(".change.selected")
    prev = el.previousElementSibling

    unless prev
      if $(el).closest('.staged').length
        prev = @querySelector(".unstaged .change:last-of-type")

    prev?.click()

  moveSelectionDown: ->
    el = @querySelector(".change.selected")
    next = el.nextElementSibling

    unless next
      if $(el).closest('.unstaged').length
        next = @querySelector(".staged .change")

    next?.click()

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

  updateCommitButton: ->
    if @stagedChangesNode.querySelector('.change') == null or $.trim(@commitMessageModel.getText()) == ''
      @commitButtonNode.disabled = true
    else
      @commitButtonNode.disabled = false

  commit: ->
    return unless @stagedChangesNode.querySelector('.change') or $.trim(@commitMessageModel.getText()) == ''
    commitPromise = @changes.commit(@commitMessageModel.getText()).then =>
      @commitMessageModel.setText('')
      @renderChanges()

  selectLineElement: (el) ->
    el = $(el)
    hunk = el.closest('.diff-hunk')
    thisHunkSelected = hunk.find('.selection-point, .keyboard-active').length
    @clearLineSelections() unless thisHunkSelected
    @clearLineStartReferences()
    el.addClass('selection-point').toggleClass('selected')

  clearLineSelections: ->
    $(@).find("tr.selected").removeClass('selected')
    $(@).find("tr.keyboard-active").removeClass('keyboard-active')
    $(@).find("tr.keyboard-selection-start").removeClass('keyboard-selection-start')

  clearLineStartReferences: ->
    $(@).find('tr.selection-point').removeClass('selection-point')

  processHunkSelection: (el) ->
    el = $(el)
    hunk = $(el).closest('.diff-hunk')
    start = hunk.find('.selection-point')
    return unless start.length

    startIndex = start.get(0).dataset['lineIndex']
    elIndex = el.get(0).dataset['lineIndex']
    selected = false

    for row in hunk.find('tr.addition, tr.deletion')
      row = $(row)
      rowIndex = row.get(0).dataset['lineIndex']
      foundLimit = rowIndex == elIndex or rowIndex == startIndex
      if foundLimit or select
        row.addClass('dragging').removeClass('dragged') if @dragging
        if start.hasClass('selected')
          row.addClass('selected')
        else
          row.removeClass('selected')

        if elIndex == startIndex
          select = false
        else if foundLimit
          select = !select

    dragged = @clearDragging()

    if @dragging
      if start.hasClass('selected')
        dragged.removeClass('selected')
      else
        dragged.addClass('selected')

      hunk.find('.dragging').removeClass('dragging').addClass('dragged')


  clearDragging: ->
    $(@).find('.dragged').removeClass('dragged')

  focusDiffsNode: ->
    $(@diffsNode).find('tr.active').removeClass('active')
    @diffsNode.focus()
    unless $(@diffsNode).find('tr.selected, tr.keyboard-active').length
      @clearLineSelections()
      @clearLineStartReferences()
      @selectFirstHunk()

  selectFirstHunk: ->
    @diffSelectionMode = 'hunk'
    $(@diffsNode).find('.diff-hunk:first').find('tr.addition, tr.deletion').addClass('selected')

  scrollLineSelectionIntoView: (el) ->
    el = el.get(0)
    offsetTop = el.offsetTop
    hunk = $(el).closest('.diff-hunk')
    if hunk.length
      offsetTop += hunk.get(0).offsetTop

    if @diffsNode.offsetHeight + @diffsNode.scrollTop - offsetTop - el.offsetHeight < 0
      el.scrollIntoView(false) # off the bottom of the scroll
    else if offsetTop < @diffsNode.scrollTop
      el.scrollIntoView()

  clearKeyboardLineSelections: ->
    $(@diffsNode).find('tr.selected').removeClass('selected') if @diffSelectionMode == 'line'

  moveDiffSelectionDown: ->
    $(@diffsNode).find('tr.active').removeClass('active')
    switch @diffSelectionMode
      when 'hunk'
        activeHunk = $(@diffsNode).find('tr.selected:first').closest('.diff-hunk')
        if activeHunk.length
          next = activeHunk.next('.diff-hunk')
          if next.length
            @clearLineSelections()
            @clearLineStartReferences()
            next.find('tr.addition, tr.deletion').addClass('selected')
            @scrollLineSelectionIntoView(next)
        else
          @selectFirstHunk()
      when 'line'
        selection = $(@diffsNode).find('.keyboard-active:last')
        if selection.length
          next = selection.nextAll('tr.addition, tr.deletion').first()
          if next.length
            next.siblings().removeClass('keyboard-active').removeClass('keyboard-selection-start')
            next.addClass('keyboard-active').addClass('keyboard-selection-start')
            @scrollLineSelectionIntoView(next)
          else
            selection.siblings().removeClass('keyboard-active').removeClass('keyboard-selection-start')
            selection.addClass('keyboard-active').addClass('keyboard-selection-start')
        else
          @switchDiffSelectionMode()

  moveDiffSelectionUp: ->
    $(@diffsNode).find('tr.active').removeClass('active')
    switch @diffSelectionMode
      when 'hunk'
        activeHunk = $(@diffsNode).find('tr.selected:first').closest('.diff-hunk')
        if activeHunk.length
          prev = activeHunk.prev('.diff-hunk')
          if prev.length
            @clearLineSelections()
            @clearLineStartReferences()
            prev.find('tr.addition, tr.deletion').addClass('selected')
            @scrollLineSelectionIntoView(prev)
        else
          @selectFirstHunk()
      when 'line'
        selection = $(@diffsNode).find('.keyboard-active:first')
        if selection.length
          prev = selection.prevAll('tr.addition, tr.deletion').first()
          if prev.length
            prev.siblings().removeClass('keyboard-active').removeClass('keyboard-selection-start')
            prev.addClass('keyboard-active').addClass('keyboard-selection-start')
            @scrollLineSelectionIntoView(prev)
          else
            selection.siblings().removeClass('keyboard-active').removeClass('keyboard-selection-start')
            selection.addClass('keyboard-active').addClass('keyboard-selection-start')
        else
          @switchDiffSelectionMode()

  expandDiffSelectionUp: ->
    return unless @diffSelectionMode == 'line'
    $(@diffsNode).find('tr.active').removeClass('active')
    start = $(@diffsNode).find('tr.keyboard-selection-start')
    lastActive = $(@diffsNode).find('tr.keyboard-active:last')
    if lastActive.hasClass('keyboard-selection-start')
      prev = $(@diffsNode).find('.keyboard-active:first').prevAll('tr.addition, tr.deletion').first()
      prev.addClass('keyboard-active') if prev.length
    else
      lastActive.removeClass('keyboard-active')

  expandDiffSelectionDown: ->
    return unless @diffSelectionMode == 'line'
    $(@diffsNode).find('tr.active').removeClass('active')
    start = $(@diffsNode).find('tr.keyboard-selection-start')
    firstActive = $(@diffsNode).find('tr.keyboard-active:first')
    if firstActive.hasClass('keyboard-selection-start')
      next = $(@diffsNode).find('.keyboard-active:last').nextAll('tr.addition, tr.deletion').first()
      next.addClass('keyboard-active') if next.length
    else
      firstActive.removeClass('keyboard-active')

  switchDiffSelectionMode: ->
    $(@diffsNode).find('tr.active').removeClass('active')
    switch @diffSelectionMode
      when 'hunk'
        @diffSelectionMode = 'line'
        activeHunk = $(@diffsNode).find('tr.selected:first').closest('.diff-hunk')
        @clearLineSelections()
        @clearLineStartReferences()
        activeHunk.find('tr.addition, tr.deletion').first().addClass('keyboard-active').addClass('keyboard-selection-start')
      when 'line'
        @diffSelectionMode = 'hunk'
        activeHunk = $(@diffsNode).find('tr.keyboard-active:first').closest('.diff-hunk')
        @clearLineSelections()
        @clearLineStartReferences()
        activeHunk.find('tr.addition, tr.deletion').addClass('selected')

  processHunkStage: (el, status) ->
    patchView = $(el).closest('patch-view')
    patchView.find('tr.addition, tr.deletion').addClass('selected')
    patchView.get(0).processLinesStage(el, status)

  processLinesStage: (el, status) ->
    patchView = $(el).closest('patch-view')
    patchView.get(0).processLinesStage(el, status)

  registerCurrentKeyboardPosition: (el) ->
    @currentHunkIndex = el.dataset['hunkIndex']
    @currentHunkPath = @selectedPath
    @currentHunkState = @selectedState

module.exports = document.registerElement 'git-experiment-changes-view', prototype: ChangesView.prototype
