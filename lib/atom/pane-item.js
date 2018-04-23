import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import {CompositeDisposable} from 'event-kit';

import URIPattern from './uri-pattern';
import RefHolder from '../models/ref-holder';
import {createItem} from '../helpers';

/**
 * PaneItem registers an opener with the current Atom workspace. The opener will trigger on URIs that match a specified
 * pattern.
 */
export default class PaneItem extends React.Component {
  static propTypes = {
    workspace: PropTypes.object.isRequired,
    children: PropTypes.func.isRequired,
    uriPattern: PropTypes.string.isRequired,
  }

  constructor(props) {
    super(props);

    this.subs = new CompositeDisposable();
    this.state = {
      uriPattern: new URIPattern(this.props.uriPattern),
      currentlyOpen: [],
    };
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    if (prevState.uriPattern.getOriginal() === nextProps.uriPattern) {
      return null;
    }

    return {
      uriPattern: new URIPattern(nextProps.uriPattern),
    };
  }

  componentDidMount() {
    this.subs.add(this.props.workspace.addOpener(this.opener));
  }

  render() {
    return this.state.currentlyOpen.map(item => item.renderPortal(this.props.children));
  }

  componentWillUnmount() {
    this.subs.dispose();
  }

  opener = async uri => {
    const m = this.state.uriPattern.matches(uri);
    if (!m.ok()) {
      return null;
    }

    const openItem = new OpenItem(m);
    await new Promise(resolve => {
      this.setState(prevState => ({
        currentlyOpen: [...prevState.currentlyOpen, openItem],
      }), resolve);
    });
    const paneItem = openItem.create();

    this.subs.add(
      this.props.workspace.onDidDestroyPaneItem(({item}) => {
        if (item === paneItem) {
          this.setState(prevState => ({
            currentlyOpen: prevState.currentlyOpen.filter(each => each !== openItem),
          }));
        }
      }),
    );

    return paneItem;
  }
}

class OpenItem {
  constructor(match) {
    this.domNode = document.createElement('div');
    this.match = match;
    this.itemHolder = new RefHolder();
  }

  create() {
    const h = this.itemHolder.isEmpty() ? null : this.itemHolder;
    return createItem(this.domNode, h, this.match.getURI());
  }

  renderPortal(renderProp) {
    return ReactDOM.createPortal(
      renderProp({
        itemHolder: this.itemHolder,
        params: this.match.getParams(),
        uri: this.match.getURI(),
      }),
      this.domNode,
    );
  }
}
