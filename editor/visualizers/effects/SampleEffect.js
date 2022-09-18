import * as twgl from '../../../js/twgl-full.module.js';
import ByteBeat from '../../../src/ByteBeat.js';
import WrappingStack from '../../../src/WrappingStack.js';
import { drawEffect } from './effect-utils.js';

export default class SampleEffect {
  constructor(gl) {
    this.programInfo = twgl.createProgramInfo(gl, [
      `
        attribute vec2 position;
        uniform float offset;
        varying vec2 v_texCoord;
        void main() {
          gl_Position = vec4(position, 0, 1);
          v_texCoord = vec2(position * 0.5 + 0.5) + vec2(offset, 0);
        }
      `,
      `
        precision mediump float;
        varying vec2 v_texCoord;
        uniform sampler2D tex;
        uniform vec4 color;
        void main() {
          float height = texture2D(tex, fract(v_texCoord)).r * 0.5;
          float m = v_texCoord.y > height ? 0.0 : 1.0;
          gl_FragColor = color * m;
        }
      `,
    ]);
    this.uniforms = {
      offset: 0,
      color: new Float32Array([0, 0.3, 0, 1]),
    };
    this.bufferInfo = twgl.primitives.createXYQuadBufferInfo(gl);
    const tex = twgl.createTexture(gl, {
      format: gl.LUMINANCE,
      src: [0],
      minMag: gl.NEAREST,
      wrap: gl.CLAMP_TO_EDGE,
    });
    this.uniforms.tex = tex;
    this.sampleTex = tex;
  }
  reset(gl) {
    this.sampleTime = 0;
    this.samplePos = 0;
    for (let i = 0; i < this.sampleWidth; ++i) {
      this.sampleBuf[i] = 0;
    }
    gl.bindTexture(gl.TEXTURE_2D, this.sampleTex);
    gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.LUMINANCE, this.sampleWidth, 1, 0,
        gl.LUMINANCE, gl.UNSIGNED_BYTE, this.sampleBuf);
  }
  resize(gl) {
    this.sampleContext = ByteBeat.makeContext();
    this.sampleStack = new WrappingStack();

    this.sampleWidth = gl.drawingBufferWidth;
    const sampleBuf = new Uint8Array(this.sampleWidth);
    this.samplePos = 0;
    this.samplePixel = new Uint8Array(1);
    gl.bindTexture(gl.TEXTURE_2D, this.sampleTex);
    gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.LUMINANCE, this.sampleWidth, 1, 0,
        gl.LUMINANCE, gl.UNSIGNED_BYTE, sampleBuf);
    this.sampleBuf = sampleBuf;
    this.sampleTime = 0;
  } 
  render(gl, commonUniforms, byteBeat) {
    const {uniforms, programInfo, bufferInfo} = this;

    gl.bindTexture(gl.TEXTURE_2D, this.sampleTex);
    for (let ii = 0; ii < 2; ++ii) {
      this.samplePixel[0] = Math.round(byteBeat.getSampleForTime(this.sampleTime++, this.sampleContext, this.sampleStack) * 127) + 127;
      gl.texSubImage2D(gl.TEXTURE_2D, 0, this.samplePos, 0, 1, 1, gl.LUMINANCE, gl.UNSIGNED_BYTE, this.samplePixel);
      this.samplePos = (this.samplePos + 1) % this.sampleWidth;
    }

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    uniforms.offset = this.samplePos / this.sampleWidth;
    drawEffect(gl, programInfo, bufferInfo, uniforms, commonUniforms, gl.TRIANGLES);
    gl.disable(gl.BLEND);
  }
}