import { READER_GESTURES_JS } from './readerGestures';

export function getReaderHtml(jszipScript: string, epubScript: string): string {
  const safeJszip = jszipScript.replace(/<\/script/gi, '<\\/script');
  const safeEpub = epubScript.replace(/<\/script/gi, '<\\/script');
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

<script>${safeJszip}</script>
<script>${safeEpub}</script>
<script>
(function() {
  var book = null;
  var rendition = null;
  var currentCfi = null;
  var locationsReady = false;
  // Hojas propias que se inyectan en cada capítulo: tipografía e interlineado.
  var injectedCss = { font: '', spacing: '' };
  var selectionSent = false;
  var suppressClickUntil = 0;
  var reportTimer = null;
${READER_GESTURES_JS}

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
      case 'setFontSize': if (rendition) { rendition.themes.fontSize(data.size + '%'); scheduleReport(); } break;
      case 'setFontFamily': applyFont(data.family); scheduleReport(); break;
      case 'setLineHeight': applyLineHeight(data.value); scheduleReport(); break;
      case 'setMargin': applyMargin(data.px); scheduleReport(); break;
      case 'highlight': addHighlight(data.cfi, data.color); break;
      case 'clearSelection': clearSelection(); break;
      case 'ping': send({ type: 'ready' }); break;
    }
  }

  // Otro tamaño del visor (rotar, redimensionar la ventana en web) cambia cuánto entra por página.
  window.addEventListener('resize', function() {
    send({ type: 'layoutChanged' });
    scheduleReport();
  });

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
        injectCss(contents.document, 'font');
        injectCss(contents.document, 'spacing');
      });

      // Gestos dentro de cada documento del libro: tocar los costados o deslizar pasa de página,
      // tocar el centro muestra/oculta las barras. Mientras hay texto seleccionado, no se navega.
      rendition.hooks.content.register(function(contents) {
        var doc = contents.document;
        var win = contents.window;
        var touchStart = null;
        var hadSelection = false;

        function hasSelection() {
          var sel = win.getSelection();
          return !!sel && !sel.isCollapsed;
        }

        doc.addEventListener('touchstart', function(e) {
          hadSelection = hasSelection();
          if (e.touches.length !== 1) { touchStart = null; return; }
          var t = e.touches[0];
          touchStart = { x: t.clientX, y: t.clientY, time: Date.now() };
        }, { passive: true });

        doc.addEventListener('touchend', function(e) {
          var start = touchStart;
          touchStart = null;
          if (!start || hadSelection || hasSelection()) return;
          var t = e.changedTouches[0];
          var direction = classifySwipe(t.clientX - start.x, t.clientY - start.y, Date.now() - start.time);
          if (direction) {
            suppressClickUntil = Date.now() + 500;
            turnPage(direction);
          }
        });

        doc.addEventListener('mousedown', function() {
          if (hasSelection()) hadSelection = true;
        });

        doc.addEventListener('click', function(e) {
          var dismissingSelection = hadSelection;
          hadSelection = false;
          if (Date.now() < suppressClickUntil) return;
          if (dismissingSelection || hasSelection()) return;
          if (e.target && e.target.closest && e.target.closest('a')) return;
          // clientX es relativo al iframe del capítulo, que se desplaza con cada página.
          var frame = win.frameElement;
          var x = (frame ? frame.getBoundingClientRect().left : 0) + (e.clientX || 0);
          var zone = tapZone(x, window.innerWidth);
          if (zone === 'menu') send({ type: 'tap' });
          else turnPage(zone);
        });

        doc.addEventListener('selectionchange', function() {
          if (selectionSent && !hasSelection()) {
            selectionSent = false;
            send({ type: 'selectionCleared' });
          }
        });
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
          var current = currentCfi && rendition.currentLocation();
          if (current && current.start) reportLocation(current);
        });
      });

      rendition.on('relocated', reportLocation);

      rendition.on('selected', function(cfiRange) {
        if (!rendition) return;
        book.getRange(cfiRange).then(function(range) {
          var text = range ? range.toString() : '';
          if (text.length > 0) {
            selectionSent = true;
            send({ type: 'selected', cfi: cfiRange, text: text });
          }
        });
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

  // Caracteres del capítulo visible, contados como epub.js cuenta las locations (nodos de texto
  // que no son solo espacios). Con las páginas del capítulo da cuántos caracteres entran por página.
  function chapterChars(sectionIndex) {
    var contents = rendition.getContents().filter(function(c) { return c.sectionIndex === sectionIndex; })[0];
    var body = contents && contents.document && contents.document.body;
    if (!body) return 0;
    var walker = contents.document.createTreeWalker(body, NodeFilter.SHOW_TEXT, null, false);
    var count = 0;
    var node;
    while ((node = walker.nextNode())) {
      if (node.data.trim().length > 0) count += node.data.length;
    }
    return count;
  }

  function reportLocation(location) {
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
      sectionIndex: location.start.index,
      chapterChars: chapterChars(location.start.index),
      rawPercent: percent,
      percent: Math.round(percent * 100),
      chapter: chapter,
      location: locationIndex
    });
  }

  // Cambiar letra o tipografía repagina el capítulo sin garantizar un 'relocated';
  // se vuelve a informar la posición cuando el nuevo layout ya se aplicó.
  function scheduleReport() {
    if (reportTimer) clearTimeout(reportTimer);
    reportTimer = setTimeout(function() {
      reportTimer = null;
      var location = rendition && rendition.currentLocation();
      if (location && location.start) reportLocation(location);
    }, 500);
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
    if (!rendition) return;
    // epub.js inyecta la hoja de cada tema elegido y nunca saca las anteriores: sin esto,
    // volver de Oscuro a Claro deja el texto con los colores oscuros (mismas reglas !important).
    rendition.getContents().forEach(function(c) {
      ['light', 'dark', 'sepia'].forEach(function(name) {
        if (name === theme) return;
        var node = c.document.getElementById('epubjs-inserted-css-' + name);
        if (node) node.remove();
      });
    });
    rendition.themes.select(theme);
  }

  function applyFont(family) {
    if (!rendition) return;
    var fontStr = family === 'default' ? '' :
                  family === 'serif' ? 'Georgia, serif' :
                  family === 'sans-serif' ? '-apple-system, Helvetica, Arial, sans-serif' :
                  'Menlo, Courier, monospace';
    injectedCss.font = fontStr ? 'body, p, div, span, a, li, h1, h2, h3, h4, h5, h6 { font-family: ' + fontStr + ' !important; }' : '';
    rendition.getContents().forEach(function(c) { injectCss(c.document, 'font'); });
  }

  // Sin valor se respeta el interlineado del libro.
  function applyLineHeight(value) {
    injectedCss.spacing = value ? 'body, p, div, li, blockquote { line-height: ' + value + ' !important; }' : '';
    if (!rendition) return;
    rendition.getContents().forEach(function(c) { injectCss(c.document, 'spacing'); });
  }

  // Margen lateral extra, sumado al que ya deja epub.js entre columnas.
  function applyMargin(px) {
    document.getElementById('viewer').style.padding = '0 ' + (px || 0) + 'px';
    if (rendition) rendition.resize();
  }

  function injectCss(doc, name) {
    var id = 'aleph-' + name;
    var old = doc.getElementById(id);
    if (old) old.remove();
    if (!injectedCss[name]) return;
    var style = doc.createElement('style');
    style.id = id;
    style.textContent = injectedCss[name];
    doc.head.appendChild(style);
  }

  function turnPage(direction) {
    if (!rendition) return;
    if (direction === 'next') rendition.next();
    else rendition.prev();
    send({ type: 'nav', direction: direction });
  }

  function clearSelection() {
    if (!rendition) return;
    rendition.getContents().forEach(function(c) {
      var sel = c.window.getSelection();
      if (sel) sel.removeAllRanges();
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
