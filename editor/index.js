/* global LZMA */
/* global WavMaker */
import '../js/scrollbars.js';
import * as twgl from '../../../js/twgl-full.module.js';

import ByteBeatNode from '../src/ByteBeatNode.js';
import WebGLVisualizer from './visualizers/WebGLVisualizer.js';
import CanvasVisualizer from './visualizers/CanvasVisualizer.js';
import NullVisualizer from './visualizers/NullVisualizer.js';

import DataEffect from './visualizers/effects/DataEffect.js';
import FFTEffect from './visualizers/effects/FFTEffect.js';
//import SampleEffect from './visualizers/effects/SampleEffect.js';
import VSAEffect from './visualizers/effects/VSAEffect.js';
import WaveEffect from './visualizers/effects/WaveEffect.js';

import songList from './songList.js';

import {
  convertBytesToHex,
  convertHexToBytes,
  makeExposedPromise,
  splitBySections,
  s_beatTypes,
  s_expressionTypes,
} from './utils.js';

function $(id) {
  return document.getElementById(id);
}

function strip(s) {
  return s.replace(/^\s+/, '').replace(/\s+$/, '');
}

let g_context;
let g_byteBeat;
let g_filter;
const g_analyzers = [];
let g_splitter;
let g_merger;
let g_visualizers;
let g_visualizer;
let g_captureFn;
let g_screenshot;
let g_saving = false;
let g_saveDialogInitialized = false;
let g_screenshotCanvas;
let g_screenshotContext;
let g_debugElem;
let g_ignoreHashChange;
let g_vsaVisualizer;
let g_vsaEffect;
let g_vsaIndex;
let playing = false;
let codeElem;
let helpElem;
let timeElem;
let playElem;
let beatTypeElem;
let expressionTypeElem;
let sampleRateElem;
let visualTypeElem;
let saveElem;
let compileStatusElem;
let canvas;
let compressor;
let controls;
let doNotSetURL = true;
const g_slow = false;



/*
  ByteBeatNode--->Splitter--->analyser---->merger---->context
                      \                  /
                       \----->analyser--/
*/
function connectFor2Channels() {
  g_byteBeat.disconnect();
  g_byteBeat.connect(g_splitter);
  g_splitter.connect(g_analyzers[0], 0);
  g_splitter.connect(g_analyzers[1], 1);
  g_analyzers[0].connect(g_merger, 0, 0);
  g_analyzers[1].connect(g_merger, 0, 1);
  return g_merger;
}

function reconnect() {
  const lastNode = connectFor2Channels();
  if (g_filter) {
    lastNode.connect(g_filter);
    g_filter.connect(g_context.destination);
  } else {
    lastNode.connect(g_context.destination);
  }
  g_context.resume();
}

function play() {
  if (!playing) {
    playing = true;
    reconnect();
  }
}

function pause() {
  if (playing) {
    playing = false;
    g_byteBeat.disconnect();
  }
}

function setSelected(element, selected) {
  if (element) {
    element.selected = selected;
  }
}
function setSelectOption(select, selectedIndex) {
  setSelected(select.options[select.selectedIndex], false);
  setSelected(select.options[selectedIndex], true);
}


const setVisualizer = ndx => {
  const {visualizer, fn} = g_visualizers[Math.min(ndx, g_visualizers.length - 1)];
  g_visualizer = visualizer;
  if (fn) {
    fn();
  }
  setSelectOption(visualTypeElem, ndx);
};

async function main() {
  compressor = new LZMA( 'js/lzma_worker.js' );
  canvas = $('visualization');
  controls = $('controls');

  g_context = new AudioContext();
  g_context.resume();  // needed for safari
  await ByteBeatNode.setup(g_context);
  g_byteBeat = new ByteBeatNode(g_context);

  g_analyzers.push(g_context.createAnalyser(), g_context.createAnalyser());
  g_analyzers.forEach(a => {
    a.maxDecibels = -1;
  });

  g_splitter = g_context.createChannelSplitter(2);
  g_merger = g_context.createChannelMerger(2);

  // g_filter = g_context.createBiquadFilter();
  // g_filter.type = 'lowpass';
  // g_filter.frequency.value = 4000;

  g_screenshotCanvas = document.createElement('canvas');
  g_screenshotCanvas.width = 400;
  g_screenshotCanvas.height = 100;
  g_screenshotContext = g_screenshotCanvas.getContext('2d');

  function resetToZero() {
    g_byteBeat.reset();
    g_visualizer.reset();
    g_visualizer.render(g_byteBeat, g_analyzers);
    updateTimeDisplay();
  }

  helpElem = document.createElement('a');
  helpElem.href = 'https://github.com/greggman/html5bytebeat';
  helpElem.innerHTML = '?';
  helpElem.className = 'buttonstyle';
  controls.appendChild(helpElem);

  timeElem = document.createElement('button');
  controls.appendChild(timeElem);
  timeElem.addEventListener('click', resetToZero);

  function playPause() {
    if (!playing) {
      playElem.textContent = 'pause ■';
      play();
    } else {
      playElem.textContent = ' play ▶';
      pause();
      updateTimeDisplay();
    }
  }
  playElem = document.createElement('button');
  playElem.addEventListener('click', playPause);
  controls.appendChild(playElem);

  function addOption(select, text, selected) {
      const option = document.createElement('option');
      option.textContent = text;
      if (selected) {
        option.selected = true;
      }
      select.appendChild(option);
  }

  function addSelection(options, selectedIndex) {
    const select = document.createElement('select');
    for (let i = 0; i < options.length; ++i) {
      addOption(select, options[i], i === selectedIndex);
    }
    return select;
  }

  beatTypeElem = addSelection(s_beatTypes, 0);
  beatTypeElem.addEventListener('change', function(event) {
    g_byteBeat.setType(event.target.selectedIndex);
    setURL();
  }, false);
  controls.appendChild(beatTypeElem);

  expressionTypeElem = addSelection(s_expressionTypes, 0);
  expressionTypeElem.addEventListener('change', function(event) {
    g_byteBeat.setExpressionType(event.target.selectedIndex);
    setExpressions(g_byteBeat.getExpressions());
  }, false);
  controls.appendChild(expressionTypeElem);

  const sampleRates = [8000, 11000, 22000, 32000, 44100, 48000];
  sampleRateElem = addSelection(['8kHz', '11kHz', '22kHz', '32kHz', '44kHz', '48kHz'], 0);
  sampleRateElem.addEventListener('change', function(event) {
    g_byteBeat.setDesiredSampleRate(sampleRates[event.target.selectedIndex]);
    setURL();
  }, false);
  controls.appendChild(sampleRateElem);

  if (g_slow) {
    g_visualizers = [
      {name: 'none', visualizer: new NullVisualizer() },
    ];
  } else {
    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: true,
    });
    if (gl) {
      twgl.addExtensionsToContext(gl);
    }
    if (gl) {
      g_vsaEffect = new VSAEffect(gl);
      g_vsaVisualizer = new WebGLVisualizer(gl, [g_vsaEffect]);

      const effects = [
        new DataEffect(gl),
        // ...(showSample ? [new SampleEffect(gl)] : []),
        new WaveEffect(gl),
        new FFTEffect(gl),
      ];
      g_visualizers = [
        { name: 'none', visualizer: new NullVisualizer(), },
        { name: 'wave', visualizer: new WebGLVisualizer(gl, effects), },
      ];
      g_vsaIndex = g_visualizers.length;
      g_visualizers.push({ name: 'vsa', visualizer: g_vsaVisualizer,});
      const vsaUrls = [
        { url: 'https://www.vertexshaderart.com/art/R2FYLbHWTcCWh5PiE', name: 'blorp', },
        { url: 'https://www.vertexshaderart.com/art/Xr5DemAP52ZcKLRbQ', name: 'seaqyuk', },
        { url: 'https://www.vertexshaderart.com/art/hffRc9FH8TMNKECkJ', name: 'bhatsu', },
        { url: 'https://www.vertexshaderart.com/art/a75Aou3fJGMJjXG5r', name: 'discinos', },
        { url: 'https://www.vertexshaderart.com/art/QCxSnbduPERK5rQni', name: '?dot-line', },
        { url: 'https://www.vertexshaderart.com/art/RnwjSt42YXLcGjsgT', name: 'morp', },
        { url: 'https://www.vertexshaderart.com/art/7YgXgotM2u7EazE58', name: 'add-em-up', },
        { url: 'https://www.vertexshaderart.com/art/TYoTaksHA6DWsP4aD', name: 'grid', },
        { url: 'https://www.vertexshaderart.com/art/ctdaXFjXNjTiss8Kh', name: 'circles', },
        { url: 'https://www.vertexshaderart.com/art/auo92EWvwwyBRak2c', name: 'widr', },
        { url: 'https://www.vertexshaderart.com/art/xvg4vyvfWjCvKZQfW', name: 'fuzeball', },
        { url: 'https://www.vertexshaderart.com/art/wFtvqKAQ3wB8Hho3p', name: 'undul', },
        { url: 'https://www.vertexshaderart.com/art/PFHJfQrt3knT8K8sQ', name: 'flwr', },
        { url: 'https://www.vertexshaderart.com/art/fmmQsNyrdyjA3226x', name: 'radonut', },
        { url: 'https://www.vertexshaderart.com/art/yKbsMohpXxZXWLHSm', name: 'vu-w/max', },
        { url: 'https://www.vertexshaderart.com/art/GxbSZ33B9swmxAmdT', name: 'notmizu', },
        { url: 'https://www.vertexshaderart.com/art/mNBny7JXpBGwQnMwG', name: 'pulsedn', },
        { url: 'https://www.vertexshaderart.com/art/YRrZ7fHmFhtoKpyrq', name: 'bebubebup', },
        { url: 'https://www.vertexshaderart.com/art/qZCxqkkWDsfd8gqGS', name: 'dncrs', },
        { url: 'https://www.vertexshaderart.com/art/yX9SGHv6RPPqcsXvh', name: 'discus', },
        { url: 'https://www.vertexshaderart.com/art/Q4dpCbhvWMYfDz5Nb', name: 'smutz', },
        { url: 'https://www.vertexshaderart.com/art/79HqSrQH4meL63aAo', name: 'ball-o?3', },
        { url: 'https://www.vertexshaderart.com/art/sHdHwHQ9GTSaJ9j99', name: 'headrush', },
        { url: 'https://www.vertexshaderart.com/art/zd2E5vCZduc5JeoFz', name: 'cubespace', },
        { url: 'https://www.vertexshaderart.com/art/PHWvovEcpp6R6yT8K', name: 's.o.i.', },
        { url: 'https://www.vertexshaderart.com/art/s7zehgnGsLh5aHkM8', name: 'volum', },
        { url: 'https://www.vertexshaderart.com/art/NR42qFZjAfmdmw6oR', name: 'iblot', },
        { url: 'https://www.vertexshaderart.com/art/YQhEmHqKTgrDSD3AM', name: 'circlepower', },
        { url: 'https://www.vertexshaderart.com/art/gX32iAvezAbinbMJz', name: 'c-pump', },
        { url: 'https://www.vertexshaderart.com/art/p9pecgaEBJ3kz5r7g', name: 'red ring', },
        { url: 'https://www.vertexshaderart.com/art/g2PZWgGp6YYe9CWwE', name: 'cybr', },
        { url: 'https://www.vertexshaderart.com/art/MefAhfbtS5ZbYifPi', name: 'qyube', },
        { url: 'https://www.vertexshaderart.com/art/uuHumiKPEiAKNPkEA', name: 'hexalicious', },
      ];
      for (const {url, name} of vsaUrls) {
        g_visualizers.push({name, visualizer: g_vsaVisualizer, fn: () => {
          g_vsaEffect.setURL(url);
        },
      });
      }
    } else {
      g_visualizers = [
        { name: 'none', visualizer: new NullVisualizer(), },
        { name: 'simple', visualizer: new CanvasVisualizer(canvas), },
      ];
    }
  }

  {
    const names = g_visualizers.map(({name}) => name);
    const ndx = Math.min(names.length - 1, 1);
    visualTypeElem = addSelection(names, ndx);
    visualTypeElem.addEventListener('change', function(event) {
      setVisualizer(event.target.selectedIndex);
    }, false);
    controls.appendChild(visualTypeElem);
    setVisualizer(ndx);
  }

  saveElem = document.createElement('button');
  saveElem.textContent = 'save';
  saveElem.addEventListener('click', startSave);
  controls.appendChild(saveElem);

  compileStatusElem = document.createElement('button');
  compileStatusElem.className = 'status';
  compileStatusElem.textContent = '---';
  controls.appendChild(compileStatusElem);

  codeElem = $('code');
  codeElem.addEventListener('input', () => {
    compile(codeElem.value);
  });

  codeElem.addEventListener('keydown', function(event) {
      if (event.code === 'Tab') {
          // Fake TAB
          event.preventDefault();

          const start = codeElem.selectionStart;
          const end = codeElem.selectionEnd;

          codeElem.value = codeElem.value.substring(0, start) + '\t' + codeElem.value.substring(end, codeElem.value.length);

          codeElem.selectionStart = codeElem.selectionEnd = start + 1;
          codeElem.focus();
      }
  }, false);

  window.addEventListener('keydown', function(event){
      if ((event.ctrlKey || event.metaKey) && event.code === 'KeyS') {
          event.preventDefault();
          startSave();
      }
  });

  window.addEventListener('hashchange', function() {
    if (g_ignoreHashChange) {
      g_ignoreHashChange = false;
      return;
    }
    const hash = window.location.hash.substr(1);
    readURL(hash);
  });

  if (window.location.hash) {
    const hash = window.location.hash.substr(1);
    readURL(hash);
  } else {
    readURL('t=0&e=0&s=8000&bb=5d000001001400000000000000001461cc403ebd1b3df4f78ee66fe76abfec87b7777fd27ffff85bd000');
  }

  {
    const observer = new ResizeObserver(onWindowResize);
    observer.observe(canvas);
  }
  playPause();

  function render() {
    // request the next one because we want to try again
    // even if one of the functions below fails (given we're
    // running user code)
    requestAnimationFrame(render, canvas);
    if (playing) {
      updateTimeDisplay();
      g_visualizer.render(g_byteBeat, g_analyzers);
      if (g_captureFn) {
        g_captureFn();
      }
    }
  }
  render();

  function readURL(hash) {
    const args = hash.split('&');
    const data = {};
    for (let i = 0; i < args.length; ++i) {
      const parts = args[i].split('=');
      data[parts[0]] = parts[1];
    }
    const t = data.t !== undefined ? parseFloat(data.t) : 1;
    const e = data.e !== undefined ? parseFloat(data.e) : 0;
    const s = data.s !== undefined ? parseFloat(data.s) : 8000;
    let rateNdx = sampleRates.indexOf(s);
    if (rateNdx < 0) {
      rateNdx = sampleRates.length;
      addOption(sampleRateElem, s);
      sampleRates.push(s);
    }
    setSelectOption(sampleRateElem, rateNdx);
    setSelectOption(beatTypeElem, t);
    setSelectOption(expressionTypeElem, e);
    g_byteBeat.setType(parseInt(t));
    g_byteBeat.setExpressionType(parseInt(e));
    g_byteBeat.setDesiredSampleRate(parseInt(s));
    const bytes = convertHexToBytes(data.bb);
    compressor.decompress(bytes, function(text) {
        doNotSetURL = true;
        codeElem.value = text;
        compile(text, true);
      },
      dummyFunction);
    if (data.debug) {
      g_debugElem = document.querySelector('#debug');
      g_debugElem.style.display = '';
    }
  }

  function onWindowResize(/*event*/) {
    g_byteBeat.resize(canvas.clientWidth, canvas.clientHeight);
    g_visualizer.resize(canvas.clientWidth, canvas.clientHeight);
  }
}
//  var dataURL = captureScreenshot(400, 100, firstLine);

function captureScreenshot(ctx, canvas, text) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  ctx.fillStyle = '#008';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(canvas, 0, 0, width, height);
  ctx.font = 'bold 20px monospace';
  const infos = [
    {x: 2, y: 2, color: '#000'},
    {x: 0, y: 1, color: '#000'},
    {x: 1, y: 0, color: '#000'},
    {x: 0, y: 0, color: '#FFF'},
  ];
  for (let i = 0; i < infos.length; ++i) {
    const info = infos[i];
    ctx.fillStyle = info.color;
    ctx.fillText(text, 20 + info.x, height - 20 + info.y, width - 40);
  }
  return g_screenshotCanvas.toDataURL();
}

function startSave() {
  if (!g_saving) {
    g_saving = true;
    showSaveDialog();
  }
}

async function showSaveDialog() {
  function closeSave() {
    $('savedialog').style.display = 'none';
    window.removeEventListener('keypress', handleKeyPress);
    g_saving = false;
    g_screenshot = '';  // just cuz.
  }
  function handleKeyPress(event) {
    if (event.code === 'Escape') {
      closeSave();
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
          pause();
        }
        // there are issues where. The stack should be
        // reset if nothing else.
        const sampleRate = g_byteBeat.getDesiredSampleRate();
        const numSamplesNeeded = sampleRate * numSeconds | 0;
        const numChannels = 2;
        const wavMaker = new WavMaker(sampleRate, numChannels);
        const context = ByteBeatNode.createContext();
        const stack = ByteBeatNode.createStack();
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
        saveData(blob, 'html5bytebeat.wav');
        if (wasPlaying) {
          play();
        }
      }
      closeSave();
    }
    realSave();
  }

  const firstLine = strip(strip(codeElem.value.split('\n')[0]).replace(/^\/\//, ''));
  const p = makeExposedPromise();
  g_captureFn = () => {
    g_captureFn = undefined;
    p.resolve(captureScreenshot(g_screenshotContext, canvas, firstLine));
  };
  g_screenshot = await p.promise;

  window.addEventListener('keypress', handleKeyPress);
  if (!g_saveDialogInitialized) {
    g_saveDialogInitialized = true;
    $('save').addEventListener('click', save);
    $('cancel').addEventListener('click', closeSave);
  }
  const saveDialogElem = $('savedialog');
  const screenshotElem = $('screenshot');
  saveDialogElem.style.display = 'table';
  screenshotElem.src = g_screenshot;
}

function dummyFunction() {}

function updateTimeDisplay() {
  timeElem.innerHTML = g_byteBeat.getTime();
}

async function setExpressions(expressions, resetToZero) {
  let error;
  try {
    await g_byteBeat.setExpressions(expressions, resetToZero);
  } catch (e) {
    error = e;
  }

  compileStatusElem.textContent = error ? error : '*';
  compileStatusElem.classList.toggle('error', error);
  if (!error) {
    setURL();
  }
}

function compile(text, resetToZero) {
  const sections = splitBySections(text);
  if (sections.default || sections.channel1) {
    const expressions = [sections.default?.body || sections.channel1?.body];
    if (sections.channel2) {
      expressions.push(sections.channel2.body);
    }
    if (resetToZero) {
      g_visualizer.reset();
    }
    setExpressions(expressions, resetToZero);
  }
  if (sections.vsa) {
    g_vsaEffect.setURL(sections.vsa.argString);
    setVisualizer(g_vsaIndex);
  }
}

function setURL() {
  if (doNotSetURL) {
    doNotSetURL = false;
    return;
  }
  compressor.compress(codeElem.value, 1, function(bytes) {
    const hex = convertBytesToHex(bytes);
    g_ignoreHashChange = true;
    window.location.replace(
      '#t=' + g_byteBeat.getType() +
      '&e=' + g_byteBeat.getExpressionType() +
      '&s=' + g_byteBeat.getDesiredSampleRate() +
      '&bb=' + hex);
  },
  dummyFunction);
}

{
  songList();
  $('loadingContainer').style.display = 'none';
  const s = $('startContainer');
  s.style.display = '';
  s.addEventListener('click', function() {
    s.style.display = 'none';
    main();
  }, false);
}
