/** @babel */

import React from 'react'

// TODO: updates, unmount
export default class StatusBar extends React.Component {
  static propTypes = {
    statusBar: React.PropTypes.object,
    legacy: React.PropTypes.bool,
  }

  componentDidMount () {
    this.consumeStatusBar(this.props)
  }

  componentDidUpdate () {
    this.consumeStatusBar(this.props)
  }

  render () {
    return <div ref={c => this.container = c}>{this.props.children}</div>
  }

  consumeStatusBar (props) {
    if (this.tile) return
    if (!props.statusBar) return

    if (!props.legacy) {
      props.statusBar.disableGitInfoTile()
    }
    const componentElement = this.container.children[0]
    this.tile = props.statusBar.addRightTile({item: componentElement, priority: -50})
  }
}
