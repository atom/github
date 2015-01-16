TemplateHelper = require './template-helper'

PatchTemplateString = """
  <div class="diff-file"></div>
  <table class="diff-hunk"></table>
"""

PatchLineTemplateString = """
  <tr class="diff-hunk-line">
    <td class="old-line-number"></td>
    <td class="new-line-number"></td>
    <td class="diff-hunk-data"></td>
  </tr>
"""

class PatchView extends HTMLElement
  @lineTemplate: TemplateHelper.addTemplate(document.body, PatchLineTemplateString)

  setPatch: (@patch) ->
    @innerHTML = PatchTemplateString
    fileNode = @querySelector('.diff-file')
    hunkNode = @querySelector('.diff-hunk')

    fileNode.textContent = @patch.newFile().path()

    for hunk in @patch.hunks()
      hunkHeaderNode = TemplateHelper.renderTemplate(PatchView.lineTemplate)
      hunkHeaderNode.firstElementChild.classList.add('diff-hunk-header')
      hunkHeaderNode.querySelector('.diff-hunk-data').textContent = hunk.header()
      hunkNode.appendChild(hunkHeaderNode)

      for line in hunk.lines()
        hunkLineNode = TemplateHelper.renderTemplate(PatchView.lineTemplate)
        content = line.content().split(/[\r\n]/g)[0] # srsly.
        lineOrigin = String.fromCharCode(line.origin())

        switch lineOrigin
          when '-' then hunkLineNode.firstElementChild.classList.add('deletion')
          when '+' then hunkLineNode.firstElementChild.classList.add('addition')

        hunkLineNode.querySelector('.diff-hunk-data').textContent = lineOrigin + content
        hunkLineNode.querySelector('.old-line-number').textContent = line.oldLineno() if line.oldLineno() > 0
        hunkLineNode.querySelector('.new-line-number').textContent = line.newLineno() if line.newLineno() > 0
        hunkNode.appendChild(hunkLineNode)

module.exports = document.registerElement 'patch-view', prototype: PatchView.prototype
