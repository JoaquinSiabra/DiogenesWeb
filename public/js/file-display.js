var token = localStorage.getItem("access_token")
var host = localStorage.getItem("cloudHost")
var filePath
var mainDiv
var dbx
window.addEventListener('DOMContentLoaded', (event) => {
  path = document.getElementById('path').textContent
  mainDiv = document.getElementById('main')

  // console.log(path)
  if (path.match(/^public\/texts/)) {
    getFileLocal(path)
  }
  else if (host == "dropbox") {
    dbx = new Dropbox.Dropbox({ accessToken: token });
    // console.log('dbx', dbx)
    //function getFile () {getFileDropbox()}
    getFileDropbox(path)
  }
});

function reqListener () {
  // console.log(this.responseXML);
  processXML(this.responseXML)
}

function getFileLocal (path) {
  var req = new XMLHttpRequest();
  req.addEventListener("load", reqListener);
  // var url = window.location.origin + '/serveXml' + "?user=" + localStorage.getItem("user") + '&xmlPath=' + path
  var url = window.location.origin + '/' + path + "?user=" + localStorage.getItem("user")
  // console.log(url)
  req.open("GET", url);
  req.send();
}

function getFileDropbox (path) {
  dbx.filesDownload({path: path})
  .then(function(response) {
    // console.log('response', response)
    processFile(response);
    //console.log(response);
  })
  .catch(function(error) {
    console.error(error);
  });
}

function processFile (data) {
  // console.log(data.fileBlob)
  // filBlob.text() is only implemented in Chrome
  // data.fileBlob.text()
  // .then()
  // So we use this interface instead
  var reader = new FileReader()
  var text
  reader.onload = function(e) {
    text = reader.result;
    parseXML(text)
  }
  reader.readAsText(data.fileBlob);
}

function parseXML (xmlDoc) {
  var parser = new DOMParser();
  var xml = parser.parseFromString(xmlDoc, "application/xml");
  // console.log(xml)
  processXML(xml)
}

function makeTitle (xml) {
  var author = xml.getElementsByTagName('author')[0].textContent
  var title = xml.getElementsByTagName('title')[0].textContent
  if (author || title) {
    var button = document.createElement('button')
    button.setAttribute('type', 'button')
    button.setAttribute('class', 'collapsible xml-header')
    //h1.setAttribute('class', 'xml-header')
    if (author) {
      button.appendChild(document.createTextNode(author))
    }
    if (author && title) {
      button.appendChild(document.createTextNode(', '))
    }
    if (title) {
      var span = document.createElement('span')
      span.setAttribute('class', 'italic')
      span.appendChild(document.createTextNode(title))
      button.appendChild(span)
    }
    var div = document.createElement('div')
    div.setAttribute('class', 'content')
    var source = xml.getElementsByTagName('sourceDesc')[0]
    if (source) {
      div.appendChild(source)
    } else {
      div.appendChild(document.createTextNode('No source-text description available.'))
    }
    mainDiv.appendChild(button)
    mainDiv.appendChild(div)
  }
}

function processXML (xml) {
  makeTitle(xml)
  current = mainDiv
  walkTheDOM(xml.getElementsByTagName('body')[0], processNode)
  processingFinished()
}

var levels = {} // Current number of all div levels
var labels = {} // Names of divs
var level = 0 // Current level of div nesting
var suppress // Suppress title divs until we encounter a proper div at this same level
var current // Current HTML node to append to

function walkTheDOM(node, func) {
  var oldCurrent = current
  var oldLevel = level
  func(node)
  node = node.firstChild;
  while (node) {
    walkTheDOM(node, func);
    node = node.nextSibling;
  }
  current = oldCurrent
  level = oldLevel
}

/* Process each XML node and return an HTML node */
function translateNode (node) {
  switch (node.nodeName) {
    case 'l': {
      // if (node.firstChild && node.firstChild.nodeName == 'label') { return }
      var div = document.createElement('div')
      div.setAttribute('class', 'line')
      var num = node.getAttribute('n')
      if (num && num % 5 === 0) {
        var lineNum = document.createElement('span')
        lineNum.setAttribute('class', 'lineNum')
        lineNum.appendChild(document.createTextNode(num))
        div.appendChild(lineNum)
      }
      return div
    }
    case 'div1':
    case 'div2':
    case 'div3':
    case 'div4':
    case 'div5':
    case 'div6':
    case 'div7':
    case 'div': {
      var type = node.getAttribute('type')
      var n = node.getAttribute('n')
      if (n == 't') {
        suppress = type
        return
      }
      if (suppress && suppress == type) {
        suppress = ''
      }
      if (suppress) { return }

      level++
      labels[level] = type
      levels[level] = n
      var div = document.createElement('div')
      if (node.hasAttributes) {
        node.attributes.forEach(function (item) {
          div.setAttribute(item.name, item.value)
        })
      }
      var button = document.createElement('button')
      button.setAttribute('type', 'button')
      // if (type === 'Section' || type === 'section') {
      //   button.setAttribute('class', 'uncollapsible')
      // }
      // else {
        button.setAttribute('class', 'collapsible '+'divLevel'+level)
        div.setAttribute('class', 'content')
      // }
      var label = ''
      for (let lev = 1; lev <= level; lev++) {
        label = label + capitalizeFirstLetter(labels[lev]) + '\u00A0' + levels[lev]
        if (lev != level) {
          label = label + ', '
        } else {
          label = label + '.'
        }
      }
      button.appendChild(document.createTextNode(label))
      current.appendChild(button)
      return div
    }
    case 'label': {
      var type = node.getAttribute('type')
      if (type == 'head') {
        var h1 = document.createElement('h1')
        return h1
      }
      else if (type == 'speaker') {
        var span = document.createElement('span')
        span.setAttribute('class', 'speaker')
        return span
      }
    }
    case 'space': {
      var q = node.getAttribute('quantity') || 1
      var sp = '\u00A0'
      var str = sp.repeat(q)
      return document.createTextNode(str)
    }
    case 'hi': {
      return document.createElement('span')
    }
    case 'seg': {
      return document.createElement('span')
    }
    case 'p': {
      return document.createElement('p')
    }
    case 'lb': {
      return document.createElement('br')
    }
    case 'cb': {
      return document.createElement('br')
    }
    case 'g': {
      return document.createTextNode('[?]')
    }
    case 'body': {
      return
    }
    case 'pb': {
      return
    }
    case 'del': {
      return document.createElement('del')
    }
    case 'quote':
    case 'q': {
      if (node.getAttribute('rend') == 'blockquote') {
        return document.createElement('blockquote')
      }
      else {
        return document.createElement('q')
      }
    }
    default: {
      console.log('Unsupported element: ' + node.nodeName)
      return
    }
  }
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

/* Adapted from the smartquotes.js library */
function smartquotesString(str) {
  return str
  .replace(/'''/g, '\u2034') // triple prime
  .replace(/(\W|^)"(\S)/g, '$1\u201c$2')  // beginning "
  .replace(/(\u201c[^"]*)"([^"]*$|[^\u201c"]*\u201c)/g, '$1\u201d$2') // ending "
  .replace(/([^0-9])"/g,'$1\u201d')  // remaining " at end of word
  .replace(/''/g, '\u2033') // double prime
  // .replace(/(\W|^)'(\S)/g, '$1\u2018$2') // beginning '
  // .replace(/([a-z])'([a-z])/ig, '$1\u2019$2') // conjunction's possession
  // .replace(/((\u2018[^']*)|[a-z])'([^0-9]|$)/ig, '$1\u2019$3') // ending '
  // .replace(/'/g, '\u2032');
  .replace(/'/g, '\u2019'); // mark of elision
};

/* Create parsing links for each word */
const latinRegex = /[a-zA-Z]+/g
const greekRegex = /[\u0370-\u03FF\u1F00-\u1FFF]+/g
function parseReplace (match) {
  // return '<a onclick="parse_'+parseLang+'(\''+match+'\')">'+match+'</a>'
  return '<a onclick="p(this)">'+match+'</a>'
}
function addParseLinks (text) {
  text = text.replace(latinRegex, parseReplace)
  text = text.replace(greekRegex, parseReplace)
  var span = document.createElement('span')
  span.setAttribute('class', 'text')
  span.innerHTML = text
  return span
}

function processNode (node) {
  // console.log(current)
  if (node.nodeType === 3) {
    var text = smartquotesString(node.data)
    var span = addParseLinks(text)
    // var textNode = document.createTextNode(text)
    // smartquotes(textNode)
    // console.log(text)
    current.appendChild(span)
  }
  else if (node.nodeType == 1) {
    var name = node.nodeName
     // console.log('>'+name)
    // console.log(current)
    // console.log(nodes[str])
    var htmlNode
    htmlNode = translateNode(node)
    if (htmlNode) {
      // console.log(htmlNode.nodeName)
      var rend = node.getAttribute('rend')
      if (rend) {
        rend = rend.replace('(', '')
        rend = rend.replace(')', '')
        htmlNode.setAttribute('class', rend)
      }
      current.appendChild(htmlNode)
      if (node.firstChild && htmlNode.nodeName != 'BR') {
        // Make current element the new parent, unless XML node is empty or we want to force the htmlNode to be empty.
        current = htmlNode
      }
    }
  }
}

function processingFinished () {
  setupFolding ()
}
