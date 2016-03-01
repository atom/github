/* @flow */
/** @jsx etch.dom */

import etch from 'etch'

export default class StatusBarComponent {
  element: HTMLElement;

  constructor () {
    etch.initialize(this)
  }

  render () {
    return (
      <div>Hey there</div>
    )
  }
}
