import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import {CompositeDisposable} from 'event-kit';

import {createItem} from '../helpers';
import {RefHolderPropType} from '../prop-types';

/**
 * `DockItem` adds its child to an Atom dock when rendered. When the item is closed, the component's `onDidCloseItem` is
 * called. You should use this callback to set state so that the `DockItem` is no longer rendered; you will get an error
 * in your console if you forget.
 *
 * Unmounting the component when the item is open will close the item.
 */
export default class DockItem extends React.Component {
  static propTypes = {
    workspace: PropTypes.object.isRequired,
    children: PropTypes.element.isRequired,
    onDidCloseItem: PropTypes.func,
    stubItem: PropTypes.object,
    itemHolder: RefHolderPropType,
    activate: PropTypes.bool,
  }

  static defaultProps = {
    onDidCloseItem: () => {},
  }

  constructor(props) {
    super(props);

    this.subscriptions = new CompositeDisposable();
    this.dockItem = null;
    this.didCloseItem = false;
    if (props.stubItem) {
      this.domNode = this.props.stubItem.getElement();
    } else {
      this.domNode = document.createElement('div');
      this.domNode.className = 'react-atom-dockitem';
    }
  }

  componentDidMount() {
    this.setupDockItem();
  }

  componentDidUpdate() {
    if (this.didCloseItem) {
      // eslint-disable-next-line no-console
      console.error('Unexpected update in `DockItem`: the contained item has been closed');
    }
  }

  render() {
    return ReactDOM.createPortal(
      this.props.children,
      this.domNode,
    );
  }

  setupDockItem() {
    if (this.dockItem) { return; }

    const itemToAdd = createItem(this.domNode, this.props.itemHolder);

    if (itemToAdd.wasActivated) {
      this.subscriptions.add(
        this.props.workspace.onDidChangeActivePaneItem(activeItem => {
          if (activeItem === this.dockItem) {
            itemToAdd.wasActivated(() => {
              return this.props.workspace.getActivePaneItem() === this.dockItem;
            });
          }
        }),
      );
    }

    const stub = this.props.stubItem;
    if (stub) {
      stub.setRealItem(itemToAdd);
      this.dockItem = stub;
      if (this.props.activate) {
        this.activate();
      }
    } else {
      Promise.resolve(this.props.workspace.open(itemToAdd, {activatePane: false}))
        .then(item => {
          this.dockItem = item;
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
    this.subscriptions.dispose();

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
      } else if (this.dockItem && !this.didCloseItem) {
        throw new Error('Could not find pane for a non-destroyed DockItem');
      }
    });
  }
}
