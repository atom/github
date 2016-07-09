/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

import FilePatchView from '../views/file-patch-view'

export default class FilePatchController {
  constructor (props) {
    this.props = props
    etch.initialize(this)
  }

  update (props) {
    this.props = props
    return etch.update(this)
  }

  render () {
    return (
      <FilePatchView
        applyPatchToIndex={this.applyPatchToIndex}

    )
  }
}
