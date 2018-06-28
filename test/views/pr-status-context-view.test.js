import React from 'react';
import {shallow} from 'enzyme';

import {BarePrStatusContextView} from '../../lib/views/pr-status-context-view';
import {createStatusContextResult} from '../fixtures/factories/pull-request-result';

describe('PrStatusContextView', function() {
  function buildApp(opts = {}) {
    return <BarePrStatusContextView context={createStatusContextResult(opts)} />;
  }

  it('renders an octicon corresponding to the status context state', function() {
    const wrapper = shallow(buildApp({state: 'ERROR'}));
    assert.isTrue(wrapper.find('Octicon[icon="alert"]').hasClass('github-PrStatuses--error'));
  });

  it('renders the context name and description', function() {
    const wrapper = shallow(buildApp({context: 'the context', description: 'the description'}));
    assert.match(wrapper.find('.github-PrStatuses-list-item-context').text(), /the context/);
    assert.match(wrapper.find('.github-PrStatuses-list-item-context').text(), /the description/);
  });

  it('renders a link to the details', function() {
    const targetUrl = 'https://ci.provider.com/builds/123';
    const wrapper = shallow(buildApp({targetUrl}));
    assert.strictEqual(wrapper.find('.github-PrStatuses-list-item-details-link a').prop('href'), targetUrl);
  });
});
