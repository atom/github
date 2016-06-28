/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

const defaultStyle = {
  position: 'fixed',
  zIndex: 100000000,
  backgroundColor: 'white',
  minWidth: '100px',
  minHeight: '100px',
  top: '200px',
  left: '200px',
  maxWidth: '800px',
  maxHeight: '400px',
  overflow: 'auto',
  whiteSpace: 'pre',
  fontFamily: 'monospace',
  border: '3px solid black'
}

export default class DebuggerComponent {
  constructor (props) {
    this.props = props
    etch.initialize(this)
  }

  update (props) {
    this.props = props
    etch.update(this)
  }

  render () {
    const {data, style, ...others} = this.props
    const finalStyle = {
      ...defaultStyle,
      ...style
    }

    return <div style={finalStyle} {...others}>{JSON.stringify(data, null, '  ')}</div>
  }
}
