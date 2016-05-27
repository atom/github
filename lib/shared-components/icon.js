'use babel'
/** @jsx etch.dom */

import etch from 'etch'

export default class Icon {
  constructor ({icon}) {
    this.icon = icon
    etch.initialize(this)
  }

  render () {
    return <span className={`icon icon-${this.icon}`} />
  }

  update () {
    return etch.update(this)
  }
}
