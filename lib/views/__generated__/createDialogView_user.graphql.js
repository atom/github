/**
 * @flow
 */

/* eslint-disable */

'use strict';

/*::
import type { ReaderFragment } from 'relay-runtime';
import type { FragmentReference } from "relay-runtime";
declare export opaque type createDialogView_user$ref: FragmentReference;
declare export opaque type createDialogView_user$fragmentType: createDialogView_user$ref;
export type createDialogView_user = {|
  +id: string,
  +$refType: createDialogView_user$ref,
|};
export type createDialogView_user$data = createDialogView_user;
export type createDialogView_user$key = {
  +$data?: createDialogView_user$data,
  +$fragmentRefs: createDialogView_user$ref,
};
*/


const node/*: ReaderFragment*/ = {
  "kind": "Fragment",
  "name": "createDialogView_user",
  "type": "User",
  "metadata": null,
  "argumentDefinitions": [],
  "selections": [
    {
      "kind": "ScalarField",
      "alias": null,
      "name": "id",
      "args": null,
      "storageKey": null
    }
  ]
};
// prettier-ignore
(node/*: any*/).hash = 'd6eb2fd926e344afb618967c2f2fcae3';
module.exports = node;
