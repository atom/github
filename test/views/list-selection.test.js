import ListSelection from '../../lib/views/list-selection';
import {assertEqualSets} from '../helpers';

// This class is mostly tested via CompositeListSelection and
// FilePatchSelection. This file contains unit tests that are more convenient to
// write directly against this class.
describe('ListSelection', function() {
  describe('coalesce', function() {
    it('correctly handles adding and subtracting a single item (regression)', function() {
      const selection = new ListSelection({items: ['a', 'b', 'c']});
      selection.selectLastItem(true);
      selection.coalesce();
      assertEqualSets(selection.getSelectedItems(), new Set(['a', 'b', 'c']));
      selection.addOrSubtractSelection('b');
      selection.coalesce();
      assertEqualSets(selection.getSelectedItems(), new Set(['a', 'c']));
      selection.addOrSubtractSelection('b');
      global.debug = true;
      selection.coalesce();
      assertEqualSets(selection.getSelectedItems(), new Set(['a', 'b', 'c']));
    });
  });
});
