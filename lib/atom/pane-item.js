import React, {Fragment} from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import {CompositeDisposable} from 'event-kit';

import URIPattern, {nonURIMatch} from './uri-pattern';
import RefHolder from '../models/ref-holder';
import {createItem} from '../helpers';

/**
 * PaneItem registers an opener with the current Atom workspace as long as this component is mounted. The opener will
 * trigger on URIs that match a specified pattern and render a subtree returned by a render prop.
 *
 * The render prop can receive three arguments:
 *
 * * itemHolder: A RefHolder. If used as the target for a ref, the referenced component will be used as the "item" of
 *   the pane item - its `getTitle()`, `getIconName()`, and other methods will be used by the pane.
 * * params: An object containing the named parameters captured by the URI pattern.
 * * uri: The exact, matched URI used to launch this item.
 *
 * render() {
 *   return (
 *     <PaneItem workspace={this.props.workspace} uriPattern='atom-github://host/{id}'>
 *       {({itemHolder, params}) => (
 *         <ItemComponent ref={itemHolder.setter} id={params.id} />
 *       )}
 *     </PaneItem>
 *   );
 * }
 */
export default class PaneItem extends React.Component {
  static propTypes = {
    workspace: PropTypes.object.isRequired,
    children: PropTypes.func.isRequired,
    uriPattern: PropTypes.string.isRequired,
  }

  constructor(props) {
    super(props);

    const uriPattern = new URIPattern(this.props.uriPattern);
    const currentlyOpen = this.props.workspace.getPaneItems()
      .map(item => {
        const element = item.getElement ? item.getElement() : null;
        const match = item.getURI ? uriPattern.matches(item.getURI()) : nonURIMatch;
        const stub = item.setRealItem ? item : null;
        return {element, match, stub};
      })
      .filter(each => each.element && each.match.ok())
      .map(each => new OpenItem(each.match, each.element, each.stub));

    this.subs = new CompositeDisposable();
    this.state = {uriPattern, currentlyOpen};
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

    for (const openItem of this.state.currentlyOpen) {
      openItem.hydrateStub();
    }
  }

  render() {
    return this.state.currentlyOpen.map(item => {
      return (
        <Fragment key={item.getURI()}>
          {item.renderPortal(this.props.children)}
        </Fragment>
      );
    });
  }

  componentWillUnmount() {
    this.subs.dispose();
  }

  opener = uri => {
    const m = this.state.uriPattern.matches(uri);
    if (!m.ok()) {
      return undefined;
    }

    const openItem = new OpenItem(m);

    return new Promise(resolve => {
      this.setState(prevState => ({
        currentlyOpen: [...prevState.currentlyOpen, openItem],
      }), () => {
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

        resolve(paneItem);
      });
    });
  }
}

/**
 * A subtree rendered through a portal onto a detached DOM node for use as the root as a PaneItem.
 */
class OpenItem {
  constructor(match, element = null, stub = null) {
    this.domNode = element || document.createElement('div');
    this.stubItem = stub;
    this.match = match;
    this.itemHolder = new RefHolder();
  }

  getURI() {
    return this.match.getURI();
  }

  create() {
    const h = this.itemHolder.isEmpty() ? null : this.itemHolder;
    return createItem(this.domNode, h, this.match.getURI());
  }

  hydrateStub() {
    if (this.stubItem) {
      this.stubItem.setRealItem(this.create());
      this.stubItem = null;
    }
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
