import React from 'react';
import PropTypes from 'prop-types';
import {CompositeDisposable} from 'event-kit';

import Portal from './portal';

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
    stubItem: PropTypes.object,
    activate: PropTypes.bool,
  }

  static defaultProps = {
    getItem: ({portal, subtree}) => portal.getView(),
    onDidCloseItem: dockItem => {},
  }

  constructor(props, context) {
    super(props, context);

    this.dockItemPromise = new Promise(resolve => {
      this.resolveDockItemPromise = resolve;
    });
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
    if (this.props.stubItem) {
      getDOMNode = () => this.props.stubItem.getElement();
    }

    return <Portal ref={c => { this.portal = c; }} getDOMNode={getDOMNode}>{this.props.children}</Portal>;
  }

  setupDockItem() {
    if (this.dockItem) { return; }

    const itemToAdd = this.props.getItem({portal: this.portal, subtree: this.portal.getRenderedSubtree()});

    this.subscriptions = new CompositeDisposable();
    if (itemToAdd.wasActivated) {
      this.subscriptions.add(
        this.props.workspace.onDidChangeActivePaneItem(activeItem => {
          if (activeItem === this.dockItem) {
            itemToAdd.wasActivated();
          }
        }),
      );
    }

    const stub = this.props.stubItem;
    if (stub) {
      stub.setRealItem(itemToAdd);
      this.dockItem = stub;
      this.resolveDockItemPromise(this.dockItem);
      if (this.props.activate) {
        this.activate();
      }
    } else {
      Promise.resolve(this.props.workspace.open(itemToAdd, {activatePane: false}))
        .then(item => {
          this.dockItem = item;
          this.resolveDockItemPromise(this.dockItem);
          if (this.props.activate) { this.activate(); }
        });
    }

    this.subscriptions.add(
      this.props.workspace.onDidDestroyPaneItem(({item}) => {
        if (item === this.dockItem) {
          this.didCloseItem = true;
          this.props.onDidCloseItem(this.dockItem);
        }
      }),
    );
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

  getDockItem() {
    return this.dockItem;
  }

  getDockItemPromise() {
    return this.dockItemPromise;
  }

  activate() {
    setTimeout(() => {
      if (!this.dockItem || this.didCloseItem || this.props.workspace.isDestroyed()) {
        return;
      }

      const pane = this.props.workspace.paneForItem(this.dockItem);
      if (pane) {
        pane.activateItem(this.dockItem);
        const dock = this.props.workspace.getPaneContainers()
          .find(container => container.getPanes().find(p => p.getItems().includes(this.dockItem)));
        if (dock && dock.show) {
          dock.show();
        }
      } else {
        throw new Error('Cannot find pane for item in `DockItem#activate`');
      }
    });
  }
}
