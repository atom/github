class HistoryView extends HTMLElement
  createdCallback: ->

module.exports = document.registerElement 'git-experiment-history-view',
  prototype: HistoryView.prototype
