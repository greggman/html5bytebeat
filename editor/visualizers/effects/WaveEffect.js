import * as twgl from '../../../js/twgl-full.module.js';
import ByteBeat from '../../../src/ByteBeat.js';
import WrappingStack from '../../../src/WrappingStack.js';
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
  }
  resize(gl) {
    this.beatContext = ByteBeat.makeContext();
    this.beatStack = new WrappingStack();

    const width = gl.drawingBufferWidth;
    const lineHeight = new Float32Array(width);
    const column = new Float32Array(width);

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
  render(gl, commonUniforms, byteBeat) {
    const {uniforms, programInfo, bufferInfoL, bufferInfoR, beatContext: context, beatStack: stack} = this;
    const numChannels = byteBeat.getNumChannels();

    this.frameCount++;
    const frameSkip = 8;
    if (byteBeat.isRunning() && this.frameCount % frameSkip === 0) {
      const now = performance.now();
      const elapsedTimeMS = now - this.then;
      this.then = now;

      const startTime = this.position;
      const endTime = startTime + elapsedTimeMS * 0.001 * byteBeat.getDesiredSampleRate() | 0;
      const duration = (endTime - startTime);

      this.position = endTime;
      for (let channel = 0; channel < numChannels; ++channel) {
        const bufferInfo = channel ? bufferInfoR : bufferInfoL;

        if (byteBeat.isRunning()) {
          const dst = channel ? this.lineHeightR : this.lineHeightL;
          for (let i = 0; i < dst.length; ++i) {
            const position = startTime + i * duration / dst.length | 0;
            dst[i] = byteBeat.getSampleForTime(position, context, stack, channel);
          }

          gl.bindBuffer(gl.ARRAY_BUFFER, bufferInfo.attribs.height.buffer);
          gl.bufferSubData(gl.ARRAY_BUFFER, 0, dst);
        }
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