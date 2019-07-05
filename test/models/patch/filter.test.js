import {filter, MAX_PATCH_CHARS} from '../../../lib/models/patch/filter';

describe('patch filter', function() {
  it('passes through small patches as-is', function() {
    const original = new PatchBuilder()
      .addSmallPatch('path-a.txt')
      .addSmallPatch('path-b.txt')
      .toString();

    const {filtered, removed} = filter(original, new Set(['path-a.txt', 'path-b.txt']));
    assert.lengthOf(Array.from(removed), 0);
    assert.strictEqual(filtered, original);
  });

  it('retains only files matching requested paths', function() {
    const original = new PatchBuilder()
      .addSmallPatch('path-a.txt')
      .addSmallPatch('path-b.txt')
      .toString();

    const expected = new PatchBuilder()
      .addSmallPatch('path-b.txt')
      .toString();

    const {filtered, removed} = filter(original, new Set(['path-b.txt', 'path-c.txt']));
    assert.deepEqual(Array.from(removed), ['path-a.txt']);
    assert.strictEqual(filtered, expected);
  });

  it('removes files from the patch that exceed the size threshold', function() {
    const original = new PatchBuilder()
      .addLargePatch('path-a.txt')
      .addSmallPatch('path-b.txt')
      .toString();

    const expected = new PatchBuilder()
      .addSmallPatch('path-b.txt')
      .toString();

    const {filtered, removed} = filter(original, new Set(['path-a.txt', 'path-b.txt']));
    assert.deepEqual(Array.from(removed), ['path-a.txt']);
    assert.strictEqual(filtered, expected);
  });
});

class PatchBuilder {
  constructor() {
    this.text = '';
  }

  addSmallPatch(fileName) {
    this.text += `diff --git a/${fileName} b/${fileName}\n`;
    this.text += '+aaaa\n';
    this.text += '+bbbb\n';
    this.text += '+cccc\n';
    this.text += '+dddd\n';
    this.text += '+eeee\n';
    return this;
  }

  addLargePatch(fileName) {
    this.text += `diff --git a/${fileName} b/${fileName}\n`;
    const line = '+yyyy\n';
    let totalSize = 0;
    while (totalSize < MAX_PATCH_CHARS) {
      this.text += line;
      totalSize += line.length;
    }
    return this;
  }

  toString() {
    return this.text;
  }
}
