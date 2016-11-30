/** @babel */

import React from 'react'
import ReactDom from 'react-dom'

import Portal from '../../lib/views/portal'

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
    const node = document.createElement('div')
    let portal, oldPortal
    ReactDom.render(<Portal ref={c => portal = c}><Component text='hello' /></Portal>, node)
    assert.equal(portal.getElement().textContent, 'hello')
    assert.equal(portal.getRenderedSubtree().getText(), 'hello')
    oldPortal = portal
    ReactDom.render(<Portal ref={c => portal = c}><Component text='world' /></Portal>, node)
    assert.equal(oldPortal, portal) // portal got updated, not recreated
    assert.equal(oldPortal.getRenderedSubtree(), portal.getRenderedSubtree()) // subtree also got updated, not recreated
    assert.equal(portal.getElement().textContent, 'world')
    assert.equal(portal.getRenderedSubtree().getText(), 'world')
  })
})
