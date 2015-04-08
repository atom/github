GitChanges = require './git-changes'

module.exports = class FileSummary
  constructor: ({@file, @status, @icon, @git}) ->
    # We pass around one instance of GitChanges for all view-models.

  getIconClass: ->
    bit = @file.statusBit()
    codes = @git.statusCodes()

    if @status == 'unstaged'
      className = if bit & codes.WT_NEW
        'added'
      else if bit & codes.WT_RENAMED
        'renamed'
      else if bit & codes.WT_DELETED
        'removed'
      else
        'modified'
    else
      className = if bit & codes.INDEX_NEW
        'added'
      else if bit & codes.INDEX_RENAMED
        'renamed'
      else if bit & codes.INDEX_DELETED
        'removed'
      else
        'modified'

  getButtonText: ->
    if @status == "staged"
      "Unstage"
    else
      "Stage"

  stage: ->
    promise = if @status == 'unstaged'
      @git.stagePath(@file.path())
    else
      @git.unstagePath(@file.path())

    promise.then =>
      @git.emit('did-update-repository')

  getPathInfo: ->
    pathParts = @file.path().split("/")
    filename  = pathParts.pop()
    dir       = pathParts.join('/')
    dir      += "/" if dir
    [dir, filename]
