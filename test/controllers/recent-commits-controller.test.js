import React from 'react';
import {shallow} from 'enzyme';

import RecentCommitsController from '../../lib/controllers/recent-commits-controller';
import Commit from '../../lib/models/commit';

describe('RecentCommitsController', function() {
  let app;

  beforeEach(function() {
    app = <RecentCommitsController commits={[]} undoLastCommit={() => {}} isLoading={false} />;
  });

  it('passes recent commits to the RecentCommitsView', function() {
    const commits = [new Commit('1'), new Commit('2'), new Commit('3')];
    app = React.cloneElement(app, {commits});
    const wrapper = shallow(app);
    assert.deepEqual(wrapper.find('RecentCommitsView').prop('commits'), commits);
  });

  it('passes fetch progress to the RecentCommitsView', function() {
    app = React.cloneElement(app, {isLoading: true});
    const wrapper = shallow(app);
    assert.isTrue(wrapper.find('RecentCommitsView').prop('isLoading'));
  });
});
