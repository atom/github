import DeferredCallbackQueue from '../lib/deferred-callback-queue';
import {Emitter} from 'event-kit';

describe('DeferredCallbackQueue', function() {
  let callbackSpy, emitter, queue;
  beforeEach(() => {
    callbackSpy = sinon.spy();
    emitter = new Emitter();
    queue = new DeferredCallbackQueue(20, callbackSpy, {
      onDidFocus: cb => {
        return emitter.on('focus', cb);
      },
      onDidBlur: cb => {
        return emitter.on('blur', cb);
      },
    });
  });

  describe('when focused', function() {
    it('calls the specified callback immediately', function() {
      emitter.emit('focus');
      queue.push('a', 'b', 'c');
      assert.deepEqual(callbackSpy.args[0][0], ['a', 'b', 'c']);
    });
  });

  describe('when blurred', function() {
    it('calls the specified callback after a specified quiet time', async function() {
      emitter.emit('blur');
      queue.push(1);
      await new Promise(res => setTimeout(res, 10));
      queue.push(2);
      await new Promise(res => setTimeout(res, 10));
      queue.push(3);
      await new Promise(res => setTimeout(res, 10));
      assert.isFalse(callbackSpy.called);
      await new Promise(res => setTimeout(res, 20));
      assert.deepEqual(callbackSpy.args[0][0], [1, 2, 3]);
    });

    it('calls the specified callback immediately when focus is regained', async function() {
      emitter.emit('blur');
      queue.push(4);
      await new Promise(res => setTimeout(res, 10));
      queue.push(5);
      await new Promise(res => setTimeout(res, 10));
      queue.push(6);
      await new Promise(res => setTimeout(res, 10));
      assert.isFalse(callbackSpy.called);
      emitter.emit('focus');
      assert.deepEqual(callbackSpy.args[0][0], [4, 5, 6]);
    });
  });
});
