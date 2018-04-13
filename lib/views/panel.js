import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import {CompositeDisposable} from 'event-kit';

import {createItem} from '../helpers';

/**
 * `Panel` renders a React component into an Atom panel. Specify the location via the `location` prop, and any
 * additional options to the `addXPanel` method in the `options` prop.
 *
 * You can get the underlying Atom panel via `getPanel()`, but you should consider controlling the panel via React and
 * the Panel component instead.
 */
export default class Panel extends React.Component {
  static propTypes = {
    workspace: PropTypes.object.isRequired,
    location: PropTypes.oneOf([
      'top', 'bottom', 'left', 'right', 'header', 'footer', 'modal',
    ]).isRequired,
    children: PropTypes.element.isRequired,
    options: PropTypes.object,
    onDidClosePanel: PropTypes.func,
    visible: PropTypes.bool,
  }

  static defaultProps = {
    options: {},
    onDidClosePanel: panel => {},
    visible: true,
  }

  constructor(props) {
    super(props);

    this.subscriptions = new CompositeDisposable();
    this.panel = null;
    this.didCloseItem = false;
    this.domNode = document.createElement('div');
    this.domNode.className = 'react-atom-panel';
  }

  componentDidMount() {
    this.setupPanel();
  }

  shouldComponentUpdate(newProps) {
    return this.props.visible !== newProps.visible;
  }

  componentDidUpdate() {
    if (this.didCloseItem) {
      // eslint-disable-next-line no-console
      console.error('Unexpected update in `Panel`: the contained panel has been destroyed');
    }

    if (this.panel) {
      this.panel[this.props.visible ? 'show' : 'hide']();
    }
  }

  render() {
    return ReactDOM.createPortal(
      this.props.children,
      this.domNode,
    );
  }

  setupPanel() {
    if (this.panel) { return; }

    // "left" => "Left"
    const location = this.props.location.substr(0, 1).toUpperCase() + this.props.location.substr(1);
    const methodName = `add${location}Panel`;

    const item = createItem(this.domNode, this.props.children);
    const options = {...this.props.options, visible: this.props.visible, item};
    this.panel = this.props.workspace[methodName](options);
    this.subscriptions.add(
      this.panel.onDidDestroy(() => {
        this.didCloseItem = true;
        this.props.onDidClosePanel(this.panel);
      }),
    );
  }

  componentWillUnmount() {
    this.subscriptions.dispose();
    if (this.panel) {
      this.panel.destroy();
    }
  }

  getPanel() {
    return this.panel;
  }
}
