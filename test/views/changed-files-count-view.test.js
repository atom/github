import React from 'react';
import {shallow} from 'enzyme';
import sinon from 'sinon';

import ChangedFilesCountView from '../../lib/views/changed-files-count-view';
import * as reporterProxy from '../../lib/reporter-proxy';

describe('ChangedFilesCountView', function() {
  let wrapper;

  it('renders diff icon', function() {
    wrapper = shallow(<ChangedFilesCountView />);
    assert.isTrue(wrapper.html().includes('icon-diff'));
  });

  it('renders merge conflict icon if there is a merge conflict', function() {
    wrapper = shallow(<ChangedFilesCountView mergeConflictsPresent={true} />);
    assert.isTrue(wrapper.html().includes('icon-alert'));
  });

  it('renders singular count for one file', function() {
    wrapper = shallow(<ChangedFilesCountView changedFilesCount={1} />);
    assert.isTrue(wrapper.text().includes('1 file'));
  });

  it('renders multiple count if more than one file', function() {
    wrapper = shallow(<ChangedFilesCountView changedFilesCount={2} />);
    assert.isTrue(wrapper.text().includes('2 files'));
  });

  it('records an event on click', function() {
    sinon.stub(reporterProxy, 'addEvent');
    reporterProxy.addEvent.reset();
    wrapper = shallow(<ChangedFilesCountView />);
    assert.deepEqual(reporterProxy.addEvent.callCount, 0);
    wrapper.simulate('click');
    assert.deepEqual(reporterProxy.addEvent.callCount, 1);
    const args = reporterProxy.addEvent.lastCall.args;
    assert.deepEqual(args[0], 'click');
    assert.deepEqual(args[1], {package: 'github', component: 'ChangedFileCountView'});
  });
});
