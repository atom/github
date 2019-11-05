import React from 'react';
import {shallow} from 'enzyme';
import path from 'path';
import Author, {nullAuthor} from '../../lib/models/author';
import {Disposable} from 'atom';

import GithubTabHeaderView from '../../lib/views/github-tab-header-view';

describe('GithubTabHeaderView', function() {
  function build(options = {}) {
    const props = {
      currentWorkDir: undefined,
      onDidChangeWorkDirs: undefined,
      onDidUpdateRepo: undefined,
      handleWorkDirSelect: undefined,
      getCurrentWorkDirs: () => [],
      getCommitter: () => nullAuthor,
      isRepoDestroyed: () => false,
      ...options,
    };
    return shallow(<GithubTabHeaderView {...props} />);
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
      const stub = function(updateWorkDirs) {
        updateWorkDirs();
        return {dispose: disposeSpy};
      };
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
      assert.isFalse(wrapper.find('select').children().exists());
    });
  });

  describe('when updating with changed props', function() {
    let wrapper, changeSpy, disposeSpy, committerSpy;

    beforeEach(function() {
      disposeSpy = sinon.spy();
      committerSpy = sinon.spy(() => nullAuthor);
      const stub = function(callback) {
        callback();
        return {dispose: disposeSpy};
      };
      changeSpy = sinon.spy(() => (new Disposable()));
      wrapper = build({onDidChangeWorkDirs: stub, onDidUpdateRepo: stub});
      wrapper.setProps({
        onDidChangeWorkDirs: changeSpy,
        onDidUpdateRepo: changeSpy,
        getCommitter: committerSpy,
      });
    });

    it('calls dispose for all subscriptions', function() {
      assert.isTrue(disposeSpy.calledTwice);
    });

    it('calls getCommitter', function() {
      assert.isTrue(committerSpy.calledOnce);
    });

    it('calls all reactive functions', function() {
      assert.isTrue(changeSpy.calledTwice);
    });
  });

  describe('when updating with falsish props', function() {
    let wrapper;

    beforeEach(function() {
      wrapper = build({
        onDidChangeWorkDirs: () => new Disposable(),
        onDidUpdateRepo: () => new Disposable(),
        getCommitter: () => new Author('dao', 'dai'),
      });
      wrapper.setProps({
        onDidChangeWorkDirs: undefined,
        onDidUpdateRepo: undefined,
        getCommitter: () => null,
      });
    });

    it('does not make any new disposables', function() {
      assert.strictEqual(wrapper.instance().disposable.disposables.size, 0);
    });

    it('uses nullAuthor instead of null', function() {
      assert.strictEqual(wrapper.state('committer'), nullAuthor);
    });
  });
});
