import React from 'react';
import PropTypes from 'prop-types';

import Portal from './portal';
import StubItem from '../atom-items/stub-item';

/**
 * `DockItem` adds its child to an Atom dock when rendered.
 * When the item is closed, the component's `onDidCloseItem` is called.
 * You should use this callback to set state so that the `DockItem` is no
 * longer rendered; you will get an error in your console if you forget.
 *
 * You may pass a `getItem` function that takes an object with `portal` and
 * `subtree` properties. `getItem` should return an item to be added to the
 * Dock. `portal` is an instance of th Portal component, and `subtree` is the
 * rendered subtree component built from the `children` prop. The default
 * implementation simply returns the Portal instance, which contains a
 * `getElement` method (to be compatible with Atom's view system).
 *
 * Unmounting the component when the item is open will close the item.
 */
export default class DockItem extends React.Component {
  static propTypes = {
    workspace: PropTypes.object.isRequired,
    children: PropTypes.element.isRequired,
    getItem: PropTypes.func,
    onDidCloseItem: PropTypes.func,
    stubItemSelector: PropTypes.string,
  }

  static defaultProps = {
    getItem: ({portal, subtree}) => portal.getView(),
    onDidCloseItem: dockItem => {},
  }

  componentDidMount() {
    this.setupDockItem();
  }

  componentWillReceiveProps() {
    if (this.didCloseItem) {
      // eslint-disable-next-line no-console
      console.error('Unexpected update in `DockItem`: the contained item has been closed');
    }
  }

  render() {
    let getDOMNode;
    if (this.props.stubItemSelector) {
      getDOMNode = () => StubItem.getElementBySelector(this.props.stubItemSelector);
    }

    return <Portal ref={c => { this.portal = c; }} getDOMNode={getDOMNode}>{this.props.children}</Portal>;
  }

  setupDockItem() {
    if (this.dockItem) { return; }

    const itemToAdd = this.props.getItem({portal: this.portal, subtree: this.portal.getRenderedSubtree()});
    let stub;
    if (this.props.stubItemSelector) {
      stub = StubItem.getBySelector(this.props.stubItemSelector);
    }

    if (stub) {
      stub.setRealItem(itemToAdd);
      this.dockItem = stub;
    } else {
      Promise.resolve(this.props.workspace.open(itemToAdd)).then(item => { this.dockItem = item; });
    }

    this.subscriptions = this.props.workspace.onDidDestroyPaneItem(({item}) => {
      if (item === this.dockItem) {
        this.didCloseItem = true;
        this.props.onDidCloseItem(this.dockItem);
      }
    });
  }

  getDockItem() {
    return this.dockItem;
  }

  componentWillUnmount() {
    this.subscriptions && this.subscriptions.dispose();
    if (this.dockItem && !this.didCloseItem) {
      const pane = this.props.workspace.paneForItem(this.dockItem);
      if (this.dockItem.destroy) {
        this.dockItem.destroy();
      }
      pane.destroyItem(this.dockItem);
    }
  }

  activate() {
    setTimeout(() => {
      if (!this.dockItem) { return; }

      const pane = this.props.workspace.paneForItem(this.dockItem);
      if (pane) {
        pane.activateItem(this.dockItem);
      } else {
        throw new Error('Cannot find pane for item in `DockItem#activate`');
      }
    });
  }
}
