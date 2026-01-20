export function isCordova() {
  return !!window.cordova;
}

export function isIOS() {
  const ua = navigator.userAgent || "";
  return /iPad|iPhone|iPod/i.test(ua);
}

export function isAndroid() {
  const ua = navigator.userAgent || "";
  return /Android/i.test(ua);
}

/**
 * Cordova 注入时机问题：最好等 deviceready
 * 返回 true 表示确认为 Cordova 环境
 */
export function waitForDeviceReady(timeoutMs = 3000) {
  return new Promise((resolve) => {
    if (isCordova()) return resolve(true);

    let done = false;
    const timer = setTimeout(() => {
      if (!done) resolve(isCordova());
    }, timeoutMs);

    document.addEventListener(
      "deviceready",
      () => {
        done = true;
        clearTimeout(timer);
        resolve(true);
      },
      { once: true }
    );
  });
}
