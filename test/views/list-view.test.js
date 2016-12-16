/** @babel */
/** @jsx etch.dom */
/* eslint react/no-unknown-property: "off" */

import etch from 'etch';
import simulant from 'simulant';

import ListView from '../../lib/views/list-view';

describe('ListView', () => {
  it('renders a list of items', () => {
    const items = ['one', 'two', 'three'];

    const renderItem = (item, selected, handleClick) => {
      return <div className={selected ? 'selected' : ''} onclick={handleClick}>{item}</div>;
    };

    const didSelectItem = sinon.spy();

    const didConfirmItem = sinon.spy();

    const component = new ListView({
      didSelectItem,
      didConfirmItem,
      items,
      selectedItems: new Set(['one']),
      renderItem,
    });

    assert.equal(component.element.children.length, 3);
    assert.equal(component.element.children[0].textContent, 'one');
    assert.isTrue(component.element.children[0].classList.contains('selected'));
    assert.equal(component.element.children[1].textContent, 'two');
    assert.equal(component.element.children[2].textContent, 'three');

    assert.isFalse(didSelectItem.called);
    simulant.fire(component.element.children[0], 'click', {detail: 1});
    assert.isTrue(didSelectItem.calledWith('one'));

    assert.isFalse(didConfirmItem.called);
    simulant.fire(component.element.children[2], 'click', {detail: 2});
    assert.isTrue(didConfirmItem.calledWith('three'));
  });
});
