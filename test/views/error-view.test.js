import React from 'react';
import {shallow} from 'enzyme';

import ErrorView from '../../lib/views/error-view';

describe('ErrorView', function() {
  function buildApp(overrideProps = {}) {
    return (
      <ErrorView
        title={'zomg'}
        descriptions={['something', 'went', 'wrong']}
        preformatted={false}
        retry={() => {}}
        logout={() => {}}
        {...overrideProps}
      />
    );
  }
  it('renders title', function() {
    const wrapper = shallow(buildApp());
    const title = wrapper.find('.github-Message-title');
    assert.strictEqual(title.text(), 'zomg');
  });

  it('renders descriptions', function() {
    const wrapper = shallow(buildApp());
    const descriptions = wrapper.find('.github-Message-description');
    assert.lengthOf(descriptions, 3);
    assert.strictEqual(descriptions.at(0).text(), 'something');
    assert.strictEqual(descriptions.at(1).text(), 'went');
    assert.strictEqual(descriptions.at(2).text(), 'wrong');
  });

  it('renders retry button that  if retry prop is passed', function() {
    const retrySpy = sinon.spy();
    const wrapper = shallow(buildApp({retry: retrySpy}));

    const retryButton = wrapper.find('.btn-primary');
    assert.strictEqual(retryButton.text(), 'Try Again');

    assert.strictEqual(retrySpy.callCount, 0);
    retryButton.simulate('click');
    assert.strictEqual(retrySpy.callCount, 1);
  });

  it('does not render retry button if retry prop is not passed', function() {
    const wrapper = shallow(buildApp({retry: null}));
    const retryButton = wrapper.find('.btn-primary');
    assert.lengthOf(retryButton, 0);
  });

  it('renders logout button if logout prop is passed', function() {
    const logoutSpy = sinon.spy();
    const wrapper = shallow(buildApp({logout: logoutSpy}));

    const logoutButton = wrapper.find('.btn-logout');
    assert.strictEqual(logoutButton.text(), 'Logout');

    assert.strictEqual(logoutSpy.callCount, 0);
    logoutButton.simulate('click');
    assert.strictEqual(logoutSpy.callCount, 1);
  });

  it('does not render logout button if logout prop is not passed', function() {
    const wrapper = shallow(buildApp({logout: null}));
    const logoutButton = wrapper.find('.btn-logout');
    assert.lengthOf(logoutButton, 0);
  });

  it('renders the devtools button if the devtools function prop is passed', function() {
    const openDevTools = sinon.spy();
    const wrapper = shallow(buildApp({openDevTools}));
    wrapper.find('.btn-devtools').simulate('click');
    assert.isTrue(openDevTools.called);
  });

  it('does not render the devtools button if the devtools prop is not passed', function() {
    const wrapper = shallow(buildApp());
    assert.isFalse(wrapper.exists('.btn-devtools'));
  });
});
