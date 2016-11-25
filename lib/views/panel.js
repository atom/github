/** @babel */

import React from 'react'

import Portal from './portal'

/**
 * `Panel` renders a React component into an Atom panel. Specify the
 * location via the `location` prop, and any additional options to the
 * `addXPanel` method in the `options` prop.
 *
 * You can get the underlying Atom panel via `getPanel()`, but you should
 * consider controlling the panel via React and the Panel component instead.
 */
// TODO: all portals that wrap atom classes should watch for the underlying
// model to be mutated/destroyed and call callbacks appropriately
export default class Panel extends React.Component {
  static propTypes = {
    workspace: React.PropTypes.object.isRequired,
    location: React.PropTypes.oneOf([
      'top', 'bottom', 'left', 'right', 'header', 'footer', 'modal'
    ]).isRequired,
    options: React.PropTypes.object,
  }

  static defaultProps = {
    options: {},
  }

  componentDidMount () {
    this.setupPanel(this.props)
  }

  render () {
    return <Portal ref={c => this.portal = c}>{this.props.children}</Portal>
  }

  setupPanel (props) {
    if (this.panel) return

    const location = props.location.substr(0, 1).toUpperCase() + props.location.substr(1)
    const methodName = `add${location}Panel`

    const item = this.portal.getComponent()
    const options = Object.assign({}, this.props.options, { item })
    this.panel = this.props.workspace[methodName](options)
  }

  componentWillUnmount () {
    if (this.panel) {
      this.panel.destroy()
    }
  }

  getPanel () {
    return this.panel
  }
}
