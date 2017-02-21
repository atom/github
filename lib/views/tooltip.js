import React from 'react';
import {autobind} from 'core-decorators';

export default class Tooltip extends React.Component {
  static propTypes = {
    active: React.PropTypes.bool.isRequired,
    text: React.PropTypes.string.isRequired,
    children: React.PropTypes.element.isRequired,
  }

  constructor(props, context) {
    super(props, context);

    this.element = null;
    this.tooltipDisposable = null;
  }

  render() {
    return (
      <div {...this.props}
        onMouseOver={this.handleMouseOver}
        onMouseOut={this.handleMouseOut}
        ref={e => { this.element = e; }}>
        {this.props.children}
      </div>
    );
  }

  componentWillUnmount() {
    this.tooltipDisposable && this.tooltipDisposable.dispose();
  }

  @autobind
  handleMouseOut() {
    if (this.tooltipDisposable) {
      this.tooltipDisposable.dispose();
      this.tooltipDisposable = null;
    }
  }

  @autobind
  handleMouseOver() {
    if (this.active && !this.tooltipDisposable) {
      this.tooltipDisposable = atom.tooltips.add(this.element, {title: this.text, trigger: 'manual'});
    }
  }
}
