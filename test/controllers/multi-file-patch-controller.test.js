import React from 'react';
import {shallow} from 'enzyme';

import MultiFilePatchController from '../../lib/controllers/multi-file-patch-controller';
import {buildMultiFilePatch} from '../../lib/models/patch';

describe('MultiFilePatchController', function() {
  let multiFilePatch;

  beforeEach(function() {
    multiFilePatch = buildMultiFilePatch([
      {
        oldPath: 'first', oldMode: '100644', newPath: 'first', newMode: '100755', status: 'modified',
        hunks: [
          {
            oldStartLine: 1, oldLineCount: 2, newStartLine: 1, newLineCount: 4,
            lines: [' line-0', '+line-1', '+line-2', ' line-3'],
          },
        ],
      },
      {
        oldPath: 'second', oldMode: '100644', newPath: 'second', newMode: '100644', status: 'modified',
        hunks: [
          {
            oldStartLine: 5, oldLineCount: 3, newStartLine: 5, newLineCount: 3,
            lines: [' line-5', '+line-6', '-line-7', ' line-8'],
          },
        ],
      },
      {
        oldPath: 'third', oldMode: '100755', newPath: 'third', newMode: '100755', status: 'added',
        hunks: [
          {
            oldStartLine: 1, oldLineCount: 0, newStartLine: 1, newLineCount: 3,
            lines: ['+line-0', '+line-1', '+line-2'],
          },
        ],
      },
    ]);
  });

  function buildApp(override = {}) {
    const props = {
      multiFilePatch,
      ...override,
    };

    return <MultiFilePatchController {...props} />;
  }

  it('renders a FilePatchController for each file patch', function() {
    const wrapper = shallow(buildApp());

    assert.lengthOf(wrapper.find('FilePatchController'), 3);

    // O(n^2) doesn't matter when n is small :stars:
    assert.isTrue(
      multiFilePatch.getFilePatches().every(fp => {
        return wrapper
          .find('FilePatchController')
          .someWhere(w => w.prop('filePatch') === fp);
      }),
    );
  });

  it('passes additional props to each controller', function() {
    const extra = Symbol('hooray');
    const wrapper = shallow(buildApp({extra}));

    assert.isTrue(
      wrapper
        .find('FilePatchController')
        .everyWhere(w => w.prop('extra') === extra),
    );
  });
});
