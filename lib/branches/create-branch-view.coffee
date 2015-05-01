$ = require 'jquery'
GitIndex = require '../changes/git-changes'

BaseTemplate = """
<div>
  <span>New branch name</span>
  <atom-text-editor mini></atom-text-editor>
</div>
<div>
  <span>Branch from</span>
  <select class="form-control"></select>
</div>
"""

class CreateBranchView extends HTMLElement
  createdCallback: ->
    @el = $(@)
    @tabIndex = -1
    @innerHTML = BaseTemplate

    @nameNode = @querySelector('atom-text-editor')
    @nameModel = @nameNode.getModel()
    @fromNode = @querySelector('select')

    @boundFocus = @detectFocus.bind(@)
    @git = new GitIndex

  toggle: ->
    if @panel?.isVisible()
      @cancel()
    else
      @attach()

  attach: ->
    @updateBranches().then =>
      @nameModel.setText('')
      @panel = atom.workspace.addModalPanel(item: this)
      @focus()
      @nameNode.focus()
      atom.commands.add this,
        'core:confirm': => @createBranch()
        'core:cancel': => @cancel()
      $(document).on 'focusin', @boundFocus

  updateBranches: ->
    @fromNode.innerHTML = ''
    @git.localBranches().then (branches) =>
      for branch in branches
        option = document.createElement('option')
        option.textContent = branch.name
        option.selected = 'selected' if branch.name is 'master'
        @fromNode.appendChild option

  close: ->
    panelToDestroy = @panel
    @panel = null
    panelToDestroy?.destroy()
    atom.workspace.getActivePane().activate()
    $(document).off 'focusin', @boundFocus

  detectFocus: (e) ->
    @close() unless @contains(e.target)

  cancel: ->
    @close()

  newBranchName: ->
    @git.normalizeBranchName(@nameModel.getText())

  branchFrom: ->
    index = @fromNode.selectedIndex
    @fromNode.options[index].value

  createBranch: ->
    name = @newBranchName()
    from = @branchFrom()

    @git.createBranch({name: name, from: from}).then =>
      atom.emit 'did-update-git-repository'
      @cancel()

module.exports = document.registerElement 'git-create-branch-view',
  prototype: CreateBranchView.prototype
