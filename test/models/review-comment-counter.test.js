import ReviewCommentCounter from '../../lib/models/review-comment-counter';

describe('ReviewCommentCounter', function() {
  let counter, sub;

  beforeEach(function() {
    counter = new ReviewCommentCounter();
  });

  afterEach(function() {
    sub && sub.dispose();
  });

  it('begins with zero total and resolved', function() {
    assert.strictEqual(counter.getTotalCount(), 0);
    assert.strictEqual(counter.getResolvedCount(), 0);
  });

  it('increments total but not resolve when presented with an unresolved comment thread', function() {
    const cb = sinon.spy();
    sub = counter.onDidChange(cb);
    counter.countAll([{isResolved: false}, {isResolved: false}]);

    assert.strictEqual(counter.getTotalCount(), 2);
    assert.strictEqual(counter.getResolvedCount(), 0);
    assert.isTrue(cb.called);
  });

  it('increments total and resolved when presented with a resolved comment thread', function() {
    const cb = sinon.spy();
    sub = counter.onDidChange(cb);
    counter.countAll([{isResolved: true}, {isResolved: true}, {isResolved: true}]);

    assert.strictEqual(counter.getTotalCount(), 3);
    assert.strictEqual(counter.getResolvedCount(), 3);
    assert.isTrue(cb.called);
  });

  it('does not fire the change listener if no threads were found', function() {
    const cb = sinon.spy();
    sub = counter.onDidChange(cb);
    counter.countAll([]);
    assert.isFalse(cb.called);
  });
});
