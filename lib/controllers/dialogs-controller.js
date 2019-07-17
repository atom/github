import React from 'react';
import PropTypes from 'prop-types';

import Panel from '../atom/panel';
import InitDialog from '../views/init-dialog';

export default class DialogsController extends React.Component {
  static propTypes = {
    // Model
    request: PropTypes.shape({
      identifier: PropTypes.string.isRequired,
      isProgressing: PropTypes.bool.isRequired,
    }).isRequired,

    // Atom environment
    workspace: PropTypes.object.isRequired,
  };

  constructor(props) {
    super(props);

    this.dialogRenderFns = {
      null: () => null,
      init: this.renderInitDialog,
    };

    this.state = {
      requestInProgress: null,
      requestError: [null, null],
    };
  }

  render() {
    return this.dialogRenderFns[this.props.request.identifier]();
  }

  renderInitDialog = () => (
    <Panel workspace={this.props.workspace} location="modal">
      <InitDialog {...this.getCommonProps()} />
    </Panel>
  )

  getCommonProps() {
    const {request} = this.props;
    const accept = request.isProgressing
      ? async (...args) => {
        this.setState({requestInProgress: request});
        try {
          return await request.accept(...args);
        } catch (error) {
          this.setState({requestError: [request, error]});
          return undefined;
        } finally {
          this.setState({requestInProgress: null});
        }
      } : (...args) => {
        try {
          return request.accept(...args);
        } catch (error) {
          this.setState({requestError: [request, error]});
          return undefined;
        }
      };
    const wrapped = wrapDialogRequest(request, {accept});

    return {
      inProgress: this.state.requestInProgress === request,
      error: this.state.requestError[0] === request ? this.state.requestError[1] : null,
      request: wrapped,
    };
  }
}

class DialogRequest {
  constructor(identifier, params = {}) {
    this.identifier = identifier;
    this.params = params;
    this.isProgressing = false;
    this.accept = () => {};
    this.cancel = () => {};
  }

  onAccept(cb) {
    this.accept = cb;
  }

  onProgressingAccept(cb) {
    this.isProgressing = true;
    this.onAccept(cb);
  }

  onCancel(cb) {
    this.cancel = cb;
  }

  getParams() {
    return this.params;
  }
}

function wrapDialogRequest(original, {accept}) {
  const dup = new DialogRequest(original.identifier, original.getParams());
  dup.isProgressing = original.isProgressing;
  dup.onAccept(accept);
  dup.onCancel(original.cancel);
  return dup;
}

export const dialogRequests = {
  null: {
    identifier: 'null',
    isProgressing: false,
    params: {},
    accept: () => {},
    cancel: () => {},
  },

  init({dirPath}) {
    return new DialogRequest('init', {dirPath});
  },
};
