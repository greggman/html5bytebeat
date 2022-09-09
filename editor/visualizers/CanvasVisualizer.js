import Visualizer from './Visualizer.js';

export default function CanvasVisualizer(canvas) {
  Visualizer.call(this, canvas);
  this.ctx = canvas.getContext("2d");
  this.temp = new Float32Array(1);
  this.resize(512, 512);
  this.type = 1;
};

tdl.base.inherit(CanvasVisualizer, Visualizer);

CanvasVisualizer.prototype.resize = function(width, height) {
  var canvas = this.canvas;
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  this.positions = new Float32Array(width);
  this.oldPositions = new Float32Array(width);
  this.width = width;
  this.height = height;
  this.position = 0;
  this.drawPosition = 0;
  this.drawCount = 0;
};

CanvasVisualizer.prototype.reset = function() {
  this.position = 0;
  this.drawPosition = 0;
  this.drawCount = 0;
  var canvas = this.canvas;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
};

CanvasVisualizer.prototype.setEffects = function(sections) {
};

CanvasVisualizer.prototype.update = function(buffer, length) {
  if (!this.type && !this.captureCallback) {
    return;
  }
  // Yes I know this is dumb. I should just do the last 2 at most.
  var s = 0;
  var p = this.position;
  var ps = this.positions;
  while (length) {
    var max = Math.min(length, this.width - p);
    for (var i = 0; i < max; ++i) {
      ps[p++] = buffer[s++];
    }
    p = p % this.width;
    this.drawCount += max;
    length -= max;
  }
  this.position = p;
  this.handleCapture();
};

CanvasVisualizer.prototype.render = function() {
  if (!this.type) {
    return;
  }
  var count = Math.min(this.drawCount, this.width);
  var dp = this.drawPosition;
  var ctx = this.ctx;
  var old = this.oldPositions;
  var ps = this.positions;
  var halfHeight = this.height / 2;
  ctx.fillStyle = "rgb(255,0,0)";
  /* horizontal */
  while (count) {
    ctx.clearRect(dp, old[dp], 1, 1);
    var newPos = Math.floor(-ps[dp] * halfHeight + halfHeight);
    ctx.fillRect(dp, newPos, 1, 1);
    old[dp] = newPos;
    dp = (dp + 1) % this.width;
    --count;
  }

  /* vertical hack (drawing the wave vertically should be faster */
  /*
  var w = this.width;
  var h = this.height;
  var hw = Math.floor(w * 0.5);
  while (count) {
    var y = Math.floor(dp * h / w);
    var oldX = Math.floor(old[dp] * w / h * 0.3);
    ctx.clearRect(hw - oldX, y, oldX * 2, 1);
    var newPos = Math.floor(-ps[dp] * halfHeight + halfHeight);
    var x = Math.floor(newPos * w / h * 0.3);
    ctx.fillRect(hw - x, y, x * 2, 1, 1);
    old[dp] = newPos;
    dp = (dp + 1) % this.width;
    --count;
  }
  */
  this.drawCount = 0;
  this.drawPosition = dp;
};