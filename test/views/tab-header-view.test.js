import React from 'react';
import {shallow} from 'enzyme';
import path from 'path';

import TabHeaderView from '../../lib/views/tab-header-view';

describe('TabHeaderView', function() {
  let wrapper, select;
  const path1 = 'test/path/project1';
  const path2 = '2nd-test/path/project2';
  const paths = [path1, path2];

  beforeEach(function() {
    select = sinon.spy();
    wrapper = shallow(<TabHeaderView handleProjectSelect={select} projectPaths={paths} currentProject={path2} />);
  });

  it('renders an option for all given project paths', function() {
    wrapper.find('option').forEach(function(node, index) {
      assert.strictEqual(node.props().value, paths[index]);
      assert.strictEqual(node.children().text(), path.basename(paths[index]));
    });
  });

  it('selects the current project\'s path', function() {
    assert.strictEqual(wrapper.find('select').props().value, path2);
  });

  it('calls handleProjectSelect on select', function() {
    wrapper.find('select').simulate('change', {target: {value: path1}});
    assert.isTrue(select.calledWith({target: {value: path1}}));
  });
});
