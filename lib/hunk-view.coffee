$ = require 'jquery'

BaseTemplate = """
<div class="diff-hunk"></div>
"""

PatchLineTemplateString = """
  <div class="old-line-number"></div>
  <div class="new-line-number"></div>
  <div class="diff-hunk-data"></div>
"""

class HunkView extends HTMLElement
  @keyboardSelectionMode: 'hunk'
  @dragging: false

  createdCallback: ->
    @el             = $(@)
    @innerHTML      = BaseTemplate
    @hunkNode       = @querySelector('.diff-hunk')
    @newSourceLines = []
    @oldSourceLines = []

  attachedCallback: ->
    @base = @el.closest('git-experiment-repository-view')

  createLineNode: ->
    lineNode = document.createElement('div')
    lineNode.innerHTML = PatchLineTemplateString
    lineNode.classList.add('diff-hunk-line')
    lineNode

  stageButton: (text) ->
    button = document.createElement('button')
    button.classList.add("btn")
    button.classList.add("btn-xs")
    button.classList.add("btn-stage-#{text}")
    button.textContent = "Stage #{text}"
    button

  setHighlightedSource: ({oldSource, newSource}) ->
    @oldSourceLines = oldSource.find('div.line')
    @newSourceLines = newSource.find('div.line')

  setHunk: (@patch, @index, @status) ->
    @hunk = @patch.hunks()[@index]
    headerNode = @createLineNode()
    headerNode.classList.add('diff-hunk-header')
    headerDataNode = headerNode.querySelector('.diff-hunk-data')
    headerDataNode.textContent = @hunk.header()
    headerDataNode.appendChild(@stageButton('hunk')) if @status
    @hunkNode.appendChild(headerNode)

    for line, lineIndex in @hunk.lines()
      lineNode              = @createLineNode()
      content               = line.content().split(/[\r\n]/g)[0] # srsly.
      contentNode           = document.createElement('span')
      contentNode.innerHTML = content
      lineOrigin            = String.fromCharCode(line.origin())
      oldLineNumber         = lineNode.querySelector('.old-line-number')
      newLineNumber         = lineNode.querySelector('.new-line-number')

      dataNode              = lineNode.querySelector('.diff-hunk-data')
      dataNode.dataset.path = @patch.newFile().path()
      oldLine               = line.oldLineno()
      newLine               = line.newLineno()

      oldSource = @oldSourceLines[oldLine-1] or contentNode
      newSource = @newSourceLines[newLine-1] or contentNode

      switch lineOrigin
        when '-'
          lineNode.classList.add('deletion')
          dataNode.innerHTML = lineOrigin + oldSource.innerHTML
        when '+'
          lineNode.classList.add('addition')
          dataNode.innerHTML = lineOrigin + newSource.innerHTML
        when '/'
        else
          dataNode.innerHTML = lineOrigin + newSource.innerHTML

      oldLineNumber.textContent = oldLine if oldLine > 0
      newLineNumber.textContent = newLine if newLine > 0
      lineNode.dataset.lineIndex = lineIndex

      if @status and (lineOrigin == '-' or lineOrigin == '+')
        dataNode.appendChild(@stageButton('line'))

      @hunkNode.appendChild(lineNode)

  processLinesStage: (el) ->
    el = $(el).closest('.diff-hunk-line').get(0)
    hunkEl = $(el).closest('.diff-hunk')
    action = if hunkEl.get(0).dataset['hunkStatus'] == 'unstaged' then 'stage' else 'unstage'
    hunkIndex = el.dataset['hunkIndex']
    lineIndex = el.dataset['lineIndex']
    path = el.dataset['path']
    hunk = @patch.hunks()[hunkIndex]

    totalChanges = hunkEl.find('tr.addition, tr.deletion').length
    totalSelections = hunkEl.find('tr.selected').length

    allStaged = totalChanges == totalSelections

    oldFile = if @patch.isAdded() and allStaged then "/dev/null" else "a/#{@patch.oldFile().path()}"
    newFile = if @patch.isDeleted() and allStaged then "/dev/null" else "b/#{@patch.newFile().path()}"

    fileInfo = "--- #{oldFile}\n"
    fileInfo += "+++ #{newFile}\n"

    header = hunk.header()
    headerParts = header.match(/^@@ \-([0-9]+),?([0-9]+)? \+([0-9]+),?([0-9]+)? @@(.*)/)

    oldStart = headerParts[1]
    oldCount = 0
    newStart = headerParts[3]
    newCount = 0
    context = headerParts[5]

    lines = []

    for line, idx in hunk.lines()
      selected = hunkEl.find("tr[data-line-index=#{idx}]").hasClass('selected')
      origin = String.fromCharCode(line.origin())
      content = line.content().split(/[\r\n]/g)[0]
      switch origin
        when ' '
          oldCount++
          newCount++
          lines.push "#{origin}#{content}"
        when '+'
          if selected
            newCount++
            lines.push "#{origin}#{content}"
          else if action == 'unstage'
            oldCount++
            newCount++
            lines.push " #{content}"
        when '-'
          if selected
            oldCount++
            lines.push "#{origin}#{content}"
          else if action == 'stage'
            oldCount++
            newCount++
            lines.push " #{content}"

    header = "@@ -#{oldStart},#{oldCount} +#{newStart},#{newCount} @@#{context}\n"

    patch = "#{fileInfo}#{header}#{lines.join("\n")}\n"

    @changesView.changes.stagePatch(patch, action).then =>
      @changesView.renderChanges()

module.exports = document.registerElement 'git-experiment-hunk-view',
  prototype: HunkView.prototype
