import State from './state';

export default class Absent extends State {
  isAbsent() {
    return true;
  }

  showGitTabInit() {
    return true;
  }
}

State.register(Absent);
