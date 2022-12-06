import React from 'react';
import {shallow} from 'enzyme';

import GithubTileView, {tooltipMessage} from '../../lib/views/github-tile-view';
import * as reporterProxy from '../../lib/reporter-proxy';

describe('GithubTileView', function() {
  let wrapper, clickSpy;
  beforeEach(function() {
    clickSpy = sinon.spy();
    wrapper = shallow(
      <GithubTileView
        didClick={clickSpy}
        tooltips={{}}
      />,
    );
  });

  it('renders github icon and text', function() {
    assert.isTrue(wrapper.html().includes('mark-github'));
    assert.isTrue(wrapper.text().includes('GitHub'));
  });

  it('renders tooltip', function() {
    const tooltip = wrapper.find('Tooltip');
    assert.isTrue(tooltip.props().title.includes(tooltipMessage));
  });


  it('calls props.didClick when clicked', function() {
    wrapper.find('button').simulate('click');
    assert.isTrue(clickSpy.calledOnce);
  });

  it('records an event on click', function() {
    sinon.stub(reporterProxy, 'addEvent');
    wrapper.find('button').simulate('click');
    assert.isTrue(reporterProxy.addEvent.calledWith('click', {package: 'github', component: 'GithubTileView'}));
  });
});
