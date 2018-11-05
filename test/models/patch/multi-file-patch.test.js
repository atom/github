import {TextBuffer} from 'atom';

import MultiFilePatch from '../../../lib/models/patch/multi-file-patch';
import FilePatch from '../../../lib/models/patch/file-patch';
import File from '../../../lib/models/patch/file';
import Patch from '../../../lib/models/patch/patch';
import Hunk from '../../../lib/models/patch/hunk';
import {Unchanged, Addition, Deletion} from '../../../lib/models/patch/region';

describe('MultiFilePatch', function() {
  let buffer, layers;

  beforeEach(function() {
    buffer = new TextBuffer();
    layers = {
      patch: buffer.addMarkerLayer(),
      hunk: buffer.addMarkerLayer(),
      unchanged: buffer.addMarkerLayer(),
      addition: buffer.addMarkerLayer(),
      deletion: buffer.addMarkerLayer(),
      noNewline: buffer.addMarkerLayer(),
    };
  });

  it('has an accessor for its file patches', function() {
    const filePatches = [buildFilePatchFixture(0), buildFilePatchFixture(1)];
    const mp = new MultiFilePatch(buffer, layers.patch, filePatches);
    assert.strictEqual(mp.getFilePatches(), filePatches);
  });

  it('locates an individual FilePatch by marker lookup', function() {
    const filePatches = [];
    for (let i = 0; i < 10; i++) {
      filePatches.push(buildFilePatchFixture(i));
    }
    const mp = new MultiFilePatch(buffer, layers.patch, filePatches);

    assert.strictEqual(mp.getFilePatchAt(0), filePatches[0]);
    assert.strictEqual(mp.getFilePatchAt(7), filePatches[0]);
    assert.strictEqual(mp.getFilePatchAt(8), filePatches[1]);
    assert.strictEqual(mp.getFilePatchAt(79), filePatches[9]);
  });

  function buildFilePatchFixture(index) {
    const rowOffset = buffer.getLastRow();
    for (let i = 0; i < 8; i++) {
      buffer.append(`file-${index} line-${i}\n`);
    }

    const mark = (layer, start, end = start) => layer.markRange([[rowOffset + start, 0], [rowOffset + end, Infinity]]);

    const hunks = [
      new Hunk({
        oldStartRow: 0, newStartRow: 0, oldRowCount: 3, newRowCount: 3,
        sectionHeading: `file-${index} hunk-0`,
        marker: mark(layers.hunk, 0, 3),
        regions: [
          new Unchanged(mark(layers.unchanged, 0)),
          new Addition(mark(layers.addition, 1)),
          new Deletion(mark(layers.deletion, 2)),
          new Unchanged(mark(layers.unchanged, 3)),
        ],
      }),
      new Hunk({
        oldStartRow: 10, newStartRow: 10, oldRowCount: 3, newRowCount: 3,
        sectionHeading: `file-${index} hunk-1`,
        marker: mark(layers.hunk, 4, 7),
        regions: [
          new Unchanged(mark(layers.unchanged, 4)),
          new Addition(mark(layers.addition, 5)),
          new Deletion(mark(layers.deletion, 6)),
          new Unchanged(mark(layers.unchanged, 7)),
        ],
      }),
    ];

    const marker = mark(layers.patch, 0, 7);
    const patch = new Patch({status: 'modified', hunks, buffer, layers, marker});

    const oldFile = new File({path: `file-${index}.txt`, mode: '100644'});
    const newFile = new File({path: `file-${index}.txt`, mode: '100644'});

    return new FilePatch(oldFile, newFile, patch);
  }
});
