window.BiliSub = window.BiliSub || {};

window.BiliSub.BookmarkDialog = (function () {
  var DOM = window.BiliSub.DOM;
  var Time = window.BiliSub.Time;
  var BookmarkService = window.BiliSub.BookmarkService;
  var ClipService = window.BiliSub.ClipService;
  var NoteEditor = window.BiliSub.NoteEditor;

  var _overlay = null;
  var _noteEditor = null;
  var _tagsInput = null;
  var _tagsList = null;
  var _suggestList = null;
  var _pendingData = null;
  var _clipVideo = null;
  var _clipEmpty = null;
  var _clipBlobUrl = null;
  var _scrollBody = null;
  var _recordingPane = null;
  var _recordingSentenceText = null;

  var DATA_URL_REGEX = /!\[\]\((data:[^)]+)\)/g;

  function _extractDataUrls(noteText) {
    var urls = [];
    var match;
    DATA_URL_REGEX.lastIndex = 0;
    while ((match = DATA_URL_REGEX.exec(noteText)) !== null) {
      urls.push(match[1]);
    }
    return urls;
  }

  function _dataUrlToBlob(dataUrl) {
    var parts = dataUrl.split(',');
    var mime = parts[0].match(/data:([^;]+);/);
    var type = mime ? mime[1] : 'image/png';
    var binary = atob(parts[1]);
    var arr = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
    return new Blob([arr], { type: type });
  }

  function _replaceDataUrlsWithAssets(noteText, dataUrls) {
    var idx = 0;
    return noteText.replace(DATA_URL_REGEX, function () {
      return '![](asset:' + (idx++) + ')';
    });
  }

  function _buildTagsSection() {
    var wrap = DOM.create('div', 'bili-sub-bookmark-dialog__tags-wrap');
    var label = DOM.create('label', 'bili-sub-bookmark-dialog__label', { textContent: '标签（可多选，输入模糊匹配）' });
    var row = DOM.create('div', 'bili-sub-bookmark-dialog__tags-row');
    _tagsInput = DOM.create('input', 'bili-sub-bookmark-dialog__tags-input');
    _tagsInput.type = 'text';
    _tagsInput.placeholder = '输入标签或从下方选择…';
    _tagsList = DOM.create('div', 'bili-sub-bookmark-dialog__tags-list');
    _suggestList = DOM.create('div', 'bili-sub-bookmark-dialog__suggest bili-sub-bookmark-dialog__suggest--hidden');
    wrap.appendChild(label);
    wrap.appendChild(_tagsList);
    row.appendChild(_tagsInput);
    row.appendChild(_suggestList);
    wrap.appendChild(row);
    return wrap;
  }

  function _renderSuggestions(filter) {
    if (!_pendingData || !_pendingData.allTags) return;
    var q = (filter || '').trim().toLowerCase();
    var list = q
      ? _pendingData.allTags.filter(function (t) { return t.toLowerCase().includes(q); })
      : _pendingData.allTags.slice(0, 15);
    _suggestList.innerHTML = '';
    _suggestList.classList.add('bili-sub-bookmark-dialog__suggest--hidden');
    if (list.length) {
      list.forEach(function (tag) {
        if (_pendingData.selectedTags.indexOf(tag) !== -1) return;
        var el = DOM.create('div', 'bili-sub-bookmark-dialog__suggest-item', { textContent: tag });
        el.addEventListener('click', function () {
          _addTag(tag);
          _tagsInput.value = '';
          _renderSuggestions('');
        });
        _suggestList.appendChild(el);
      });
      _suggestList.classList.remove('bili-sub-bookmark-dialog__suggest--hidden');
    }
  }

  function _addTag(tag) {
    tag = String(tag).trim();
    if (!tag || !_pendingData) return;
    if (_pendingData.selectedTags.indexOf(tag) === -1) {
      _pendingData.selectedTags.push(tag);
      _renderTagChips();
    }
  }

  function _removeTag(tag) {
    if (!_pendingData) return;
    var i = _pendingData.selectedTags.indexOf(tag);
    if (i !== -1) {
      _pendingData.selectedTags.splice(i, 1);
      _renderTagChips();
    }
  }

  function _renderTagChips() {
    _tagsList.innerHTML = '';
    if (!_pendingData || !_pendingData.selectedTags.length) return;
    _pendingData.selectedTags.forEach(function (tag) {
      var chip = DOM.create('span', 'bili-sub-bookmark-dialog__tag-chip');
      chip.textContent = tag;
      var close = DOM.create('span', 'bili-sub-bookmark-dialog__tag-chip-close', { textContent: '×' });
      close.addEventListener('click', function () { _removeTag(tag); });
      chip.appendChild(close);
      _tagsList.appendChild(chip);
    });
  }

  function _positionBox(anchor) {
    var box = _overlay && _overlay.querySelector('.bili-sub-bookmark-dialog__box');
    if (!box) return;
    // 抽屉模式固定在右侧，占据整高，不再依赖锚点
    box.style.position = 'relative';
    box.style.right = '';
    box.style.left = '';
    box.style.top = '';
    box.style.bottom = '';
    box.style.maxHeight = '';
  }

  function open(data, options) {
    options = options || {};
    _pendingData = {
      type: data.type || 'sentence',
      sentences: data.sentences || [],
      video: data.video || { url: '', title: '', from: 0, to: 0 },
      selectedTags: (data.tags && data.tags.slice()) || [],
      allTags: [],
      clipId: data.clipId || null,
    };
    if (!_overlay) _create();
    _overlay.classList.remove('bili-sub-bookmark-dialog--hidden');
    _positionBox(options.anchor);

    var titleEl = _overlay.querySelector('.bili-sub-bookmark-dialog__title-text');
    if (titleEl) titleEl.textContent = _pendingData.type === 'segment' ? '收藏 AB 段' : '收藏句子';

    var previewEl = _overlay.querySelector('.bili-sub-bookmark-dialog__preview');
    previewEl.innerHTML = '';
    _pendingData.sentences.forEach(function (s, idx) {
      var block = DOM.create('div', 'bili-sub-bookmark-dialog__preview-item');
      block.dataset.from = s.from;
      block.dataset.to = s.to;
      var targetInput = DOM.create('input', 'bili-sub-bookmark-dialog__preview-target');
      targetInput.type = 'text';
      targetInput.value = s.target || '';
      targetInput.placeholder = '原文';
      block.appendChild(targetInput);
      var nativeInput = DOM.create('input', 'bili-sub-bookmark-dialog__preview-native');
      nativeInput.type = 'text';
      nativeInput.value = s.native || '';
      nativeInput.placeholder = '译文';
      block.appendChild(nativeInput);
      var timeSpan = DOM.create('span', 'bili-sub-bookmark-dialog__preview-time', {
        textContent: Time.format(s.from) + ' - ' + Time.format(s.to),
      });
      block.appendChild(timeSpan);
      previewEl.appendChild(block);
    });

    if (_noteEditor) {
      _noteEditor.setValue(data.note || '');
    }
    _renderTagChips();
    _tagsInput.value = '';

    var recordStatusEl = _overlay.querySelector('.bili-sub-bookmark-dialog__record-status');
    var recordBtnEl = _overlay.querySelector('.bili-sub-bookmark-dialog__btn--record');

    if (_clipBlobUrl) { URL.revokeObjectURL(_clipBlobUrl); _clipBlobUrl = null; }
    _hideClipPreview();

    BookmarkService.getAllTags().then(function (tags) {
      _pendingData.allTags = tags || [];
    });

    // 录制中的提示文案，展示第一句的原文 / 译文，方便知道正在录哪一句
    if (_recordingSentenceText) {
      var first = _pendingData.sentences[0] || {};
      var line = (first.target || '') + (first.native ? ' / ' + first.native : '');
      _recordingSentenceText.textContent = line || '';
    }

    // 打开时先进入“录制中”界面，录制完成后再展示完整表单
    if (ClipService && ClipService.recordFreshClip && _scrollBody && _recordingPane) {
      var v = _pendingData.video;
      var from = v.from != null ? v.from : (_pendingData.sentences[0] && _pendingData.sentences[0].from) || 0;
      var to = v.to != null ? v.to : (_pendingData.sentences[_pendingData.sentences.length - 1] && _pendingData.sentences[_pendingData.sentences.length - 1].to) || from + 10;
      _scrollBody.style.display = 'none';
      _recordingPane.style.display = 'flex';
      if (recordStatusEl) recordStatusEl.textContent = '';
      if (recordBtnEl) recordBtnEl.disabled = true;
      ClipService.recordFreshClip(from, to).then(function (result) {
        _pendingData.clipId = result.clipId;
        _pendingData.clipBlob = result.blob;
        _clipBlobUrl = URL.createObjectURL(result.blob);
        _showClipPreview(_clipBlobUrl);
        if (recordStatusEl) recordStatusEl.textContent = '已录制';
        if (recordBtnEl) recordBtnEl.textContent = '重新录制';
      }).catch(function (err) {
        if (recordStatusEl) recordStatusEl.textContent = '录制失败：' + (err && err.message || '');
      }).finally(function () {
        _recordingPane.style.display = 'none';
        _scrollBody.style.display = 'block';
        if (recordBtnEl) recordBtnEl.disabled = false;
      });
    } else {
      if (recordBtnEl) {
        recordBtnEl.disabled = false;
        recordBtnEl.textContent = '录制切片';
      }
      if (recordStatusEl) recordStatusEl.textContent = '';
    }
  }

  function close() {
    if (_overlay) _overlay.classList.add('bili-sub-bookmark-dialog--hidden');
    if (_clipBlobUrl) { URL.revokeObjectURL(_clipBlobUrl); _clipBlobUrl = null; }
    _pendingData = null;
  }

  function _tryGetAutoClip() {
    if (!_pendingData || !ClipService || !ClipService.getAutoClip) return null;
    var ss = _pendingData.sentences;
    if (!ss || !ss.length) return null;
    if (ss.length === 1) return ClipService.getAutoClip(ss[0].from, ss[0].to);
    var blobs = [];
    for (var i = 0; i < ss.length; i++) {
      var b = ClipService.getAutoClip(ss[i].from, ss[i].to);
      if (b) blobs.push(b);
      else return null;
    }
    return new Blob(blobs, { type: 'video/webm' });
  }

  function _showClipPreview(url) {
    if (_clipVideo) { _clipVideo.src = url; _clipVideo.style.display = 'block'; }
    if (_clipEmpty) _clipEmpty.style.display = 'none';
  }

  function _hideClipPreview() {
    if (_clipVideo) { _clipVideo.removeAttribute('src'); _clipVideo.style.display = 'none'; }
    if (_clipEmpty) _clipEmpty.style.display = 'block';
  }

  function _collectSentencesFromDom() {
    var items = _overlay && _overlay.querySelectorAll('.bili-sub-bookmark-dialog__preview-item');
    if (!items || !items.length) return _pendingData ? _pendingData.sentences : [];
    var list = [];
    items.forEach(function (block) {
      var targetInput = block.querySelector('.bili-sub-bookmark-dialog__preview-target');
      var nativeInput = block.querySelector('.bili-sub-bookmark-dialog__preview-native');
      list.push({
        from: parseFloat(block.dataset.from) || 0,
        to: parseFloat(block.dataset.to) || 0,
        target: targetInput ? targetInput.value : '',
        native: nativeInput ? nativeInput.value : '',
      });
    });
    return list;
  }

  function _blobToDataUrl(blob) {
    return new Promise(function (resolve) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { resolve(null); };
      r.readAsDataURL(blob);
    });
  }

  function _inlineDraftBlobs(noteText, draftBlobs) {
    if (!draftBlobs.length) return Promise.resolve(noteText);
    var promises = draftBlobs.map(function (b) { return _blobToDataUrl(b); });
    return Promise.all(promises).then(function (urls) {
      var result = noteText;
      for (var i = 0; i < urls.length; i++) {
        if (urls[i]) result = result.replace('![](asset:' + i + ')', '![](' + urls[i] + ')');
      }
      return result;
    });
  }

  function _save() {
    if (!_pendingData) return;
    var noteText = _noteEditor ? _noteEditor.getValue() : '';
    var draftBlobs = _noteEditor && typeof _noteEditor.getDraftBlobs === 'function' ? _noteEditor.getDraftBlobs() : [];

    var sentences = _collectSentencesFromDom();
    if (!sentences.length) sentences = _pendingData.sentences;

    var video = _pendingData.video;
    var from = video.from;
    var to = video.to;
    if (sentences.length) {
      from = sentences[0].from;
      to = sentences[sentences.length - 1].to;
    }

    var clipBlob = _pendingData.clipBlob || null;
    var clipIdReady = _pendingData.clipId
      ? Promise.resolve(_pendingData.clipId)
      : (clipBlob && ClipService && ClipService.persistClip
        ? ClipService.persistClip(clipBlob)
        : Promise.resolve(null));

    Promise.all([clipIdReady, _inlineDraftBlobs(noteText, draftBlobs)])
      .then(function (results) {
        var resolvedClipId = results[0];
        var finalNote = results[1];
        return BookmarkService.add({
          type: _pendingData.type,
          sentences: sentences,
          video: {
            url: video.url || (typeof location !== 'undefined' ? location.href : ''),
            title: video.title || '',
            from: from,
            to: to,
          },
          note: finalNote,
          tags: _pendingData.selectedTags.slice(),
          clipId: resolvedClipId || null,
        });
      }).then(function () {
        close();
        _toastWithLink();
      }).catch(function (err) {
        _toast('保存失败：' + (err && err.message ? err.message : ''));
      });
  }

  var _toastEl = null;
  function _toast(msg) {
    if (_toastEl) {
      _toastEl.remove();
      clearTimeout(_toastEl._tid);
    }
    _toastEl = DOM.create('div', 'bili-sub-bookmark-dialog__toast');
    _toastEl.textContent = msg;
    document.body.appendChild(_toastEl);
    _toastEl._tid = setTimeout(function () {
      if (_toastEl && _toastEl.parentNode) _toastEl.remove();
      _toastEl = null;
    }, 2000);
  }

  function _toastWithLink() {
    if (_toastEl) {
      _toastEl.remove();
      clearTimeout(_toastEl._tid);
    }
    _toastEl = DOM.create('div', 'bili-sub-bookmark-dialog__toast');
    _toastEl.appendChild(document.createTextNode('已收藏。 '));
    var link = DOM.create('a', 'bili-sub-bookmark-dialog__toast-link', { textContent: '查看收藏' });
    link.href = '#';
    link.addEventListener('click', function (e) {
      e.preventDefault();
      if (chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action: 'open-bookmarks-page' });
      }
    });
    _toastEl.appendChild(link);
    _toastEl.appendChild(document.createTextNode(' 可查看全部'));
    document.body.appendChild(_toastEl);
    _toastEl._tid = setTimeout(function () {
      if (_toastEl && _toastEl.parentNode) _toastEl.remove();
      _toastEl = null;
    }, 4000);
  }

  function _create() {
    _overlay = DOM.create('div', 'bili-sub-bookmark-dialog bili-sub-bookmark-dialog--hidden');
    var box = DOM.create('div', 'bili-sub-bookmark-dialog__box bili-sub-bookmark-dialog__box--light');

    var title = DOM.create('div', 'bili-sub-bookmark-dialog__title');
    var titleText = DOM.create('h2', 'bili-sub-bookmark-dialog__title-text', { textContent: '收藏' });
    var titleClose = DOM.create('button', 'bili-sub-bookmark-dialog__title-close', { textContent: '×' });
    titleClose.type = 'button';
    titleClose.title = '关闭';
    titleClose.addEventListener('click', close);
    title.appendChild(titleText);
    title.appendChild(titleClose);
    var preview = DOM.create('div', 'bili-sub-bookmark-dialog__preview');
    var noteLabel = DOM.create('label', 'bili-sub-bookmark-dialog__label', { textContent: '备注（Markdown，可粘贴图片）' });
    _noteEditor = NoteEditor.create({});
    var tagsSection = _buildTagsSection();

    var recordWrap = DOM.create('div', 'bili-sub-bookmark-dialog__record-wrap');
    var recordBtn = DOM.create('button', 'bili-sub-bookmark-dialog__btn bili-sub-bookmark-dialog__btn--record', { textContent: '录制切片' });
    recordBtn.type = 'button';
    recordBtn.title = '录制此段时间的视频到本地（需保持标签页在前台）';
    var recordStatus = DOM.create('span', 'bili-sub-bookmark-dialog__record-status');
    recordWrap.appendChild(recordBtn);
    recordWrap.appendChild(recordStatus);

    recordBtn.addEventListener('click', function () {
      if (!_pendingData || !ClipService || !ClipService.requestClip) return;
      var v = _pendingData.video;
      var from = v.from != null ? v.from : (_pendingData.sentences[0] && _pendingData.sentences[0].from) || 0;
      var to = v.to != null ? v.to : (_pendingData.sentences[_pendingData.sentences.length - 1] && _pendingData.sentences[_pendingData.sentences.length - 1].to) || from + 10;
      recordBtn.disabled = true;
      recordStatus.textContent = '正在录制…';
      var useFresh = /重新录制/.test(recordBtn.textContent || '');
      var p = useFresh && ClipService.recordFreshClip
        ? ClipService.recordFreshClip(from, to)
        : ClipService.requestClip(from, to);
      p.then(function (result) {
        _pendingData.clipId = result.clipId;
        _pendingData.clipBlob = result.blob;
        if (_clipBlobUrl) URL.revokeObjectURL(_clipBlobUrl);
        _clipBlobUrl = URL.createObjectURL(result.blob);
        _showClipPreview(_clipBlobUrl);
        recordStatus.textContent = '已录制';
        recordBtn.disabled = false;
      }).catch(function (err) {
        recordStatus.textContent = '录制失败';
        recordBtn.disabled = false;
        _toast('录制失败：' + (err && err.message || ''));
      });
    });

    var actions = DOM.create('div', 'bili-sub-bookmark-dialog__actions');
    var cancelBtn = DOM.create('button', 'bili-sub-bookmark-dialog__btn bili-sub-bookmark-dialog__btn--secondary', { textContent: '取消' });
    var saveBtn = DOM.create('button', 'bili-sub-bookmark-dialog__btn bili-sub-bookmark-dialog__btn--primary', { textContent: '保存' });
    cancelBtn.addEventListener('click', close);
    saveBtn.addEventListener('click', _save);
    actions.appendChild(recordWrap);
    actions.appendChild(cancelBtn);
    actions.appendChild(saveBtn);

    var clipWrap = DOM.create('div', 'bili-sub-bookmark-dialog__clip-wrap');
    var clipLabel = DOM.create('label', 'bili-sub-bookmark-dialog__label', { textContent: '视频切片' });
    _clipVideo = DOM.create('video', 'bili-sub-bookmark-dialog__clip-video');
    _clipVideo.controls = true;
    _clipVideo.preload = 'metadata';
    _clipVideo.style.display = 'none';
    _clipEmpty = DOM.create('div', 'bili-sub-bookmark-dialog__clip-empty', { textContent: '暂无切片（播放时自动录制，或手动点击录制）' });
    clipWrap.appendChild(clipLabel);
    clipWrap.appendChild(_clipVideo);
    clipWrap.appendChild(_clipEmpty);

    _scrollBody = DOM.create('div', 'bili-sub-bookmark-dialog__scroll-body');
    _scrollBody.appendChild(preview);
    _scrollBody.appendChild(clipWrap);
    _scrollBody.appendChild(noteLabel);
    _scrollBody.appendChild(_noteEditor.getElement());
    _scrollBody.appendChild(tagsSection);

    _recordingPane = DOM.create('div', 'bili-sub-bookmark-dialog__recording');
    var recText = DOM.create('div', 'bili-sub-bookmark-dialog__recording-text', {
      textContent: '正在录制视频切片，请稍候…',
    });
    _recordingSentenceText = DOM.create('div', 'bili-sub-bookmark-dialog__recording-sentence');
    _recordingPane.appendChild(recText);
    _recordingPane.appendChild(_recordingSentenceText);
    _recordingPane.style.display = 'none';

    box.appendChild(title);
    box.appendChild(_recordingPane);
    box.appendChild(_scrollBody);
    box.appendChild(actions);

    _overlay.appendChild(box);

    _overlay.addEventListener('click', function (e) {
      if (e.target === _overlay) close();
    });

    _tagsInput.addEventListener('input', function () {
      _renderSuggestions(_tagsInput.value);
    });
    _tagsInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        var val = _tagsInput.value.trim();
        if (val) _addTag(val);
        _tagsInput.value = '';
        _renderSuggestions('');
      }
    });
    _tagsInput.addEventListener('focus', function () {
      _renderSuggestions(_tagsInput.value);
    });

    document.body.appendChild(_overlay);
  }

  return { open: open, close: close };
})();
