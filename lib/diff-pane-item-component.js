/* @flow */
/** @jsx etch.dom */

import etch from 'etch'
// $FlowBug: Yes, we know this isn't a React component :\
import DiffComponent from './diff-component'

import type DiffViewModel from './diff-view-model'

export default class DiffPaneItemComponent {
  diffViewModel: DiffViewModel;
  element: HTMLElement;
  refs: {diffComponent: HTMLElement};

  constructor ({diffViewModel}: {diffViewModel: DiffViewModel}) {
    this.diffViewModel = diffViewModel
    etch.initialize(this)

    this.element.addEventListener('focus', () => this.refs.diffComponent.focus())
  }

  render () {
    return (
      <div className='pane-item' tabIndex='-1'>{
        <DiffComponent ref='diffComponent' diffViewModel={this.diffViewModel}/>
      }</div>
    )
  }
}
