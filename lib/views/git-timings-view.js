import React from 'react';

class Marker {
  constructor(label) {
    this.label = label;
    this.currentSection = null;
    this.timings = [];
  }

  markStart(sectionName, startTime = performance.now()) {
    if (this.currentSection) {
      this.markEnd(this.currentSection, startTime);
    }

    this.currentSection = sectionName;
    this.timings.push({label: sectionName, start: startTime});
  }

  markEnd(sectionName, endTime = performance.now()) {
    if (!sectionName && this.currentSection) {
      this.timings.find(t => t.label === this.currentSection).end = endTime;
    } else {
      this.timings.find(t => t.label === sectionName).end = endTime;
    }

    if (this.currentSection === sectionName) {
      this.currentSection = null;
    }
  }
}

export default class GitTimingsView extends React.Component {
  static generateMarker(label) {
    return new Marker(label);
  }

  render() {
    return (
      <div>
        Testing
      </div>
    );
  }
}
