/** @babel */

import React from 'react'

import Portal from './portal'

/**
 * `Panel` renders a React component into an Atom panel. Specify the
 * location via the `location` prop, and any additional options to the
 * `addXPanel` method in the `options` prop.
 *
 * You may pass a `getItem` function that takes an object with `portal` and
 * `subtree` properties. `getItem` should return an item to be added to the
 * Panel. `portal` is an instance of the Portal component, and `subtree` is the
 * rendered subtree component built from the `children` prop. The default
 * implementation simply returns the Portal instance, which contains a
 * `getElement` method (to be compatible with Atom's view system).
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
    getItem: React.PropTypes.func,
    options: React.PropTypes.object,
  }

  static defaultProps = {
    options: {},
    getItem: ({portal, subtree}) => portal,
  }

  componentDidMount () {
    this.setupPanel(this.props)
  }

  render () {
    return <Portal ref={c => this.portal = c}>{this.props.children}</Portal>
  }

  setupPanel (props) {
    if (this.panel) return

    // "left" => "Left"
    const location = props.location.substr(0, 1).toUpperCase() + props.location.substr(1)
    const methodName = `add${location}Panel`

    const item = props.getItem({portal: this.portal, subtree: this.portal.getRenderedSubtree()})
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
