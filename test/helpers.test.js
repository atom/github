import {firstImplementer} from '../lib/helpers';

class A {
  one() { return 'a-one'; }
  two() { return 'a-two'; }
}

class B {
  two() { return 'b-two'; }
  three() { return 'b-three'; }
}

describe('firstImplementer', function() {
  const a = new A();
  const b = new B();

  it('calls methods from the first target that has the method', function() {
    const target = firstImplementer(a, b);
    assert.equal(target.one, a.one);
    assert.equal(target.two, a.two);
    assert.equal(target.three, b.three);
  });
});
