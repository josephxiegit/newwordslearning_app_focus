import { showConfirmDialog, showToast } from "vant";
import { CLIENT_VERSION, CLIENT_APK } from ".././version.js";
import { waitForDeviceReady } from "../runtime.js";

const BASE = "http://39.105.1.189:8082";

async function copyText(text) {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {
    console.warn("[update] clipboard.writeText failed:", e);
  }

  try {
    const input = document.createElement("textarea");
    input.value = text;
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.focus();
    input.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(input);
    return ok;
  } catch (e) {
    console.warn("[update] execCommand copy failed:", e);
    return false;
  }
}

function bindCopyLink(copyId, text) {
  let retry = 0;
  const timer = setInterval(() => {
    const el = document.getElementById(copyId);
    if (!el) {
      retry += 1;
      if (retry > 20) clearInterval(timer);
      return;
    }
    clearInterval(timer);
    el.addEventListener("click", async () => {
      const ok = await copyText(text);
      if (ok) {
        showToast("链接已复制，可粘贴到浏览器或百度网盘 App");
      } else {
        showToast("复制失败，请手动长按复制");
      }
    });
  }, 100);
}

function normalizeExternalUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  return `https://${raw}`;
}

async function openExternal(url) {
  const targetUrl = normalizeExternalUrl(url);
  if (!targetUrl) return false;
  console.log("[update] openExternal input:", url);
  console.log("[update] openExternal normalized:", targetUrl);

  if (window.cordova) {
    console.log("[update] window.cordova detected, waiting deviceready...");
    await waitForDeviceReady(5000);
  }

  try {
    console.log("[update] cordova exists:", !!window.cordova);
    console.log(
      "[update] InAppBrowser.open exists:",
      !!window?.cordova?.InAppBrowser &&
      typeof window?.cordova?.InAppBrowser?.open === "function"
    );

    if (
      window.cordova &&
      window.cordova.InAppBrowser &&
      typeof window.cordova.InAppBrowser.open === "function"
    ) {
      console.log("[update] using cordova.InAppBrowser.open(_system)");
      window.cordova.InAppBrowser.open(targetUrl, "_system", "location=yes");
      return true;
    }

    if (window.cordova) {
      console.log("[update] fallback window.open(_system)");
      window.open(targetUrl, "_system", "location=yes");
      return true;
    }
  } catch (e) {
    console.warn("openExternal 失败：", e);
  }

  console.log("[update] fallback web window.open(_blank)");
  window.open(targetUrl, "_blank", "noopener,noreferrer");
  return true;
}

/**
 * 打开 Gitee 仓库创建发行版
 * 从后端获取 Gitee 地址，然后跳出 App 打开系统浏览器
 */
/**
 * 打开百度网盘下载 (原 openGiteeRepo)
 * 逻辑：从后端获取链接 -> 跳出 App 打开系统浏览器
 */
/**
 * 直接获取下载链接并跳转（不比对版本）
 * 复用 checkApkUpdate 的接口逻辑
 */
export async function openDirectDownload() {
  try {
    // 1. 完全复用 checkApkUpdate 的地址构造
    // 虽然是无脑下载，但为了接口正常返回，还是带上当前的参数
    const url =
      `${BASE}/app/update-check` +
      `?cv=${encodeURIComponent(CLIENT_VERSION)}` +
      `&apk=${encodeURIComponent(CLIENT_APK)}`;

    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) {
      showToast("获取配置失败");
      return;
    }

    const data = await res.json();
    console.log("[update] openDirectDownload response:", data);

    // 2. 核心修改：不判断 update_required，直接取 download.url
    // 参考原函数：const downloadUrl = data.download?.url || "";
    const downloadUrl = data.download?.url || "";
    console.log("[update] openDirectDownload downloadUrl:", downloadUrl);

    if (!downloadUrl) {
      showToast("未找到下载地址");
      return;
    }

    showToast("正在跳转下载...");

    // 3. 执行跳转
    const ok = await openExternal(downloadUrl);
    if (!ok) {
      showToast("跳转失败，请手动复制链接");
    }

  } catch (e) {
    console.warn("直接下载异常:", e);
    showToast("获取下载地址异常");
  }
}

/**
 * 检查更新
 * @param {Object} options
 * @param {boolean} options.showLatestToast
 */
export async function checkApkUpdate(options = {}) {
  const { showLatestToast = false, forceUpdate = false } = options;

  try {
    const url =
      `${BASE}/app/update-check` +
      `?cv=${encodeURIComponent(CLIENT_VERSION)}` +
      `&apk=${encodeURIComponent(CLIENT_APK)}`;

    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn("更新检查失败:", res.status);
      showToast("更新检查失败，请稍后重试");
      return;
    }

    const data = await res.json();
    console.log("[update] checkApkUpdate response:", data);

    // ===== 已是最新版 =====
    if (!data.update_required) {
      if (showLatestToast) {
        showToast(`已是最新版（${data.latest_version || CLIENT_VERSION}），无需更新`);
      }
      return;
    }

    // ===== 有新版本 =====
    const downloadUrl = data.download?.url || "";
    console.log("[update] checkApkUpdate downloadUrl:", downloadUrl);

    let extractCode = "";
    try {
      extractCode = new URL(downloadUrl).searchParams.get("pwd") || "";
    } catch (e) {
      console.warn("[update] parse extract code failed:", e);
    }
    const copyTextValue = extractCode
      ? `${downloadUrl} 提取码: ${extractCode}`
      : downloadUrl;
    const copyId = `update-copy-link-${Date.now()}`;
    const msg =
      (forceUpdate
        ? `<div style="color:#ee0a24;font-weight:bold;margin-bottom:8px;">⚠️ 重要更新，必须升级后才能继续使用</div>`
        : "") +
      `当前版本：${data.client_version || CLIENT_VERSION}\n` +
      `最新版本：${data.latest_version || ""}\n\n` +
      `将从 百度 下载\n\n` +
      `<div style="font-size:12px;line-height:1.5;word-break:break-all;">
链接: ${downloadUrl}<br/>
提取码: ${extractCode || "（未识别）"}<br/>
<span id="${copyId}" style="color:#1989fa;text-decoration:underline;cursor:pointer;">点击这里复制链接和提取码</span>
</div>`;

    try {
      bindCopyLink(copyId, copyTextValue);
      await showConfirmDialog({
        title: "发现新版本",
        message: msg,
        allowHtml: true,
        confirmButtonText: "去下载",
        cancelButtonText: "稍后",
        showCancelButton: !forceUpdate,   // forceUpdate=true 时隐藏「稍后」按钮
        closeOnClickOverlay: !forceUpdate, // 同时禁止点蒙层关闭
        className: "update-dialog",
      });
    } catch {
      // 用户点了「稍后」
      return;
    }

    // ===== 用户确认去下载 =====
    if (!downloadUrl) {
      showToast("未获取到下载链接");
      return;
    }

    // 跳出 App，用系统浏览器打开下载链接
    const ok = await openExternal(downloadUrl);
    if (!ok) {
      showToast("打开下载链接失败，请检查网络");
    } else {
      showToast("已跳转到系统浏览器");
    }
  } catch (e) {
    console.warn("更新检查异常：", e);
    showToast("更新检查异常，请稍后重试");
  }
}
