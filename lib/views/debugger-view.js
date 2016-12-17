/** @jsx etch.dom */
/* eslint react/no-unknown-property: "off" */

import etch from 'etch';

const defaultStyle = {
  position: 'fixed',
  zIndex: 100000000,
  backgroundColor: 'white',
  minWidth: '300px',
  minHeight: '300px',
  top: '400px',
  left: '600px',
  maxWidth: '800px',
  maxHeight: '400px',
  overflow: 'auto',
  whiteSpace: 'pre',
  fontFamily: 'monospace',
  border: '3px solid black',
};

export default class DebuggerView {
  constructor(props) {
    this.props = props;
    etch.initialize(this);
  }

  update(props) {
    this.props = props;
    etch.update(this);
  }

  render() {
    const {data, style, ...others} = this.props;
    const finalStyle = {
      ...defaultStyle,
      ...style,
    };

    return <div style={finalStyle} {...others}>{JSON.stringify(data, null, '  ')}</div>;
  }
}
