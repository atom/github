import React from 'react';
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

  componentDidMount() {
    this.consumeStatusBar();
  }

  componentDidUpdate() {
    this.consumeStatusBar();
  }

  render() {
    return <div ref={c => { this.container = c; }}>{this.props.children}</div>;
  }

  consumeStatusBar() {
    if (this.tile) { return; }
    if (!this.props.statusBar) { return; }

    const componentElement = this.container.children[0];
    this.tile = this.props.statusBar.addRightTile({item: componentElement, priority: -50});
    this.props.onConsumeStatusBar(this.props.statusBar);
  }

  componentWillUnmount() {
    this.tile && this.tile.destroy();
  }
}
