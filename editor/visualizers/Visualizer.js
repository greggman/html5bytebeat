export default function Visualizer(canvas) {
  this.canvas = canvas;
  this.type = 1;
};

Visualizer.prototype.setType = function(type) {
  this.type = type;

};

Visualizer.prototype.setOnCompile = function(callback) {
  this.onCompileCallback = callback;
};

Visualizer.prototype.capture = function(callback) {
  this.captureCallback = callback;
};

Visualizer.prototype.handleCapture = function() {
  var fn = this.captureCallback;
  if (fn) {
    this.captureCallback = undefined;
    fn(this.canvas);
  }
};