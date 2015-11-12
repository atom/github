shell = require 'shell'
fs = require 'fs'
path = require 'path'
GitService = require('./git-service')

module.exports = class FileSummary
  constructor: ({@status, @icon}) ->
    @gitService = GitService.instance()
    @pathName = @status.path()

  getPathName: -> @pathName

  getFileName: -> path.basename(@pathName)

  getIconClass: ->
    bit = @status.statusBit()
    codes = @gitService.statusCodes()

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
      @gitService.stagePath(@status.path())
    else
      @gitService.unstagePath(@status.path())

    promise.then =>
      @gitService.emit('did-update-repository')

  localPath: ->
    "#{@gitService.repoPath}#{path.sep}#{@path()}"

  exists: ->

  discard: ->
    shell.moveItemToTrash(localPath()) if @exists() # XXX where was this originally defined
    @gitService.forceCheckoutPath(path())

  isUnstaged: (status) ->
    bit = @status.statusBit()
    codes = @gitService.statusCodes()

    return bit & codes.WT_NEW ||
           bit & codes.WT_MODIFIED ||
           bit & codes.WT_DELETED ||
           bit & codes.WT_RENAMED ||
           bit & codes.WT_TYPECHANGE

  isStaged: ->
    bit = @status.statusBit()
    codes = @gitService.statusCodes()

    return bit & codes.INDEX_NEW ||
           bit & codes.INDEX_MODIFIED ||
           bit & codes.INDEX_DELETED ||
           bit & codes.INDEX_RENAMED ||
           bit & codes.INDEX_TYPECHANGE

  # Maybe move out of this class

  open: ->
    console.log 'open', @path()
    atom.workspace.open(@path()) if @exists()

  openDiff: ->
    console.log 'open diff', @path()
    atom.workspace.open('atom://git/diff/' + @path())
