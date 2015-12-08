"use babel"

let etch = require('etch')

/** @jsx etch.dom */

export default class DiffComponent {
  constructor ({diffViewModel}) {
    this.diffViewModel = diffViewModel
    etch.createElement(this)
  }

  render () {
    return (
      <div className="pane-item" tabIndex="-1">
        A DIFF
      </div>
    )
  }
}
