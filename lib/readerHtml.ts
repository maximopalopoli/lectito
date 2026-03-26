const JSZIP_CDN = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
const EPUB_JS_CDN = 'https://cdn.jsdelivr.net/npm/epubjs@0.3.93/dist/epub.min.js';

export function getReaderHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; overflow: hidden; }
  body { background: #ffffff; color: #1a1a1a; }
  body.dark { background: #1a1a1a; color: #e0e0e0; }
  body.sepia { background: #f4ecd8; color: #5b4636; }
  #viewer { width: 100%; height: 100%; }
  #loading {
    position: absolute; top: 0; left: 0; right: 0; bottom: 0;
    display: flex; align-items: center; justify-content: center;
    font-family: -apple-system, sans-serif; font-size: 16px; color: #888;
  }
  .epub-highlight { background: rgba(251, 191, 36, 0.3); }
  .epub-highlight-blue { background: rgba(96, 165, 250, 0.3); }
  .epub-highlight-green { background: rgba(52, 211, 153, 0.3); }
  .epub-highlight-pink { background: rgba(244, 114, 182, 0.3); }
  .epub-highlight-purple { background: rgba(167, 139, 250, 0.3); }
</style>
</head>
<body>
<div id="loading">Cargando libro...</div>
<div id="viewer"></div>

<script src="${JSZIP_CDN}"></script>
<script src="${EPUB_JS_CDN}"></script>
<script>
(function() {
  var book = null;
  var rendition = null;
  var currentCfi = null;
  var locationsReady = false;
  var currentFontCss = '';

  function send(msg) {
    var json = JSON.stringify(msg);
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(json);
    } else if (window.parent !== window) {
      window.parent.postMessage(json, '*');
    }
  }

  function onMessage(event) {
    var data;
    try {
      data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
    } catch(e) { return; }
    if (!data || !data.type) return;

    switch(data.type) {
      case 'load': loadBook(data.data, data.cfi, data.cachedLocations); break;
      case 'next': if (rendition) rendition.next(); break;
      case 'prev': if (rendition) rendition.prev(); break;
      case 'goto': if (rendition && data.cfi) rendition.display(data.cfi); break;
      case 'setTheme': applyTheme(data.theme); break;
      case 'setFontSize': if (rendition) rendition.themes.fontSize(data.size + '%'); break;
      case 'setFontFamily': applyFont(data.family); break;
      case 'highlight': addHighlight(data.cfi, data.color); break;
      case 'ping': send({ type: 'ready' }); break;
    }
  }

  document.addEventListener('message', onMessage);
  window.addEventListener('message', onMessage);

  function loadBook(base64Data, resumeCfi, cachedLocations) {
    try {
      var binary = atob(base64Data);
      var bytes = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      book = ePub(bytes.buffer);

      rendition = book.renderTo('viewer', {
        flow: 'paginated',
        width: '100%',
        height: '100%',
        snap: true,
        spread: 'none',
        allowScriptedContent: false
      });

      registerThemes();

      // Hook to inject custom font CSS into each epub content document
      rendition.hooks.content.register(function(contents) {
        if (currentFontCss) {
          var doc = contents.document;
          var style = doc.createElement('style');
          style.id = 'aleph-font';
          style.textContent = currentFontCss;
          doc.head.appendChild(style);
        }
      });

      book.ready.then(function() {
        var toc = book.navigation ? book.navigation.toc.map(function(ch) {
          return { label: ch.label.trim(), href: ch.href };
        }) : [];
        send({ type: 'bookLoaded', toc: toc, totalPages: 0 });
        document.getElementById('loading').style.display = 'none';

        // Load cached locations or generate in background
        var locationsPromise;
        if (cachedLocations) {
          book.locations.load(cachedLocations);
          locationsPromise = Promise.resolve();
        } else {
          locationsPromise = book.locations.generate(1024);
        }
        locationsPromise.then(function() {
          locationsReady = true;
          var total = book.locations.length();
          var msg = { type: 'locationsReady', totalPages: total };
          if (!cachedLocations) {
            msg.locations = book.locations.save();
          }
          send(msg);
          // Re-send current location now that we have percentages
          if (currentCfi) {
            var percent = book.locations.percentageFromCfi(currentCfi);
            var loc = book.locations.locationFromCfi(currentCfi);
            send({ type: 'relocated', cfi: currentCfi, page: 0, total: 0, rawPercent: percent, percent: Math.round(percent * 100), chapter: '', location: loc });
          }
        });
      });

      rendition.on('relocated', function(location) {
        var percent = locationsReady && book.locations ? book.locations.percentageFromCfi(location.start.cfi) : -1;
        var page = location.start.displayed ? location.start.displayed.page : 0;
        var total = location.start.displayed ? location.start.displayed.total : 0;
        var locationIndex = locationsReady && book.locations ? book.locations.locationFromCfi(location.start.cfi) : -1;
        currentCfi = location.start.cfi;

        var chapter = '';
        if (book.navigation) {
          var spineItem = book.spine.get(location.start.href);
          if (spineItem) {
            var navItem = book.navigation.toc.find(function(ch) {
              return ch.href && location.start.href.indexOf(ch.href.split('#')[0]) !== -1;
            });
            if (navItem) chapter = navItem.label.trim();
          }
        }

        send({
          type: 'relocated',
          cfi: location.start.cfi,
          page: page,
          total: total,
          rawPercent: percent,
          percent: Math.round(percent * 100),
          chapter: chapter,
          location: locationIndex
        });
      });

      rendition.on('selected', function(cfiRange) {
        if (!rendition) return;
        book.getRange(cfiRange).then(function(range) {
          var text = range ? range.toString() : '';
          if (text.length > 0) {
            send({ type: 'selected', cfi: cfiRange, text: text });
          }
        });
      });

      // Navigation: on native, RN overlays handle prev/next.
      // On web (iframe), use click zones since there are no overlays.
      rendition.on('click', function(e) {
        var isNative = !!window.ReactNativeWebView;
        if (isNative) {
          send({ type: 'tap' });
          return;
        }
        var width = window.innerWidth;
        var x = e.clientX || 0;
        if (x < width * 0.3) {
          rendition.prev();
          send({ type: 'nav', direction: 'prev' });
        } else if (x > width * 0.7) {
          rendition.next();
          send({ type: 'nav', direction: 'next' });
        } else {
          send({ type: 'tap' });
        }
      });

      if (resumeCfi) {
        rendition.display(resumeCfi);
      } else {
        rendition.display();
      }

    } catch(e) {
      send({ type: 'error', message: e.message || 'Error cargando libro' });
    }
  }

  function registerThemes() {
    if (!rendition) return;
    rendition.themes.register('light', {
      body: { background: '#ffffff !important', color: '#1a1a1a !important' },
      'a': { color: '#007AFF !important' }
    });
    rendition.themes.register('dark', {
      body: { background: '#1a1a1a !important', color: '#e0e0e0 !important' },
      'a': { color: '#60A5FA !important' }
    });
    rendition.themes.register('sepia', {
      body: { background: '#f4ecd8 !important', color: '#5b4636 !important' },
      'a': { color: '#8B6914 !important' }
    });
    rendition.themes.select('light');
  }

  function applyTheme(theme) {
    document.body.className = theme === 'light' ? '' : theme;
    if (rendition) rendition.themes.select(theme);
  }

  function applyFont(family) {
    if (!rendition) return;
    var fontStr = family === 'default' ? '' :
                  family === 'serif' ? 'Georgia, serif' :
                  family === 'sans-serif' ? '-apple-system, Helvetica, Arial, sans-serif' :
                  'Menlo, Courier, monospace';
    currentFontCss = fontStr ? 'body, p, div, span, a, li, h1, h2, h3, h4, h5, h6 { font-family: ' + fontStr + ' !important; }' : '';
    // Apply to already-rendered content
    rendition.getContents().forEach(function(c) {
      var doc = c.document;
      var old = doc.getElementById('aleph-font');
      if (old) old.remove();
      if (currentFontCss) {
        var style = doc.createElement('style');
        style.id = 'aleph-font';
        style.textContent = currentFontCss;
        doc.head.appendChild(style);
      }
    });
  }

  function addHighlight(cfi, color) {
    if (!rendition || !cfi) return;
    var className = color === 'blue' ? 'epub-highlight-blue' :
                    color === 'green' ? 'epub-highlight-green' :
                    color === 'pink' ? 'epub-highlight-pink' :
                    color === 'purple' ? 'epub-highlight-purple' :
                    'epub-highlight';
    try {
      rendition.annotations.highlight(cfi, {}, function(){}, className);
    } catch(e) {}
  }

  send({ type: 'ready' });
})();
</script>
</body>
</html>`;
}
