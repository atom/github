import URIPattern from '../../lib/atom/uri-pattern';

describe('URIPattern', function() {
  describe('exact', function() {
    let exact;

    beforeEach(function() {
      exact = new URIPattern('atom-github://exact');
    });

    it('matches exact URIs', function() {
      assert.isTrue(exact.matches('atom-github://exact').ok());
    });

    it('does not match any other URIs', function() {
      assert.isFalse(exact.matches('atom-github://exactbutnot').ok());
      assert.isFalse(exact.matches('https://exact').ok());
      assert.isFalse(exact.matches('atom-github://exact/but/not').ok());
      assert.isFalse(exact.matches('atom-github://exact?no=no').ok());
    });
  });

  describe('parameter placeholders', function() {
    it('matches each placeholder to one path segment', function() {
      const pattern = new URIPattern('atom-github://base/exact/{id}');

      const m0 = pattern.matches('atom-github://base/exact/0');
      assert.isTrue(m0.ok());
      assert.deepEqual(m0.getParams(), {id: '0'});

      const m1 = pattern.matches('atom-github://base/exact/1');
      assert.isTrue(m1.ok());
      assert.deepEqual(m1.getParams(), {id: '1'});

      assert.isFalse(pattern.matches('atom-github://base/exact/0/more').ok());
    });

    it('does not match if the expected segment is absent', function() {
      const pattern = new URIPattern('atom-github://base/exact/{id}');
      assert.isFalse(pattern.matches('atom-github://base/exact/').ok());
    });
  });
});
