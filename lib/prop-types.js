import PropTypes from 'prop-types';

export const DOMNodePropType = (props, propName, componentName) => {
  if (props[propName] instanceof HTMLElement) {
    return null;
  } else {
    return new Error(
      `Invalid prop '${propName}' supplied to '${componentName}'. Value is not DOM element.`,
    );
  }
};

export const RemotePropType = PropTypes.shape({
  getName: PropTypes.func.isRequired,
  getUrl: PropTypes.func.isRequired,
  isGithubRepo: PropTypes.func.isRequired,
  getOwner: PropTypes.func.isRequired,
  getRepo: PropTypes.func.isRequired,
});

export const BranchPropType = PropTypes.shape({
  getName: PropTypes.func.isRequired,
  isDetached: PropTypes.func.isRequired,
  isPresent: PropTypes.func.isRequired,
});

export const CommitPropType = PropTypes.shape({
  getSha: PropTypes.func.isRequired,
  getMessage: PropTypes.func.isRequired,
  isUnbornRef: PropTypes.func.isRequired,
  isPresent: PropTypes.func.isRequired,
});

export const RelayConnectionPropType = nodePropType => PropTypes.shape({
  edges: PropTypes.arrayOf(
    PropTypes.shape({
      cursor: PropTypes.string,
      node: nodePropType,
    }),
  ),
  pageInfo: PropTypes.shape({
    endCursor: PropTypes.string,
    hasNextPage: PropTypes.bool,
    hasPreviousPage: PropTypes.bool,
    startCursor: PropTypes.string,
  }),
  totalCount: PropTypes.number,
});
