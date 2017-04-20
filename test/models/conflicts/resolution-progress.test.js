import ResolutionProgress from '../../../lib/models/conflicts/resolution-progress';

describe('ResolutionProgress', function() {
  it('reports undefined for any path that has not reported progress yet', function() {
    const progress = new ResolutionProgress();
    progress.load('1234abcd', {});
    assert.isUndefined(progress.getRemaining('path/to/file.txt'));
  });

  it('accepts reports of unresolved conflict counts', function() {
    const progress = new ResolutionProgress();
    progress.load('1234abcd', {});
    progress.reportMarkerCount('path/to/file.txt', 3);

    assert.equal(progress.getRemaining('path/to/file.txt'), 3);
  });

  describe('serialization', function() {
    let payload;

    beforeEach(function() {
      const progress0 = new ResolutionProgress();
      progress0.load('1234abcd', {});
      progress0.reportMarkerCount('path/to/file0.txt', 3);
      progress0.reportMarkerCount('path/to/file1.txt', 4);

      payload = progress0.serialize();
    });

    it('restores data from the same revision', function() {
      const progress1 = new ResolutionProgress();
      progress1.load('1234abcd', payload);
      assert.equal(progress1.getRemaining('path/to/file0.txt'), 3);
      assert.equal(progress1.getRemaining('path/to/file1.txt'), 4);
      assert.isFalse(progress1.isEmpty());
    });

    it('restores an empty object for a different revision', function() {
      const progress2 = new ResolutionProgress();
      progress2.load('abcd1234', payload);

      assert.isUndefined(progress2.getRemaining('path/to/file0.txt'));
      assert.isUndefined(progress2.getRemaining('path/to/file1.txt'));
      assert.isTrue(progress2.isEmpty());
    });
  });

  describe('onDidUpdate', function() {
    let progress, didUpdateSpy;

    beforeEach(function() {
      progress = new ResolutionProgress();
      progress.load('1234abcd', {});
      progress.reportMarkerCount('path/file0.txt', 4);

      didUpdateSpy = sinon.spy();
      progress.onDidUpdate(didUpdateSpy);
    });

    it('triggers an event when the marker count is updated', function() {
      progress.reportMarkerCount('path/file1.txt', 7);
      assert.isTrue(didUpdateSpy.called);
    });

    it('triggers no events when the marker count is unchanged', function() {
      progress.reportMarkerCount('path/file0.txt', 4);
      assert.isFalse(didUpdateSpy.called);
    });
  });
});
