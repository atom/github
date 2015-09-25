$          = require 'jquery'
GitIndex = require '../changes/git-changes'

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
    @base = @el.closest('.git-root-view')

    @git = new GitIndex

  createLineNode: ->
    lineNode = document.createElement('div')
    lineNode.innerHTML = PatchLineTemplateString
    lineNode.classList.add('hunk-line')
    lineNode

  stageButton: (text) ->
    button = document.createElement('button')
    button.classList.add("btn")
    button.classList.add("btn-xs")
    button.classList.add("btn-stage-#{text}")
    action = if @status == 'unstaged' then 'Stage' else 'Unstage'
    button.textContent = "#{action} #{text}"
    button

  setHighlightedSource: ({oldSource, newSource}) ->
    @oldSourceLines = oldSource.find('div.line')
    @newSourceLines = newSource.find('div.line')

    for line in @allLines()
      lineNumber = line.dataset.lineIndex
      contentNode = line.querySelector('.syntax-node')

      if line.classList.contains('deletion')
        highlighted = @oldSourceLines[line.dataset.oldIndex]?.innerHTML
      else
        highlighted = @newSourceLines[line.dataset.newIndex]?.innerHTML

      contentNode.innerHTML = highlighted if highlighted

  setHunk: (@patch, @index, @status) ->
    @hunk = null
    @patch.hunks().then (hunks) =>
      @hunk = hunks[@index]
      @_setHunk()

  _setHunk: ->
    header = @hunk.header()
    headerNode = @createLineNode()
    headerNode.classList.add('diff-hunk-header')
    headerDataNode = headerNode.querySelector('.diff-hunk-data')
    headerDataNode.textContent = header
    headerDataNode.appendChild(@stageButton('hunk')) if @status
    @hunkNode.appendChild(headerNode)

    {oldStart, newStart} = @parseHeader(header)

    oldLine = oldStart
    newLine = newStart

    for line, lineIndex in @hunk.lines()
      lineNode              = @createLineNode()
      content               = line.content().split(/[\r\n]/g)[0] # srsly.
      contentNode           = document.createElement('span')
      lineOrigin            = String.fromCharCode(line.origin())
      oldLineNumber         = lineNode.querySelector('.old-line-number')
      newLineNumber         = lineNode.querySelector('.new-line-number')

      dataNode              = lineNode.querySelector('.diff-hunk-data')
      dataNode.dataset.path = @patch.newFile().path()
      oldLine               = line.oldLineno() if line.oldLineno() > 0
      newLine               = line.newLineno() if line.newLineno() > 0

      lineNode.dataset.oldIndex = oldLine - 1
      lineNode.dataset.newIndex = newLine - 1

      contentNode.classList.add('syntax-node')
      dataNode.textContent = lineOrigin
      contentNode.textContent = content
      dataNode.appendChild(contentNode)

      switch lineOrigin
        when '-'
          lineNode.classList.add('deletion')
        when '+'
          lineNode.classList.add('addition')

      oldLineNumber.textContent = oldLine if line.oldLineno() > 0
      newLineNumber.textContent = newLine if line.newLineno() > 0
      lineNode.dataset.lineIndex = lineIndex

      if @status and (lineOrigin == '-' or lineOrigin == '+')
        dataNode.appendChild(@stageButton('lines'))

      @hunkNode.appendChild(lineNode)

  allLines: ->
    @querySelectorAll('.hunk-line[data-line-index]')

  allChangedLines: ->
    @querySelectorAll('.hunk-line.addition, .hunk-line.deletion')

  activeLine: ->
    @querySelector('.hunk-line.selected, .hunk-line.keyboard-active')

  selectedLines: ->
    @querySelectorAll('.hunk-line.selected')

  selectAllChangedLines: ->
    for line in @allChangedLines()
      line.classList.add('selected')

  unselectAllChangedLines: ->
    for line in @allChangedLines()
      line.classList.remove('selected')

  parseHeader: (header) ->
    headerParts =
      header.match(/^@@ \-([0-9]+),?([0-9]+)? \+([0-9]+),?([0-9]+)? @@(.*)/)
    return false unless headerParts

    data =
      oldStart: headerParts[1]
      oldCount: headerParts[2]
      newStart: headerParts[3]
      newCount: headerParts[4]
      context:  headerParts[5]

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

    {oldStart, context} = @parseHeader(header)
    newStart = oldStart
    oldCount = newCount = 0

    lines = []

    for line, idx in @hunk.lines()
      selected =
        @querySelector(".hunk-line.selected[data-line-index='#{idx}']")

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

    oldStart = 1 if oldCount > 0 and oldStart == '0'
    newStart = 1 if newCount > 0 and newStart == '0'

    header =
      "@@ -#{oldStart},#{oldCount} +#{newStart},#{newCount} @@#{context}\n"

    patch = "#{header}#{lines.join("\n")}\n"

    promise = if @status == 'unstaged'
      @git.stagePatch(patch, @patch)
    else
      @git.unstagePatch(patch, @patch)

    promise.then ->
      atom.emit('did-update-git-repository')

module.exports = document.registerElement 'git-hunk-view',
  prototype: HunkView.prototype
