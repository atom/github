/** @babel */

import React from 'react'

import Portal from './portal'

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
export default class PaneItem extends React.Component {
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
