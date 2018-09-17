import React, {Fragment} from 'react';
import PropTypes from 'prop-types';
import {TextEditor} from 'atom';
import {CompositeDisposable} from 'event-kit';

import RefHolder from '../models/ref-holder';
import {RefHolderPropType} from '../prop-types';
import {autobind, extractProps} from '../helpers';

const editorUpdateProps = {
  mini: PropTypes.bool,
  readOnly: PropTypes.bool,
  placeholderText: PropTypes.string,
  lineNumberGutterVisible: PropTypes.bool,
  autoHeight: PropTypes.bool,
  autoWidth: PropTypes.bool,
};

const editorCreationProps = {
  buffer: PropTypes.object, // FIXME make proptype more specific
  ...editorUpdateProps,
};

export const TextEditorContext = React.createContext();

export default class AtomTextEditor extends React.Component {
  static propTypes = {
    ...editorCreationProps,

    workspace: PropTypes.object.isRequired, // FIXME make more specific

    didChangeCursorPosition: PropTypes.func,
    didAddSelection: PropTypes.func,
    didChangeSelectionRange: PropTypes.func,
    didDestroySelection: PropTypes.func,
    observeSelections: PropTypes.func,

    refModel: RefHolderPropType,

    children: PropTypes.node,
  }

  static defaultProps = {
    didChangeCursorPosition: () => {},
    didAddSelection: () => {},
    didChangeSelectionRange: () => {},
    didDestroySelection: () => {},
  }

  constructor(props) {
    super(props);
    autobind(this, 'observeSelections');

    this.subs = new CompositeDisposable();

    this.refParent = new RefHolder();
    this.refElement = new RefHolder();
    this.refModel = null;
  }

  render() {
    return (
      <Fragment>
        <div className="github-AtomTextEditor-container" ref={this.refParent.setter} />
        <TextEditorContext.Provider value={this.getRefModel()}>
          {this.props.children}
        </TextEditorContext.Provider>
      </Fragment>
    );
  }

  componentDidMount() {
    const modelProps = extractProps(this.props, editorCreationProps);

    this.refParent.map(element => {
      const editor = new TextEditor(modelProps);
      element.appendChild(editor.getElement());
      this.getRefModel().setter(editor);
      this.refElement.setter(editor.getElement());

      this.subs.add(
        editor.onDidChangeCursorPosition(this.props.didChangeCursorPosition),
        editor.observeSelections(this.observeSelections),
      );

      return null;
    });
  }

  componentDidUpdate(prevProps) {
    const modelProps = extractProps(this.props, editorUpdateProps);
    this.getRefModel().map(editor => editor.update(modelProps));
  }

  componentWillUnmount() {
    this.getRefModel().map(editor => editor.destroy());
    this.subs.dispose();
  }

  observeSelections(selection) {
    const selectionSubs = new CompositeDisposable(
      selection.onDidChangeRange(this.props.didChangeSelectionRange),
      selection.onDidDestroy(() => {
        selectionSubs.dispose();
        this.subs.remove(selectionSubs);
        this.props.didDestroySelection(selection);
      }),
    );
    this.subs.add(selectionSubs);
    this.props.didAddSelection(selection);
  }

  contains(element) {
    return this.refElement.map(e => e.contains(element)).getOr(false);
  }

  focus() {
    this.refElement.map(e => e.focus());
  }

  getRefModel() {
    if (this.props.refModel) {
      return this.props.refModel;
    }

    if (!this.refModel) {
      this.refModel = new RefHolder();
    }

    return this.refModel;
  }

  getModel() {
    return this.getRefModel().getOr(undefined);
  }
}
