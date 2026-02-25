window.BiliSub = window.BiliSub || {};

window.BiliSub.Constants = {
  EVENTS: {
    SUBTITLE_DATA: 'bili-subtitle-data',
    SUBTITLE_URLS: 'bili-subtitle-urls',
    SUBTITLE_UPDATED: 'bili-sub-updated',
    LANGUAGE_CHANGED: 'bili-sub-lang-changed',
    SEEK_TO: 'bili-sub-seek',
    PANEL_TOGGLE: 'bili-sub-panel-toggle',
    MODE_CHANGED: 'bili-sub-mode-changed',
    SETTINGS_CHANGED: 'bili-sub-settings-changed',
    REPEATER_STATE: 'bili-sub-repeater-state',
  },

  DISPLAY_MODES: {
    BILINGUAL: 'bilingual',
    LEARNING: 'learning',
    ASSISTED: 'assisted',
  },

  SUPPORTED_LANGS: ['zh', 'en', 'ja', 'es', 'ar', 'pt'],

  LANG_NAMES: {
    zh: '中文',
    en: 'English',
    ja: '日本語',
    es: 'Español',
    ar: 'العربية',
    pt: 'Português',
  },

  SELECTORS: {
    VIDEO: 'video',
    PLAYER_CONTAINER: '.bpx-player-container',
    VIDEO_WRAPPER: '#bilibili-player',
  },

  STORAGE_KEYS: {
    NATIVE_LANG: 'bili-sub-native-lang',
    TARGET_LANG: 'bili-sub-target-lang',
    DISPLAY_MODE: 'bili-sub-display-mode',
    PANEL_POSITION: 'bili-sub-panel-pos',
    PANEL_COLLAPSED: 'bili-sub-panel-collapsed',
    PLAYBACK_SPEED: 'bili-sub-speed',
    DEFAULT_MODE_STRATEGY: 'bili-sub-default-mode-strategy',
    DEFAULT_MODE: 'bili-sub-default-mode',
  },

  DEFAULTS: {
    NATIVE_LANG: 'zh',
    TARGET_LANG: 'en',
    DISPLAY_MODE: 'assisted',
    PLAYBACK_SPEED: 1,
  },

  SENTENCE: {
    MAX_MERGE_COUNT: 4,
    TIME_GAP_THRESHOLD: 1.5,
    SHORT_EN_WORDS: 3,
    SHORT_CJK_CHARS: 4,
    TERMINAL_PUNCTUATION: /[.!?。！？…]+$/,
    EN_CONNECTORS: /\b(if|and|but|because|that|which|when|while|or|so|as|to|of|the|a|an|in|on|for|with|at|by|from|not|is|are|was|were|do|does|did|has|have|had|will|would|can|could|should|shall|may|might|must|being|been|also|then|than|into|about|after|before|between|through|during|without|within|upon|over|under|like)$/i,
  },

  REPEATER: {
    LOOP_OPTIONS: [Infinity, 5],
    PAUSE_BETWEEN_LOOPS: 500,
  },

  SPEED_OPTIONS: [0.5, 0.75, 1, 1.25, 1.5],

  AUTO_SCROLL_DELAY: 3000,
  HIGHLIGHT_UPDATE_INTERVAL: 200,
  PANEL_DEFAULT_WIDTH: 400,
};
