import React from 'react';
import {shallow} from 'enzyme';

import {BarePrStatusesView} from '../../lib/views/pr-statuses-view';
import {createPullRequestResult} from '../fixtures/factories/pull-request-result';

describe('PrStatusesView', function() {
  function buildPullRequestResult(opts) {
    return createPullRequestResult({includeEdges: true, ...opts});
  }

  function buildApp(opts, overrideProps = {}) {
    const props = {
      relay: {
        refetch: () => {},
      },
      displayType: 'full',
      pullRequest: buildPullRequestResult(opts),
      ...overrideProps,
    };

    return <BarePrStatusesView {...props} />;
  }

  it('renders nothing if the pull request has no status', function() {
    const wrapper = shallow(buildApp({}));
    assert.lengthOf(wrapper.children(), 0);
  });

  it('renders a styled octicon with displayType: check', function() {
    const wrapper = shallow(buildApp({summaryState: 'EXPECTED'}, {displayType: 'check'}));
    assert.isTrue(wrapper.find('Octicon[icon="primitive-dot"]').hasClass('github-PrStatuses--warning'));

    wrapper.setProps({
      pullRequest: buildPullRequestResult({summaryState: 'PENDING'}),
    });
    assert.isTrue(wrapper.find('Octicon[icon="primitive-dot"]').hasClass('github-PrStatuses--warning'));

    wrapper.setProps({
      pullRequest: buildPullRequestResult({summaryState: 'SUCCESS'}),
    });
    assert.isTrue(wrapper.find('Octicon[icon="check"]').hasClass('github-PrStatuses--success'));

    wrapper.setProps({
      pullRequest: buildPullRequestResult({summaryState: 'ERROR'}),
    });
    assert.isTrue(wrapper.find('Octicon[icon="alert"]').hasClass('github-PrStatuses--error'));

    wrapper.setProps({
      pullRequest: buildPullRequestResult({summaryState: 'FAILURE'}),
    });
    assert.isTrue(wrapper.find('Octicon[icon="x"]').hasClass('github-PrStatuses--error'));
  });

  it('renders a donut chart', function() {
    const wrapper = shallow(buildApp({summaryState: 'FAILURE', states: ['SUCCESS', 'FAILURE', 'ERROR']}));

    const donutChart = wrapper.find('StatusDonutChart');
    assert.strictEqual(donutChart.prop('pending'), 0);
    assert.strictEqual(donutChart.prop('failure'), 2);
    assert.strictEqual(donutChart.prop('success'), 1);
  });

  it('renders a summary sentence', function() {
    const wrapper = shallow(buildApp({summaryState: 'SUCCESS', states: ['SUCCESS', 'SUCCESS', 'SUCCESS']}));
    assert.strictEqual(wrapper.find('.github-PrStatuses-summary').text(), 'All checks succeeded');

    wrapper.setProps({
      pullRequest: buildPullRequestResult({summaryState: 'FAILURE', states: ['FAILURE', 'ERROR', 'FAILURE']}),
    });
    assert.strictEqual(wrapper.find('.github-PrStatuses-summary').text(), 'All checks failed');

    wrapper.setProps({
      pullRequest: buildPullRequestResult({summaryState: 'PENDING', states: ['PENDING', 'PENDING', 'PENDING']}),
    });
    assert.strictEqual(wrapper.find('.github-PrStatuses-summary').text(), '3 pending checks');

    // No pending checks
    wrapper.setProps({
      pullRequest: buildPullRequestResult({summaryState: 'FAILURE', states: ['SUCCESS', 'SUCCESS', 'FAILURE']}),
    });
    assert.strictEqual(wrapper.find('.github-PrStatuses-summary').text(), '1 failing and 2 successful checks');

    // No failing checks
    wrapper.setProps({
      pullRequest: buildPullRequestResult({summaryState: 'PENDING', states: ['SUCCESS', 'PENDING', 'PENDING']}),
    });
    assert.strictEqual(wrapper.find('.github-PrStatuses-summary').text(), '2 pending and 1 successful checks');

    // No succeeding checks
    wrapper.setProps({
      pullRequest: buildPullRequestResult({summaryState: 'FAILURE', states: ['FAILURE', 'ERROR', 'PENDING']}),
    });
    assert.strictEqual(wrapper.find('.github-PrStatuses-summary').text(), '1 pending and 2 failing checks');

    // All three categories
    wrapper.setProps({
      pullRequest: buildPullRequestResult({summaryState: 'FAILURE', states: ['PENDING', 'SUCCESS', 'SUCCESS', 'FAILURE', 'FAILURE', 'FAILURE']}),
    });
    assert.strictEqual(wrapper.find('.github-PrStatuses-summary').text(), '1 pending, 3 failing, and 2 successful checks');

    // Singular
    wrapper.setProps({
      pullRequest: buildPullRequestResult({summaryState: 'PENDING', states: ['PENDING']}),
    });
    assert.strictEqual(wrapper.find('.github-PrStatuses-summary').text(), '1 pending check');
  });

  it('renders a context view for each status context', function() {
    const wrapper = shallow(buildApp({summaryState: 'FAILURE', states: ['SUCCESS', 'FAILURE', 'ERROR']}));

    const contextViews = wrapper.find('Relay(PrStatusContext)');
    assert.deepEqual(contextViews.map(v => v.prop('context').state), ['SUCCESS', 'FAILURE', 'ERROR']);
  });

  it('constructs a PeriodicRefresher to update the status checks', function() {
    const refetch = sinon.stub();
    const wrapper = shallow(buildApp({summaryState: 'PENDING', states: ['PENDING', 'PENDING']}, {
      relay: {
        refetch,
      },
    }));
    const refresher = wrapper.instance().refresher;
    assert.strictEqual(refresher.options.interval(), BarePrStatusesView.PENDING_REFRESH_TIMEOUT);

    wrapper.setProps({
      pullRequest: buildPullRequestResult({summaryState: 'FAILURE', state: ['FAILURE', 'SUCCESS']}),
    });
    assert.strictEqual(refresher.options.interval(), BarePrStatusesView.SUCCESS_REFRESH_TIMEOUT);

    assert.isFalse(refetch.called);
    refresher.refreshNow(true);
    assert.isTrue(refetch.calledWith({id: 'pullrequest0'}));

    sinon.spy(refresher, 'destroy');
    wrapper.unmount();
    assert.isTrue(refresher.destroy.called);
  });

  it('throws an error on an unknown state', function() {
    assert.throws(() => shallow(buildApp({states: ['OHNO']})), /OHNO/);
  });

  it('throws an error on an unknown displayType', function() {
    assert.throws(() => shallow(buildApp({states: ['SUCCESS']}, {displayType: 'crazypants'})), /crazypants/);
  });
});
