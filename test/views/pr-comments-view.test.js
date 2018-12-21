import React from 'react';
import {shallow} from 'enzyme';

import {multiFilePatchBuilder} from '../builder/patch';
import {pullRequestBuilder} from '../builder/pr';
import PrCommentsView from '../../lib/views/pr-comments-view';

describe('PrCommentsView', function() {
  it('adjusts the position for comments after hunk headers', function() {
    const {multiFilePatch} = multiFilePatchBuilder()
      .addFilePatch(fp => {
        fp.setOldFile(f => f.path('file.txt'));
        fp.addHunk(h => h.oldRow(5).unchanged('1').added('2', '3', '4').unchanged('5'));
        fp.addHunk(h => h.oldRow(20).unchanged('7').deleted('8', '9', '10').unchanged('11'));
        fp.addHunk(h => h.oldRow(30).unchanged('13').added('14', '15').deleted('16').unchanged('17'));
      })
      .build();

    const pr = pullRequestBuilder()
      .addReview(r => {
        r.addComment(c => c.id(0).path('file.txt').position(2).body('one'));
        r.addComment(c => c.id(1).path('file.txt').position(9).body('two'));
        r.addComment(c => c.id(2).path('file.txt').position(15).body('three'));
      })
      .build();

    const wrapper = shallow(<PrCommentsView multiFilePatch={multiFilePatch} reviews={pr.reviews} />);

    assert.deepEqual(wrapper.find('Marker').at(0).prop('bufferRange').serialize(), [[1, 0], [1, 0]]);
    assert.deepEqual(wrapper.find('Marker').at(1).prop('bufferRange').serialize(), [[7, 0], [7, 0]]);
    assert.deepEqual(wrapper.find('Marker').at(2).prop('bufferRange').serialize(), [[12, 0], [12, 0]]);
  });
});
