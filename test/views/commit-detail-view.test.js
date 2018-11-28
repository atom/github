import React from 'react';
import {shallow} from 'enzyme';

describe('CommitDetailView', function() {
  it('has a MultiFilePatchController that its itemType set');

  it('passes unrecognized props to a MultiFilePatchController');

  it('renders commit details properly');

  it('renders multiple avatars for co-authored commit');
});

/*
it('has a MultiFilePatchController that has `disableStageUnstage` flag set to true', function() {
  const wrapper = mount(buildApp());
  assert.isTrue(wrapper.find('MultiFilePatchController').exists());
  assert.isTrue(wrapper.find('MultiFilePatchController').prop('disableStageUnstage'));
});

it('passes unrecognized props to a MultiFilePatchController', function() {
  const extra = Symbol('extra');
  const wrapper = shallow(buildApp({extra}));

  assert.strictEqual(wrapper.find('MultiFilePatchController').prop('extra'), extra);
});

it('renders commit details properly', function() {
  const newCommit = new Commit({
    sha: '420',
    authorEmail: 'very@nice.com',
    authorDate: moment().subtract(2, 'days').unix(),
    messageSubject: 'subject',
    messageBody: 'messageBody',
  });
  const {multiFilePatch: mfp} = multiFilePatchBuilder().addFilePatch().build();
  sinon.stub(newCommit, 'getMultiFileDiff').returns(mfp);
  const wrapper = mount(buildApp({commit: newCommit}));

  assert.strictEqual(wrapper.find('.github-CommitDetailView-title').text(), 'subject');
  assert.strictEqual(wrapper.find('.github-CommitDetailView-moreText').text(), 'messageBody');
  assert.strictEqual(wrapper.find('.github-CommitDetailView-metaText').text(), 'very@nice.com committed 2 days ago');
  assert.strictEqual(wrapper.find('.github-CommitDetailView-sha').text(), '420');
  // assert.strictEqual(wrapper.find('.github-CommitDetailView-sha a').prop('href'), '420');
  assert.strictEqual(wrapper.find('img.github-RecentCommit-avatar').prop('src'), 'https://avatars.githubusercontent.com/u/e?email=very%40nice.com&s=32');
});

it('renders multiple avatars for co-authored commit', function() {
  const newCommit = new Commit({
    sha: '420',
    authorEmail: 'very@nice.com',
    authorDate: moment().subtract(2, 'days').unix(),
    messageSubject: 'subject',
    messageBody: 'messageBody',
    coAuthors: [{name: 'two', email: 'two@coauthor.com'}, {name: 'three', email: 'three@coauthor.com'}],
  });
  const {multiFilePatch: mfp} = multiFilePatchBuilder().addFilePatch().build();
  sinon.stub(newCommit, 'getMultiFileDiff').returns(mfp);
  const wrapper = mount(buildApp({commit: newCommit}));
  assert.deepEqual(
    wrapper.find('img.github-RecentCommit-avatar').map(w => w.prop('src')),
    [
      'https://avatars.githubusercontent.com/u/e?email=very%40nice.com&s=32',
      'https://avatars.githubusercontent.com/u/e?email=two%40coauthor.com&s=32',
      'https://avatars.githubusercontent.com/u/e?email=three%40coauthor.com&s=32',
    ],
  );
});
*/
