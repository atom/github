{$$, SelectListView} = require 'atom-space-pen-views'
GitIndex = require '../changes/git-changes'

module.exports =
class BranchesView extends SelectListView
  initialize: ->
    super
    @addClass('branches-list')
    @git = new GitIndex

  toggle: ->
    if @panel?.isVisible()
      @cancel()
    else
      @show()

  getFilterKey: ->
    'name'

  show: ->
    @git.localBranches()
    .then (branches) =>
      @setItems(branches)
      @panel ?= atom.workspace.addModalPanel(item: this)
      @panel.show()
      @focusFilterEditor()

  hide: ->
    @panel?.hide()

  cancelled: ->
    @hide()

  viewForItem: ({name, current, create, remote}={}) ->
    $$ ->
      @li class: 'branch', =>
        @div class: 'status', =>
          @span class: 'status-added icon icon-check' if current
          @span class: 'icon icon-cloud-download' if remote
        @span name, title: name

  confirmed: (item) ->
    promise = if item.remote
      @git.trackRemoteBranch(item.name)
    else
      @git.checkoutBranch(item.name)

    promise.then =>
      atom.emit('did-update-git-repository')
      @cancel()
    .catch =>
      console.log(error)
      @setError("Could not check out #{item.name}")

  deleteBranch: ->
    alert('are you sure?')
