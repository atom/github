FileSummaryElement = require '../../lib/changes/file-summary-element.coffee'
FileSummary = require '../../lib/changes/file-summary.coffee'
GitIndex = require '../../lib/changes/git-changes.coffee'

describe 'FileSummaryElement', ->
  beforeEach ->
    @view = new FileSummaryElement
    model = new FileSummary
      file:
        path: -> '/test/file.md'
        statusBit: -> (new GitIndex).statusCodes().WT_NEW
      status: 'unstaged',
      gitIndex: new GitIndex

    @view.initialize(model: model)

  it 'displays the filename', ->
    expect(@view.filenameNode.textContent).toEqual('file.md')

  it 'shows the correct icon', ->
    expect(@view.iconNode.classList.contains('status-added')).toBe(true)

  it 'updates the filename on change', ->
    @view.model.file =
      path: -> '/test/new-file-name.md'
      statusBit: => @view.model.gitIndex.statusCodes().WT_NEW

    waitsFor ->
      @view.filenameNode.textContent != 'file.md'
    runs ->
      expect(@view.filenameNode.textContent).toEqual('new-file-name.md')
