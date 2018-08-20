import {Addition, Deletion, NoNewline, Unchanged} from '../../../lib/models/patch/region';
import IndexedRowRange from '../../../lib/models/indexed-row-range';

describe('Regions', function() {
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

    it('has range accessors', function() {
      assert.strictEqual(addition.getRowRange(), range);
      assert.strictEqual(addition.getStartBufferRow(), 1);
    });

    it('delegates some methods to its row range', function() {
      assert.sameMembers(Array.from(addition.getBufferRows()), [1, 2, 3]);
      assert.strictEqual(addition.bufferRowCount(), 3);
      assert.isTrue(addition.includesBufferRow(2));
    });

    it('can be recognized by the isAddition predicate', function() {
      assert.isTrue(addition.isAddition());
      assert.isFalse(addition.isDeletion());
      assert.isFalse(addition.isUnchanged());
      assert.isFalse(addition.isNoNewline());

      assert.isTrue(addition.isChange());
    });

    it('executes the "addition" branch of a when() call', function() {
      const result = addition.when({
        addition: () => 'correct',
        deletion: () => 'wrong: deletion',
        unchanged: () => 'wrong: unchanged',
        nonewline: () => 'wrong: nonewline',
        default: () => 'wrong: default',
      });
      assert.strictEqual(result, 'correct');
    });

    it('executes the "default" branch of a when() call when no "addition" is provided', function() {
      const result = addition.when({
        deletion: () => 'wrong: deletion',
        unchanged: () => 'wrong: unchanged',
        nonewline: () => 'wrong: nonewline',
        default: () => 'correct',
      });
      assert.strictEqual(result, 'correct');
    });

    it('returns undefined from when() if neither "addition" nor "default" are provided', function() {
      const result = addition.when({
        deletion: () => 'wrong: deletion',
        unchanged: () => 'wrong: unchanged',
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
      assert.strictEqual(inverted.getRowRange(), addition.getRowRange());
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
      assert.isFalse(deletion.isUnchanged());
      assert.isFalse(deletion.isNoNewline());

      assert.isTrue(deletion.isChange());
    });

    it('executes the "deletion" branch of a when() call', function() {
      const result = deletion.when({
        addition: () => 'wrong: addition',
        deletion: () => 'correct',
        unchanged: () => 'wrong: unchanged',
        nonewline: () => 'wrong: nonewline',
        default: () => 'wrong: default',
      });
      assert.strictEqual(result, 'correct');
    });

    it('executes the "default" branch of a when() call when no "deletion" is provided', function() {
      const result = deletion.when({
        addition: () => 'wrong: addition',
        unchanged: () => 'wrong: unchanged',
        nonewline: () => 'wrong: nonewline',
        default: () => 'correct',
      });
      assert.strictEqual(result, 'correct');
    });

    it('returns undefined from when() if neither "deletion" nor "default" are provided', function() {
      const result = deletion.when({
        addition: () => 'wrong: addition',
        unchanged: () => 'wrong: unchanged',
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
      assert.strictEqual(inverted.getRowRange(), deletion.getRowRange());
    });
  });

  describe('Unchanged', function() {
    let unchanged;

    beforeEach(function() {
      unchanged = new Unchanged(range);
    });

    it('can be recognized by the isUnchanged predicate', function() {
      assert.isFalse(unchanged.isAddition());
      assert.isFalse(unchanged.isDeletion());
      assert.isTrue(unchanged.isUnchanged());
      assert.isFalse(unchanged.isNoNewline());

      assert.isFalse(unchanged.isChange());
    });

    it('executes the "unchanged" branch of a when() call', function() {
      const result = unchanged.when({
        addition: () => 'wrong: addition',
        deletion: () => 'wrong: deletion',
        unchanged: () => 'correct',
        nonewline: () => 'wrong: nonewline',
        default: () => 'wrong: default',
      });
      assert.strictEqual(result, 'correct');
    });

    it('executes the "default" branch of a when() call when no "unchanged" is provided', function() {
      const result = unchanged.when({
        addition: () => 'wrong: addition',
        deletion: () => 'wrong: deletion',
        nonewline: () => 'wrong: nonewline',
        default: () => 'correct',
      });
      assert.strictEqual(result, 'correct');
    });

    it('returns undefined from when() if neither "unchanged" nor "default" are provided', function() {
      const result = unchanged.when({
        addition: () => 'wrong: addition',
        deletion: () => 'wrong: deletion',
        nonewline: () => 'wrong: nonewline',
      });
      assert.isUndefined(result);
    });

    it('uses " " as a prefix for toStringIn()', function() {
      assert.strictEqual(unchanged.toStringIn(buffer), ' 1111\n 2222\n 3333\n');
    });

    it('inverts as itself', function() {
      assert.strictEqual(unchanged.invert(), unchanged);
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
      assert.isFalse(noNewline.isUnchanged());
      assert.isTrue(noNewline.isNoNewline());

      assert.isFalse(noNewline.isChange());
    });

    it('executes the "nonewline" branch of a when() call', function() {
      const result = noNewline.when({
        addition: () => 'wrong: addition',
        deletion: () => 'wrong: deletion',
        unchanged: () => 'wrong: unchanged',
        nonewline: () => 'correct',
        default: () => 'wrong: default',
      });
      assert.strictEqual(result, 'correct');
    });

    it('executes the "default" branch of a when() call when no "nonewline" is provided', function() {
      const result = noNewline.when({
        addition: () => 'wrong: addition',
        deletion: () => 'wrong: deletion',
        unchanged: () => 'wrong: unchanged',
        default: () => 'correct',
      });
      assert.strictEqual(result, 'correct');
    });

    it('returns undefined from when() if neither "nonewline" nor "default" are provided', function() {
      const result = noNewline.when({
        addition: () => 'wrong: addition',
        deletion: () => 'wrong: deletion',
        unchanged: () => 'wrong: unchanged',
      });
      assert.isUndefined(result);
    });

    it('uses "\\" as a prefix for toStringIn()', function() {
      assert.strictEqual(noNewline.toStringIn(buffer), '\\1111\n\\2222\n\\3333\n');
    });

    it('inverts as itself', function() {
      assert.strictEqual(noNewline.invert(), noNewline);
    });
  });
});
