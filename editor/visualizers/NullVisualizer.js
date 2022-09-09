import Visualizer from './Visualizer.js';

export default function NullVisualizer(canvas) {
  Visualizer.call(this, canvas);
};

tdl.base.inherit(NullVisualizer, Visualizer);

NullVisualizer.prototype.resize = function(width, height) {
};

NullVisualizer.prototype.reset = function() {
};

NullVisualizer.prototype.setEffects = function(sections) {
};

NullVisualizer.prototype.update = function(buffer, length) {
};

NullVisualizer.prototype.render = function() {
};
