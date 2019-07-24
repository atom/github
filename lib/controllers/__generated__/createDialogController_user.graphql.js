/**
 * @flow
 */

/* eslint-disable */

'use strict';

/*::
import type { ReaderFragment } from 'relay-runtime';
import type { FragmentReference } from "relay-runtime";
declare export opaque type createDialogController_user$ref: FragmentReference;
declare export opaque type createDialogController_user$fragmentType: createDialogController_user$ref;
export type createDialogController_user = {|
  +id: string,
  +$refType: createDialogController_user$ref,
|};
export type createDialogController_user$data = createDialogController_user;
export type createDialogController_user$key = {
  +$data?: createDialogController_user$data,
  +$fragmentRefs: createDialogController_user$ref,
};
*/


const node/*: ReaderFragment*/ = {
  "kind": "Fragment",
  "name": "createDialogController_user",
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
(node/*: any*/).hash = '525e9172a481ebccd304f9d2f535a493';
module.exports = node;
