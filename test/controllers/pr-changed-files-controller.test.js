import React from 'react';
import {shallow} from 'enzyme';

import {multiFilePatchBuilder} from '../builder/patch';

import PullRequestChangedFilesController from '../../lib/controllers/pr-changed-files-controller';

const {multiFilePatch} = multiFilePatchBuilder()
  .addFilePatch(fp => {
    fp.addHunk(h => {
      h.unchanged('line 0', 'line-1').added('added line').unchanged('line 2');
    });
  })
  .build();

describe('PullRequestChangedFilesController', function() {

  function buildApp(overrideProps = {}) {
    return (
      <PullRequestChangedFilesController
        multiFilePatch={multiFilePatch}
        localRepository={{}}
        {...overrideProps}
      />
    );
  }

  it('passes child props through to MultiFilePatchView', function() {
      const extraProp = Symbol('so extra you wont believe it');
      const wrapper = shallow(buildApp({extraProp}));

      const controller = wrapper.find('PullRequestChangedFilesView');
      assert.strictEqual(controller.prop('extraProp'), extraProp);
  });

});
