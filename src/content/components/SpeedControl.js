window.BiliSub = window.BiliSub || {};

window.BiliSub.SpeedControl = (function () {
  var DOM = window.BiliSub.DOM;
  var Constants = window.BiliSub.Constants;
  var RepeaterService = window.BiliSub.RepeaterService;

  var _container = null;
  var _currentSpeed = Constants.DEFAULTS.PLAYBACK_SPEED;

  function create() {
    _container = DOM.create('div', 'bili-sub-speed');

    var label = DOM.create('span', 'bili-sub-speed__label', { textContent: 'Speed' });
    _container.appendChild(label);

    Constants.SPEED_OPTIONS.forEach(function (speed) {
      var btn = DOM.create('button', 'bili-sub-speed__btn', {
        textContent: speed + 'x',
      });
      btn.dataset.speed = speed;

      if (speed === _currentSpeed) {
        btn.classList.add('bili-sub-speed__btn--active');
      }

      btn.addEventListener('click', function () {
        setSpeed(speed);
      });

      _container.appendChild(btn);
    });

    _loadSaved();
    return _container;
  }

  function setSpeed(speed) {
    _currentSpeed = speed;
    RepeaterService.setSpeed(speed);
    _updateUI();
    _save();
  }

  function _updateUI() {
    if (!_container) return;
    _container.querySelectorAll('.bili-sub-speed__btn').forEach(function (btn) {
      var s = parseFloat(btn.dataset.speed);
      btn.classList.toggle('bili-sub-speed__btn--active', s === _currentSpeed);
    });
  }

  function _save() {
    try {
      if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [Constants.STORAGE_KEYS.PLAYBACK_SPEED]: _currentSpeed });
      }
    } catch (_) {}
  }

  function _loadSaved() {
    try {
      if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(Constants.STORAGE_KEYS.PLAYBACK_SPEED, function (result) {
          var s = result[Constants.STORAGE_KEYS.PLAYBACK_SPEED];
          if (s && Constants.SPEED_OPTIONS.includes(s)) {
            _currentSpeed = s;
            RepeaterService.setSpeed(s);
            _updateUI();
          }
        });
      }
    } catch (_) {}
  }

  return { create: create, setSpeed: setSpeed };
})();
