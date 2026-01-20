import { showConfirmDialog, showToast } from "vant";
import { CLIENT_VERSION, CLIENT_APK } from ".././version.js";

const BASE = "http://39.105.1.189:8082";

function openExternal(url) {
  if (!url) return false;

  // Cordova 环境：跳系统浏览器
  if (window.cordova) {
    try {
      window.open(url, "_system", "location=yes");
      return true;
    } catch (e) {
      console.warn("打开失败:", e);
    }
  }

  // Web 环境：新标签页打开
  window.open(url, "_blank", "noopener,noreferrer");
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

    // 2. 核心修改：不判断 update_required，直接取 download.url
    // 参考原函数：const downloadUrl = data.download?.url || "";
    const downloadUrl = data.download?.url || "";

    if (!downloadUrl) {
      showToast("未找到下载地址");
      return;
    }

    showToast("正在跳转下载...");

    // 3. 执行跳转
    const ok = openExternal(downloadUrl);
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
  const { showLatestToast = false } = options;

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

    // ===== 已是最新版 =====
    if (!data.update_required) {
      if (showLatestToast) {
        showToast(`已是最新版（${data.latest_version || CLIENT_VERSION}），无需更新`);
      }
      return;
    }

    // ===== 有新版本 =====
    const downloadUrl = data.download?.url || "";

    const msg =
      `当前版本：${data.client_version || CLIENT_VERSION}\n` +
      `最新版本：${data.latest_version || ""}\n\n` +
      `将从 百度 下载`;

    try {
      await showConfirmDialog({
        title: "发现新版本",
        message: msg,
        confirmButtonText: "去下载",
        cancelButtonText: "稍后",
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
    const ok = openExternal(downloadUrl);
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