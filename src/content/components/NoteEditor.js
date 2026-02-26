window.BiliSub = window.BiliSub || {};

window.BiliSub.NoteEditor = (function () {
  var DOM = window.BiliSub.DOM;

  function _escapeHtml(s) {
    if (!s) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function _markdownToHtml(md, getAssetUrl) {
    if (!md) return '';
    var html = _escapeHtml(md);
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/!\[([^\]]*)\]\((asset:\d+)\)/g, function (_, alt, ref) {
      var num = ref.replace('asset:', '');
      var src = typeof getAssetUrl === 'function' ? getAssetUrl(parseInt(num, 10)) : null;
      if (src) return '<img src="' + _escapeHtml(src) + '" alt="' + _escapeHtml(alt) + '" class="bili-sub-note-editor__img"/>';
      return '<span class="bili-sub-note-editor__img-placeholder">[图片]</span>';
    });
    html = html.replace(/!\[([^\]]*)\]\((data:[^)]+)\)/g, function (_, alt, src) {
      return '<img src="' + _escapeHtml(src) + '" alt="' + _escapeHtml(alt) + '" class="bili-sub-note-editor__img"/>';
    });
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_, t, u) {
      return '<a href="' + _escapeHtml(u) + '" target="_blank" rel="noopener">' + _escapeHtml(t) + '</a>';
    });
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  function create(options) {
    options = options || {};
    var getAssetUrl = options.getAssetUrl || null;
    var draftBlobs = [];

    var wrap = DOM.create('div', 'bili-sub-note-editor bili-sub-note-editor--split');
    var editWrap = DOM.create('div', 'bili-sub-note-editor__edit-wrap');
    var textarea = DOM.create('textarea', 'bili-sub-note-editor__textarea');
    textarea.placeholder = '支持 Markdown，粘贴图片会插入占位符…';
    textarea.rows = 5;
    if (options.value) textarea.value = options.value;
    editWrap.appendChild(textarea);

    var previewWrap = DOM.create('div', 'bili-sub-note-editor__preview-wrap');
    var previewLabel = DOM.create('div', 'bili-sub-note-editor__preview-label', { textContent: '预览' });
    var previewEl = DOM.create('div', 'bili-sub-note-editor__preview');
    previewWrap.appendChild(previewLabel);
    previewWrap.appendChild(previewEl);

    wrap.appendChild(editWrap);
    wrap.appendChild(previewWrap);

    function renderPreview() {
      var raw = textarea.value;
      var resolver = getAssetUrl || function (index) {
        if (draftBlobs[index]) return URL.createObjectURL(draftBlobs[index]);
        return null;
      };
      previewEl.innerHTML = _markdownToHtml(raw, resolver);
    }
    textarea.addEventListener('input', renderPreview);
    textarea.addEventListener('keyup', renderPreview);

    textarea.addEventListener('paste', function (e) {
      var items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (var i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();
          var file = items[i].getAsFile();
          if (!file) return;
          var idx = draftBlobs.length;
          draftBlobs.push(file);
          var insert = '![](asset:' + idx + ')';
          var start = textarea.selectionStart;
          var end = textarea.selectionEnd;
          var val = textarea.value;
          textarea.value = val.slice(0, start) + insert + val.slice(end);
          textarea.selectionStart = textarea.selectionEnd = start + insert.length;
          renderPreview();
          return;
        }
      }
    });

    function getValue() { return textarea.value; }
    function setValue(s) {
      textarea.value = s || '';
      draftBlobs = [];
      renderPreview();
    }
    function setGetAssetUrl(fn) { getAssetUrl = fn; }
    function getDraftBlobs() { return draftBlobs.slice(); }

    if (textarea.value) renderPreview();

    return {
      getElement: function () { return wrap; },
      getValue: getValue,
      setValue: setValue,
      setGetAssetUrl: setGetAssetUrl,
      getDraftBlobs: getDraftBlobs,
      renderPreview: renderPreview,
    };
  }

  return {
    create: create,
    markdownToHtml: _markdownToHtml,
    escapeHtml: _escapeHtml,
  };
})();
