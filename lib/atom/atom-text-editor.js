import React, {Fragment} from 'react';
import PropTypes from 'prop-types';
import {CompositeDisposable} from 'event-kit';

import RefHolder from '../models/ref-holder';
import {autobind, extractProps} from '../helpers';

const editorProps = {
  autoIndent: PropTypes.bool,
  autoIndentOnPaste: PropTypes.bool,
  undoGroupingInterval: PropTypes.number,
  scrollSensitivity: PropTypes.number,
  encoding: PropTypes.string,
  softTabs: PropTypes.bool,
  atomicSoftTabs: PropTypes.bool,
  tabLength: PropTypes.number,
  softWrapped: PropTypes.bool,
  softWrapHangingIndentLenth: PropTypes.number,
  softWrapAtPreferredLineLength: PropTypes.bool,
  preferredLineLength: PropTypes.number,
  maxScreenLineLength: PropTypes.number,
  mini: PropTypes.bool,
  readOnly: PropTypes.bool,
  placeholderText: PropTypes.string,
  lineNumberGutterVisible: PropTypes.bool,
  showIndentGuide: PropTypes.bool,
  showLineNumbers: PropTypes.bool,
  showInvisibles: PropTypes.bool,
  invisibles: PropTypes.string,
  editorWidthInChars: PropTypes.number,
  width: PropTypes.number,
  scrollPastEnd: PropTypes.bool,
  autoHeight: PropTypes.bool,
  autoWidth: PropTypes.bool,
  showCursorOnSelection: PropTypes.bool,
};

export const TextEditorContext = React.createContext();

export default class AtomTextEditor extends React.PureComponent {
  static propTypes = {
    ...editorProps,
    text: PropTypes.string,
    didChange: PropTypes.func,
    didChangeCursorPosition: PropTypes.func,
    preserveMarkers: PropTypes.bool,
    children: PropTypes.node,
  }

  static defaultProps = {
    text: '',
    didChange: () => {},
    didChangeCursorPosition: () => {},
  }

  constructor(props, context) {
    super(props, context);
    autobind(this, 'didChange', 'didChangeCursorPosition');

    this.subs = new CompositeDisposable();
    this.suppressChange = false;

    this.refElement = new RefHolder();
    this.refModel = new RefHolder();
  }

  render() {
    return (
      <Fragment>
        <atom-text-editor ref={this.refElement.setter} />
        <TextEditorContext.Provider value={this.refModel}>
          {this.props.children}
        </TextEditorContext.Provider>
      </Fragment>
    );
  }

  componentDidMount() {
    this.setAttributesOnElement(this.props);

    this.refElement.map(element => {
      const editor = element.getModel();

      this.refModel.setter(editor);

      this.subs.add(
        editor.onDidChange(this.didChange),
        editor.onDidChangeCursorPosition(this.didChangeCursorPosition),
      );

      // shhh, eslint. shhhh
      return null;
    });
  }

  componentDidUpdate(prevProps) {
    this.setAttributesOnElement(this.props);
  }

  componentWillUnmount() {
    this.subs.dispose();
  }

  quietlySetText(text) {
    this.suppressChange = true;
    try {
      const editor = this.getModel();
      if (this.props.preserveMarkers) {
        editor.getBuffer().setTextViaDiff(text);
      } else {
        editor.setText(text);
      }
    } finally {
      this.suppressChange = false;
    }
  }

  setAttributesOnElement(theProps) {
    const modelProps = extractProps(this.props, editorProps);

    const editor = this.getModel();
    editor.update(modelProps);

    if (editor.getText() !== theProps.text) {
      this.quietlySetText(theProps.text);
    }
  }

  didChange() {
    if (this.suppressChange) {
      return;
    }

    this.props.didChange(this.getModel());
  }

  didChangeCursorPosition() {
    this.props.didChangeCursorPosition(this.getModel());
  }

  contains(element) {
    return this.refElement.get().contains(element);
  }

  focus() {
    this.refElement.get().focus();
  }

  getModel() {
    return this.refElement.get().getModel();
  }
}
