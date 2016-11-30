/** @babel */

import React from 'react'
import ReactDom from 'react-dom'
import sinon from 'sinon'

import Panel from '../../lib/views/panel'

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

describe('Panel component', () => {
  it('renders a React component into an Atom panel', () => {
    const workspace = {
      addLeftPanel: sinon.stub().returns({destroy: sinon.stub()})
    }
    let panel, portal, subtree
    const item = Symbol('item')
    const node = document.createElement('div')
    const app = (
      <Panel
        ref={c => panel = c}
        workspace={workspace}
        location='left'
        options={{some: 'option'}}
        getItem={(obj) => {
          portal = obj.portal
          subtree = obj.subtree
          return item
        }}
      >
        <Component text='hello' />
      </Panel>
    )
    ReactDom.render(app, node)
    assert.equal(workspace.addLeftPanel.callCount, 1)
    assert.deepEqual(workspace.addLeftPanel.args[0], [{some: 'option', item: item}])
    assert.equal(portal.getElement().textContent, 'hello')
    assert.equal(subtree.getText(), 'hello')

    const app2 = (
      <Panel
        ref={c => panel = c}
        workspace={workspace}
        location='left'
        options={{some: 'option'}}
        getItem={(obj) => {
          return item
        }}
      >
        <Component text='world' />
      </Panel>
    )
    ReactDom.render(app2, node)
    assert.equal(workspace.addLeftPanel.callCount, 1)
    assert.equal(portal.getElement().textContent, 'world')
    assert.equal(subtree.getText(), 'world')

    const wrappedPanel = panel.getPanel()
    ReactDom.unmountComponentAtNode(node)
    assert.equal(wrappedPanel.destroy.callCount, 1)
  })
})
