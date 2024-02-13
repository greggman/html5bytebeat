// import 'https://greggman.github.io/webgl-lint/webgl-lint.js';
import * as twgl from '../../js/twgl-full.module.js';
import Visualizer from './Visualizer.js';

export default class WebGLVisualizer extends Visualizer {
  constructor(gl, effects) {
    super(gl.canvas);
    this.gl = gl;
    this.temp = new Float32Array(1);
    this.resolution = new Float32Array(2);
    this.commonUniforms = {
      time: 0,
      resolution: this.resolution,
    };

    this.effects = effects;
    this.resize(512, 512);
  }

  resize(width, height) {
    const gl = this.gl;
    const canvas = this.canvas;
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    for (const effect of this.effects) {
      effect.resize(gl);
    }

    this.width = width;
    this.height = height;
    this.then = performance.now() * 0.001;
  }

  reset() {
    const gl = this.gl;
    this.then = performance.now() * 0.001;
    this.position = 0;

    for (const effect of this.effects) {
      effect.reset(gl);
    }
  }

  render(byteBeat, analyzers) {
    const gl = this.gl;
    twgl.bindFramebufferInfo(gl);
    gl.clearColor(0, 0, 0.3, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    this.resolution[0] = gl.drawingBufferWidth;
    this.resolution[1] = gl.drawingBufferHeight;
    const now = performance.now();
    this.commonUniforms.time = (now - this.then) * 0.001;

    for (const effect of this.effects) {
      effect.render(gl, this.commonUniforms, byteBeat, analyzers);
    }
  }
}

