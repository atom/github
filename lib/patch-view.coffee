TemplateHelper = require './template-helper'
$ = require 'jquery'

PatchTemplateString = """
  <div class="diff-file"></div>
  <div class="diff-hunks"></div>
"""

PatchHunkTemplateString = """
  <table class="diff-hunk"></table>
"""

PatchLineTemplateString = """
  <tr class="diff-hunk-line">
    <td class="old-line-number"></td>
    <td class="new-line-number"></td>
    <td class="diff-hunk-data"></td>
  </tr>
"""

PatchStageHunkButtonString = """
  <button class="btn btn-xs btn-stage-hunk">Stage Hunk</button>
"""

PatchUnstageHunkButtonString = """
  <button class="btn btn-xs btn-unstage-hunk">Unstage Hunk</button>
"""

PatchStageLinesButtonString = """
  <button class="btn btn-xs btn-stage-lines">Stage Lines</button>
"""

PatchUnstageLinesButtonString = """
  <button class="btn btn-xs btn-unstage-lines">Unstage Lines</button>
"""

class PatchView extends HTMLElement
  @lineTemplate: TemplateHelper.addTemplate(document.body, PatchLineTemplateString)
  @hunkTemplate: TemplateHelper.addTemplate(document.body, PatchHunkTemplateString)
  @stageHunkTemplate: TemplateHelper.addTemplate(document.body, PatchStageHunkButtonString)
  @unstageHunkTemplate: TemplateHelper.addTemplate(document.body, PatchUnstageHunkButtonString)
  @stageLinesTemplate: TemplateHelper.addTemplate(document.body, PatchStageLinesButtonString)
  @unstageLinesTemplate: TemplateHelper.addTemplate(document.body, PatchUnstageLinesButtonString)

  @keyboardSelectionMode: 'hunk'
  @dragging: false

  setPatch: (@patch, @changesView, @status) ->
    @innerHTML = PatchTemplateString
    fileNode = @querySelector('.diff-file')
    hunksNode = @querySelector('.diff-hunks')

    fileNode.textContent = @patch.newFile().path()
    for hunk, idx in @patch.hunks()
      hunkIndex = idx
      hunkNode = TemplateHelper.renderTemplate(PatchView.hunkTemplate)
      hunkTableNode = hunkNode.querySelector('.diff-hunk')

      hunkHeaderNode = TemplateHelper.renderTemplate(PatchView.lineTemplate)
      hunkHeaderNode.firstElementChild.classList.add('diff-hunk-header')
      hunkHeaderNode.firstElementChild.dataset['hunkIndex'] = hunkIndex
      hunkHeaderNode.querySelector('.diff-hunk-data').textContent = hunk.header()
      if @status
        stageHunkNode = if @status == 'unstaged'
          TemplateHelper.renderTemplate(PatchView.stageHunkTemplate)
        else
          TemplateHelper.renderTemplate(PatchView.unstageHunkTemplate)

        hunkHeaderNode.querySelector('.diff-hunk-data').appendChild stageHunkNode

      hunkTableNode.appendChild(hunkHeaderNode)
      hunkTableNode.dataset['hunkStatus'] = @status
      hunkTableNode.dataset['hunkIndex'] = hunkIndex

      for line, lineIndex in hunk.lines()
        hunkLineNode = TemplateHelper.renderTemplate(PatchView.lineTemplate)
        content = line.content().split(/[\r\n]/g)[0] # srsly.
        lineOrigin = String.fromCharCode(line.origin())

        switch lineOrigin
          when '-' then hunkLineNode.firstElementChild.classList.add('deletion')
          when '+' then hunkLineNode.firstElementChild.classList.add('addition')

        hunkDataNode = hunkLineNode.querySelector('.diff-hunk-data')
        hunkDataNode.textContent = lineOrigin + content
        hunkLineNode.querySelector('.old-line-number').textContent = line.oldLineno() if line.oldLineno() > 0
        hunkLineNode.querySelector('.new-line-number').textContent = line.newLineno() if line.newLineno() > 0
        hunkLineNode.firstElementChild.dataset['hunkIndex'] = hunkIndex
        hunkLineNode.firstElementChild.dataset['lineIndex'] = lineIndex
        hunkDataNode.dataset['path'] = @patch.newFile().path()

        if @status and (lineOrigin == '-' or lineOrigin == '+')
          lineHunkNode = if @status == 'unstaged'
            TemplateHelper.renderTemplate(PatchView.stageLinesTemplate)
          else
            TemplateHelper.renderTemplate(PatchView.unstageLinesTemplate)

          hunkDataNode.appendChild lineHunkNode

        hunkTableNode.appendChild(hunkLineNode)

      hunksNode.appendChild(hunkNode)

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

module.exports = document.registerElement 'patch-view', prototype: PatchView.prototype
