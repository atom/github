const capitalize = str => str.substr(0, 1).toUpperCase() + str.substr(1);

class StateMachine {
  constructor(target, initialState, transitions) {
    this.target = target;
    this.transitions = transitions;
    this.state = initialState;
  }

  getCurrentState() {
    return this.state;
  }

  trigger(event, ...args) {
    const validTransitions = this.transitions[this.state] || {};
    const nextState = validTransitions[event];

    if (nextState && nextState !== this.state) {
      this.transitionTo(nextState, ...args);
      return true;
    } else {
      return false;
    }
  }

  transitionTo(nextState, ...args) {
    const exitMethod = `onExit${capitalize(this.state)}`;
    const enterMethod = `onEnter${capitalize(nextState)}`;

    if (Reflect.has(this.target, exitMethod)) {
      this.target[exitMethod](nextState, ...args);
    }

    const previousState = this.state;
    this.state = nextState;

    if (Reflect.has(this.target, enterMethod)) {
      this.target[enterMethod](previousState, ...args);
    }
  }
}

export default class SpitDiffLineGrouper {
  constructor(lines) {
    this.lines = lines;
    this.stateMachine = new StateMachine(this, 'start', {
      start: {
        unchanged: 'context',
        deleted: 'changes',
        added: 'additions',
        nonewline: 'nonewline',
      },
      context: {
        deleted: 'changes',
        added: 'additions',
        nonewline: 'nonewline',
      },
      changes: {
        unchanged: 'context',
        nonewline: 'nonewline',
      },
      additions: {
        unchanged: 'context',
      },
      nonewline: {
      },
    });
  }

  getGroups() {
    if (!this.groups) {
      this.computeGroups();
    }

    return this.groups;
  }

  computeGroups() {
    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];
      const status = line.getStatus();
      this.stateMachine.trigger(status);
      const method = `consume${capitalize(status)}Line`;
      if (this[method]) {
        this[method](line, this.stateMachine.getCurrentState());
      }
    }
    this.groups.push(this.currentGroup);
  }

  onExitStart() {
    this.groups = [];
  }

  onEnterContext() {
    this.currentGroup && this.groups.push(this.currentGroup);
    this.currentGroup = {left: [], right: []};
  }

  onEnterChanges() {
    this.currentGroup && this.groups.push(this.currentGroup);
    this.currentGroup = {left: [], right: []};
  }

  onEnterAdditions() {
    this.currentGroup && this.groups.push(this.currentGroup);
    this.currentGroup = {left: [], right: []};
  }

  consumeUnchangedLine(line) {
    this.currentGroup.left.push(line);
    this.currentGroup.right.push(line);
  }

  consumeDeletedLine(line) {
    this.currentGroup.left.push(line);
  }

  consumeAddedLine(line, state) {
    this.currentGroup.right.push(line);
  }
}
