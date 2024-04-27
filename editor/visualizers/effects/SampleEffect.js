import * as twgl from '../../../js/twgl-full.module.js';
import { drawEffect } from './effect-utils.js';

const kChunkSize = 1024;

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
    this.data = new Map();
    this.state = 'init';
  }

  async #getData(byteBeat) {
    this.updating = true;
    const start = Math.ceil(this.sampleTime / kChunkSize) * kChunkSize;
    const numChannels = byteBeat.getNumChannels();
    const dataP = [];
    for (let channel = 0; channel < numChannels; ++channel) {
      dataP.push(byteBeat.getSamplesForTimeRange(start, start + kChunkSize, kChunkSize, this.sampleContext, this.sampleStack, channel));
    }
    const data = await Promise.all(dataP);
    const chunkId = start / kChunkSize;
    this.data.set(chunkId, data);
    this.updating = false;
  }

  #update(byteBeat) {
    const noData = this.data.length === 0;
    const passingHalfWayPoint = (this.oldSampleTime % kChunkSize) < kChunkSize / 2 && (this.sampleTime % kChunkSize) >= kChunkSize / 2;
    const passingChunk = (this.oldSampleTime % kChunkSize) >= kChunkSize - 2 && this.sampleTime % kChunkSize === 0;
    const oldChunkId = this.oldSampleTime / kChunkSize | 0;
    this.oldSampleTime = this.sampleTime;
    if (passingChunk) {
      this.data.delete(oldChunkId);
    }
    if (!this.updating && (noData || passingHalfWayPoint)) {
      this.#getData(byteBeat);
    }
  }

  async #init(byteBeat) {
    if (this.sampleContext) {
      byteBeat.destroyContext(this.sampleContext);
      byteBeat.destroyStack(this.sampleStack);
    }
    this.sampleContext = await byteBeat.createContext();
    this.sampleStack = await byteBeat.createStack();
    await this.#getData(byteBeat);
    this.state = 'running';
  }

  render(gl, commonUniforms, byteBeat) {
    const {uniforms, programInfo, bufferInfo} = this;

    if (this.state === 'init') {
      this.state = 'initializing';
      this.#init(byteBeat);
    }
    if (this.state !== 'running') {
      return;
    }
    this.#update(byteBeat);

    gl.bindTexture(gl.TEXTURE_2D, this.sampleTex);
    for (let ii = 0; ii < 2; ++ii) {
      const chunkId = this.sampleTime++ / kChunkSize | 0;
      const chunk = this.data.get(chunkId);
      const ndx = this.sampleTime % kChunkSize;
      try {
        const ch = chunk[0];
        const sample = ch[ndx];
        this.samplePixel[0] = Math.round(sample * 127) + 127;
      } catch {
        //
      }
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