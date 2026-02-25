window.BiliSub = window.BiliSub || {};

window.BiliSub.Constants = {
  EVENTS: {
    SUBTITLE_DATA: 'bili-subtitle-data',
    SUBTITLE_UPDATED: 'bili-sub-updated',
    LANGUAGE_CHANGED: 'bili-sub-lang-changed',
    SEEK_TO: 'bili-sub-seek',
    PANEL_TOGGLE: 'bili-sub-panel-toggle',
  },

  LANG_NAMES: {
    zh: '中文',
    en: 'English',
    ja: '日本語',
    ko: '한국어',
    es: 'Español',
    fr: 'Français',
    de: 'Deutsch',
    ru: 'Русский',
    pt: 'Português',
    th: 'ไทย',
    vi: 'Tiếng Việt',
    id: 'Bahasa',
    ar: 'العربية',
  },

  SELECTORS: {
    VIDEO: 'video',
    PLAYER_CONTAINER: '.bpx-player-container',
    VIDEO_WRAPPER: '#bilibili-player',
  },

  STORAGE_KEYS: {
    SELECTED_LANGS: 'bili-sub-selected-langs',
    PANEL_POSITION: 'bili-sub-panel-pos',
    PANEL_COLLAPSED: 'bili-sub-panel-collapsed',
  },

  AUTO_SCROLL_DELAY: 3000,
  HIGHLIGHT_UPDATE_INTERVAL: 250,
  PANEL_DEFAULT_WIDTH: 380,
  PANEL_DEFAULT_HEIGHT: 500,
};
