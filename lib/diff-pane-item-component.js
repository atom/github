/** @babel */
/** @jsx etch.dom */

import etch from 'etch'
import DiffComponent from './diff-component'

export default class DiffPaneItemComponent {
  constructor ({diffViewModel}) {
    this.diffViewModel = diffViewModel
    etch.createElement(this)

    this.element.addEventListener('focus', () => this.refs.diffComponent.focus())
  }

  render () {
    return (
      <div className="pane-item" tabIndex="-1">{
        <DiffComponent ref="diffComponent" diffViewModel={this.diffViewModel}/>
      }</div>
    )
  }
}
