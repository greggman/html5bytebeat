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

  updateBuffer(buffer, length, dest, position, bufferInfo) {
    const gl = this.gl;
    // Yes I know this is dumb. I should just do the last 2 at most.
    let offset = 0;
    const v = this.oneVerticalPixel;
    const v2 = v * 2;
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferInfo.attribs.height.buffer);
    while (length) {
      const max = Math.min(length, this.width - position);
      let d = position * 2;
      let h1 = buffer[offset];
      for (let i = 0; i < max; ++i) {
        const h2 = buffer[++offset];
        const dy = h1 - h2;
        dest[d++] = h1;
        dest[d++] = Math.abs(dy) > v ? h2 : (h2 + (dy > 0 ? v2 : -v2));
        h1 = h2;
      }
      const view = new Float32Array(dest.buffer, position * 4 * 2, max * 2);
      gl.bufferSubData(gl.ARRAY_BUFFER, position * 4 * 2, view);
      position = (position + max) % this.width;
      length -= max;
    }
    return position;
  }

  update(bufferL, bufferR, length) {
    const position = this.position;
    this.position = this.updateBuffer(bufferL, length, this.lineHeightL, position, this.effects.wave.bufferInfoL);
    const is2Channels = bufferL !== bufferR;
    // do we have 2 channels?
    if (is2Channels) {
      this.updateBuffer(bufferR, length, this.lineHeightR, position, this.effects.wave.bufferInfoR);
    }
  }

  render(byteBeat) {
    const gl = this.gl;
    gl.clearColor(0, 0, 0.3, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    this.resolution[0] = gl.drawingBufferWidth;
    this.resolution[1] = gl.drawingBufferHeight;
    const now = performance.now();
    this.commonUniforms.time = now - this.then;

    for (const effect of this.effects) {
      effect.render(gl, this.commonUniforms, byteBeat);
    }

/*
    const canvas = this.canvas;

    {
      //const data = byteBeat.getFloatAudioData();
      const data = byteBeat.getByteAudioData();
      const dst = this.lineHeightL;
      const v = this.oneVerticalPixel;
      const v2 = v * 2;
      let h1 = data[0] / 128 - 1;
      for (let i = 0; i < dst.length; i += 2) {
        const ndx = i * data.length / dst.length | 0;
        const h2 = data[ndx] / 128 - 1;
        const dy = h1 - h2;
        dst[i] = h1;
        dst[i + 1] = (Math.abs(dy) > v ? h2 : (h2 + (dy > 0 ? v2 : -v2)));
        h1 = h2;
      }
      const bufferInfo = this.effects.wave.bufferInfoL;
      gl.bindBuffer(gl.ARRAY_BUFFER, bufferInfo.attribs.height.buffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.lineHeightL);
    }

    const now = (new Date()).getTime() * 0.001;


*/

    this.handleCapture();
  }
}

