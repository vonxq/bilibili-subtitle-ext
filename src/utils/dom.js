window.BiliSub = window.BiliSub || {};

window.BiliSub.DOM = {
  create(tag, className, attrs) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (attrs) {
      Object.entries(attrs).forEach(([key, val]) => {
        if (key === 'textContent') el.textContent = val;
        else if (key === 'innerHTML') el.innerHTML = val;
        else el.setAttribute(key, val);
      });
    }
    return el;
  },

  appendChildren(parent, ...children) {
    children.forEach((child) => {
      if (child) parent.appendChild(child);
    });
    return parent;
  },

  onEvent(target, event, handler) {
    target.addEventListener(event, handler);
    return () => target.removeEventListener(event, handler);
  },

  injectPageScript(url) {
    const script = document.createElement('script');
    script.src = url;
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
  },

  waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(selector);
      if (existing) return resolve(existing);

      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });

      observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true,
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Timeout waiting for ${selector}`));
      }, timeout);
    });
  },
};
