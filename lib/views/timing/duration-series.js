export default class DurationSeries {
  constructor(operationName) {
    this.operationName = operationName;
    this.durations = [];
  }

  record(duration) {
    this.durations.push(duration);
  }

  getMinimum() {
    //
  }

  getQuartile1() {
    //
  }

  getMedian() {
    //
  }

  getQuartile3() {
    //
  }

  getMaximum() {
    //
  }
}
