import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import {CompositeDisposable} from 'event-kit';

import {createItem} from '../helpers';

/**
 * `PaneItem` adds its child to the current Atom pane when rendered. When the pane is closed, the component's
 * `onDidCloseItem` is called. You should use this callback to set state so that the `PaneItem` is no longer rendered;
 * you will get an error in your console if you forget.
 *
 * Unmounting the component when the item is open will close the item.
 */
export default class PaneItem extends React.Component {
  static propTypes = {
    workspace: PropTypes.object.isRequired,
    children: PropTypes.element.isRequired,
    onDidCloseItem: PropTypes.func,
    stubItem: PropTypes.object,
    title: PropTypes.string,
    iconName: PropTypes.string,
    defaultLocation: PropTypes.oneOf(['left', 'right', 'bottom', 'center']),
    preferredWidth: PropTypes.number,
    uri: PropTypes.string,
  }

  static defaultProps = {
    onDidCloseItem: paneItem => {},
  }

  constructor(props) {
    super(props);

    this.subscriptions = new CompositeDisposable();
    this.paneItem = null;
    this.didCloseItem = false;

    if (this.props.stubItem) {
      this.domNode = this.props.stubItem.getElement();
    } else {
      this.domNode = document.createElement('div');
      this.domNode.className = 'react-atom-pane-item';
    }
  }

  componentDidMount() {
    this.setupPaneItem();
  }

  componentDidUpdate() {
    if (this.didCloseItem) {
      // eslint-disable-next-line no-console
      console.error('Unexpected update in `PaneItem`: the contained item has been closed');
    }
  }

  render() {
    return ReactDOM.createPortal(
      this.props.children,
      this.domNode,
    );
  }

  setupPaneItem() {
    if (this.paneItem) { return; }

    const itemToAdd = createItem(this.domNode, this.props);
    if (itemToAdd.wasActivated) {
      this.subscriptions.add(
        this.props.workspace.onDidChangeActivePaneItem(activeItem => {
          if (activeItem === this.paneItem) {
            itemToAdd.wasActivated(() => {
              return this.props.workspace.getActivePaneItem() === this.paneItem;
            });
          }
        }),
      );
    }

    const stub = this.props.stubItem;
    if (stub) {
      stub.setRealItem(itemToAdd);
      this.paneItem = stub;
    } else {
      const paneContainer = this.props.workspace;
      this.paneItem = paneContainer.getActivePane().addItem(itemToAdd);
    }

    this.subscriptions.add(
      this.props.workspace.onDidDestroyPaneItem(({item}) => {
        if (item === this.paneItem) {
          this.didCloseItem = true;
          this.props.onDidCloseItem(this.paneItem);
        }
      }),
    );
  }

  getPaneItem() {
    return this.paneItem;
  }

  componentWillUnmount() {
    this.subscriptions.dispose();
    if (this.paneItem && !this.didCloseItem) {
      this.paneItem.destroy();
    }
  }
}
