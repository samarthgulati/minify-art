var view = {
  codePathEl: document.getElementById('codePath'),
  stylePathEl: document.getElementById('stylePath'),
  canvas: document.getElementById('canvas')
}

function init() {
  view.canvas.width = window.innerWidth;
  view.canvas.height = window.innerHeight;
  for(var i = 0; i < highlightJSStyles.length; i++) {
    var opt = document.createElement('option');
    opt.textContent = highlightJSStyles[i];
    opt.setAttribute('value', highlightJSStyles[i]);
    view.stylePathEl.appendChild(opt);
  }
  view.stylePathEl.addEventListener('change', highlightCodeWithStyle);
  view.codePathEl.addEventListener('change', highlightCodeWithStyle);
  view.stylePathEl.value = 'night-owl';
  highlightCodeWithStyle();
}

function applyCSS(parsedCodeAsHTML, cssText) {
  var doc = document.implementation.createHTMLDocument("HightlightJS");
  var code = document.createElement('code');
  code.classList.add('js', 'hljs', 'javascript');
  code.innerHTML = parsedCodeAsHTML;
  var pre = document.createElement('pre');
  pre.appendChild(code);
  doc.body.appendChild(pre);
  var styleElement = document.createElement("style");
  styleElement.textContent = cssText;
  doc.body.appendChild(styleElement);
  return doc;
};

function parseCodeForHighlighting(code) {
  const worker = new Worker('worker.js');
  worker.postMessage(code);
  return new Promise(function(res, rej) {
    worker.onmessage = function(e) {
      res(e.data);
    };
  });
}

function loadCode(path) {
  return fetch(path)
  .then(res => res.text())
}

function stylizedCodeToCodeColors(doc) {
  var iFrame = document.createElement('iframe');
  document.body.appendChild(iFrame);
  var destDocument = iFrame.contentDocument;
  var srcNode = doc.documentElement;
  var newNode = destDocument.importNode(srcNode, true);
  destDocument.replaceChild(newNode, destDocument.documentElement);
  var code = destDocument.body.firstElementChild.firstElementChild;
  var nodeIterator = document.createNodeIterator(code, NodeFilter.SHOW_ALL);
  var colorList = [];
  var currNode = nodeIterator.nextNode();
  var backgroundColor = window.getComputedStyle(currNode).backgroundColor;
  while(currNode !== null) {
    if(currNode.nodeName === '#text') {
      var nodeValue = currNode.nodeValue.trim();
      if(nodeValue.length > 0) {
        var parentElement = currNode.parentElement;
        var parentElementStyle = window.getComputedStyle(parentElement);
        var color = parentElementStyle.color;
        for(var i = 0; i < nodeValue.length; i++) {
          colorList.push(color);
        }
      }
    }
    currNode = nodeIterator.nextNode();
  }
  return {
    backgroundColor: backgroundColor,
    colorList: colorList
  };
}

function renderCodeColors(codeColors) {
  var backgroundColor =  codeColors.backgroundColor;
  var colorList =  codeColors.colorList;
  var ctx = view.canvas.getContext('2d');
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  var availSize = Math.sqrt(window.innerWidth * window.innerHeight / colorList.length);
  var cols = Math.floor(window.innerWidth / availSize);
  var rows = Math.floor(window.innerHeight / availSize);
  var totalArea = cols * rows;
  while(totalArea < colorList.length) {
    cols += 1;
    totalArea = cols * rows;
  }
  availSize = window.innerWidth / cols;
  var dotSize = availSize * 0.75;
  var margin = availSize * 0.25;
  var r = dotSize * 0.5;
  var TAU = Math.PI * 2;
  for(var i = 0; i < colorList.length; i++) {
    var x = ((i % cols) * availSize) + r + margin;
    var y = (Math.floor(i / cols) * availSize) + r + margin;
    ctx.beginPath();
    ctx.fillStyle = colorList[i];
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.closePath();
  }
  document.body.appendChild(canvas);
}

function highlightCodeWithStyle() {
  var pathToCode = view.codePathEl.value;
  var styleFile = view.stylePathEl.value;
  var pathToStyle = 'highlight/styles/' + styleFile + '.css';
  var promises = [
    loadCode(pathToCode).then(parseCodeForHighlighting),
    loadCode(pathToStyle),
  ];
  Promise.all(promises).then(function (res, rej) {
    var parsedCodeAsHTML = res[0];
    var cssText = res[1];
    var highlightJSDocument = applyCSS(parsedCodeAsHTML, cssText);
    var codeColors = stylizedCodeToCodeColors(highlightJSDocument);
    renderCodeColors(codeColors);
  });
}

var highlightJSWorker = new Worker('worker.js');
init();