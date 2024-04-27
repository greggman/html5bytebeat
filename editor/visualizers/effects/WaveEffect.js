import * as twgl from '../../../js/twgl-full.module.js';
import { drawEffect } from './effect-utils.js';

const colorRed = new Float32Array([1, 0, 0, 1]);
const colorMagenta = new Float32Array([1, 0, 1, 1]);
const colorGreen = new Float32Array([0, 1, 0, 1]);

export default class WaveEffect {
  constructor(gl) {
    this.programInfo = twgl.createProgramInfo(gl, [
        `
          attribute float column;
          attribute float height;
          uniform float position;
          uniform vec2 offset;
          void main() {
            gl_Position = vec4(mod(column - position, 1.0) * 2.0 - 1.0, height, 0, 1) + vec4(offset, 0, 0);
          }
        `,
        `
          precision mediump float;
          uniform vec4 color;
          void main() {
            gl_FragColor = color;
          }
        `,
    ]);
    this.uniforms = {
      position: 0,
      offset: [0, 0],
      color: new Float32Array([1, 0, 0, 1]),
    };
    this.frameCount = 0;
  }
  reset(gl) {
    for (let i = 0; i < this.lineHeightL.length; ++i) {
      this.lineHeightL[i] = 0;
      this.lineHeightR[i] = 0;
    }
    twgl.setAttribInfoBufferFromArray(gl, this.bufferInfoL.attribs.height, this.lineHeightL);
    twgl.setAttribInfoBufferFromArray(gl, this.bufferInfoR.attribs.height, this.lineHeightR);
    this.then = performance.now();
    this.position = 0;
  }
  resize(gl) {
    const width = gl.drawingBufferWidth;
    const lineHeight = new Float32Array(width);
    const column = new Float32Array(width);

    this.state = 'init';
    this.width = width;
    this.position = 0;
    this.then = performance.now();

    this.oneVerticalPixel = 2 / gl.drawingBufferHeight;

    for (let ii = 0; ii < width; ++ii) {
      lineHeight[ii] = Math.sin(ii / width * Math.PI * 2);
      column[ii] = ii / width;
    }
    this.lineHeightL = lineHeight;
    this.lineHeightR = lineHeight.slice();
    const arrays = {
      height: { numComponents: 1, data: lineHeight, },
      column: { numComponents: 1, data: column, },
    };

    if (!this.bufferInfoL) {
      this.bufferInfoL = twgl.createBufferInfoFromArrays(gl, arrays);
      this.bufferInfoR = twgl.createBufferInfoFromArrays(gl, arrays);
    } else {
      twgl.setAttribInfoBufferFromArray(gl, this.bufferInfoL.attribs.height, arrays.height);
      twgl.setAttribInfoBufferFromArray(gl, this.bufferInfoL.attribs.column, arrays.column);
      twgl.setAttribInfoBufferFromArray(gl, this.bufferInfoR.attribs.height, arrays.height);
      twgl.setAttribInfoBufferFromArray(gl, this.bufferInfoR.attribs.column, arrays.column);
      this.bufferInfoL.numElements = width;
      this.bufferInfoR.numElements = width;
    }
  }
  async #update(gl, byteBeat, elapsedTimeMS) {
    if (this.state === 'init') {
      this.state = 'initializing';
      if (this.beatContext) {
        byteBeat.destroyContext(this.beatContext);
        byteBeat.destroyStack(this.beatStack);
      }
      this.beatContext = await byteBeat.createContext();
      this.beatStack = await byteBeat.createStack();
      this.state = 'running';
    }
    if (this.state === 'running') {
      this.state = 'waiting';
      const {bufferInfoL, bufferInfoR, beatContext: context, beatStack: stack} = this;
      const numChannels = byteBeat.getNumChannels();
      const startTime = this.position;
      const endTime = startTime + elapsedTimeMS * 0.001 * byteBeat.getDesiredSampleRate() | 0;
      this.position = endTime;
      const dataP = [];
      for (let channel = 0; channel < numChannels; ++channel) {
        dataP.push(byteBeat.getSamplesForTimeRange(
          startTime,
          endTime,
          this.lineHeightL.length,
          context,
          stack,
          channel,
        ));
      }
      const data = await Promise.all(dataP);
      for (let channel = 0; channel < numChannels; ++channel) {
        const bufferInfo = channel ? bufferInfoR : bufferInfoL;
        gl.bindBuffer(gl.ARRAY_BUFFER, bufferInfo.attribs.height.buffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, data[channel].subarray(0, this.lineHeightL.length));
      }
      this.state = 'running';
    }
  }
  render(gl, commonUniforms, byteBeat) {
    const {uniforms, programInfo, bufferInfoL, bufferInfoR} = this;
    const numChannels = byteBeat.getNumChannels();

    const targetTimeMS = 1000 / (48000 / 4096);
    const now = performance.now();
    const elapsedTimeMS = now - this.then;
    const run = elapsedTimeMS >= targetTimeMS;
    if (run) {
      this.then = now;
      if (byteBeat.isRunning()) {
        this.#update(gl, byteBeat, elapsedTimeMS);
      }
    }

    for (let channel = 0; channel < numChannels; ++channel) {
      const bufferInfo = channel ? bufferInfoR : bufferInfoL;
      uniforms.color = channel
          ? colorGreen
          : (numChannels === 2 ? colorMagenta : colorRed);
      //uniforms.position = this.position / this.width;
      uniforms.offset[0] = channel / gl.drawingBufferWidth;
      uniforms.offset[1] = 0;
      if (channel) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
      }
      drawEffect(gl, programInfo, bufferInfo, uniforms, commonUniforms, gl.LINE_STRIP);
      uniforms.offset[0] += 1 / gl.drawingBufferWidth;
      uniforms.offset[1] += 1 / gl.drawingBufferHeight;
      drawEffect(gl, programInfo, bufferInfo, uniforms, commonUniforms, gl.LINE_STRIP);
      if (channel) {
        gl.disable(gl.BLEND);
      }
    }
  }
}