import DataEffect from './effects/DataEffect.js';
import FFTEffect from './effects/FFTEffect.js';
import SampleEffect from './effects/SampleEffect.js';
import WaveEffect from './effects/WaveEffect.js';
import Visualizer from './Visualizer.js';

export default class WaveVisualizer extends Visualizer {
  constructor(canvas, showSample) {
    super(canvas);
    this.showSample = showSample;
    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: true,
    });
    this.gl = gl;
    this.temp = new Float32Array(1);
    this.resolution = new Float32Array(2);
    this.commonUniforms = {
      time: 0,
      resolution: this.resolution,
    };

    this.effects = [
      new DataEffect(gl),
      ...(showSample ? [new SampleEffect(gl)] : []),
      new WaveEffect(gl),
      new FFTEffect(gl),
    ];

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

