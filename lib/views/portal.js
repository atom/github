/** @babel */

import React from 'react'
import ReactDom from 'react-dom'

/**
 * `Portal` is a mechanism for rendering a React subtree at a different place
 * in the DOM.
 *
 *    <Portal type="span" className="portal-class" appendNode={true}>
 *      <Stuff />
 *    </Portal>
 *
 * Given the above example, there will be a span with the class "portal-class"
 * created and appended to the document body, and then `<Stuff />` will be
 * rendered into it. Note that this uses `unstable_renderSubtreeIntoContainer`
 * to preserve context in the subtree.
 *
 * `getComponent()` allows access to the rendered subtree instance
 * (`Stuff` in the example above).
 *
 * Pass `false` (the default) to `appendNode` to skip adding the node to the
 * DOM. `type` defaults to "div" and `className` defaults to
 * "react-atom-portal".
 */
export default class Portal extends React.Component {
  static propTypes = {
    type: React.PropTypes.string,
    className: React.PropTypes.string,
    appendNode: React.PropTypes.bool,
  }

  static defaultProps = {
    type: 'div',
    className: 'react-atom-portal',
    appendNode: false,
  }

  componentDidMount () {
    this.node = document.createElement(this.props.type)
    this.node.className = this.props.className
    if (this.props.appendNode) {
      document.body.appendChild(this.node)
    }
    this.renderPortal(this.props)
  }

  componentWillReceiveProps (newProps) {
    this.renderPortal(newProps)
  }

  componentWillUnmount () {
    ReactDom.unmountComponentAtNode(this.node)
    if (this.props.appendNode) {
      document.body.removeChild(this.node)
    }
  }

  renderPortal (props) {
    this.portal = ReactDom.unstable_renderSubtreeIntoContainer(
      this, props.children, this.node
    )
  }

  shouldComponentUpdate () {
    return false
  }

  render () {
    return null
  }

  getComponent () {
    return this.portal
  }
}
