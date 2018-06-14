import React from 'react';
import {shallow} from 'enzyme';

import Accordion from '../../lib/views/accordion';

class CustomChild extends React.Component {
  render() {
    return <div className="custom-child" />;
  }
}

class WrongChild extends React.Component {
  render() {
    return <div className="wrong-child" />;
  }
}

describe('Accordion', function() {
  function buildApp(overrideProps = {}) {
    return (
      <Accordion
        leftTitle=""
        results={[]}
        isLoading={false}
        children={() => null}
        {...overrideProps}
      />
    );
  }

  it('renders a left title', function() {
    const wrapper = shallow(buildApp({leftTitle: 'left'}));
    assert.strictEqual(
      wrapper.find('summary.github-Accordion-header span.github-Accordion--leftTitle').text(),
      'left',
    );
  });

  it('renders a right title', function() {
    const wrapper = shallow(buildApp({rightTitle: 'right'}));
    assert.strictEqual(
      wrapper.find('summary.github-Accordion-header span.github-Accordion--rightTitle').text(),
      'right',
    );
  });

  it('is initially expanded', function() {
    const wrapper = shallow(buildApp());
    assert.isTrue(wrapper.find('details.github-Accordion[open]').exists());
  });

  it('toggles expansion state on a header click', function() {
    const wrapper = shallow(buildApp());
    const e = {preventDefault: sinon.stub()};
    wrapper.find('.github-Accordion-header').simulate('click', e);
    assert.isFalse(wrapper.find('details.github-Accordion[open="false"]').exists());
    assert.isTrue(e.preventDefault.called);
  });

  describe('while loading', function() {
    it('defaults to rendering no children', function() {
      const wrapper = shallow(buildApp({isLoading: true, children: WrongChild}));
      assert.lengthOf(wrapper.find('CustomChild'), 0);
    });

    it('renders a custom child component', function() {
      const wrapper = shallow(buildApp({
        isLoading: true,
        loadingComponent: CustomChild,
        emptyComponent: WrongChild,
      }));
      assert.lengthOf(wrapper.find('CustomChild'), 1);
      assert.lengthOf(wrapper.find('WrongChild'), 0);
    });
  });

  describe('when empty', function() {
    it('defaults to rendering no children', function() {
      const wrapper = shallow(buildApp({results: [], children: WrongChild}));
      assert.lengthOf(wrapper.find('WrongChild'), 0);
    });

    it('renders a custom child component', function() {
      const wrapper = shallow(buildApp({
        results: [],
        loadingComponent: WrongChild,
        emptyComponent: CustomChild,
      }));
      assert.lengthOf(wrapper.find('CustomChild'), 1);
      assert.lengthOf(wrapper.find('WrongChild'), 0);
    });
  });

  describe('with results', function() {
    it('renders its child render prop with each', function() {
      const results = [1, 2, 3];
      const wrapper = shallow(buildApp({
        results,
        loadingComponent: WrongChild,
        emptyComponent: WrongChild,
        children: each => <CustomChild item={each} />,
      }));

      assert.lengthOf(wrapper.find('WrongChild'), 0);
      assert.lengthOf(wrapper.find('CustomChild'), 3);
      for (const i of results) {
        assert.isTrue(wrapper.find('CustomChild').someWhere(c => c.prop('item') === i));
      }
    });
  });
});
