shell = require 'shell'
fs = require 'fs'
path = require 'path'

module.exports = class FileSummary
  constructor: ({@file, @status, @icon, @gitIndex}) ->
    # We pass around one instance of GitIndex for all view-models.

  getIconClass: ->
    bit = @file.statusBit()
    codes = @gitIndex.statusCodes()

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
      @gitIndex.stagePath(@file.path())
    else
      @gitIndex.unstagePath(@file.path())

    promise.then =>
      @gitIndex.emit('did-update-repository')

  getPathInfo: ->
    pathParts = @file.path().split(path.sep)
    filename  = pathParts.pop()
    dir       = pathParts.join(path.sep)
    dir      += path.sep if dir
    # TODO: This should probably return an object with descriptive keys.
    [dir, filename]

  path: ->
    @file.path()

  localPath: ->
    "#{@gitIndex.repoPath}#{path.sep}#{@path()}"

  exists: ->

  discard: ->
    shell.moveItemToTrash(localPath()) if @exists() # XXX where was this originally defined
    @gitIndex.forceCheckoutPath(path())

  open: ->
    console.log 'open', @path()
    atom.workspace.open(@path()) if @exists()

  openDiff: ->
    console.log 'open diff', @path()
    atom.workspace.open('atom://git/diff/' + @path())
