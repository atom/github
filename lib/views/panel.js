import React from 'react';

import Portal from './portal';

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
export default class Panel extends React.Component {
  static propTypes = {
    workspace: React.PropTypes.object.isRequired,
    location: React.PropTypes.oneOf([
      'top', 'bottom', 'left', 'right', 'header', 'footer', 'modal',
    ]).isRequired,
    children: React.PropTypes.element.isRequired,
    getItem: React.PropTypes.func,
    options: React.PropTypes.object,
    onDidClosePanel: React.PropTypes.func,
    visible: React.PropTypes.bool,
  }

  static defaultProps = {
    options: {},
    getItem: ({portal, subtree}) => portal,
    onDidClosePanel: panel => {},
    visible: true,
  }

  componentDidMount() {
    this.setupPanel();
  }

  componentWillReceiveProps(newProps) {
    if (this.didCloseItem) {
      // eslint-disable-next-line no-console
      console.error('Unexpected update in `Panel`: the contained panel has been destroyed');
    }

    if (this.panel && this.props.visible !== newProps.visible) {
      this.panel[newProps.visible ? 'show' : 'hide']();
    }
  }

  render() {
    return <Portal ref={c => { this.portal = c; }}>{this.props.children}</Portal>;
  }

  setupPanel() {
    if (this.panel) { return; }

    // "left" => "Left"
    const location = this.props.location.substr(0, 1).toUpperCase() + this.props.location.substr(1);
    const methodName = `add${location}Panel`;

    const item = this.props.getItem({portal: this.portal, subtree: this.portal.getRenderedSubtree()});
    const options = {...this.props.options, visible: this.props.visible, item};
    this.panel = this.props.workspace[methodName](options);
    this.subscriptions = this.panel.onDidDestroy(() => {
      this.didCloseItem = true;
      this.props.onDidClosePanel(this.panel);
    });
  }

  componentWillUnmount() {
    this.subscriptions && this.subscriptions.dispose();
    if (this.panel) {
      this.panel.destroy();
    }
  }

  getPanel() {
    return this.panel;
  }
}
