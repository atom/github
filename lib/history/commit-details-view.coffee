$                = require 'jquery'
GitHistory       = require './git-history'
CommitHeaderView = require './commit-header-view'
# XXX this should be replaced with patch-element
PatchView        = require '../patch/patch-view'
_                = require 'underscore-contrib'

{CompositeDisposable} = require 'atom'

DefaultFontFamily = "Inconsolata, Monaco, Consolas, 'Courier New', Courier"
DefaultFontSize = 14

class CommitDetailsView extends HTMLElement
  createdCallback: ->
    @el        = $(@)
    @tabIndex  = -1
    @viewCache = {}

    @setFont()
    @git = new GitHistory
    @disposables = new CompositeDisposable

  attachedCallback: ->
    @base = @el.closest('.git-root-view')
    @handleEvents()

  handleEvents: ->
    @base.on 'focus-commit-details', @focus.bind(@)
    @base.on 'render-commit', @renderCommit.bind(@)

    @disposables.add atom.config.onDidChange 'editor.fontFamily', @setFont.bind(@)
    @disposables.add atom.config.onDidChange 'editor.fontSize', @setFont.bind(@)

    @disposables.add atom.commands.add 'git-commit-details-view',
      'git:focus-commit-list':  @focusCommitList

  detatchedCallback: ->
    @base.off 'focus-commit-details'
    @base.off 'render-commit'

    @disposables.dispose()

  focusCommitList: ->
    @base.trigger('focus-commit-list')

  setFont: ->
    fontFamily = atom.config.get('editor.fontFamily') or DefaultFontFamily
    fontSize   = atom.config.get('editor.fontSize') or DefaultFontSize
    @style.fontFamily = fontFamily
    @style.fontSize   = "#{fontSize}px"

  renderCommit: (e, sha) ->
    if view = @viewCache[sha]
      unless view.isSameNode(@firstElementChild)
        @innerHTML = ''
        @appendChild(view)
        @scrollTop = 0
    else
      @innerHTML = ''
      @createCommitView(sha)

  getCommitView: (sha) ->
    new Promise (resolve, reject) ->


  createCommitView: (sha) ->
    commitNode = document.createElement('div')
    @appendChild(commitNode)
    @viewCache[sha] = commitNode
    @git.getCommit(sha)
    .then (commit) =>
      @commit = commit
      header = new CommitHeaderView
      header.setCommit(@commit)
      commitNode.appendChild(header)
      @git.getDiff(sha)
    .then (diff) =>
      window.actionTimestamp = actionTimestamp = Date.now()
      chunkSize = 5
      promise = Promise.resolve()
      _.chunkAll(diff.patches(), chunkSize).forEach (patches) =>
        promise = promise.then => new Promise (resolve) =>
          return unless actionTimestamp == window.actionTimestamp
          setImmediate =>
            patches.forEach (patch) =>
              patchView = new PatchView
              patchView.setPatch
                patch: patch
                commit: @commit
              commitNode.appendChild(patchView)

            resolve()

module.exports = document.registerElement 'git-commit-details-view',
  prototype: CommitDetailsView.prototype
