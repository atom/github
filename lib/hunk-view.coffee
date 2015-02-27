$          = require 'jquery'
GitChanges = require './git-changes'

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

    @el.on 'click', '.btn-stage-lines', @processLinesStage.bind(@)
    @el.on 'click', '.btn-stage-hunk', @processHunkStage.bind(@)

    @git = new GitChanges

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

    for line in @allLines()
      lineNumber = line.dataset.lineIndex
      contentNode = line.querySelector('.diff-hunk-data')

      if line.classList.contains('deletion')
        highlighted = @oldSourceLines[line.dataset.oldIndex]?.innerHTML
        contentNode.innerHTML = "-#{highlighted}" if highlighted
      else
        origin = if line.classList.contains('addition') then "+" else " "
        highlighted = @newSourceLines[line.dataset.newIndex]?.innerHTML
        contentNode.innerHTML = "#{origin}#{highlighted}" if highlighted

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
      lineOrigin            = String.fromCharCode(line.origin())
      oldLineNumber         = lineNode.querySelector('.old-line-number')
      newLineNumber         = lineNode.querySelector('.new-line-number')

      dataNode              = lineNode.querySelector('.diff-hunk-data')
      dataNode.dataset.path = @patch.newFile().path()
      oldLine               = line.oldLineno()
      newLine               = line.newLineno()

      lineNode.dataset.oldIndex = oldLine - 1
      lineNode.dataset.newIndex = newLine - 1

      dataNode.textContent = lineOrigin + content

      switch lineOrigin
        when '-'
          lineNode.classList.add('deletion')
        when '+'
          lineNode.classList.add('addition')

      oldLineNumber.textContent = oldLine if oldLine > 0
      newLineNumber.textContent = newLine if newLine > 0
      lineNode.dataset.lineIndex = lineIndex

      if @status and (lineOrigin == '-' or lineOrigin == '+')
        dataNode.appendChild(@stageButton('line'))

      @hunkNode.appendChild(lineNode)

  allLines: ->
    @querySelectorAll('.diff-hunk-line[data-line-index]')

  allChangedLines: ->
    @querySelectorAll('.diff-hunk-line.addition, .diff-hunk-line.deletion')

  selectedLines: ->
    @querySelectorAll('.diff-hunk-line.selected')

  processHunkStage: ->
    for line in @allChangedLines()
      line.classList.add('selected')

    @processLinesStage()

  processLinesStage: ->
    action = if @status == 'unstaged' then 'stage' else 'unstage'
    path = @patch.newFile().path()

    totalChanges = @allChangedLines().length
    totalSelections = @selectedLines().length

    allStaged = totalChanges == totalSelections

    oldFile = if @patch.isAdded() and allStaged
      "/dev/null"
    else
      "a/#{@patch.oldFile().path()}"

    newFile = if @patch.isDeleted() and allStaged
      "/dev/null"
    else
      "b/#{@patch.newFile().path()}"

    fileInfo = "--- #{oldFile}\n"
    fileInfo += "+++ #{newFile}\n"

    header = @hunk.header()
    headerParts =
      header.match(/^@@ \-([0-9]+),?([0-9]+)? \+([0-9]+),?([0-9]+)? @@(.*)/)

    oldStart = headerParts[1]
    oldCount = 0
    newStart = headerParts[3]
    newCount = 0
    context  = headerParts[5]

    lines = []

    for line, idx in @hunk.lines()
      selected =
        @querySelector(".diff-hunk-line.selected[data-line-index='#{idx}']")

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

    header =
      "@@ -#{oldStart},#{oldCount} +#{newStart},#{newCount} @@#{context}\n"

    patch = "#{fileInfo}#{header}#{lines.join("\n")}\n"

    @git.stagePatch(patch, action).then =>
      @base.trigger('index-updated')

module.exports = document.registerElement 'git-experiment-hunk-view',
  prototype: HunkView.prototype
