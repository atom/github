/** @babel */

import React from 'react'
import ReactDom from 'react-dom'

import Portal from '../../lib/views/portal'

import {createRenderer} from '../helpers'

class Component extends React.Component {
  render () {
    return (
      <div>{this.props.text}</div>
    )
  }

  getText () {
    return this.props.text
  }
}

describe('Portal', () => {
  it('renders a subtree into a different dom node', () => {
    const renderer = createRenderer()
    renderer.render(<Portal><Component text='hello' /></Portal>)
    assert.equal(renderer.instance.getElement().textContent, 'hello')
    assert.equal(renderer.instance.getRenderedSubtree().getText(), 'hello')
    const oldSubtree = renderer.instance.getRenderedSubtree()
    renderer.render(<Portal><Component text='world' /></Portal>)
    assert.equal(renderer.lastInstance, renderer.instance)
    assert.equal(oldSubtree, renderer.instance.getRenderedSubtree())
    assert.equal(renderer.instance.getElement().textContent, 'world')
    assert.equal(renderer.instance.getRenderedSubtree().getText(), 'world')
  })
})
