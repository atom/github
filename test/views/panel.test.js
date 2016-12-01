/** @babel */

import React from 'react'
import ReactDom from 'react-dom'
import sinon from 'sinon'

import Panel from '../../lib/views/panel'

import {Emitter} from 'atom'

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

describe('Panel component', () => {
  it('renders a React component into an Atom panel', () => {
    const renderer = createRenderer()
    const emitter = new Emitter()
    const workspace = {
      addLeftPanel: sinon.stub().returns({
        destroy: sinon.spy(() => emitter.emit('destroy')),
        onDidDestroy: (cb) => emitter.on('destroy', cb),
      })
    }
    let portal, subtree
    const item = Symbol('item')
    let app = (
      <Panel
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
    renderer.render(app)
    assert.equal(workspace.addLeftPanel.callCount, 1)
    assert.deepEqual(workspace.addLeftPanel.args[0], [{some: 'option', item: item}])
    assert.equal(portal.getElement().textContent, 'hello')
    assert.equal(subtree.getText(), 'hello')

    app = (
      <Panel
        workspace={workspace}
        location='left'
        options={{some: 'option'}}
        getItem={(obj) => {
          return item
        }}
        onDidClosePanel={() => { throw new Error('Expected onDidClosePanel not to be called') }}
      >
        <Component text='world' />
      </Panel>
    )
    renderer.render(app)
    assert.equal(workspace.addLeftPanel.callCount, 1)
    assert.equal(portal.getElement().textContent, 'world')
    assert.equal(subtree.getText(), 'world')

    renderer.unmount()
    assert.equal(renderer.lastInstance.getPanel().destroy.callCount, 1)
  })

  it('calls props.onDidClosePanel when the panel is destroyed unexpectedly', () => {
    const renderer = createRenderer()
    const emitter = new Emitter()
    const workspace = {
      addLeftPanel: sinon.stub().returns({
        destroy: () => emitter.emit('destroy'),
        onDidDestroy: (cb) => emitter.on('destroy', cb),
      })
    }
    const onDidClosePanel = sinon.stub()
    let app = (
      <Panel
        workspace={workspace}
        location='left'
        onDidClosePanel={onDidClosePanel}
      >
        <Component text='hello' />
      </Panel>
    )
    renderer.render(app)
    renderer.instance.getPanel().destroy()
    assert.equal(onDidClosePanel.callCount, 1)
    emitter.dispose()
  })
})
