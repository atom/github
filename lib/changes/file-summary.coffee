GitChanges = require './git-changes'
Model = require '../model'

module.exports = class FileSummary extends Model
  constructor: ({@file, @status, @icon}) ->
    @git = new GitChanges

  iconClass: ->
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

  buttonText: ->
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
      atom.emit('did-update-git-repository')

  pathInfo: ->
    pathParts = @file.path().split("/")
    filename  = pathParts.pop()
    dir       = pathParts.join('/')
    dir      += "/" if dir
    [dir, filename]
