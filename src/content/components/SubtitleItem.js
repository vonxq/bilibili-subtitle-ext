window.BiliSub = window.BiliSub || {};

window.BiliSub.SubtitleItem = (function () {
  const { DOM, Time, Constants } = window.BiliSub;

  function create(entry, selectedLangs, index) {
    const item = DOM.create('div', 'bili-sub-item');
    item.dataset.index = index;
    item.dataset.from = entry.from;
    item.dataset.to = entry.to;

    const timeEl = DOM.create('span', 'bili-sub-item__time', {
      textContent: Time.format(entry.from),
    });

    const textsEl = DOM.create('div', 'bili-sub-item__texts');

    const langsToShow =
      selectedLangs.length > 0
        ? selectedLangs.filter((l) => entry.texts[l])
        : Object.keys(entry.texts);

    langsToShow.forEach((lang, i) => {
      const textEl = DOM.create(
        'div',
        i === 0 ? 'bili-sub-item__text' : 'bili-sub-item__text bili-sub-item__text--secondary'
      );

      if (langsToShow.length > 1) {
        const langName = Constants.LANG_NAMES[lang] || lang;
        const tag = DOM.create('span', 'bili-sub-item__lang-tag', {
          textContent: lang.toUpperCase(),
        });
        tag.title = langName;
        textEl.appendChild(tag);
      }

      textEl.appendChild(document.createTextNode(entry.texts[lang]));
      textsEl.appendChild(textEl);
    });

    DOM.appendChildren(item, timeEl, textsEl);

    item.addEventListener('click', () => {
      window.dispatchEvent(
        new CustomEvent(Constants.EVENTS.SEEK_TO, { detail: entry.from })
      );
    });

    return item;
  }

  return { create };
})();
