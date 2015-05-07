path = require 'path'
fs = require 'fs'
Git = require 'nodegit'

describe 'View and Commit Changes', ->
  workspaceElement = null
  projectPath = null

  beforeEach ->
    workspaceElement = atom.views.getView(atom.workspace)
    projectPath = path.join(__dirname, '../fixtures/a')
    atom.project.setPaths([projectPath])
    waitsForPromise ->
      atom.packages.activatePackage('git')

  afterEach ->
    console.log "after"
    Reset = Git.Reset
    repository = null
    console.log "projectPath", projectPath
    Git.Repository.open(projectPath).then (repo) ->
      repository = repo
      repo.head()
    .then (reference) ->
      repository.getBranchCommit(reference.toString())
    .then (commit) ->
      Reset.reset(repository, commit, Reset.TYPE.HARD)

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
