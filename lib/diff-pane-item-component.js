/* @flow */
/** @jsx etch.dom */

import etch from 'etch'
// $FlowBug: Yes, we know this isn't a React component :\
import DiffComponent from './diff-component'

import type DiffViewModel from './diff-view-model'

type DiffPaneItemComponentProps = {diffViewModel: DiffViewModel}

export default class DiffPaneItemComponent {
  diffViewModel: DiffViewModel;
  element: HTMLElement;
  refs: {diffComponent: HTMLElement};

  constructor (props: DiffPaneItemComponentProps) {
    this.acceptProps(props)
  }

  acceptProps ({diffViewModel}: DiffPaneItemComponentProps): Promise<void> {
    this.diffViewModel = diffViewModel

    let updatePromise = Promise.resolve()
    if (this.element) {
      updatePromise = etch.update(this)
    } else {
      etch.initialize(this)
    }

    this.element.addEventListener('focus', () => this.refs.diffComponent.focus())

    return updatePromise
  }

  update (props: DiffPaneItemComponentProps, children: Array<any>): Promise<void> {
    return this.acceptProps(props)
  }

  render () {
    return (
      <div className='pane-item' tabIndex='-1'>{
        <DiffComponent ref='diffComponent' diffViewModel={this.diffViewModel}/>
      }</div>
    )
  }
}
