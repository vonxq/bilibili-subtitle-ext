window.BiliSub = window.BiliSub || {};

window.BiliSub.Time = {
  format(seconds) {
    if (typeof seconds !== 'number' || isNaN(seconds)) return '00:00';
    const total = Math.max(0, Math.floor(seconds));
    const mm = String(Math.floor(total / 60)).padStart(2, '0');
    const ss = String(total % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  },

  formatWithMs(seconds) {
    if (typeof seconds !== 'number' || isNaN(seconds)) return '00:00.000';
    const total = Math.max(0, seconds);
    const mm = String(Math.floor(total / 60)).padStart(2, '0');
    const ss = String(Math.floor(total % 60)).padStart(2, '0');
    const ms = String(Math.round((total % 1) * 1000)).padStart(3, '0');
    return `${mm}:${ss}.${ms}`;
  },
};
