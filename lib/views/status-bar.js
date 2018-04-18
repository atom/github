import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';

export default class StatusBar extends React.Component {
  static propTypes = {
    children: PropTypes.element.isRequired,
    statusBar: PropTypes.object,
    onConsumeStatusBar: PropTypes.func,
  }

  static defaultProps = {
    onConsumeStatusBar: statusBar => {},
  }

  constructor(props) {
    super(props);

    this.domNode = document.createElement('div');
    this.domNode.className = 'react-atom-status-bar';
    this.tile = null;
  }

  componentDidMount() {
    this.consumeStatusBar();
  }

  render() {
    return ReactDOM.createPortal(
      this.props.children,
      this.domNode,
    );
  }

  consumeStatusBar() {
    if (this.tile) { return; }
    if (!this.props.statusBar) { return; }

    this.tile = this.props.statusBar.addRightTile({item: this.domNode, priority: -50});
    this.props.onConsumeStatusBar(this.props.statusBar);
  }

  componentWillUnmount() {
    this.tile && this.tile.destroy();
  }
}
