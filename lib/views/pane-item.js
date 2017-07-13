import React from 'react';
import PropTypes from 'prop-types';
import {CompositeDisposable} from 'event-kit';

import Portal from './portal';
import StubItem from '../atom-items/stub-item';

/**
 * `PaneItem` adds its child to the current Atom pane when rendered.
 * When the pane is closed, the component's `onDidCloseItem` is called.
 * You should use this callback to set state so that the `PaneItem` is no
 * longer rendered; you will get an error in your console if you forget.
 *
 * You may pass a `getItem` function that takes an object with `portal` and
 * `subtree` properties. `getItem` should return an item to be added to the
 * Panel. `portal` is an instance of th Portal component, and `subtree` is the
 * rendered subtree component built from the `children` prop. The default
 * implementation simply returns the Portal instance, which contains a
 * `getElement` method (to be compatible with Atom's view system).
 *
 * Unmounting the component when the item is open will close the item.
 */
export default class PaneItem extends React.Component {
  static propTypes = {
    workspace: PropTypes.object.isRequired,
    children: PropTypes.element.isRequired,
    getItem: PropTypes.func,
    onDidCloseItem: PropTypes.func,
    stubItemSelector: PropTypes.string,
    id: PropTypes.string,
  }

  static defaultProps = {
    getItem: ({portal, subtree}) => portal.getView(),
    onDidCloseItem: paneItem => {},
  }

  constructor(props, context) {
    super(props, context);

    // this.paneItemPromise = new Promise(resolve => {
    //   this.resolvePaneItemPromise = resolve;
    // });
  }

  componentDidMount() {
    this.setupPaneItem();
  }

  componentWillReceiveProps() {
    if (this.didCloseItem) {
      // eslint-disable-next-line no-console
      console.error('Unexpected update in `PaneItem`: the contained item has been closed');
    }
  }

  render() {
    let getDOMNode;
    if (this.props.stubItemSelector) {
      getDOMNode = () => StubItem.getElementBySelector(this.props.stubItemSelector);
    }

    return <Portal ref={c => { this.portal = c; }} getDOMNode={getDOMNode}>{this.props.children}</Portal>;
  }

  setupPaneItem() {
    if (this.paneItem) { return; }

    console.log('getItem');
    // const itemToAdd = this.props.getItem({portal: this.portal, subtree: this.portal.getRenderedSubtree()});
    const itemToAdd = this.props.getItem({portal: this.portal, subtree: this.portal.getRenderedSubtree()});
    console.log(itemToAdd);

    this.subscriptions = new CompositeDisposable();
    if (itemToAdd.wasActivated) {
      this.subscriptions.add(
        this.props.workspace.onDidChangeActivePaneItem(activeItem => {
          if (activeItem === this.paneItem) {
            itemToAdd.wasActivated();
          }
        }),
      );
    }

    let stub;
    if (this.props.stubItemSelector && this.props.id) {
      stub = StubItem.getBySelector(this.props.stubItemSelector, this.props.id);
    }

    if (stub) {
      stub.setRealItem(itemToAdd);
      this.paneItem = stub;
      console.log('$$$OPEN');
      this.props.workspace.open(this.paneItem, {
        searchAllPanes: true,
      });
      // this.resolvePaneItemPromise(this.paneItem);
      if (this.props.activate) {
        this.activate();
      }
    } else {
      let paneContainer = this.props.workspace;
      // TODO[v1.17]: remove this once bundled in v1.17
      if (this.props.workspace.getCenter) {
        paneContainer = this.props.workspace.getCenter();
      }
      this.paneItem = paneContainer.getActivePane().addItem(itemToAdd);
      this.props.workspace.open(this.paneItem, {
        searchAllPanes: true,
      });
      // this.resolvePaneItemPromise(this.paneItem);
    }

    this.subscriptions = this.props.workspace.onDidDestroyPaneItem(({item}) => {
      if (item === this.paneItem) {
        this.didCloseItem = true;
        this.props.onDidCloseItem(this.paneItem);
      }
    });
  }

  getPaneItem() {
    return this.paneItem;
  }

  componentWillUnmount() {
    this.subscriptions && this.subscriptions.dispose();
    if (this.paneItem && !this.didCloseItem) {
      this.paneItem.destroy();
    }
  }

  activate() {
    setTimeout(() => {
      if (!this.paneItem) { return; }

      const pane = this.props.workspace.paneForItem(this.paneItem);
      if (pane) {
        pane.activateItem(this.paneItem);
      } else {
        throw new Error('Cannot find pane for item in `PaneItem#activate`');
      }
    });
  }
}
