import {PropTypes} from 'react';

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
  name: PropTypes.string,
  url: PropTypes.string,
  info: PropTypes.shape({
    githubRepo: PropTypes.bool.isRequired,
    owner: PropTypes.string,
    name: PropTypes.string,
  }).isRequired,
});
