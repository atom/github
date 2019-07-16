import React, {useState, useEffect, useRef} from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';

import {BranchSetPropType, BranchPropType} from '../prop-types';
import {Commands, Command} from '../atom/commands';
import {GitError} from '../git-shell-out-strategy';
import {RefHolder} from '../models/ref-holder';

export default function BranchMenuView(props) {
  const [createNew, setCreateNew] = useState(false);
  const [checkedOutBranch, setCheckedOutBranch] = useState(null);

  const refEditorElement = useRef(new RefHolder());

  useEffect(() => {
    createNew && refEditorElement.current.map(e => e.focus());
  }, [createNew]);

  async function performCheckout(branchName, options) {
    refEditorElement.current.map(e => e.classList.remove('is-focused'));
    setCheckedOutBranch(branchName);
    try {
      await props.checkout(branchName, options);
      setCheckedOutBranch(null);
      refEditorElement.current.map(e => e.getModel().setText(''));
    } catch (error) {
      refEditorElement.current.map(e => e.classList.add('is-focused'));
      setCheckedOutBranch(null);
      if (!(error instanceof GitError)) {
        throw error;
      }
    }
  }

  function didSelectItem(event) {
    return performCheckout(event.target.value);
  }

  async function createBranch() {
    if (createNew) {
      const branchName = refEditorElement.current.map(e => e.getModel().getText().trim()).getOr('');
      await performCheckout(branchName, {createNew: true});
    } else {
      setCreateNew(true);
    }
  }

  function cancelCreateNewBranch() {
    setCreateNew(false);
  }

  const branchNames = props.branches.getNames();
  let currentBranchName = props.currentBranch.isDetached() ? 'detached' : props.currentBranch.getName();
  if (checkedOutBranch) {
    currentBranchName = checkedOutBranch;
    if (branchNames.indexOf(checkedOutBranch) === -1) {
      branchNames.push(checkedOutBranch);
    }
  }

  const disableControls = !!checkedOutBranch;

  const branchEditorClasses = cx(
    'github-BranchMenuView-item', 'github-BranchMenuView-editor', {hidden: !createNew},
  );

  const branchSelectListClasses = cx(
    'github-BranchMenuView-item', 'github-BranchMenuView-select', 'input-select', {hidden: !!createNew},
  );

  const iconClasses = cx(
    'github-BranchMenuView-item', 'icon', {'icon-git-branch': !disableControls, 'icon-sync': disableControls},
  );

  const newBranchEditor = (
    <div className={branchEditorClasses}>
      <atom-text-editor
        ref={refEditorElement.current.setter}
        mini={true}
        readonly={disableControls ? true : undefined}
      />
    </div>
  );

  const selectBranchView = (
    /* eslint-disable jsx-a11y/no-onchange */
    <select
      className={branchSelectListClasses}
      onChange={didSelectItem}
      disabled={disableControls}
      value={currentBranchName}>
      {props.currentBranch.isDetached() &&
        <option key="detached" value="detached" disabled>{props.currentBranch.getName()}</option>
      }
      {branchNames.map(branchName => {
        return <option key={branchName} value={branchName}>{branchName}</option>;
      })}
    </select>
  );

  return (
    <div className="github-BranchMenuView">
      <Commands target=".github-BranchMenuView-editor atom-text-editor[mini]">
        <Command command="tool-panel:unfocus" callback={cancelCreateNewBranch} />
        <Command command="core:cancel" callback={cancelCreateNewBranch} />
        <Command command="core:confirm" callback={createBranch} />
      </Commands>
      <div className="github-BranchMenuView-selector">
        <span className={iconClasses} />
        {newBranchEditor}
        {selectBranchView}
        <button
          className="github-BranchMenuView-item github-BranchMenuView-button btn"
          onClick={createBranch}
          disabled={disableControls}> New Branch </button>
      </div>
    </div>
  );
}

BranchMenuView.propTypes = {
  branches: BranchSetPropType.isRequired,
  currentBranch: BranchPropType.isRequired,
  checkout: PropTypes.func.isRequired,
};
