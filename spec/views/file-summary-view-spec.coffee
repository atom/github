FileSummaryView = require '../../lib/changes/file-summary-view.coffee'
GitChanges = require '../../lib/changes/git-changes.coffee'

fdescribe 'FileSummaryView', ->
  it 'displays the filename', ->
    view = new FileSummaryView
    view.initialize
      file:
        path: -> '/test/file.md'
        statusBit: -> (new GitChanges).statusCodes().WT_NEW
      status: 'unstaged'

    expect(view.filenameNode.textContent).toEqual('file.md')
