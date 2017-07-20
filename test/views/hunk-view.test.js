import React from 'react';
import {shallow} from 'enzyme';

import Hunk from '../../lib/models/hunk';
import HunkLine from '../../lib/models/hunk-line';
import HunkView from '../../lib/views/hunk-view';

describe('HunkView', function() {
  let component, mousedownOnHeader, mousedownOnLine, mousemoveOnLine, contextMenuOnItem, didClickStageButton, didClickDiscardButton;

  beforeEach(function() {
    const onlyLine = new HunkLine('only', 'added', 1, 1);
    const emptyHunk = new Hunk(1, 1, 1, 1, 'heading', [
      onlyLine,
    ]);

    mousedownOnHeader = sinon.spy();
    mousedownOnLine = sinon.spy();
    mousemoveOnLine = sinon.spy();
    contextMenuOnItem = sinon.spy();
    didClickStageButton = sinon.spy();
    didClickDiscardButton = sinon.spy();

    component = (
      <HunkView
        tooltips={{}}
        hunk={emptyHunk}
        headHunk={emptyHunk}
        headLine={onlyLine}
        isSelected={false}
        selectedLines={new Set()}
        hunkSelectionMode={false}
        stageButtonLabel=""
        mousedownOnHeader={mousedownOnHeader}
        mousedownOnLine={mousedownOnLine}
        mousemoveOnLine={mousemoveOnLine}
        contextMenuOnItem={contextMenuOnItem}
        didClickStageButton={didClickStageButton}
        didClickDiscardButton={didClickStageButton}
        discardButtonLabel={'Discard'}
        unstaged={true}
      />
    );
  });

  it('renders the hunk header and its lines', function() {
    const hunk0 = new Hunk(5, 5, 2, 1, 'function fn {', [
      new HunkLine('line-1', 'unchanged', 5, 5),
      new HunkLine('line-2', 'deleted', 6, -1),
      new HunkLine('line-3', 'deleted', 7, -1),
      new HunkLine('line-4', 'added', -1, 6),
    ]);

    const wrapper = shallow(React.cloneElement(component, {hunk: hunk0}));

    assert.equal(
      wrapper.find('.github-HunkView-header').render().text().trim(),
      `${hunk0.getHeader().trim()} ${hunk0.getSectionHeading().trim()}`,
    );

    const lines0 = wrapper.find('LineView');
    assertHunkLineElementEqual(
      lines0.at(0),
      {oldLineNumber: '5', newLineNumber: '5', origin: ' ', content: 'line-1', isSelected: false},
    );
    assertHunkLineElementEqual(
      lines0.at(1),
      {oldLineNumber: '6', newLineNumber: ' ', origin: '-', content: 'line-2', isSelected: false},
    );
    assertHunkLineElementEqual(
      lines0.at(2),
      {oldLineNumber: '7', newLineNumber: ' ', origin: '-', content: 'line-3', isSelected: false},
    );
    assertHunkLineElementEqual(
      lines0.at(3),
      {oldLineNumber: ' ', newLineNumber: '6', origin: '+', content: 'line-4', isSelected: false},
    );

    const hunk1 = new Hunk(8, 8, 1, 1, 'function fn2 {', [
      new HunkLine('line-1', 'deleted', 8, -1),
      new HunkLine('line-2', 'added', -1, 8),
    ]);
    wrapper.setProps({hunk: hunk1});

    assert.equal(
      wrapper.find('.github-HunkView-header').render().text().trim(),
      `${hunk1.getHeader().trim()} ${hunk1.getSectionHeading().trim()}`,
    );

    const lines1 = wrapper.find('LineView');
    assertHunkLineElementEqual(
      lines1.at(0),
      {oldLineNumber: '8', newLineNumber: ' ', origin: '-', content: 'line-1', isSelected: false},
    );
    assertHunkLineElementEqual(
      lines1.at(1),
      {oldLineNumber: ' ', newLineNumber: '8', origin: '+', content: 'line-2', isSelected: false},
    );

    wrapper.setProps({
      selectedLines: new Set([hunk1.getLines()[1]]),
    });

    const lines2 = wrapper.find('LineView');
    assertHunkLineElementEqual(
      lines2.at(0),
      {oldLineNumber: '8', newLineNumber: ' ', origin: '-', content: 'line-1', isSelected: false},
    );
    assertHunkLineElementEqual(
      lines2.at(1),
      {oldLineNumber: ' ', newLineNumber: '8', origin: '+', content: 'line-2', isSelected: true},
    );
  });

  it('adds the is-selected class based on the isSelected property', function() {
    const wrapper = shallow(React.cloneElement(component, {isSelected: true}));
    assert.isTrue(wrapper.find('.github-HunkView').hasClass('is-selected'));

    wrapper.setProps({isSelected: false});

    assert.isFalse(wrapper.find('.github-HunkView').hasClass('is-selected'));
  });

  it('calls the didClickStageButton handler when the staging button is clicked', function() {
    const wrapper = shallow(component);

    wrapper.find('.github-HunkView-stageButton').simulate('click');
    assert.isTrue(didClickStageButton.called);
  });

  describe('line selection', function() {
    it('calls the mousedownOnLine and mousemoveOnLine handlers on mousedown and mousemove events', function() {
      const hunk = new Hunk(1234, 1234, 1234, 1234, '', [
        new HunkLine('line-1', 'added', 1234, 1234),
        new HunkLine('line-2', 'added', 1234, 1234),
        new HunkLine('line-3', 'added', 1234, 1234),
        new HunkLine('line-4', 'unchanged', 1234, 1234),
        new HunkLine('line-5', 'deleted', 1234, 1234),
      ]);

      // selectLine callback not called when selectionEnabled = false
      const wrapper = shallow(React.cloneElement(component, {hunk, selectionEnabled: false}));
      const lineDivAt = index => wrapper.find('LineView').at(index).shallow().find('.github-HunkView-line');

      const payload0 = {};
      lineDivAt(0).simulate('mousedown', payload0);
      assert.isTrue(mousedownOnLine.calledWith(payload0, hunk, hunk.lines[0]));

      const payload1 = {};
      lineDivAt(1).simulate('mousemove', payload1);
      assert.isTrue(mousemoveOnLine.calledWith(payload1, hunk, hunk.lines[1]));

      // we don't call handler with redundant events
      assert.equal(mousemoveOnLine.callCount, 1);
      lineDivAt(1).simulate('mousemove');
      assert.equal(mousemoveOnLine.callCount, 1);
      lineDivAt(2).simulate('mousemove');
      assert.equal(mousemoveOnLine.callCount, 2);
    });
  });
});

function assertHunkLineElementEqual(lineWrapper, {oldLineNumber, newLineNumber, origin, content, isSelected}) {
  const subWrapper = lineWrapper.shallow();

  assert.equal(subWrapper.find('.github-HunkView-lineNumber.is-old').render().text(), oldLineNumber);
  assert.equal(subWrapper.find('.github-HunkView-lineNumber.is-new').render().text(), newLineNumber);
  assert.equal(subWrapper.find('.github-HunkView-lineContent').render().text(), origin + content);
  assert.equal(subWrapper.find('.github-HunkView-line').hasClass('is-selected'), isSelected);
}
