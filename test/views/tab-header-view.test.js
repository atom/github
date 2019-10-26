import React from 'react';
import {shallow} from 'enzyme';
import path from 'path';

import TabHeaderView from '../../lib/views/tab-header-view';

describe('TabHeaderView', function() {
  function build(options = {}) {
    const props = {
      currentWorkDir: undefined,
      onDidChangeWorkDirs: undefined,
      handleWorkDirSelect: undefined,
      getCurrentWorkDirs: () => [],
      ...options,
    };
    return shallow(<TabHeaderView {...props} />);
  }

  describe('with a select listener and paths', function() {
    let wrapper, select;
    const path1 = path.normalize('test/path/project1');
    const path2 = path.normalize('2nd-test/path/project2');
    const paths = [path1, path2];

    beforeEach(function() {
      select = sinon.spy();
      wrapper = build({handleWorkDirSelect: select, getCurrentWorkDirs: () => paths, currentWorkDir: path2});
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

    it('updates paths', function() {
      const path3 = 'test3/path/project3';
      paths.push(path3);
      wrapper.instance().updateWorkDirs();
      assert.strictEqual(wrapper.find('option').length, 3);
    });
  });

  describe('with onDidChangeWorkDirs', function() {
    let wrapper, changeSpy, disposeSpy;

    beforeEach(function() {
      disposeSpy = sinon.spy();
      const stub = sinon.stub().callsFake(function(updateWorkDirs) {
        updateWorkDirs();
        return {dispose: disposeSpy};
      });
      changeSpy = sinon.spy(stub);
      wrapper = build({onDidChangeWorkDirs: changeSpy});
    });

    it('calls onDidChangeWorkDirs with updateWorkDirs', function() {
      assert.isTrue(changeSpy.calledWith(wrapper.instance().updateWorkDirs));
    });

    it('calls dispose on unmount', function() {
      wrapper.unmount();
      assert.isTrue(disposeSpy.called);
    });

    it('does nothing on unmount without a disposable', function() {
      wrapper.instance().disposable = undefined;
      wrapper.unmount();
      assert.isFalse(disposeSpy.called);
    });

  });

  describe('with no paths', function() {
    let wrapper;

    beforeEach(function() {
      wrapper = build();
    });

    it('renders no options', function() {
      assert.isTrue(wrapper.find('select').children().isEmpty());
    });
  });
});
