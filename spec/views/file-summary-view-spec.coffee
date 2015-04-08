FileSummaryView = require '../../lib/changes/file-summary-view.coffee'
FileSummary = require '../../lib/changes/file-summary.coffee'
GitChanges = require '../../lib/changes/git-changes.coffee'

fdescribe 'FileSummaryView', ->
  beforeEach ->
    @view = new FileSummaryView
    model = new FileSummary(
      file:
        path: -> '/test/file.md'
        statusBit: -> (new GitChanges).statusCodes().WT_NEW
      status: 'unstaged'
      )

    @view.initialize(model)

  it 'displays the filename', ->
    expect(@view.filenameNode.textContent).toEqual('file.md')

  it 'shows the correct icon', ->
    expect(@view.iconNode.classList.contains('status-added')).toBe(true)

  it 'updates the filename on change', ->
    @view.model.file =
      path: -> '/test/new-file-name.md'
      statusBit: => @view.model.git.statusCodes().WT_NEW

    waitsFor ->
      @view.filenameNode.textContent != 'file.md'
    runs ->
      expect(@view.filenameNode.textContent).toEqual('new-file-name.md')
