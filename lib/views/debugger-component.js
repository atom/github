/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

const style = {
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
  constructor ({data}) {
    this.data = data
    etch.initialize(this)
  }

  update ({data}) {
    this.data = data
    etch.update(this)
  }

  render () {
    return (
      <div style={style}> {JSON.stringify(this.data, null, '  ')}
      </div>)
  }
}
