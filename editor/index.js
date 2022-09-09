import ByteBeat from '../src/ByteBeat.js';
import WrappingStack from '../src/WrappingStack.js';
import WaveVisualizer from './visualizers/WaveVisualizer.js';
import CanvasVisualizer from './visualizers/CanvasVisualizer.js';
import NullVisualizer from './visualizers/NullVisualizer.js';

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

    g_visualizer = gl ? new WaveVisualizer(canvas) : new CanvasVisualizer(canvas);
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
      g_visualizer.render(g_byteBeat);
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
