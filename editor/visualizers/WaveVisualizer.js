import Visualizer from './Visualizer.js';
// Fix?
import ByteBeat from '../../src/ByteBeat.js';
import WrappingStack from '../../src/WrappingStack.js';

export default function WebGLVisualizer(canvas) {
  Visualizer.call(this, canvas);
  this.type = 1;
  this.temp = new Float32Array(1);
  this.resolution = new Float32Array(2);
  this.effects = {
    wave: {
      uniforms: {
        position: 0,
        time: 0,
        resolution: this.resolution,
        color: new Float32Array([1, 0, 0, 1])
      }
    },
    sample: {
      uniforms: {
        offset: 0,
        time: 0,
        resolution: this.resolution,
        color: new Float32Array([0, 1, 0, 1])
      }
    },
    data: {
      uniforms: {
        offset: 0,
        time: 0,
        resolution: this.resolution,
        color: new Float32Array([0, 0, 1, 1])
      }
    }
  };

  const VERTEX_SHADER = WebGLRenderingContext.VERTEX_SHADER;
  const FRAGMENT_SHADER = WebGLRenderingContext.FRAGMENT_SHADER;
  this.effects.wave[VERTEX_SHADER] = {
    defaultSource: `
      attribute float column;
      attribute float height;
      uniform float position;
      void main() {
        gl_Position = vec4(mod(column - position, 1.0) * 2.0 - 1.0, height, 0, 1);
      }
    `
  };
  this.effects.wave[FRAGMENT_SHADER] = {
    defaultSource: `
      precision mediump float;
      uniform vec4 color;
      void main() {
        gl_FragColor = color;
      }
    `,
  };
  this.effects.sample[VERTEX_SHADER] = {
    defaultSource: `
      attribute vec2 position;
      uniform float offset;
      varying vec2 v_texCoord;
      void main() {
        gl_Position = vec4(position, 0, 1);
        v_texCoord = vec2(position * 0.5 + 0.5) + vec2(offset, 0);
      }
    `,
  };
  this.effects.sample[FRAGMENT_SHADER] = {
    defaultSource: `
      precision mediump float;
      varying vec2 v_texCoord;
      uniform sampler2D tex;
      uniform vec4 color;
      void main() {
        float height = texture2D(tex, v_texCoord).r * 0.5;
        float m = v_texCoord.y > height ? 0.0 : 1.0;
        gl_FragColor = color * m;
      }
    `,
  };
  this.effects.data[VERTEX_SHADER] = {
    defaultSource: `
      attribute vec2 position;
      uniform float offset;
      varying vec2 v_texCoord;
      void main() {
        gl_Position = vec4(position, 0, 1);
        v_texCoord = vec2(position * 0.5 + 0.5) + vec2(offset, 0);
      }
    `,
  };
  this.effects.data[FRAGMENT_SHADER] = {
    defaultSource: `
      precision mediump float;
      varying vec2 v_texCoord;
      uniform sampler2D tex;
      uniform vec4 color;
      void main() {
        int c = int(texture2D(tex, v_texCoord).r * 255.0);
        int y = int(v_texCoord.y * 8.0);
        int p = int(pow(2.0, float(y)));
        c = c / p;
        float m = mod(float(c), 2.0);
        float line = mod(gl_FragCoord.y, 3.0) / 2.0;
        gl_FragColor = color * m;
      }
    `,
  };

  this.resize(512, 512);
};

tdl.base.inherit(WebGLVisualizer, Visualizer);

WebGLVisualizer.prototype.resize = function(width, height) {
  var canvas = this.canvas;
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);
  var height = new tdl.primitives.AttribBuffer(1, width * 2);
  var column = new tdl.primitives.AttribBuffer(1, width * 2);
  for (var ii = 0; ii < width * 2; ++ii) {
    height.setElement(ii, [Math.sin(ii / width * Math.PI * 2)]);
    column.setElement(ii, [(ii >> 1) / width]);
  }
  var arrays = {
    height: height,
    column: column
  }
  var effects = this.effects;
  var wave = effects.wave;
  if (!wave.model) {
    var program = tdl.programs.loadProgram(
        wave[gl.VERTEX_SHADER].defaultSource,
        wave[gl.FRAGMENT_SHADER].defaultSource);
    wave.model = new tdl.models.Model(program, arrays, {}, gl.LINES/*gl.LINE_STRIP*/ /*gl.POINTS*/);
  } else {
    wave.model.setBuffers(arrays, true);
  }

  var data = effects.data;
  if (!data.model) {
    var tex = new tdl.textures.ExternalTexture(gl.TEXTURE_2D);
    var arrays = tdl.primitives.createPlane(2, 2, 1, 1);
    // Don't need the normals.
    delete arrays.normal;
    delete arrays.texCoord;
    // rotate from xz plane to xy plane
    tdl.primitives.reorient(arrays,
        [1, 0, 0, 0,
         0, 0, 1, 0,
         0, -1, 0, 0,
         0, 0, 0, 1]);
    var textures = {
        tex: tex,
    };
    var program = tdl.programs.loadProgram(
        data[gl.VERTEX_SHADER].defaultSource,
        data[gl.FRAGMENT_SHADER].defaultSource);
    data.model = new tdl.models.Model(program, arrays, textures);
    this.dataTex = tex;
  }

  this.dataContext = ByteBeat.makeContext();
  this.dataStack = new WrappingStack();
  this.sampleContext = ByteBeat.makeContext();
  this.sampleStack = new WrappingStack();

  this.dataWidth = 1024;
  var dataBuf = new Uint8Array(this.dataWidth);
  this.dataPos = 0;
  this.dataPixel = new Uint8Array(1);
  this.dataTex.setParameter(gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  this.dataTex.setParameter(gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.LUMINANCE, this.dataWidth, 1, 0,
      gl.LUMINANCE, gl.UNSIGNED_BYTE, dataBuf);
  this.dataBuf = dataBuf;
  this.dataTime = 0;

  var sample = effects.sample;
  if (!sample.model) {
    var tex = new tdl.textures.ExternalTexture(gl.TEXTURE_2D);
    var arrays = tdl.primitives.createPlane(2, 2, 1, 1);
    // Don't need the normals.
    delete arrays.normal;
    delete arrays.texCoord;
    // rotate from xz plane to xy plane
    tdl.primitives.reorient(arrays,
        [1, 0, 0, 0,
         0, 0, 1, 0,
         0, -1, 0, 0,
         0, 0, 0, 1]);
    var textures = {
        tex: tex,
    };
    var program = tdl.programs.loadProgram(
        sample[gl.VERTEX_SHADER].defaultSource,
        sample[gl.FRAGMENT_SHADER].defaultSource);
    sample.model = new tdl.models.Model(program, arrays, textures);
    this.sampleTex = tex;
  }

  this.sampleWidth = 1024;
  var sampleBuf = new Uint8Array(this.sampleWidth);
  this.samplePos = 0;
  this.samplePixel = new Uint8Array(1);
  this.sampleTex.setParameter(gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  this.sampleTex.setParameter(gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.LUMINANCE, this.sampleWidth, 1, 0,
      gl.LUMINANCE, gl.UNSIGNED_BYTE, sampleBuf);
  this.sampleBuf = sampleBuf;
  this.sampleTime = 0;

  this.oneVerticalPixel = 2 / canvas.height;
  this.width = width;
  this.height = height;
  this.position = 0;
  this.then = (new Date()).getTime() * 0.001;
  this.compiling = false;
};

WebGLVisualizer.prototype.reset = function() {
  this.then = (new Date()).getTime() * 0.001;
  for (var i = 0; i < this.height.numElements; ++i) {
    this.height.setElement(i, [0]);
  }
  this.position = 0;
  this.effects.wave.model.buffers.height.set(this.height);

  this.dataTime = 0;
  this.dataPos = 0;
  for (var i = 0; i < this.dataWidth; ++i) {
    this.dataBuf[i] = 0;
  }
  this.dataTex.setParameter(gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.LUMINANCE, this.dataWidth, 1, 0,
      gl.LUMINANCE, gl.UNSIGNED_BYTE, this.dataBuf);

  this.sampleTime = 0;
  this.samplePos = 0;
  for (var i = 0; i < this.sampleWidth; ++i) {
    this.sampleBuf[i] = 0;
  }
  this.sampleTex.setParameter(gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.LUMINANCE, this.sampleWidth, 1, 0,
      gl.LUMINANCE, gl.UNSIGNED_BYTE, this.sampleBuf);
};

WebGLVisualizer.prototype.setShaderGLSL = function(effect, vertexShaderSource, fragmentShaderSource) {
  if (!vertexShaderSource) {
    vertexShaderSource = effect[gl.VERTEX_SHADER].defaultSource;
  }
  if (!fragmentShaderSource) {
    fragmentShaderSource = effect[gl.FRAGMENT_SHADER].defaultSource;
  }

  effect[gl.VERTEX_SHADER].pending = vertexShaderSource;
  effect[gl.FRAGMENT_SHADER].pending = fragmentShaderSource;
}

WebGLVisualizer.prototype.compileIfPending = function() {
  if (this.compiling) {
    return;
  }

  if (this.compileShaderIfPending(this.effects.wave)) {
    return;
  }

  if (this.compileShaderIfPending(this.effects.sample)) {
    return;
  }

  if (this.compileShaderIfPending(this.effects.data)) {
    return;
  }
};

WebGLVisualizer.prototype.compileShaderIfPending = function(effect) {
  var pendingVertexShader = effect[gl.VERTEX_SHADER].pending;
  var pendingFragmentShader = effect[gl.FRAGMENT_SHADER].pending;

  // If there was nothing pending exit
  if (pendingVertexShader === undefined && pendingFragmentShader === undefined) {
    return false;
  }

  // clear pending
  effect[gl.VERTEX_SHADER].pending = undefined;
  effect[gl.FRAGMENT_SHADER].pending = undefined;

  // If there was no change exit.
  if (pendingVertexShader == effect[gl.VERTEX_SHADER].source &&
      pendingFragmentShader == effect[gl.FRAGMENT_SHADER].source) {
    //this.onCompileCallback(null);
    return false;
  }

  this.compiling = true;
  var that = this;
  this.programBeingCompiled = tdl.programs.loadProgram(pendingVertexShader, pendingFragmentShader, function(error) {
    that.handleCompile(error, effect, pendingVertexShader, pendingFragmentShader);
  });
  return true;
};

WebGLVisualizer.prototype.handleCompile = function(error, effect, vertexShaderSource, fragmentShaderSource) {
  this.compiling = false;
  if (error !== undefined) {
    if (this.onCompileCallback) {
      this.onCompileCallback(tdl.programs.lastError);
    }
  } else {
    effect.model.setProgram(this.programBeingCompiled);
    effect[gl.VERTEX_SHADER].source = vertexShaderSource;
    effect[gl.FRAGMENT_SHADER].source = fragmentShaderSource;
    if (this.onCompileCallback) {
      this.onCompileCallback(null);
    }
  }
  this.compileIfPending();
};

WebGLVisualizer.prototype.setEffects = function(sections) {
  this.setShaderGLSL(this.effects.wave, sections['glsl-wave-vs'], sections['glsl-wave-fs']);
  this.setShaderGLSL(this.effects.data, this.effects.data[gl.VERTEX_SHADER].defaultSource, sections['glsl-data-fs']);
  this.setShaderGLSL(this.effects.sample, this.effects.data[gl.VERTEX_SHADER].defaultSource, sections['glsl-sample-fs']);
  this.compileIfPending();
};

WebGLVisualizer.prototype.update = function(buffer, length) {
  if (!this.type) {
    return;
  }
  // Yes I know this is dumb. I should just do the last 2 at most.
  var dest = this.height.buffer;
  var offset = 0;
  var v = this.oneVerticalPixel;
  var v2 = v * 2;
  while (length) {
    var max = Math.min(length, this.width - this.position);
    var d = this.position * 2;
    var h1 = buffer[offset];
    for (let i = 0; i < max; ++i) {
      var h2 = buffer[++offset];
      var dy = h1 - h2;
      dest[d++] = h1;
      dest[d++] = Math.abs(dy) > v ? h2 : (h2 + (dy > 0 ? v2 : -v2));
      h1 = h2;
    }
    var view = new Float32Array(dest.buffer, this.position * 4 * 2, max * 2);
    this.effects.wave.model.buffers.height.setRange(view, this.position * 4 * 2);
    this.position = (this.position + max) % this.width;
    length -= max;
  }
};

WebGLVisualizer.prototype.render = function(byteBeat) {
  if (!this.type && !this.captureCallback) {
    return;
  }

  gl.clearColor(0,0,0.3,1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  var effects = this.effects;
  var wave = this.effects.wave;
  var data = this.effects.data;
  var sample = this.effects.sample;

  var canvas = this.canvas;
  this.resolution[0] = canvas.width;
  this.resolution[1] = canvas.height;

  this.dataTex.setParameter(gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  this.dataPixel[0] = Math.round(byteBeat.getSampleForTime(this.dataTime++, this.dataContext, this.dataStack) * 127) + 127;
  gl.texSubImage2D(gl.TEXTURE_2D, 0, this.dataPos, 0, 1, 1, gl.LUMINANCE, gl.UNSIGNED_BYTE, this.dataPixel);
  this.dataPos = (this.dataPos + 1) % this.dataWidth;

  this.sampleTex.setParameter(gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  for (var ii = 0; ii < 2; ++ii) {
    this.samplePixel[0] = Math.round(byteBeat.getSampleForTime(this.sampleTime++, this.sampleContext, this.sampleStack) * 127) + 127;
    gl.texSubImage2D(gl.TEXTURE_2D, 0, this.samplePos, 0, 1, 1, gl.LUMINANCE, gl.UNSIGNED_BYTE, this.samplePixel);
    this.samplePos = (this.samplePos + 1) % this.sampleWidth;
  }

  var now = (new Date()).getTime() * 0.001;

  data.uniforms.offset = this.dataPos / this.dataWidth;
  data.uniforms.time = now - this.then;
  data.model.drawPrep(data.uniforms);
  data.model.draw();

  if (false) {
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    sample.uniforms.offset = this.samplePos / this.sampleWidth;
    sample.uniforms.time = now - this.then;
    sample.model.drawPrep(sample.uniforms);
    sample.model.draw();
    gl.disable(gl.BLEND);
  }

  wave.uniforms.position = this.position / this.width;
  wave.uniforms.time = now - this.then;
  wave.model.drawPrep(wave.uniforms);
  wave.model.draw();

  this.handleCapture();
};
