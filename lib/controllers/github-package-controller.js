/** @babel */

import {CompositeDisposable} from 'atom'

import React from 'react'
import ReactDom from 'react-dom'

import StatusBarTileController from './status-bar-tile-controller'


/**
 * `EtchWrapper` is a React component that renders Etch components
 * and correctly manages their lifecycles as the application progresses.
 *
 *    <EtchWrapper type="span" reattachDomNode={true} className="wrapper">
 *      <EtchComponent etchProp={stuff} />
 *    </EtchWrapper>
 *
 * The `type` property specifies the DOM node type to wrap around the
 * Etch component's element, and defaults to 'div'. Any other props you
 * pass to the wrapper component will be applied to the DOM node.
 *
 * `reattachDomNode` determines whether or not to place the wrapped component
 * element back in the React component's DOM node if we find it's missing;
 * this could happen due to changing the `type` property. If you pass the
 * wrapped component element into a method that moves the element, you should
 * specify `false` for this option.
 *
 * The component takes a single JSX child, which describes the type and props
 * of the Etch component to render. Any time this changes, the wrapper will
 * update (or destroy and recreate) the Etch component as necessary.
 *
 * Note that the component cleans up its own DOM node, and calls
 * `component.destroy(false)` (if your component has a `destroy` method)
 * and you should pass the `false` as the second argument to
 * `etch.destroy(this)` (e.g. `etch.destroy(this, false)`) inside your
 * component instance.
 *
 * The component instance is available at `this.getWrappedComponent` if you need
 * to call methods on it from the outside (though you should really consider
 * setting a prop instead. ;)
 */
class EtchWrapper extends React.Component {
  static propTypes = {
    children: React.PropTypes.element.isRequired,
    type: React.PropTypes.string,
    reattachDomNode: React.PropTypes.bool,
  }

  static defaultProps = {
    type: 'div',
    reattachDomNode: true,
  }

  componentDidMount () {
    this.createComponent(this.getWrappedComponentDetails(this.props.children))
  }

  componentWillReceiveProps (newProps) {
    const oldDetails = this.getWrappedComponentDetails(this.props.children)
    const newDetails = this.getWrappedComponentDetails(newProps.children)
    if (oldDetails.type !== newDetails.type) {
      // The wrapped component type changed, so we need to destroy the old
      // component and create a new one of the new type.
      this.destroyComponent()
      this.createComponent(newDetails)
    }
  }

  async componentDidUpdate (prevProps) {
    const oldDetails = this.getWrappedComponentDetails(prevProps.children)
    const newDetails = this.getWrappedComponentDetails(this.props.children)

    if (oldDetails.type === newDetails.type) {
      // We didn't change the wrapped (Etch) component type,
      // so we need to update the instance with the new props.
      await this.updateComponent(this.getWrappedComponentDetails(this.props.children))
    }

    // If we just recreated our DOM node by changing the node type, we
    // need to reattach the wrapped component's element.
    if (this.props.reattachDomNode && !this.container.contains(this.component.element)) {
      this.container.appendChild(this.component.element)
    }
  }

  render () {
    const Type = this.props.type
    const {type, children, reattachDomNode, ...props} = this.props
    return <Type {...props} ref={c => this.container = c} />
  }

  componentWillUnmount () {
    this.destroyComponent()
  }

  getWrappedComponentDetails (ourChildren) {
    // e.g. <EtchWrapper><EtchChild prop={1} other={2}>Hi</EtchChild></EtchWrapper>
    const etchElement = React.Children.toArray(ourChildren)[0]
    // etchElement === {type: EtchChild, props: {prop: 1, other: 2, children: 'Hi'}}
    const {type, props} = etchElement
    // type === EtchChild, props === {prop: 1, other: 2, children: 'Hi'}
    const {children, ...remainingProps} = props
    // children === 'Hi', remainingProps === {prop: 1, other: 2}
    return {type, children, props: remainingProps}
  }

  // For compatability with Atom's ViewProvider
  getElement () {
    return this.container
  }

  // Etch component interactions

  getWrappedComponent () {
    return this.component
  }

  createComponent ({type, props, children}) {
    this.component = new type(props, children)
    this.container.appendChild(this.component.element)
  }

  updateComponent ({props, children}) {
    return this.component.update(props, children)
  }

  destroyComponent () {
    if (this.container.contains(this.component.element)) {
      this.container.removeChild(this.component.element)
    }
    this.component.destroy && this.component.destroy(false)
    delete this.component
  }
}


class StatusBar extends React.Component {
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


/**
 * `Panel` renders a React component into an Atom panel. Specify the
 * location via the `location` prop, and any additional options to the
 * `addXPanel` method in the `options` prop.
 *
 * You can get the underlying Atom panel via `getPanel()`, but you should
 * consider controlling the panel via React and the Panel component instead.
 */
class Panel extends React.Component {
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
class Portal extends React.Component {
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

  render () {
    return null
  }

  getComponent () {
    return this.portal
  }
}

/**
 * `PaneItem` adds its child to the current Atom pane when rendered.
 * When the pane is closed, the component's `onDidCloseItem` is called.
 * You should use this callback to set state so that the `PaneItem` is no
 * longer rendered; you will get an error in your console if you forget.
 *
 * The optional `getItem` property is a function that gets passed the wrapped
 * React component instance, and you should return a valid Atom item.
 *
 * Unmounting the component when the item is open will close the item.
 */
class PaneItem extends React.Component {
  static propTypes = {
    workspace: React.PropTypes.object.isRequired,
    getItem: React.PropTypes.func,
    onDidCloseItem: React.PropTypes.func,
  }

  static defaultProps = {
    getItem: (c) => c,
    onDidCloseItem: () => {},
  }

  componentDidMount () {
    this.setupPaneItem(this.props)
  }

  componentWillReceiveProps () {
    if (this.didCloseItem) {
      console.error(
        `Unexpected update in \`PaneItem\`: the contained item has been closed`
      )
    }
  }

  render () {
    return <Portal ref={c => this.portal = c}>{this.props.children}</Portal>
  }

  setupPaneItem (props) {
    if (this.paneItem) return

    const item = props.getItem(this.portal.getComponent())
    this.paneItem = this.props.workspace.getActivePane().addItem(item)
    this.subscriptions = this.props.workspace.onDidDestroyPaneItem(({item}) => {
      if (item === this.paneItem) {
        this.didCloseItem = true
        this.props.onDidCloseItem()
      }
    })
  }

  componentWillUnmount () {
    this.subscriptions && this.subscriptions.dispose()
    if (this.paneItem && !this.didCloseItem) {
      this.paneItem.destroy()
    }
  }

  activate () {
    setTimeout(() => {
      if (!this.paneItem) return

      const pane = this.props.workspace.paneForItem(this.paneItem)
      if (pane) {
        pane.activateItem(this.paneItem)
      } else {
        throw new Error(`Cannot find pane for item in \`PaneItem#activate\``)
      }
    })
  }
}

export default class GithubPackageController extends React.Component {
  static propTypes = {
    workspace: React.PropTypes.object.isRequired,
    repository: React.PropTypes.object,
    statusBar: React.PropTypes.object,
    legacyStatusBar: React.PropTypes.bool,
  }

  static defaultProps = {
    legacyStatusBar: false,
  }

  constructor (props, context) {
    super(props, context)

    this.subscriptions = new CompositeDisposable()

    // this.changeObserver = process.platform === 'linux'
    //   ? new WorkspaceChangeObserver(window, props.workspace)
    //   : new FileSystemChangeObserver()
  }

  render () {
    return (
      <div>
        <StatusBar statusBar={this.props.statusBar} legacy={this.props.legacyStatusBar}>
          <EtchWrapper type="span">
            <StatusBarTileController
              workspace={this.props.workspace}
              repository={this.props.repository}
              toggleGitPanel={this.toggleGitPanel}
            />
          </EtchWrapper>
        </StatusBar>
      </div>
    )
  }
}
