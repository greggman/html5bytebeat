import * as twgl from '../../../js/twgl-full.module.js';
import { drawEffect } from './effect-utils.js';

export default class FFTEffect {
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
      color: new Float32Array([0, 0.5, 0.5, 1]),
    };
  }
  reset(gl) {
    this.lineHeight.fill(0);
    twgl.setAttribInfoBufferFromArray(gl, this.bufferInfo.attribs.height, this.lineHeight);
  }
  resize(gl) {
    const width = gl.drawingBufferWidth;
    const lineHeight = new Float32Array(width * 2);
    const column = new Float32Array(width * 2);

    this.width = width;
    this.position = 0;

    this.oneVerticalPixel = 2 / gl.drawingBufferHeight;

    for (let ii = 0; ii < width * 2; ++ii) {
      lineHeight[ii] = Math.sin(ii / width * Math.PI * 2);
      column[ii] = (ii >> 1) / width;
    }
    this.lineHeight = lineHeight;
    const arrays = {
      height: { numComponents: 1, data: lineHeight, },
      column: { numComponents: 1, data: column, },
    };

    if (!this.bufferInfo) {
      this.bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);
    } else {
      twgl.setAttribInfoBufferFromArray(gl, this.bufferInfo.attribs.height, arrays.height);
      twgl.setAttribInfoBufferFromArray(gl, this.bufferInfo.attribs.column, arrays.column);
      this.bufferInfo.numElements = width * 2;
    }
  }
  render(gl, commonUniforms, byteBeat, analyser) {
    this.data = this.data || new Uint8Array(analyser.frequencyBinCount);
    const data = this.data;
    analyser.getByteFrequencyData(data);
    const dst = this.lineHeight;
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

    const {uniforms, programInfo, bufferInfo} = this;

    gl.bindBuffer(gl.ARRAY_BUFFER, bufferInfo.attribs.height.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.lineHeight);

    uniforms.position = this.position / this.width;
    uniforms.offset[0] = 0;
    drawEffect(gl, programInfo, bufferInfo, uniforms, commonUniforms, gl.LINES);
  }
}