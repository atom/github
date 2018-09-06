import React from 'react';
import {shallow} from 'enzyme';

import HunkHeaderView from '../../lib/views/hunk-header-view';
import Hunk from '../../lib/models/patch/hunk';

describe('HunkHeaderView', function() {
  let atomEnv, hunk;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
    hunk = new Hunk({
      oldStartRow: 0, oldRowCount: 10, newStartRow: 1, newRowCount: 11, sectionHeading: 'section heading', changes: [],
    });
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function buildApp(overrideProps = {}) {
    return (
      <HunkHeaderView
        hunk={hunk}
        isSelected={false}
        selectionMode={'hunk'}
        stagingStatus={'unstaged'}
        toggleSelectionLabel={'default'}
        discardSelectionLabel={'default'}

        tooltips={atomEnv.tooltips}

        toggleSelection={() => {}}
        discardSelection={() => {}}

        {...overrideProps}
      />
    );
  }

  it('applies a CSS class when selected', function() {
    const wrapper = shallow(buildApp({isSelected: true}));
    assert.isTrue(wrapper.find('.github-HunkHeaderView').hasClass('github-HunkHeaderView--isSelected'));

    wrapper.setProps({isSelected: false});
    assert.isFalse(wrapper.find('.github-HunkHeaderView').hasClass('github-HunkHeaderView--isSelected'));
  });

  it('applies a CSS class in hunk selection mode', function() {
    const wrapper = shallow(buildApp({selectionMode: 'hunk'}));
    assert.isTrue(wrapper.find('.github-HunkHeaderView').hasClass('github-HunkHeaderView--isHunkMode'));

    wrapper.setProps({selectionMode: 'line'});
    assert.isFalse(wrapper.find('.github-HunkHeaderView').hasClass('github-HunkHeaderView--isHunkMode'));
  });

  it('renders the hunk header title', function() {
    const wrapper = shallow(buildApp());
    assert.strictEqual(wrapper.find('.github-HunkHeaderView-title').text(), '@@ -0,10 +1,11 @@ section heading');
  });

  it('renders a button to toggle the selection', function() {
    const toggleSelection = sinon.stub();
    const wrapper = shallow(buildApp({toggleSelectionLabel: 'Do the thing', toggleSelection}));
    const button = wrapper.find('button.github-HunkHeaderView-stageButton');
    assert.strictEqual(button.text(), 'Do the thing');
    button.simulate('click');
    assert.isTrue(toggleSelection.called);
  });

  it('renders a button to discard an unstaged selection', function() {
    const discardSelection = sinon.stub();
    const wrapper = shallow(buildApp({stagingStatus: 'unstaged', discardSelectionLabel: 'Nope', discardSelection}));
    const button = wrapper.find('button.github-HunkHeaderView-discardButton');
    assert.isTrue(button.exists());
    assert.isTrue(wrapper.find('Tooltip[title="Nope"]').exists());
    button.simulate('click');
    assert.isTrue(discardSelection.called);
  });

  it('triggers the mousedown handler', function() {
    const mouseDown = sinon.spy();
    const wrapper = shallow(buildApp({mouseDown}));

    wrapper.find('.github-HunkHeaderView').simulate('mousedown');

    assert.isTrue(mouseDown.called);
  });

  it('stops mousedown events on the toggle button from propagating', function() {
    const mouseDown = sinon.spy();
    const wrapper = shallow(buildApp({mouseDown}));

    const evt = {stopPropagation: sinon.spy()};
    wrapper.find('.github-HunkHeaderView-stageButton').simulate('mousedown', evt);

    assert.isFalse(mouseDown.called);
    assert.isTrue(evt.stopPropagation.called);
  });
});
