class DiffsView extends HTMLElement
  createdCallback: ->
    content = document.createElement('div')
    content.textContent = 'OMG'
    @appendChild(content)

  getTitle: ->
    'Yeah, view that diff...'

module.exports = document.registerElement 'git-experiment-diffs-view', prototype: DiffsView.prototype
