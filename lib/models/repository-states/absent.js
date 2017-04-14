import State from './state';
import Empty from './empty';

export default class Absent extends Empty {
  isAbsent() {
    return true;
  }

  init() {
    return disallowed('init');
  }

  clone() {
    return disallowed('clone');
  }
}

State.register(Absent);

function disallowed(actionName) {
  return Promise.reject(new Error(`${actionName} cannot be performed on an absent repository`));
}
