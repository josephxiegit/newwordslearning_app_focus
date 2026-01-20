import { ref } from "vue";

/**
 * 固定 8082：
 * - 静态 mp3：/static/answerBGM.mp3
 * - 配置接口：/app/version  (你 nginx 8082 已反代到 Django 8000)
 */
const SITE_BASE = "http://39.105.1.189:8082";
const REMOTE_BGM_BASE = `${SITE_BASE}/static/answerBGM.mp3`;
const VERSION_API = `${SITE_BASE}/app/version`;

const LOCAL_BGM = "/answerBGM.mp3";

let audio = null;

const isPlaying = ref(false);
const audioUnlocked = ref(false);
const bgmVersion = ref("0"); // 从后端拿到的版本号（mtime秒级）

function buildRemoteUrl() {
  // 用版本号控制缓存命中；版本变就会强制拉新文件
  return `${REMOTE_BGM_BASE}?v=${encodeURIComponent(bgmVersion.value || "0")}`;
}

async function fetchBgmVersion() {
  try {
    const res = await fetch(VERSION_API, { method: "GET", cache: "no-store" });
    if (!res.ok) throw new Error(`version api status ${res.status}`);
    const data = await res.json();
    if (data?.bgm_version) bgmVersion.value = String(data.bgm_version);
  } catch (e) {
    // 接口失败不要影响播放，保持 bgmVersion=0 也能播（只是可能缓存不更新）
    console.warn("获取 bgm_version 失败：", e);
  }
}

function ensureAudio() {
  if (audio) return;

  audio = new Audio();
  audio.loop = true;
  audio.volume = 0.3;
  audio.preload = "auto";
}

function setSrc(url) {
  if (!audio) return;
  // 只要 url 不同就切换
  if ((audio.currentSrc || audio.src) === url) return;
  audio.pause();
  audio.src = url;
  audio.load();
}

function isUsingRemote() {
  if (!audio) return false;
  return (audio.currentSrc || audio.src).includes("/static/answerBGM.mp3");
}

async function refreshRemoteSrc() {
  // 拉最新版本号，然后更新音频 src
  await fetchBgmVersion();
  ensureAudio();
  setSrc(buildRemoteUrl());
}

/**
 * 必须由用户手势触发
 */
async function unlockAudio() {
  ensureAudio();

  if (!isUsingRemote()) {
    // 首次解锁前，优先拉一次版本并切远程
    await refreshRemoteSrc();
  }

  if (audioUnlocked.value) return true;

  try {
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    audioUnlocked.value = true;
    return true;
  } catch (err) {
    console.warn("音频解锁失败（需要用户手势触发）：", err);
    return false;
  }
}

async function playAudio() {
  ensureAudio();

  // 每次播放前都尝试切到“最新远程版本”
  // 这保证你替换服务器文件后，用户不更新客户端也能拿到新 bgm
  await refreshRemoteSrc();

  if (!audioUnlocked.value) {
    const ok = await unlockAudio();
    if (!ok) return;
  }

  try {
    await audio.play();
    isPlaying.value = true;
  } catch (err) {
    console.warn("播放失败：", err);

    // 远程失败回退本地（可选）
    console.warn("远程播放失败，回退本地");
    setSrc(LOCAL_BGM);
    try {
      await audio.play();
      isPlaying.value = true;
    } catch (e2) {
      console.warn("本地也播放失败：", e2);
    }
  }
}

function pauseAudio() {
  if (audio && isPlaying.value) {
    audio.pause();
    isPlaying.value = false;
  }
}

// 保持点击入口同步，不要 await
function toggleAudio() {
  if (isPlaying.value) pauseAudio();
  else void playAudio();
}

export function useBgm() {
  return {
    isPlayingBGM: isPlaying,
    bgmVersion,
    audioUnlocked,
    toggleAudioBGM: toggleAudio,
    playAudio,
    pauseAudioBGM: pauseAudio,
    refreshRemoteSrc, // 可选：你想手动刷新也可调用
  };
}
