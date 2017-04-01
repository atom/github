import IssueishPaneItem from '../../lib/atom-items/issueish-pane-item';

describe('IssueishPaneItem', function() {
  describe('opener', function() {
    const paneItem = Symbol('paneItem');
    beforeEach(function() {
      sinon.stub(IssueishPaneItem, 'create').returns(paneItem);
    });

    it('returns an item given a valid PR URL', function() {
      const item = IssueishPaneItem.opener('atom-github://issueish/https://api.github.com/atom/github/123');
      assert.deepEqual(IssueishPaneItem.create.getCall(0).args[0], {
        host: 'https://api.github.com',
        owner: 'atom',
        repo: 'github',
        issueishNumber: 123,
      });
      assert.equal(item, paneItem);
    });

    [
      ['returns null if a segment is missing', 'atom-github://issueish/https://api.github.com/atom/123'],
      ['returns null if the PR number is not a number', 'atom-github://issueish/https://api.github.com/atom/github/asdf'],
      ['returns null if the host is not issueish', 'atom-github://pr/https://api.github.com/atom/github/123'],
      ['returns null if the protocol is not atom-github', 'github://issueish/https://api.github.com/atom/github/123'],
    ].forEach(([description, uri]) => {
      it(description, function() {
        const item = IssueishPaneItem.opener(uri);
        assert.isNull(item);
      });
    });
  });
});
