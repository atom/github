import React from 'react';
import {shallow} from 'enzyme';
import path from 'path';
import {nullAuthor} from '../../lib/models/author';

import GitTabHeaderView from '../../lib/views/git-tab-header-view';

describe('GitTabHeaderView', function() {
  function build(options = {}) {
    const props = {
      committer: nullAuthor,
      workdirs: [],
      ...options,
    };
    return shallow(<GitTabHeaderView {...props} />);
  }

  describe('with a select listener and paths', function() {
    let wrapper, select;
    const path1 = path.normalize('test/path/project1');
    const path2 = path.normalize('2nd-test/path/project2');
    const paths = [path1, path2];

    beforeEach(function() {
      select = sinon.spy();
      wrapper = build({handleWorkDirSelect: select, workdirs: paths, workdir: path2});
    });

    it('renders an option for all given working directories', function() {
      wrapper.find('option').forEach(function(node, index) {
        assert.strictEqual(node.props().value, paths[index]);
        assert.strictEqual(node.children().text(), path.basename(paths[index]));
      });
    });

    it('selects the current working directory\'s path', function() {
      assert.strictEqual(wrapper.find('select').props().value, path2);
    });

    it('calls handleWorkDirSelect on select', function() {
      wrapper.find('select').simulate('change', {target: {value: path1}});
      assert.isTrue(select.calledWith({target: {value: path1}}));
    });
  });

  describe('with falsish props', function() {
    let wrapper;

    beforeEach(function() {
      wrapper = build();
    });

    it('renders no options', function() {
      assert.isFalse(wrapper.find('select').children().exists());
    });

    it('renders an avatar placeholder', function() {
      assert.strictEqual(wrapper.find('img.github-Project-avatar').prop('src'), 'atom://github/img/avatar.svg');
    });
  });
});
