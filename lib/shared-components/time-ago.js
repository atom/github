'use babel'
/** @jsx etch.dom */

import etch from 'etch'

import moment from 'moment'

export default class TimeAgo {
  constructor ({time}) {
    this.time = time
    etch.initialize(this)

    this.interval = setInterval(() => {
      etch.update(this)
    }, 1000 * 60)
  }

  update ({time}) {
    this.time = time
    etch.update(this)
  }

  render () {
    return <span> {moment(this.time).fromNow()} </span>
  }

  destroy () {
    if (this.interval) clearInterval(this.interval)
    this.interval = null
    return etch.destroy(this)
  }
}
