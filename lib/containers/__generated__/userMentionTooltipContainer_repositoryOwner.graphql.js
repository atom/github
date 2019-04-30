/**
 * @flow
 */

/* eslint-disable */

'use strict';

/*::
import type { ReaderFragment } from 'relay-runtime';
import type { FragmentReference } from "relay-runtime";
declare export opaque type userMentionTooltipContainer_repositoryOwner$ref: FragmentReference;
export type userMentionTooltipContainer_repositoryOwner = {|
  +login: string,
  +avatarUrl: any,
  +repositories: {|
    +totalCount: number
  |},
  +company?: ?string,
  +membersWithRole?: {|
    +totalCount: number
  |},
  +$refType: userMentionTooltipContainer_repositoryOwner$ref,
|};
*/


const node/*: ReaderFragment*/ = (function(){
var v0 = [
  {
    "kind": "ScalarField",
    "alias": null,
    "name": "totalCount",
    "args": null,
    "storageKey": null
  }
];
return {
  "kind": "Fragment",
  "name": "userMentionTooltipContainer_repositoryOwner",
  "type": "RepositoryOwner",
  "metadata": null,
  "argumentDefinitions": [],
  "selections": [
    {
      "kind": "ScalarField",
      "alias": null,
      "name": "login",
      "args": null,
      "storageKey": null
    },
    {
      "kind": "ScalarField",
      "alias": null,
      "name": "avatarUrl",
      "args": null,
      "storageKey": null
    },
    {
      "kind": "LinkedField",
      "alias": null,
      "name": "repositories",
      "storageKey": null,
      "args": null,
      "concreteType": "RepositoryConnection",
      "plural": false,
      "selections": (v0/*: any*/)
    },
    {
      "kind": "InlineFragment",
      "type": "Organization",
      "selections": [
        {
          "kind": "LinkedField",
          "alias": null,
          "name": "membersWithRole",
          "storageKey": null,
          "args": null,
          "concreteType": "OrganizationMemberConnection",
          "plural": false,
          "selections": (v0/*: any*/)
        }
      ]
    },
    {
      "kind": "InlineFragment",
      "type": "User",
      "selections": [
        {
          "kind": "ScalarField",
          "alias": null,
          "name": "company",
          "args": null,
          "storageKey": null
        }
      ]
    }
  ]
};
})();
// prettier-ignore
(node/*: any*/).hash = '3ee858460adcfbee1dfc27cf8dc46332';
module.exports = node;
