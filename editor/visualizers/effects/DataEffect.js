import * as twgl from '../../../js/twgl-full.module.js';
import { drawEffect } from './effect-utils.js';

const colorBlue = new Float32Array([0, 0, 1, 1]);
const colorGray = new Float32Array([0.25, 0.25, 0.25, 1]);

const kChunkSize = 1024;

export default class DataEffect {
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
          int c = int(texture2D(tex, fract(v_texCoord)).r * 255.0);
          int y = int(v_texCoord.y * 8.0);
          int p = int(pow(2.0, float(y)));
          c = c / p;
          float m = mod(float(c), 2.0);
          float line = mod(gl_FragCoord.y, 3.0) / 2.0;
          gl_FragColor = color * m;
        }
      `,
    ]);
    this.uniforms = {
      offset: 0,
      color: new Float32Array([0, 0, 1, 1]),
    };
    this.bufferInfo = twgl.primitives.createXYQuadBufferInfo(gl);
    this.dataTex = [
      twgl.createTexture(gl, {
        src: [0],
        format: gl.LUMINANCE,
        minMag: gl.NEAREST,
        wrap: gl.CLAMP_TO_EDGE,
      }),
      twgl.createTexture(gl, {
        src: [0],
        format: gl.LUMINANCE,
        minMag: gl.NEAREST,
        wrap: gl.CLAMP_TO_EDGE,
      }),
    ];
    this.dataCursor = 0;
    this.data = [];
  }
  reset(gl) {
    for (let i = 0; i < this.dataWidth; ++i) {
      this.dataBuf[i] = 0;
    }
    this.resize(gl);
  }

  async resize(gl) {
    this.dataWidth = gl.drawingBufferWidth;
    const dataBuf = new Uint8Array(this.dataWidth);
    this.dataPos = 0;
    this.dataPixel = new Uint8Array(1);
    for (const tex of this.dataTex) {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(
          gl.TEXTURE_2D, 0, gl.LUMINANCE, this.dataWidth, 1, 0,
          gl.LUMINANCE, gl.UNSIGNED_BYTE, dataBuf);
    }
    this.dataBuf = dataBuf;
    this.dataTime = 0;
    this.oldDataTime = 0;
    this.data = new Map();
    this.state = 'init';
  }

  async #getData(byteBeat) {
    this.updating = true;
    const start = Math.ceil(this.dataTime / kChunkSize) * kChunkSize;
    const numChannels = byteBeat.getNumChannels();
    const dataP = [];
    for (let channel = 0; channel < numChannels; ++channel) {
      dataP.push(byteBeat.getSamplesForTimeRange(start, start + kChunkSize, kChunkSize, this.dataContext, this.dataStack, channel));
    }
    const data = await Promise.all(dataP);
    const chunkId = start / kChunkSize;
    this.data.set(chunkId, data);
    this.updating = false;
  }

  #update(byteBeat) {
    const noData = this.data.length === 0;
    const passingHalfWayPoint = (this.oldDataTime % kChunkSize) < kChunkSize / 2 && (this.dataTime % kChunkSize) >= kChunkSize / 2;
    const passingChunk = (this.oldDataTime % kChunkSize) === kChunkSize - 1 && this.dataTime % kChunkSize === 0;
    const oldChunkId = this.oldDataTime / kChunkSize | 0;
    this.oldDataTime = this.dataTime;
    if (passingChunk) {
      this.data.delete(oldChunkId);
    }
    if (!this.updating && (noData || passingHalfWayPoint)) {
      this.#getData(byteBeat);
    }
  }

  async #init(byteBeat) {
    if (this.dataContext) {
      byteBeat.destroyContext(this.dataContext);
      byteBeat.destroyStack(this.dataStack);
    }
    this.dataContext = await byteBeat.createContext();
    this.dataStack = await byteBeat.createStack();
    await this.#getData(byteBeat);
    this.state = 'running';
  }

  render(gl, commonUniforms, byteBeat) {
    if (this.state === 'init') {
      this.state = 'initializing';
      this.#init(byteBeat);
    }
    if (this.state !== 'running') {
      return;
    }
    this.#update(byteBeat);
    const numChannels = byteBeat.getNumChannels();

    const {uniforms, programInfo, bufferInfo} = this;

    const chunkId = this.dataTime / kChunkSize | 0;
    const chunk = this.data.get(chunkId);
    const ndx = this.dataTime % kChunkSize;
    for (let channel = 0; channel < numChannels; ++channel) {
      try {
        const ch = chunk[channel];
        const sample = ch[ndx];
        this.dataPixel[0] = Math.round(sample * 127) + 127;
      } catch {
        //
      }
      gl.bindTexture(gl.TEXTURE_2D, this.dataTex[channel]);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, this.dataPos, 0, 1, 1, gl.LUMINANCE, gl.UNSIGNED_BYTE, this.dataPixel);
      this.dataPos = (this.dataPos + 1) % this.dataWidth;

      uniforms.color = channel ? colorGray : colorBlue;
      uniforms.tex = this.dataTex[channel];
      uniforms.offset = this.dataPos / this.dataWidth;
      if (channel) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
      }
      drawEffect(gl, programInfo, bufferInfo, uniforms, commonUniforms, gl.TRIANGLES);
      if (channel) {
        gl.disable(gl.BLEND);
      }
    }
    ++this.dataTime;
  }
}