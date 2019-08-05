import React from 'react';
import {mount} from 'enzyme';

import TabGroup from '../lib/tab-group';
import {TabbableInput} from '../lib/views/tabbable';

describe('TabGroup', function() {
  let atomEnv, root;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();

    root = document.createElement('div');
    document.body.appendChild(root);
  });

  afterEach(function() {
    root.remove();
    atomEnv.destroy();
  });

  describe('with tabbable elements', function() {
    let group, zero, one, two;

    beforeEach(function() {
      group = new TabGroup();

      mount(
        <div>
          <TabbableInput tabGroup={group} commands={atomEnv.commands} type="text" id="zero" />
          <TabbableInput tabGroup={group} commands={atomEnv.commands} type="text" id="one" />
          <TabbableInput tabGroup={group} commands={atomEnv.commands} type="text" id="two" />
        </div>,
        {attachTo: root},
      );

      zero = root.querySelector('#zero');
      one = root.querySelector('#one');
      two = root.querySelector('#two');

      sinon.stub(zero, 'focus');
      sinon.stub(one, 'focus');
      sinon.stub(two, 'focus');
    });

    it('appends elements into a doubly-linked circular list', function() {
      let current = zero;

      current = group.after(current);
      assert.strictEqual(current.id, 'one');
      current = group.after(current);
      assert.strictEqual(current.id, 'two');
      current = group.after(current);
      assert.strictEqual(current.id, 'zero');

      current = group.before(current);
      assert.strictEqual(current.id, 'two');
      current = group.before(current);
      assert.strictEqual(current.id, 'one');
      current = group.before(current);
      assert.strictEqual(current.id, 'zero');
      current = group.before(current);
      assert.strictEqual(current.id, 'two');
    });

    it('brings focus to a successor element, wrapping around at the end', function() {
      group.focusAfter(zero);
      assert.strictEqual(one.focus.callCount, 1);

      group.focusAfter(one);
      assert.strictEqual(two.focus.callCount, 1);

      group.focusAfter(two);
      assert.strictEqual(zero.focus.callCount, 1);
    });

    it('is a no-op with unregistered elements', function() {
      const unregistered = document.createElement('div');

      group.focusAfter(unregistered);
      group.focusBefore(unregistered);

      assert.isFalse(zero.focus.called);
      assert.isFalse(one.focus.called);
      assert.isFalse(two.focus.called);
    });

    it('brings focus to a predecessor element, wrapping around at the beginning', function() {
      group.focusBefore(zero);
      assert.strictEqual(two.focus.callCount, 1);

      group.focusBefore(two);
      assert.strictEqual(one.focus.callCount, 1);

      group.focusBefore(one);
      assert.strictEqual(zero.focus.callCount, 1);
    });
  });

  describe('autofocus', function() {
    it('brings focus to the first rendered element with autofocus', function() {
      const group = new TabGroup();

      mount(
        <div>
          <TabbableInput tabGroup={group} commands={atomEnv.commands} type="text" id="zero" />
          {false && <TabbableInput tabGroup={group} commands={atomEnv.commands} autofocus type="text" id="missing" />}
          <TabbableInput tabGroup={group} commands={atomEnv.commands} type="text" id="one" />
          <TabbableInput tabGroup={group} commands={atomEnv.commands} autofocus type="text" id="two" />
          <TabbableInput tabGroup={group} commands={atomEnv.commands} autofocus type="text" id="three" />
        </div>,
        {attachTo: root},
      );

      const elements = ['zero', 'one', 'two', 'three'].map(id => document.getElementById(id));
      for (const element of elements) {
        sinon.stub(element, 'focus');
      }

      group.autofocus();

      assert.isFalse(elements[0].focus.called);
      assert.isFalse(elements[1].focus.called);
      assert.isTrue(elements[2].focus.called);
      assert.isFalse(elements[3].focus.called);
    });

    it('is a no-op if no elements are autofocusable', function() {
      const group = new TabGroup();

      mount(
        <div>
          <TabbableInput tabGroup={group} commands={atomEnv.commands} type="text" id="zero" />
          <TabbableInput tabGroup={group} commands={atomEnv.commands} type="text" id="one" />
        </div>,
        {attachTo: root},
      );

      const elements = ['zero', 'one'].map(id => document.getElementById(id));
      for (const element of elements) {
        sinon.stub(element, 'focus');
      }

      group.autofocus();

      assert.isFalse(elements[0].focus.called);
      assert.isFalse(elements[1].focus.called);
    });
  });
});
