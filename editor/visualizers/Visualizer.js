export default class Visualizer {
  constructor(canvas) {
    this.canvas = canvas;
    this.type = 1;
  }

  setType(type) {
    this.type = type;
  }

  setOnCompile(callback) {
    this.onCompileCallback = callback;
  }

  capture(callback) {
    this.captureCallback = callback;
  }

  handleCapture() {
    const fn = this.captureCallback;
    if (fn) {
      this.captureCallback = undefined;
      fn(this.canvas);
    }
  }
}
