import * as twgl from '../../../js/twgl-full.module.js';
import { drawEffect } from './effect-utils.js';

const colorDarkCyan = [0, 0.7, 0.7, 1];
const colorDarkYellow = [0.7, 0.7, 0, 1];

export default class FFTEffect {
  constructor(gl) {
    if (gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) < 1) {
      console.warn('vertex texture units not supported');
      const noop = _ => _;
      this.reset = noop;
      this.resize = noop;
      this.render = noop;
      return;
    }
    this.programInfo = twgl.createProgramInfo(gl, [
        `
          attribute float column;
          uniform sampler2D heightTex;
          uniform float heightTexWidth;
          uniform float position;
          uniform vec2 offset;
          uniform vec2 resolution;
          void main() {
            float width = resolution[0];
            float height = resolution[1];

            float oneVerticalPixel = 2.0 / height;
            float oneHorizontalTexel = 1.0 / heightTexWidth;

            float odd = mod(column, 2.0);

            float c = floor(column / 2.0) / width;
            float u = c + oneHorizontalTexel * odd;
            float h = texture2D(heightTex, vec2(u, 0.5)).r * 2.0 - 1.0
               + oneVerticalPixel * odd;
            gl_Position = vec4(c * 2.0 - 1.0, h, 0, 1) + vec4(offset, 0, 0);
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

    this.heightTex = twgl.createTexture(gl, {
      format: gl.LUMINANCE,
      src: [0],
      minMag: gl.NEAREST,
      wrap: gl.CLAMP_TO_EDGE,
    });

    this.uniforms = {
      heightTex: this.heightTex,
      heightTexWidth: 0,
      position: 0,
      resolution: [0, 0],
      offset: [0, 0],
      color: new Float32Array([0, 0.5, 0.5, 1]),
    };
  }
  reset(/*gl*/) {
  }
  resize(gl) {
    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;
    const column = new Float32Array(width * 2);

    this.width = width;
    this.position = 0;
    this.uniforms.resolution[0] = width;
    this.uniforms.resolution[1] = height;

    this.maxWidth = gl.getParameter(gl.MAX_TEXTURE_SIZE);

    for (let ii = 0; ii < column.length; ++ii) {
      column[ii] = ii;
    }
    const arrays = {
      column: { numComponents: 1, data: column, },
    };

    if (!this.bufferInfo) {
      this.bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);
    } else {
      twgl.setAttribInfoBufferFromArray(gl, this.bufferInfo.attribs.column, arrays.column);
      this.bufferInfo.numElements = width * 2;
    }
  }
  render(gl, commonUniforms, byteBeat, analyzers) {
    if (!this.data) {
      this.data = new Uint8Array(analyzers[0].frequencyBinCount);
    }
    const data = this.data;
    const numChannels = byteBeat.getNumChannels();
    for (let ch = 0; ch < numChannels; ++ch) {
      analyzers[ch].getByteFrequencyData(data);
      gl.bindTexture(gl.TEXTURE_2D, this.heightTex);
      const texWidth = Math.min(this.maxWidth, data.length);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, texWidth, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, data);

      const {uniforms, programInfo, bufferInfo} = this;

      uniforms.width = this.width;
      uniforms.heightTexWidth = texWidth;
      uniforms.position = this.position / this.width;
      //uniforms.offset[0] = ch / gl.drawingBufferWidth;
      uniforms.color = ch ? colorDarkYellow : colorDarkCyan;
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      drawEffect(gl, programInfo, bufferInfo, uniforms, commonUniforms, gl.LINES);
      gl.disable(gl.BLEND);
    }
  }
}