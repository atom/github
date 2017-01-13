import React from 'react';
import cx from 'classnames';
import {autobind} from 'core-decorators';

export default class Resizer extends React.Component {
  static propTypes = {
    size: React.PropTypes.number.isRequired,
    onChange: React.PropTypes.func.isRequired,
    className: React.PropTypes.string,
    children: React.PropTypes.element,
  }

  constructor(props, context) {
    super(props, context);
    this.state = {
      dragging: false,
      start: null,
      lastSize: props.size,
    };
  }

  render() {
    const {onChange, children, className, ...others} = this.props; // eslint-disable-line no-unused-vars
    return (
      <div {...others} className={cx('resizer-container', className)}>
        <div className="sizing-handle" onMouseDown={this.handleMouseDown}>
          &nbsp;
        </div>
        <div className="content" style={{width: this.props.size}}>
          {children}
        </div>
      </div>
    );
  }

  @autobind
  handleMouseDown(e) {
    // save off copy since synthetic event will be recycled
    // by the time the `setState` function runs
    const clientX = e.clientX;
    this.setState(s => ({
      dragging: true,
      start: clientX,
      lastSize: this.props.size,
    }));

    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
  }

  @autobind
  handleMouseUp(e) {
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);

    this.setState({
      dragging: false,
    });
  }

  @autobind
  handleMouseMove(e) {
    if (!this.state.dragging) { return; }
    const oldPos = this.state.start;
    const delta = oldPos - e.clientX;
    const newSize = Math.max(0, this.state.lastSize + delta);
    this.props.onChange(newSize);
  }
}
