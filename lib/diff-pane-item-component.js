/** @babel */
/** @jsx etch.dom */

import etch from 'etch'
import DiffComponent from './diff-component'

export default class DiffPaneItemComponent {
  constructor ({diffViewModel}) {
    this.diffViewModel = diffViewModel
    etch.createElement(this)
  }

  render () {
    return (
      <div className="pane-item" tabIndex="-1">{
        <DiffComponent diffViewModel={this.diffViewModel}/>
      }</div>
    )
  }
}
