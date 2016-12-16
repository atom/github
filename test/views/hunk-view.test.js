/** @babel */


import Hunk from '../../lib/models/hunk';
import HunkLine from '../../lib/models/hunk-line';
import HunkView from '../../lib/views/hunk-view';

describe('HunkView', () => {
  it('renders the hunk header and its lines', async () => {
    const hunk1 = new Hunk(5, 5, 2, 1, [
      new HunkLine('line-1', 'unchanged', 5, 5),
      new HunkLine('line-2', 'deleted', 6, -1),
      new HunkLine('line-3', 'deleted', 7, -1),
      new HunkLine('line-4', 'added', -1, 6),
    ]);
    const view = new HunkView({hunk: hunk1, selectedLines: new Set()});
    const element = view.element;
    // eslint-disable-next-line prefer-const
    let [line1, line2, line3, line4] = Array.from(element.querySelectorAll('.github-HunkView-line'));

    assert.equal(view.refs.header.textContent, hunk1.getHeader());
    assertHunkLineElementEqual(
      line1,
      {oldLineNumber: '5', newLineNumber: '5', origin: ' ', content: 'line-1', isSelected: false},
    );
    assertHunkLineElementEqual(
      line2,
      {oldLineNumber: '6', newLineNumber: ' ', origin: '-', content: 'line-2', isSelected: false},
    );
    assertHunkLineElementEqual(
      line3,
      {oldLineNumber: '7', newLineNumber: ' ', origin: '-', content: 'line-3', isSelected: false},
    );
    assertHunkLineElementEqual(
      line4,
      {oldLineNumber: ' ', newLineNumber: '6', origin: '+', content: 'line-4', isSelected: false},
    );

    const hunk2 = new Hunk(8, 8, 1, 1, [
      new HunkLine('line-1', 'deleted', 8, -1),
      new HunkLine('line-2', 'added', -1, 8),
    ]);
    const lines = Array.from(element.querySelectorAll('.github-HunkView-line'));
    line1 = lines[0];
    line2 = lines[1];

    await view.update({hunk: hunk2, selectedLines: new Set()});

    assert.equal(view.refs.header.textContent, hunk2.getHeader());
    assertHunkLineElementEqual(
      line1,
      {oldLineNumber: '8', newLineNumber: ' ', origin: '-', content: 'line-1', isSelected: false},
    );
    assertHunkLineElementEqual(
      line2,
      {oldLineNumber: ' ', newLineNumber: '8', origin: '+', content: 'line-2', isSelected: false},
    );

    await view.update({hunk: hunk2, selectedLines: new Set([hunk2.getLines()[1]])});
    assertHunkLineElementEqual(
      line1,
      {oldLineNumber: '8', newLineNumber: ' ', origin: '-', content: 'line-1', isSelected: false},
    );
    assertHunkLineElementEqual(
      line2,
      {oldLineNumber: ' ', newLineNumber: '8', origin: '+', content: 'line-2', isSelected: true},
    );
  });

  it('adds the is-selected class based on the isSelected property', async () => {
    const hunk = new Hunk(5, 5, 2, 1, []);
    const view = new HunkView({hunk, selectedLines: new Set(), isSelected: true});
    assert(view.element.classList.contains('is-selected'));

    await view.update({hunk, selectedLines: new Set(), isSelected: false});
    assert(!view.element.classList.contains('is-selected'));
  });

  it('calls the didClickStageButton handler when the staging button is clicked', async () => {
    const hunk = new Hunk(5, 5, 2, 1, [new HunkLine('line-1', 'unchanged', 5, 5)]);
    const didClickStageButton1 = sinon.spy();
    const view = new HunkView({hunk, selectedLines: new Set(), didClickStageButton: didClickStageButton1});
    view.refs.stageButton.dispatchEvent(new MouseEvent('click'));
    assert(didClickStageButton1.calledOnce);

    const didClickStageButton2 = sinon.spy();
    await view.update({didClickStageButton: didClickStageButton2, hunk, selectedLines: new Set()});
    view.refs.stageButton.dispatchEvent(new MouseEvent('click'));
    assert(didClickStageButton2.calledOnce);
  });

  describe('line selection', () => {
    it('calls the mousedownOnLine and mousemoveOnLine handlers on mousedown and mousemove events', () => {
      const hunk = new Hunk(1234, 1234, 1234, 1234, [
        new HunkLine('line-1', 'added', 1234, 1234),
        new HunkLine('line-2', 'added', 1234, 1234),
        new HunkLine('line-3', 'added', 1234, 1234),
        new HunkLine('line-4', 'unchanged', 1234, 1234),
        new HunkLine('line-5', 'deleted', 1234, 1234),
      ]);

      const mousedownOnLine = sinon.spy();
      const mousemoveOnLine = sinon.spy();
      // selectLine callback not called when selectionEnabled = false
      const view = new HunkView({hunk, selectedLines: new Set(), mousedownOnLine, mousemoveOnLine, selectionEnabled: false});
      const element = view.element;
      const lineElements = Array.from(element.querySelectorAll('.github-HunkView-line'));
      const mousedownEvent = new MouseEvent('mousedown');
      lineElements[0].dispatchEvent(mousedownEvent);
      assert.deepEqual(mousedownOnLine.args[0], [mousedownEvent, hunk, hunk.lines[0]]);

      const mousemoveEvent = new MouseEvent('mousemove');
      lineElements[1].dispatchEvent(mousemoveEvent);
      assert.deepEqual(mousemoveOnLine.args[0], [mousemoveEvent, hunk, hunk.lines[1]]);

      // we don't call handler with redundant events
      assert.equal(mousemoveOnLine.args.length, 1);
      lineElements[1].dispatchEvent(new MouseEvent('mousemove'));
      assert.equal(mousemoveOnLine.args.length, 1);
      lineElements[2].dispatchEvent(new MouseEvent('mousemove'));
      assert.equal(mousemoveOnLine.args.length, 2);
    });
  });
});

function assertHunkLineElementEqual(lineElement, {oldLineNumber, newLineNumber, origin, content, isSelected}) {
  assert.equal(lineElement.querySelector('.github-HunkView-lineNumber.is-old').textContent, oldLineNumber);
  assert.equal(lineElement.querySelector('.github-HunkView-lineNumber.is-new').textContent, newLineNumber);
  assert.equal(lineElement.querySelector('.github-HunkView-lineContent').textContent, origin + content);
  assert.equal(lineElement.classList.contains('is-selected'), isSelected);
}
