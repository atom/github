import TabGroup from '../lib/tab-group';

describe('TabGroup', function() {
  let div;

  beforeEach(function() {
    div = document.createElement('div');
    div.tabIndex = 1000000;
    document.body.appendChild(div);
  });

  afterEach(function() {
    div.remove();
  });

  it('begins above the highest tabIndex existing in the DOM', function() {
    const group = new TabGroup();
    assert.strictEqual(group.nextIndex(), 1000001);
  });

  it('assigns ascending indices to each successive tab target', function() {
    const group = new TabGroup();
    assert.strictEqual(group.nextIndex(), 1000001);
    assert.strictEqual(group.nextIndex(), 1000002);
    assert.strictEqual(group.nextIndex(), 1000003);
  });

  it('brings focus to the lowest tabIndex assigned by this group', function() {
    const group = new TabGroup();

    const child0 = document.createElement('div');
    child0.tabIndex = group.nextIndex();
    sinon.stub(child0, 'focus');
    div.appendChild(child0);

    const child1 = document.createElement('div');
    child1.tabIndex = group.nextIndex();
    div.appendChild(child1);

    const child2 = document.createElement('div');
    child2.tabIndex = group.nextIndex();
    div.appendChild(child2);

    group.focusBeginning();
    assert.isTrue(child0.focus.called);
  });
});
