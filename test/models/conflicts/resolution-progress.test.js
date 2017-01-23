import ResolutionProgress from '../../../lib/models/conflicts/resolution-progress';

describe('ResolutionProgress', function() {
  it('reports 0% for any path that has not reported progress yet', function() {
    const progress = new ResolutionProgress('1234abcd', {});
    assert.equal(progress.getValue('path/to/file.txt'), 0);
    assert.isAbove(progress.getMax('path/to/file.txt'), 0);
  });

  it('reports progress max after a marker count notification', function() {
    const progress = new ResolutionProgress('1234abcd', {});
    progress.reportMarkerCount('path/to/file.txt', 3);

    assert.equal(progress.getValue('path/to/file.txt'), 0);
    assert.equal(progress.getMax('path/to/file.txt'), 3);
  });

  it('reports progress after a resolution notification', function() {
    const progress = new ResolutionProgress('1234abcd', {});
    progress.reportMarkerCount('path/to/file.txt', 3);
    progress.markerWasResolved('path/to/file.txt');

    assert.equal(progress.getValue('path/to/file.txt'), 1);
    assert.equal(progress.getMax('path/to/file.txt'), 3);
  });

  it('disregards duplicate total conflict marker counts', function() {
    const progress = new ResolutionProgress('1234abcd', {});
    progress.reportMarkerCount('path/to/file.txt', 3);
    progress.reportMarkerCount('path/to/file.txt', 10);

    assert.equal(progress.getMax('path/to/file.txt'), 3);
  });

  it('caps resolution notification count to the current maximum', function() {
    const progress = new ResolutionProgress('1234abcd', {});
    progress.reportMarkerCount('path/to/file.txt', 2);
    progress.markerWasResolved('path/to/file.txt');
    progress.markerWasResolved('path/to/file.txt');
    progress.markerWasResolved('path/to/file.txt');

    assert.equal(progress.getValue('path/to/file.txt'), 2);
  });

  describe('serialization', function() {
    let payload;

    beforeEach(function() {
      const progress0 = new ResolutionProgress('1234abcd', {});
      progress0.reportMarkerCount('path/to/file0.txt', 3);
      progress0.markerWasResolved('path/to/file0.txt');
      progress0.markerWasResolved('path/to/file0.txt');
      progress0.reportMarkerCount('path/to/file1.txt', 4);
      progress0.markerWasResolved('path/to/file1.txt');

      payload = progress0.serialize();
    });

    it('restores data from the same revision', function() {
      const progress1 = new ResolutionProgress('1234abcd', payload);
      assert.equal(progress1.getMax('path/to/file0.txt'), 3);
      assert.equal(progress1.getValue('path/to/file0.txt'), 2);
      assert.equal(progress1.getMax('path/to/file1.txt'), 4);
      assert.equal(progress1.getValue('path/to/file1.txt'), 1);
      assert.isFalse(progress1.isEmpty());
    });

    it('restores an empty object for a different revision', function() {
      const progress2 = new ResolutionProgress('abcd1234', payload);

      assert.equal(progress2.getValue('path/to/file0.txt'), 0);
      assert.equal(progress2.getValue('path/to/file1.txt'), 0);
      assert.isTrue(progress2.isEmpty());
    });
  });
});
