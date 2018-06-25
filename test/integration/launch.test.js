import {setup, teardown} from './helpers';

describe('Package initialization', function() {
  let context, wrapper, atom;

  beforeEach(function() {
    context = setup(this.currentTest);
    wrapper = context.wrapper;
    atom = context.atom;
  });

  afterEach(async function() {
    await teardown(this.currentTest);
  });

  describe('on the very first run with the GitHub package present', function() {
    describe('with no serialized project state', function() {
      describe('with the welcome package active', function() {
        it('places the git and github tabs into the right dock');

        it('hides the right dock');
      });

      describe('with the welcome package dismissed', function() {
        it('places the git and github tabs into the right dock');

        it('reveals the right dock');
      });
    });

    describe('with serialized project state', function() {
      it('keeps previously closed git and github tabs closed');

      it('keeps previously open git and github tabs opened');
    });
  });

  describe('on a run when the GitHub package was present before', function() {
    describe('with no serialized project state', function() {
      it('places the git and github tabs into the right dock');

      it('hides the right dock');
    });

    describe('with serialized project state', function() {
      it('keeps previously closed git and github tabs closed');

      it('keeps previously open git and github tabs opened');
    });
  });
});
