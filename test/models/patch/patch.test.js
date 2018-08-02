import Patch, {nullPatch} from '../../../lib/models/patch/patch';
import Hunk from '../../../lib/models/patch/hunk';
import IndexedRowRange, {nullIndexedRowRange} from '../../../lib/models/indexed-row-range';

describe('Patch', function() {
  it('has some standard accessors', function() {
    const p = new Patch({status: 'modified', hunks: [], bufferText: 'bufferText'});
    assert.strictEqual(p.getStatus(), 'modified');
    assert.deepEqual(p.getHunks(), []);
    assert.strictEqual(p.getBufferText(), 'bufferText');
    assert.isTrue(p.isPresent());
  });

  it('computes the byte size of the total patch data', function() {
    const p = new Patch({status: 'modified', hunks: [], bufferText: '\u00bd + \u00bc = \u00be'});
    assert.strictEqual(p.getByteSize(), 12);
  });

  it('clones itself with optionally overridden properties', function() {
    const original = new Patch({status: 'modified', hunks: [], bufferText: 'bufferText'});

    const dup0 = original.clone();
    assert.notStrictEqual(dup0, original);
    assert.strictEqual(dup0.getStatus(), 'modified');
    assert.deepEqual(dup0.getHunks(), []);
    assert.strictEqual(dup0.getBufferText(), 'bufferText');

    const dup1 = original.clone({status: 'added'});
    assert.notStrictEqual(dup1, original);
    assert.strictEqual(dup1.getStatus(), 'added');
    assert.deepEqual(dup1.getHunks(), []);
    assert.strictEqual(dup1.getBufferText(), 'bufferText');

    const hunks = [new Hunk({})];
    const dup2 = original.clone({hunks});
    assert.notStrictEqual(dup2, original);
    assert.strictEqual(dup2.getStatus(), 'modified');
    assert.deepEqual(dup2.getHunks(), hunks);
    assert.strictEqual(dup2.getBufferText(), 'bufferText');

    const dup3 = original.clone({bufferText: 'changed'});
    assert.notStrictEqual(dup3, original);
    assert.strictEqual(dup3.getStatus(), 'modified');
    assert.deepEqual(dup3.getHunks(), []);
    assert.strictEqual(dup3.getBufferText(), 'changed');
  });

  it('clones a nullPatch as a nullPatch', function() {
    assert.strictEqual(nullPatch, nullPatch.clone());
  });

  it('clones a nullPatch to a real Patch if properties are provided', function() {
    const dup0 = nullPatch.clone({status: 'added'});
    assert.notStrictEqual(dup0, nullPatch);
    assert.strictEqual(dup0.getStatus(), 'added');
    assert.deepEqual(dup0.getHunks(), []);
    assert.strictEqual(dup0.getBufferText(), '');

    const hunks = [new Hunk({})];
    const dup1 = nullPatch.clone({hunks});
    assert.notStrictEqual(dup1, nullPatch);
    assert.isNull(dup1.getStatus());
    assert.deepEqual(dup1.getHunks(), hunks);
    assert.strictEqual(dup1.getBufferText(), '');

    const dup2 = nullPatch.clone({bufferText: 'changed'});
    assert.notStrictEqual(dup2, nullPatch);
    assert.isNull(dup2.getStatus());
    assert.deepEqual(dup2.getHunks(), []);
    assert.strictEqual(dup2.getBufferText(), 'changed');
  });

  it('prints itself as an apply-ready string', function() {
    const bufferText = '0000\n1111\n2222\n3333\n4444\n5555\n6666\n7777\n8888\n9999\n';
    // old: 0000.2222.3333.4444.5555.6666.7777.8888.9999.
    // new: 0000.1111.2222.3333.4444.5555.6666.9999.
    // 0000.1111.2222.3333.4444.5555.6666.7777.8888.9999.

    const hunk0 = new Hunk({
      oldStartRow: 0,
      newStartRow: 0,
      oldRowCount: 2,
      newRowCount: 3,
      sectionHeading: 'zero',
      rowRange: new IndexedRowRange({bufferRange: [[0, 0], [2, 0]], startOffset: 0, endOffset: 15}),
      additions: [
        new IndexedRowRange({bufferRange: [[1, 0], [1, 0]], startOffset: 5, endOffset: 10}),
      ],
      deletions: [],
      noNewline: nullIndexedRowRange,
    });

    const hunk1 = new Hunk({
      oldStartRow: 5,
      newStartRow: 6,
      oldRowCount: 4,
      newRowCount: 2,
      sectionHeading: 'one',
      rowRange: new IndexedRowRange({bufferRange: [[6, 0], [10, 0]], startOffset: 30, endOffset: 55}),
      additions: [],
      deletions: [
        new IndexedRowRange({bufferRange: [[7, 0], [8, 0]], startOffset: 35, endOffset: 45}),
      ],
      noNewline: nullIndexedRowRange,
    });

    const p = new Patch({status: 'modified', hunks: [hunk0, hunk1], bufferText});

    assert.strictEqual(p.toString(), [
      '@@ -0,2 +0,3 @@\n',
      ' 0000\n',
      '+1111\n',
      ' 2222\n',
      '@@ -5,4 +6,2 @@\n',
      ' 6666\n',
      '-7777\n',
      '-8888\n',
      ' 9999\n',
    ].join(''));
  });

  it('has a stubbed nullPatch counterpart', function() {
    assert.isNull(nullPatch.getStatus());
    assert.deepEqual(nullPatch.getHunks(), []);
    assert.strictEqual(nullPatch.getBufferText(), '');
    assert.strictEqual(nullPatch.getByteSize(), 0);
    assert.isFalse(nullPatch.isPresent());
  });
});
