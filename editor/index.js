import ByteBeat from '../src/ByteBeat.js';
import WrappingStack from '../src/WrappingStack.js';

tdl.require('tdl.buffers');
tdl.require('tdl.fast');
tdl.require('tdl.models');
tdl.require('tdl.primitives');
tdl.require('tdl.programs');
tdl.require('tdl.textures');
tdl.require('tdl.webgl');

window.addEventListener('load', main);

function $(id) {
  return document.getElementById(id);
}

var g_byteBeat;
var g_visualizer;
var g_screenshot;
var g_saving = false;
var g_saveDialogInitialized = false;
var g_screenshotCanvas;
var g_screenshotContext;
var gl;
var playing = false;
var play;
var codeElem;
var helpElem;
var timeElem;
var playElem;
var byteBeatElem;
var beatTypeElem;
var expressionTypeElem;
var sampleRateElem;
var visualTypeElem;
var saveElem;
var compileStatusElem;
var canvas;
var requestId;
var compressor;
var controls;
var dontSet = true;
var g_slow = false;

function main() {
  compressor = new LZMA( "js/lzma_worker.js" );
  canvas = $("visualization");
  controls = $("controls");

  g_byteBeat = new ByteBeat();
  if (!g_byteBeat.good) {
    alert("This page needs a browser the supports the Web Audio API or the Audio Data API: Chrome, Chromium, Firefox, or WebKit");
  }

  g_screenshotCanvas = document.createElement("canvas");
  g_screenshotCanvas.width = 400;
  g_screenshotCanvas.height = 100;
  g_screenshotContext = g_screenshotCanvas.getContext("2d");

  function resetToZero() {
    g_byteBeat.reset();
    g_visualizer.reset();
    g_visualizer.render();
    updateTimeDisplay();
  }

  helpElem = document.createElement('a');
  helpElem.href = "https://github.com/greggman/html5bytebeat";
  helpElem.innerHTML = "?";
  helpElem.className = "buttonstyle";
  controls.appendChild(helpElem);

  timeElem = document.createElement('button');
  controls.appendChild(timeElem);
  timeElem.addEventListener('click', resetToZero);

  function playPause() {
    playing = !playing;
    if (playing) {
      g_byteBeat.play();
      playElem.textContent = "pause ■";
    } else {
      g_byteBeat.pause();
      playElem.textContent = " play ▶";
      updateTimeDisplay();
    }
  }
  playElem = document.createElement('button');
  playElem.addEventListener('click', playPause);
  controls.appendChild(playElem);

  function addSelection(options, selectedIndex) {
    var select = document.createElement('select');
    for (var i = 0; i < options.length; ++i) {
      var option = document.createElement('option');
      option.textContent = options[i];
      if (i == selectedIndex) {
        option.selected = true;
      }
      select.appendChild(option);
    }
    return select;
  }

  beatTypeElem = addSelection(["bytebeat", "floatbeat", "signedbytebeat"], 0);
  beatTypeElem.addEventListener('change', function(event) {
    g_byteBeat.setType(event.target.selectedIndex);
    setURL();
  }, false);
  controls.appendChild(beatTypeElem);

  expressionTypeElem = addSelection(["infix", "postfix(rpn)", "glitch", "function"], 0);
  expressionTypeElem.addEventListener('change', function(event) {
    g_byteBeat.setExpressionType(event.target.selectedIndex);
    g_byteBeat.recompile();
  }, false);
  controls.appendChild(expressionTypeElem);

  var sampleRates = [8000, 11000, 22000, 32000, 44100, 48000];
  sampleRateElem = addSelection(["8kHz", "11kHz", "22kHz", "32kHz", "44kHz", "48kHz"], 0);
  sampleRateElem.addEventListener('change', function(event) {
    g_byteBeat.setDesiredSampleRate(sampleRates[event.target.selectedIndex]);
  }, false);
  controls.appendChild(sampleRateElem);

  visualTypeElem = addSelection(["none", "wave"], 1);
  visualTypeElem.addEventListener('change', function(event) {
    g_visualizer.setType(event.target.selectedIndex);
  }, false);
  controls.appendChild(visualTypeElem);

  saveElem = document.createElement("button");
  saveElem.textContent = "save";
  saveElem.addEventListener('click', startSave);
  controls.appendChild(saveElem);

  compileStatusElem = document.createElement('button');
  compileStatusElem.className = 'status';
  compileStatusElem.textContent = "---";
  controls.appendChild(compileStatusElem);

  if (g_slow) {
    g_visualizer = new NullVisualizer();
  } else {
    gl = tdl.webgl.setupWebGL(
      canvas,
      { alpha:false,
        antialias:false,
        preserveDrawingBuffer:true
      },
      function(){});

    g_visualizer = gl ? new WebGLVisualizer(canvas) : new CanvasVisualizer(canvas);
  }
  g_byteBeat.setVisualizer(g_visualizer);

  codeElem = $("code");
  codeElem.addEventListener('keyup', function(event) {
    if (event.keyCode == 37 ||
        event.keyCode == 38 ||
        event.keyCode == 39 ||
        event.keyCode == 40) {
      return;
    }

    compile(codeElem.value);
  }, false );

  codeElem.addEventListener('keydown', function(event) {
      if (event.keyCode == 9) {
          // Fake TAB
          event.preventDefault();

          var start = codeElem.selectionStart;
          var end = codeElem.selectionEnd;

          codeElem.value = codeElem.value.substring(0, start) + '\t' + codeElem.value.substring(end, codeElem.value.length);

          codeElem.selectionStart = codeElem.selectionEnd = start + 1;
          codeElem.focus();
      }
  }, false);

  window.addEventListener('keydown', function(event){
      if ((event.ctrlKey || event.metaKey) && event.keyCode == 83) {
          event.preventDefault();
          startSave();
      }
  });

  g_byteBeat.setOnCompile(handleCompileError);
  g_visualizer.setOnCompile(handleCompileError);

  if (window.location.hash) {
    var hash = window.location.hash.substr(1);
    readURL(hash);
  } else {
    readURL('t=0&e=0&s=8000&bb=5d000001001400000000000000001461cc403ebd1b3df4f78ee66fe76abfec87b7777fd27ffff85bd000');
  }

  onWindowResize();
  window.addEventListener('resize', onWindowResize, false);
  {
    var s = $("startContainer");
    s.addEventListener('click', function() {
      s.style.display = "none";
      g_byteBeat.resume(playPause);
    }, false);
  }

  function render() {
    if (playing) {
      updateTimeDisplay();
      g_visualizer.render();
    }
    requestId = tdl.webgl.requestAnimationFrame(render, canvas);
  }
  render();

  function setSelectOption(select, selectedIndex) {
    select.options[select.selectedIndex].selected = false;
    select.options[selectedIndex].selected = true;
  }

  function readURL(hash) {
    var args = hash.split("&");
    var data = {};
    for (var i = 0; i < args.length; ++i) {
      var parts = args[i].split("=");
      data[parts[0]] = parts[1];
    }
    var t = data.t !== undefined ? data.t : 1
    var e = data.e !== undefined ? data.e : 0;
    var s = data.s !== undefined ? data.s : 8000;
    for (var i = 0; i < sampleRates.length; ++i) {
      if (s == sampleRates[i]) {
        setSelectOption(sampleRateElem, i);
        break;
      }
    }
    setSelectOption(beatTypeElem, t);
    setSelectOption(expressionTypeElem, e);
    g_byteBeat.setType(parseInt(t));
    g_byteBeat.setExpressionType(parseInt(e));
    g_byteBeat.setDesiredSampleRate(parseInt(s));
    var bytes = convertHexToBytes(data.bb);
    compressor.decompress(bytes, function(text) {
      codeElem.value = text;
      compile(text);
    },
    dummyFunction);
  }

  function onWindowResize(event) {
    g_byteBeat.resize(canvas.clientWidth, canvas.clientHeight);
    g_visualizer.resize(canvas.clientWidth, canvas.clientHeight);
  }
}
//  var dataURL = captureScreenshot(400, 100, firstLine);

function captureScreenshot(ctx, canvas, text) {
  var width = ctx.canvas.width;
  var height = ctx.canvas.height;
  ctx.fillStyle = "#008";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(canvas, 0, 0, width, height);
  ctx.font = "bold 20px monospace";
  var infos = [
    {x: 2, y: 2, color: "#000"},
    {x: 0, y: 1, color: "#000"},
    {x: 1, y: 0, color: "#000"},
    {x: 0, y: 0, color: "#FFF"}
  ];
  for (var i = 0; i < infos.length; ++i) {
    var info = infos[i];
    ctx.fillStyle = info.color;
    ctx.fillText(text, 20 + info.x, height - 20 + info.y, width - 40);
  }
  return g_screenshotCanvas.toDataURL();
}

function startSave() {
  if (!g_saving) {
    g_saving = true;
    var firstLine = strip(strip(codeElem.value.split("\n")[0]).replace(/^\/\//, ''));
    g_screenshot = captureScreenshot(g_screenshotContext, canvas, firstLine);
    showSaveDialog();
  }
}

function showSaveDialog() {
  function closeSave() {
    $("savedialog").style.display = "none";
    window.removeEventListener('keypress', handleKeyPress);
    g_saving = false;
    g_screenshot = "";  // just cuz.
  }
  function handleKeyPress(event) {
    if (event.keyCode == 27) {
      closeSave()
    }
  }
  const saveData = (function() {
    const a = document.createElement('a');
    document.body.appendChild(a);
    a.style.display = 'none';
    return function saveData(blob, fileName) {
      const url = window.URL.createObjectURL(blob);
      a.href = url;
      a.download = fileName;
      a.click();
    };
  }());

  function wait(ms = 0) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  function save() {
    async function realSave() {
      const numSeconds = parseFloat($('seconds').value);
      if (numSeconds > 0) {
        const wasPlaying = playing;
        if (playing) {
          g_byteBeat.pause();
        }
        // there are issues where. The stack should be
        // reset if nothing else.
        const sampleRate = g_byteBeat.getDesiredSampleRate();
        const numSamplesNeeded = sampleRate * numSeconds | 0;
        const numChannels = 2;
        const wavMaker = new WavMaker(sampleRate, numChannels);
        const context = ByteBeat.makeContext();
        const stack = new WrappingStack();
        for (let i = 0; i < numSamplesNeeded; i += sampleRate) {
          const start = i;
          const end = Math.min(i + sampleRate, numSamplesNeeded);
          const output = [
            new Float32Array(end - start),
            new Float32Array(end - start),
          ];
          for (let j = start; j < end; ++j) {
            for (let ch = 0; ch < numChannels; ++ch) {
              const s = g_byteBeat.getSampleForTime(j, context, stack, ch);
              output[ch][j - i] = s;
            }
          }
          wavMaker.addData(output);
          await wait();
        }
        const blob = wavMaker.getWavBlob();
        saveData(blob, "html5bytebeat.wav");
        if (wasPlaying) {
          g_byteBeat.play();
        }
      }
      closeSave();
    }
    realSave();
  }

  window.addEventListener('keypress', handleKeyPress);
  if (!g_saveDialogInitialized) {
    g_saveDialogInitialized = true;
    $("save").addEventListener('click', save);
    $("cancel").addEventListener('click', closeSave);
  }
  var saveDialogElem = $("savedialog");
  var screenshotElem = $("screenshot");
  saveDialogElem.style.display = "table";
  screenshotElem.src = g_screenshot;
}

function dummyFunction() {};

function updateTimeDisplay() {
  timeElem.innerHTML = g_byteBeat.getTime();
};

// Splits a string, looking for //:name
var g_splitRE = new RegExp(/\/\/\:([a-zA-Z0-9_-]+)(.*)/);
function splitBySections(str) {
  var sections = {};

  function getNextSection(str) {
    var pos = str.search(g_splitRE);
    if (pos < 0) {
      return str;
    }
    var m = str.match(g_splitRE);
    var sectionName = m[1];
    var newStr = getNextSection(str.substring(pos + 3 + sectionName.length));
    sections[sectionName] = newStr;
    return str.substring(0, pos);
  }
  str = getNextSection(str);
  if (str.length) {
    sections.default = str;
  }
  return sections;
}
function compile(text) {
  var sections = splitBySections(text);
  if (sections.default || sections.channel1) {
    var expressions = [sections.default || sections.channel1];
    if (sections.channel2) {
      expressions.push(sections.channel2);
    }
    g_byteBeat.setExpressions(expressions);
  }
  g_byteBeat.setOptions(sections);
  // comment in to allow live GLSL editing
  //g_visualizer.setEffects(sections);
}

function handleCompileError(error) {
  compileStatusElem.textContent = error ? error : "*";
  compileStatusElem.classList.toggle('error', error);
  if (error == null) {
    setURL();
  }
}

function convertHexToBytes(text) {
  var array = [];
  for (var i = 0; i < text.length; i += 2) {
    var tmpHex = text.substring(i, i + 2);
    array.push(parseInt(tmpHex, 16));
  }
  return array;
}

function convertBytesToHex(byteArray) {
  var hex = "";
  for (var i = 0, il = byteArray.length; i < il; i++) {
    if (byteArray[i] < 0) {
      byteArray[i] = byteArray[i] + 256;
    }
    var tmpHex = byteArray[i].toString(16);
    // add leading zero
    if (tmpHex.length == 1) {
      tmpHex = "0" + tmpHex;
    }
    hex += tmpHex;
  }
  return hex;
}

var nstrip = function(v) {
  return v;
}

var replaceRE = /\$\((\w+)\)/g;

/**
 * Replaces strings with property values.
 * Given a string like "hello $(first) $(last)" and an object
 * like {first:"John", last:"Smith"} will return
 * "hello John Smith".
 * @param {string} str String to do replacements in
 * @param {...} 1 or more objects conaining properties.
 */
var replaceParams = function(str) {
  var args = arguments;
  return str.replace(replaceRE, function(str, p1, offset, s) {
    for (var ii = 1; ii < args.length; ++ii) {
      if (args[ii][p1] !== undefined) {
        return args[ii][p1];
      }
    }
    throw "unknown string param '" + p1 + "'";
  });
};

function setURL() {
  if (dontSet) {
    dontSet = false;
    return;
  }
  compressor.compress(codeElem.value, 1, function(bytes) {
    var hex = convertBytesToHex(bytes);
    window.location.replace(
      '#t=' + g_byteBeat.getType() +
      '&e=' + g_byteBeat.getExpressionType() +
      '&s=' + g_byteBeat.getDesiredSampleRate() +
      '&bb=' + hex);
  },
  dummyFunction);
}

function Visualizer(canvas) {
  this.canvas = canvas;
  this.type = 1;
};

Visualizer.prototype.setType = function(type) {
  this.type = type;

};

Visualizer.prototype.setOnCompile = function(callback) {
  this.onCompileCallback = callback;
};

Visualizer.prototype.capture = function(callback) {
  this.captureCallback = callback;
};

Visualizer.prototype.handleCapture = function() {
  var fn = this.captureCallback;
  if (fn) {
    this.captureCallback = undefined;
    fn(this.canvas);
  }
};

function WebGLVisualizer(canvas) {
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

  this.effects.wave[gl.VERTEX_SHADER] = {
    defaultSource: $("waveVertexShader").text
  };
  this.effects.wave[gl.FRAGMENT_SHADER] = {
    defaultSource: $("waveFragmentShader").text
  };
  this.effects.sample[gl.VERTEX_SHADER] = {
    defaultSource: $("sampleVertexShader").text
  };
  this.effects.sample[gl.FRAGMENT_SHADER] = {
    defaultSource: $("sampleFragmentShader").text
  };
  this.effects.data[gl.VERTEX_SHADER] = {
    defaultSource: $("dataVertexShader").text
  };
  this.effects.data[gl.FRAGMENT_SHADER] = {
    defaultSource: $("dataFragmentShader").text
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

WebGLVisualizer.prototype.render = function() {
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
  this.dataPixel[0] = Math.round(g_byteBeat.getSampleForTime(this.dataTime++, this.dataContext, this.dataStack) * 127) + 127;
  gl.texSubImage2D(gl.TEXTURE_2D, 0, this.dataPos, 0, 1, 1, gl.LUMINANCE, gl.UNSIGNED_BYTE, this.dataPixel);
  this.dataPos = (this.dataPos + 1) % this.dataWidth;

  this.sampleTex.setParameter(gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  for (var ii = 0; ii < 2; ++ii) {
    this.samplePixel[0] = Math.round(g_byteBeat.getSampleForTime(this.sampleTime++, this.sampleContext, this.sampleStack) * 127) + 127;
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

function CanvasVisualizer(canvas) {
  Visualizer.call(this, canvas);
  this.ctx = canvas.getContext("2d");
  this.temp = new Float32Array(1);
  this.resize(512, 512);
  this.type = 1;
};

tdl.base.inherit(CanvasVisualizer, Visualizer);

CanvasVisualizer.prototype.resize = function(width, height) {
  var canvas = this.canvas;
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  this.positions = new Float32Array(width);
  this.oldPositions = new Float32Array(width);
  this.width = width;
  this.height = height;
  this.position = 0;
  this.drawPosition = 0;
  this.drawCount = 0;
};

CanvasVisualizer.prototype.reset = function() {
  this.position = 0;
  this.drawPosition = 0;
  this.drawCount = 0;
  var canvas = this.canvas;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
};

CanvasVisualizer.prototype.setEffects = function(sections) {
};

CanvasVisualizer.prototype.update = function(buffer, length) {
  if (!this.type && !this.captureCallback) {
    return;
  }
  // Yes I know this is dumb. I should just do the last 2 at most.
  var s = 0;
  var p = this.position;
  var ps = this.positions;
  while (length) {
    var max = Math.min(length, this.width - p);
    for (var i = 0; i < max; ++i) {
      ps[p++] = buffer[s++];
    }
    p = p % this.width;
    this.drawCount += max;
    length -= max;
  }
  this.position = p;
  this.handleCapture();
};

CanvasVisualizer.prototype.render = function() {
  if (!this.type) {
    return;
  }
  var count = Math.min(this.drawCount, this.width);
  var dp = this.drawPosition;
  var ctx = this.ctx;
  var old = this.oldPositions;
  var ps = this.positions;
  var halfHeight = this.height / 2;
  ctx.fillStyle = "rgb(255,0,0)";
  /* horizontal */
  while (count) {
    ctx.clearRect(dp, old[dp], 1, 1);
    var newPos = Math.floor(-ps[dp] * halfHeight + halfHeight);
    ctx.fillRect(dp, newPos, 1, 1);
    old[dp] = newPos;
    dp = (dp + 1) % this.width;
    --count;
  }

  /* vertical hack (drawing the wave vertically should be faster */
  /*
  var w = this.width;
  var h = this.height;
  var hw = Math.floor(w * 0.5);
  while (count) {
    var y = Math.floor(dp * h / w);
    var oldX = Math.floor(old[dp] * w / h * 0.3);
    ctx.clearRect(hw - oldX, y, oldX * 2, 1);
    var newPos = Math.floor(-ps[dp] * halfHeight + halfHeight);
    var x = Math.floor(newPos * w / h * 0.3);
    ctx.fillRect(hw - x, y, x * 2, 1, 1);
    old[dp] = newPos;
    dp = (dp + 1) % this.width;
    --count;
  }
  */
  this.drawCount = 0;
  this.drawPosition = dp;
};

function NullVisualizer(canvas) {
  Visualizer.call(this, canvas);
};

tdl.base.inherit(NullVisualizer, Visualizer);

NullVisualizer.prototype.resize = function(width, height) {
};

NullVisualizer.prototype.reset = function() {
};

NullVisualizer.prototype.setEffects = function(sections) {
};

NullVisualizer.prototype.update = function(buffer, length) {
};

NullVisualizer.prototype.render = function() {
};
