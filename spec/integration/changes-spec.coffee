path = require 'path'
fs = require 'fs'

describe 'View and Commit Changes', ->
  workspaceElement = null

  beforeEach ->
    workspaceElement = atom.views.getView(atom.workspace)
    projectPath = path.join(__dirname, '../fixtures/a')
    atom.project.setPaths([projectPath])
    waitsForPromise ->
      atom.packages.activatePackage('git')

  dispatchCommand = (command) ->
    commandText = "git:#{command}"
    atom.commands.dispatch(workspaceElement, commandText)

  describe 'editing an existing file', ->
    it 'Shows the change in the changes list', ->
      projectPath = path.join(__dirname, '../fixtures/a')
      fs.writeFileSync(path.join(projectPath, 'foo.md'), 'some more text')
      dispatchCommand('view-and-commit-changes')

      waitsFor "changes view to open", ->
        workspaceElement.querySelector('git-changes-view')?

      runs ->
        expect(workspaceElement.querySelector('.unstaged.files').innerHTML).toContain('foo.md')
