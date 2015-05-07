path = require 'path'
fs = require 'fs'
Git = require 'nodegit'
$ = require 'jquery'


describe 'View and Commit Changes', ->
  workspaceElement = null
  projectPath = null

  beforeEach ->
    workspaceElement = atom.views.getView(atom.workspace)
    jasmine.attachToDOM(workspaceElement)
    projectPath = path.join(__dirname, '../fixtures/a')
    atom.project.setPaths([projectPath])
    waitsForPromise ->
      atom.packages.activatePackage('git')

  afterEach ->
    Reset = Git.Reset
    repository = null

    Git.Repository.open(projectPath).then (repo) ->
      repository = repo
      repo.head()
    .then (reference) ->
      repository.getBranchCommit(reference.toString())
    .then (commit) ->
      Reset.reset(repository, commit, Reset.TYPE.HARD)

  dispatchCommand = (command='view-and-commit-changes') ->
    commandText = "git:#{command}"
    atom.commands.dispatch(workspaceElement, commandText)

  makeChange = ->
    projectPath = path.join(__dirname, '../fixtures/a')
    fs.writeFileSync(path.join(projectPath, 'foo.md'), 'some more text')

  describe 'editing an existing file', ->
    it 'Shows the change in the changes list', ->
      makeChange()
      dispatchCommand()

      waitsFor "status list to populate", ->
        wrapper = workspaceElement.querySelector('git-changes-view .unstaged.files')
        wrapper? and (wrapper.innerHTML.indexOf('foo.md') isnt -1)

      runs ->
        expect(workspaceElement.querySelector('.unstaged.files').innerHTML).toContain('foo.md')

  fdescribe 'keyboard navigation', ->
    it 'focuses a hunk when the status list is focused and the right arrow key is pressed', ->
      makeChange()
      dispatchCommand()
      waitsFor 'the changes element to be displayed', ->
        workspaceElement.querySelector('git-changes-view')?

      statusList = null
      runs ->
        statusList = document.querySelector('git-status-list-view')
        statusList.focus()

      waitsFor 'the highlight to be applied', ->
        $(workspaceElement).find('git-file-summary-element.selected').length > 0

      runs ->
        atom.commands.dispatch(statusList, 'core:move-right')
        expect($('git-diff-view:focus').length).toBe(1)

    it 'focuses the status list when a hunk is selected and the left arrow key is pressed', ->
      makeChange()
      dispatchCommand()

      waitsFor 'the changes element to be displayed', ->
        workspaceElement.querySelector('git-changes-view')?

      runs ->
        diffView = document.querySelector('git-diff-view')
      #   diffView.focus()
      #   atom.commands.dispatch(diffView, 'core:move-left')
      #
      # waitsFor 'the status list view to be focused', ->
      #   $('git-status-list-view:focus').length > 0
      #
      # runs ->
      #   expect($('git-status-list-view:focus').length).toBe(1)
