import PrPaneItemController from '../../lib/controllers/pr-pane-item-controller';

describe('PrPaneItemController', function() {
  describe('opener', function() {
    const paneItem = Symbol('paneItem');
    const Controller = PrPaneItemController.getWrappedComponentClass();
    beforeEach(function() {
      sinon.stub(Controller, 'create').returns(paneItem);
    });

    it('returns an item given a valid PR URL', function() {
      const item = Controller.opener('atom-github://pull-request/https://api.github.com/atom/github/123');
      assert.deepEqual(Controller.create.getCall(0).args[0], {
        host: 'https://api.github.com',
        owner: 'atom',
        repo: 'github',
        prNumber: 123,
      });
      assert.equal(item, paneItem);
    });

    [
      ['returns null if a segment is missing', 'atom-github://pull-request/https://api.github.com/atom/123'],
      ['returns null if the PR number is not a number', 'atom-github://pull-request/https://api.github.com/atom/github/asdf'],
      ['returns null if the host is not pull-request', 'atom-github://pr/https://api.github.com/atom/github/123'],
      ['returns null if the protocol is not atom-github', 'github://pull-request/https://api.github.com/atom/github/123'],
    ].forEach(([description, uri]) => {
      it(description, function() {
        const item = Controller.opener(uri);
        assert.isNull(item);
      });
    });
  });
});
