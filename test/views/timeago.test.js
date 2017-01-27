import moment from 'moment';

import Timeago from '../../lib/views/timeago';

function test(kindOfDisplay, modifier, expectation) {
  it(`displays correctly for ${kindOfDisplay}`, function() {
    const base = moment('May 6 1987', 'MMMM D YYYY');
    const m = modifier(moment(base)); // copy `base` since `modifier` mutates
    assert.equal(Timeago.getTimeDisplay(m, base), expectation);
  });
}

describe('Timeago component', function() {
  describe('time display calcuation', function() {
    test('recent items', m => m, 'a few seconds ago');
    test('items within a minute', m => m.subtract(45, 'seconds'), 'a minute ago');
    test('items within two minutes', m => m.subtract(2, 'minutes'), '2 minutes ago');
    test('items within five minutes', m => m.subtract(5, 'minutes'), '5 minutes ago');
    test('items within thirty minutes', m => m.subtract(30, 'minutes'), '30 minutes ago');
    test('items within an hour', m => m.subtract(1, 'hours'), 'an hour ago');
    test('items within the same day', m => m.subtract(20, 'hours'), '20 hours ago');
    test('items within a day', m => m.subtract(1, 'day'), 'a day ago');
    test('items within the same week', m => m.subtract(4, 'days'), '4 days ago');
    test('items within the same month', m => m.subtract(20, 'days'), '20 days ago');
    test('items within a month', m => m.subtract(1, 'month'), 'a month ago');
    test('items beyond a month', m => m.subtract(31, 'days'), 'on Apr 5th, 1987');
    test('items way beyond a month', m => m.subtract(2, 'years'), 'on May 6th, 1985');
  });
});
