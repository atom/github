/**
 * @flow
 * @relayHash c6c5a728be2bea6cc53ebf552c515929
 */

/* eslint-disable */

'use strict';

/*::
import type {ConcreteBatch} from 'relay-runtime';
export type UserMentionTooltipItemQueryResponse = {|
  +repositoryOwner: ?{| |};
|};
*/


/*
query UserMentionTooltipItemQuery(
  $username: String!
) {
  repositoryOwner(login: $username) {
    __typename
    ...UserMentionTooltipContainer_repositoryOwner
    id
  }
}

fragment UserMentionTooltipContainer_repositoryOwner on RepositoryOwner {
  login
  avatarUrl
  repositories {
    totalCount
  }
  ... on User {
    company
  }
  ... on Organization {
    members {
      totalCount
    }
  }
}
*/

const batch /*: ConcreteBatch*/ = {
  "fragment": {
    "argumentDefinitions": [
      {
        "kind": "LocalArgument",
        "name": "username",
        "type": "String!",
        "defaultValue": null
      }
    ],
    "kind": "Fragment",
    "metadata": null,
    "name": "UserMentionTooltipItemQuery",
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "args": [
          {
            "kind": "Variable",
            "name": "login",
            "variableName": "username",
            "type": "String!"
          }
        ],
        "concreteType": null,
        "name": "repositoryOwner",
        "plural": false,
        "selections": [
          {
            "kind": "FragmentSpread",
            "name": "UserMentionTooltipContainer_repositoryOwner",
            "args": null
          }
        ],
        "storageKey": null
      }
    ],
    "type": "Query"
  },
  "id": null,
  "kind": "Batch",
  "metadata": {},
  "name": "UserMentionTooltipItemQuery",
  "query": {
    "argumentDefinitions": [
      {
        "kind": "LocalArgument",
        "name": "username",
        "type": "String!",
        "defaultValue": null
      }
    ],
    "kind": "Root",
    "name": "UserMentionTooltipItemQuery",
    "operation": "query",
    "selections": [
      {
        "kind": "LinkedField",
        "alias": null,
        "args": [
          {
            "kind": "Variable",
            "name": "login",
            "variableName": "username",
            "type": "String!"
          }
        ],
        "concreteType": null,
        "name": "repositoryOwner",
        "plural": false,
        "selections": [
          {
            "kind": "ScalarField",
            "alias": null,
            "args": null,
            "name": "__typename",
            "storageKey": null
          },
          {
            "kind": "ScalarField",
            "alias": null,
            "args": null,
            "name": "login",
            "storageKey": null
          },
          {
            "kind": "ScalarField",
            "alias": null,
            "args": null,
            "name": "avatarUrl",
            "storageKey": null
          },
          {
            "kind": "LinkedField",
            "alias": null,
            "args": null,
            "concreteType": "RepositoryConnection",
            "name": "repositories",
            "plural": false,
            "selections": [
              {
                "kind": "ScalarField",
                "alias": null,
                "args": null,
                "name": "totalCount",
                "storageKey": null
              }
            ],
            "storageKey": null
          },
          {
            "kind": "ScalarField",
            "alias": null,
            "args": null,
            "name": "id",
            "storageKey": null
          },
          {
            "kind": "InlineFragment",
            "type": "Organization",
            "selections": [
              {
                "kind": "LinkedField",
                "alias": null,
                "args": null,
                "concreteType": "UserConnection",
                "name": "members",
                "plural": false,
                "selections": [
                  {
                    "kind": "ScalarField",
                    "alias": null,
                    "args": null,
                    "name": "totalCount",
                    "storageKey": null
                  }
                ],
                "storageKey": null
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
                "args": null,
                "name": "company",
                "storageKey": null
              }
            ]
          }
        ],
        "storageKey": null
      }
    ]
  },
  "text": "query UserMentionTooltipItemQuery(\n  $username: String!\n) {\n  repositoryOwner(login: $username) {\n    __typename\n    ...UserMentionTooltipContainer_repositoryOwner\n    id\n  }\n}\n\nfragment UserMentionTooltipContainer_repositoryOwner on RepositoryOwner {\n  login\n  avatarUrl\n  repositories {\n    totalCount\n  }\n  ... on User {\n    company\n  }\n  ... on Organization {\n    members {\n      totalCount\n    }\n  }\n}\n"
};

module.exports = batch;
