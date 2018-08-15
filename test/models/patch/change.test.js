import {Addition, Deletion, NoNewline} from '../../../lib/models/patch/change';
import IndexedRowRange from '../../../lib/models/indexed-row-range';

describe('Changes', function() {
  let buffer, range;

  beforeEach(function() {
    buffer = '0000\n1111\n2222\n3333\n4444\n5555\n';
    range = new IndexedRowRange({bufferRange: [[1, 0], [3, 0]], startOffset: 5, endOffset: 20});
  });

  describe('Addition', function() {
    let addition;

    beforeEach(function() {
      addition = new Addition(range);
    });

    it('has a range accessor', function() {
      assert.strictEqual(addition.getRange(), range);
    });

    it('can be recognized by the isAddition predicate', function() {
      assert.isTrue(addition.isAddition());
      assert.isFalse(addition.isDeletion());
      assert.isFalse(addition.isNoNewline());
    });

    it('executes the "addition" branch of a when() call', function() {
      const result = addition.when({
        addition: () => 'correct',
        deletion: () => 'wrong: deletion',
        nonewline: () => 'wrong: nonewline',
        default: () => 'wrong: default',
      });
      assert.strictEqual(result, 'correct');
    });

    it('executes the "default" branch of a when() call when no "addition" is provided', function() {
      const result = addition.when({
        deletion: () => 'wrong: deletion',
        nonewline: () => 'wrong: nonewline',
        default: () => 'correct',
      });
      assert.strictEqual(result, 'correct');
    });

    it('returns undefined from when() if neither "addition" nor "default" are provided', function() {
      const result = addition.when({
        deletion: () => 'wrong: deletion',
        nonewline: () => 'wrong: nonewline',
      });
      assert.isUndefined(result);
    });

    it('uses "+" as a prefix for toStringIn()', function() {
      assert.strictEqual(addition.toStringIn(buffer), '+1111\n+2222\n+3333\n');
    });

    it('inverts to a deletion', function() {
      const inverted = addition.invert();
      assert.isTrue(inverted.isDeletion());
      assert.strictEqual(inverted.getRange(), addition.getRange());
    });
  });

  describe('Deletion', function() {
    let deletion;

    beforeEach(function() {
      deletion = new Deletion(range);
    });

    it('can be recognized by the isDeletion predicate', function() {
      assert.isFalse(deletion.isAddition());
      assert.isTrue(deletion.isDeletion());
      assert.isFalse(deletion.isNoNewline());
    });

    it('executes the "deletion" branch of a when() call', function() {
      const result = deletion.when({
        addition: () => 'wrong: addition',
        deletion: () => 'correct',
        nonewline: () => 'wrong: nonewline',
        default: () => 'wrong: default',
      });
      assert.strictEqual(result, 'correct');
    });

    it('executes the "default" branch of a when() call when no "deletion" is provided', function() {
      const result = deletion.when({
        addition: () => 'wrong: addition',
        nonewline: () => 'wrong: nonewline',
        default: () => 'correct',
      });
      assert.strictEqual(result, 'correct');
    });

    it('returns undefined from when() if neither "deletion" nor "default" are provided', function() {
      const result = deletion.when({
        addition: () => 'wrong: addition',
        nonewline: () => 'wrong: nonewline',
      });
      assert.isUndefined(result);
    });

    it('uses "-" as a prefix for toStringIn()', function() {
      assert.strictEqual(deletion.toStringIn(buffer), '-1111\n-2222\n-3333\n');
    });

    it('inverts to an addition', function() {
      const inverted = deletion.invert();
      assert.isTrue(inverted.isAddition());
      assert.strictEqual(inverted.getRange(), deletion.getRange());
    });
  });

  describe('NoNewline', function() {
    let noNewline;

    beforeEach(function() {
      noNewline = new NoNewline(range);
    });

    it('can be recognized by the isNoNewline predicate', function() {
      assert.isFalse(noNewline.isAddition());
      assert.isFalse(noNewline.isDeletion());
      assert.isTrue(noNewline.isNoNewline());
    });

    it('executes the "nonewline" branch of a when() call', function() {
      const result = noNewline.when({
        addition: () => 'wrong: addition',
        deletion: () => 'wrong: deletion',
        nonewline: () => 'correct',
        default: () => 'wrong: default',
      });
      assert.strictEqual(result, 'correct');
    });

    it('executes the "default" branch of a when() call when no "nonewline" is provided', function() {
      const result = noNewline.when({
        addition: () => 'wrong: addition',
        deletion: () => 'wrong: deletion',
        default: () => 'correct',
      });
      assert.strictEqual(result, 'correct');
    });

    it('returns undefined from when() if neither "nonewline" nor "default" are provided', function() {
      const result = noNewline.when({
        addition: () => 'wrong: addition',
        deletion: () => 'wrong: deletion',
      });
      assert.isUndefined(result);
    });

    it('uses "\\ " as a prefix for toStringIn()', function() {
      assert.strictEqual(noNewline.toStringIn(buffer), '\\ 1111\n\\ 2222\n\\ 3333\n');
    });

    it('inverts as itself', function() {
      assert.strictEqual(noNewline.invert(), noNewline);
    });
  });
});
