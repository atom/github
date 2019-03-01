import React from 'react';
import {shallow, mount} from 'enzyme';
import PropTypes from 'prop-types';


import PaneItem from '../../lib/atom/pane-item';
import ItemWrapper from '../../lib/items/item-wrapper';

class MockItem extends React.Component {
  static propTypes = {
    text: PropTypes.string.isRequired,
  }
  static uriPattern = 'atom-github://mock-item';

  render() {
    return (
      <div>{this.props.text}</div>
    );
  }
}

describe.only('ItemWrapper', function() {

  let atomEnv, workspace;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
    workspace = atomEnv.workspace;
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function buildPaneApp(overrideProps = {}) {
    const itemProps = {
      workspace,
      text: 'i told you so',
    };

    return (
      <PaneItem workspace={workspace} uriPattern={MockItem.uriPattern}>
        {({itemHolder, params}) =>
          <ItemWrapper needsDestroy needsPending needsEmbeddedTextEditor
            {...overrideProps}
            ref={itemHolder.setter} item={extraProps => (
              <MockItem
                {...extraProps}
                {...itemProps}
              />
            )}
          />
        }
      </PaneItem>
    );
  }

  it('calls provided item func with necessary props', async function() {
    const stubItem = sinon.stub().returns(<MockItem />);
    const wrapper = mount(<ItemWrapper item={stubItem} />);
    assert.isTrue(stubItem.called);
  });

  it('returns title');
  it('returns icon name');
  it('handles title change');

  it('terminates pending state', async function() {
    mount(buildPaneApp());
    const item = await workspace.open(MockItem.uriPattern);
    const callback = sinon.spy();
    const sub = item.onDidTerminatePendingState(callback);

    assert.strictEqual(callback.callCount, 0);
    item.terminatePendingState();
    assert.strictEqual(callback.callCount, 1);
    item.terminatePendingState();
    assert.strictEqual(callback.callCount, 1);

    sub.dispose();
  });
  it('does not terminate pending state if item does not needPending');

  it('may be destroyed once if item needs destroy', async function() {
    mount(buildPaneApp());

    const item = await workspace.open(MockItem.uriPattern);
    const callback = sinon.spy();
    const sub = item.onDidDestroy(callback);

    assert.strictEqual(callback.callCount, 0);
    item.destroy();
    assert.strictEqual(callback.callCount, 1);

    sub.dispose();
  });

  it('does not destroy if item does not needDestroy');

  // describe('observeEmbeddedTextEditor() if needsEmbeddedTextEditor');

});
