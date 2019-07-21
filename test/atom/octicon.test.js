import React from 'react';
import {shallow} from 'enzyme';

import Octicon from '../../lib/atom/octicon';

describe('Octicon', function() {
  it('adds the boilerplate to render an octicon', function() {
    const wrapper = shallow(<Octicon icon="check" />);
    const span = wrapper.find('span');
    assert.isTrue(span.hasClass('icon'));
    assert.isTrue(span.hasClass('icon-check'));
  });

  it('appends additional CSS classes', function() {
    const wrapper = shallow(<Octicon icon="alert" className="github-Octicon-extra" />);
    const span = wrapper.find('span');
    assert.isTrue(span.hasClass('icon'));
    assert.isTrue(span.hasClass('icon-alert'));
    assert.isTrue(span.hasClass('github-Octicon-extra'));
  });

  it('passes additional props directly to the span', function() {
    const wrapper = shallow(<Octicon icon="comment" extra="yes" />);
    const span = wrapper.find('span');
    assert.strictEqual(span.prop('extra'), 'yes');
  });
});
