export default class Visualizer {
  constructor(canvas) {
    this.canvas = canvas;
    this.type = 1;
  }

  // called when the window resizes
  resize(/*width, height*/) {
    // extend and override
  }

  // called the the time is reset to 0
  reset() {
    // extend and override
  }

  // called with audio data
  // If buffer0 === buffer1 then it's mono
  // else it's stereo.
  update(/*buffer0, buffer1, length*/) {
    // extend and override
  }

  // Called on requestAnimationFrame
  render(/*byteBeat*/) {
    // extend and override
  }
}
