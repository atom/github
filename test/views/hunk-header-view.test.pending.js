import React from 'react';
import {shallow} from 'enzyme';

import HunkHeaderView from '../../lib/views/hunk-header-view';
import Hunk from '../../lib/models/hunk';

describe('HunkHeaderView', function() {
  let atomEnv, hunk;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
    hunk = new Hunk(0, 1, 10, 11, 'section heading', []);
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
    assert.isTrue(wrapper.find('.github-HunkHeaderView').hasClass('is-selected'));

    wrapper.setProps({isSelected: false});
    assert.isFalse(wrapper.find('.github-HunkHeaderView').hasClass('is-selected'));
  });

  it('applies a CSS class in hunk selection mode', function() {
    const wrapper = shallow(buildApp({selectionMode: 'hunk'}));
    assert.isTrue(wrapper.find('.github-HunkHeaderView').hasClass('is-hunkMode'));

    wrapper.setProps({selectionMode: 'line'});
    assert.isFalse(wrapper.find('.github-HunkHeaderView').hasClass('is-hunkMode'));
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
});
