import React from 'react';
import {shallow} from 'enzyme';
import {Disposable} from 'event-kit';

import Tooltip from '../../lib/atom/tooltip';
import RefHolder from '../../lib/models/ref-holder';
import {injectAtomEnv} from '../../lib/context/atom';

describe('Tooltip', function() {
  let atomEnv;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
    injectAtomEnv(atomEnv);

    sinon.stub(atomEnv.tooltips, 'add').callsFake(() => new Disposable());
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function buildApp(...override) {
    const props = {
      target: new RefHolder(),
      ...override,
    };

    return <Tooltip {...props} />;
  }

  describe('without children', function() {
    it('passes verbatim props directly to the Atom API', function() {
      const targetElement = document.createElement('div');
      const targetHolder = new RefHolder();
      const keyBindingTarget = document.createElement('div');

      const wrapper = shallow(buildApp({
        target: targetHolder,
        title: 'the title',
        html: true,
        placement: 'top',
        trigger: 'manual',
        keyBindingCommand: 'github:commit',
        keyBindingTarget,
      }));
      assert.isTrue(wrapper.isEmptyRender());
      assert.isFalse(atomEnv.tooltips.add.called);

      targetHolder.setter(targetElement);

      assert.isTrue(atomEnv.tooltips.add.calledWith(targetElement, {
        title: 'the title',
        html: true,
        placement: 'top',
        trigger: 'manual',
        keyBindingCommand: 'github:commit',
        keyBindingTarget,
      }));
    });

    it('passes className as class');

    it('defaults hover tooltip delays');

    it('defaults non-hover tooltip delays to zero');

    it('destroys and re-creates the tooltip when rendered with a differing option');

    it('does not destroy and re-create the tooltip when no props have changed');

    it('destroys the tooltip when unmounted');
  });

  describe('with children', function() {
    //
  });
});
