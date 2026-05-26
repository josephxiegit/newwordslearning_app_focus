<template>
  <div class="game-wrapper">
    <div class="header">
      <div>
        <div class="title">单词连线</div>
        <div class="subtitle">{{ subtitleText }}</div>
      </div>
      <div class="stats">
        <div class="stat">
          进度 <span class="stat-val">{{ wordsDone }}/{{ totalWords }}</span>
        </div>
        <div class="stat err">
          错误 <span class="stat-val">{{ errorCount }}</span>
        </div>
      </div>
    </div>

    <div class="pbar-wrap">
      <div
        class="pbar"
        :style="{
          width: Math.min(100, Math.round((errorCount / 5) * 100)) + '%',
        }"
      ></div>
    </div>

    <div v-if="gameComplete" class="cn-area victory-area">
      <div class="victory-inner">
        <h2>全部完成！</h2>
        <p>
          共答错 <strong>{{ errorCount }}</strong> 次，完成
          {{ totalWords }} 个单词
        </p>
        <button class="restart-btn" @click="initGame">再来一次</button>
      </div>
    </div>

    <div v-else class="cn-area" ref="cnArea">
      <div
        v-for="pill in visiblePills"
        :key="pill.id"
        class="cn-pill"
        :class="[
          pill.animClass,
          { matched: pill.state === 'pending', wrong: pill.isWrong },
        ]"
        :style="{ left: pill.x + 'px', top: pill.y + 'px' }"
        @click="selectRight(pill.id)"
      >
        {{ pill.chinese }}
      </div>
    </div>

    <div v-if="!gameComplete" class="en-row">
      <div
        v-for="card in leftCards"
        :key="card.wordId"
        class="en-card"
        :class="enCardClass(card)"
        @click="selectLeft(card.wordId)"
      >
        <span class="en-word">{{ card.english }}</span>
        <span class="en-count">
          {{
            card.groupSize > 1
              ? `${card.groupSize - card.pending}/${card.groupSize} 个答案`
              : "1 个答案"
          }}
        </span>
      </div>
    </div>

    <div
      class="feedback-overlay"
      v-if="showAnim"
      :class="{ 'warning-mode': isWarningOverlay }"
    >
      <div class="feedback-content">
        <img :key="animKey" :src="currentAnim" alt="feedback animation" />

        <div v-if="isWarningOverlay" class="warning-box">
          <p class="warning-text">注意：再错一次，将结束本次挑战</p>
          <button class="warning-btn" @click="dismissWarning">确 定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, inject } from "vue";
import { useRouter } from "vue-router";
import {
  showDialog,
  showConfirmDialog,
  showLoadingToast,
  showToast,
} from "vant";
import axios from "axios";

// 导入你的资源
import matchgameVictoryGoatandWolf from "../assets/matchgameVictoryGoatandWolf.gif";
import matchgameFailGoatandWolf from "../assets/matchgameFailGoatandWolf.gif";
import matchgameVictoryBears from "../assets/Boonie Bears/matchgameVictoryBears.gif";
import matchgameFailBears from "../assets/Boonie Bears/matchgameFailBears.gif";
import matchgameWarningGoatandWolf from "../assets/matchgameWarningGoatandWolf.gif";
import matchgameWarningBears from "../assets/Boonie Bears/matchgameWarningBears.gif";

import turnfailSound from "../assets/sound/turnfail.mp3";
import successSound from "../assets/sound/success.mp3";

// 实例化 router
const router = useRouter();

// 注入主题标志
const flagTheme = inject("flagTheme", ref(1));

// 🔥 用户名，从路由 state 提取，请确保前置页面跳转时携带了 username
const username = ref(
  (history.state?.username || sessionStorage.getItem("username") || "")
    .replace(/"/g, "")
    .trim() // 去掉多余空格
);
console.log("username:", username.value);

// ── 音效与动效状态 ─────────────────────────────────────────────────────────────
const showAnim = ref(false);
const currentAnim = ref("");
let animTimer = null;

// 🔥 新增：控制是否显示警告强制确认面板
const isWarningOverlay = ref(false);

// 🔥 单词发音相关状态
const audioCache = new Map();
let currentPronunciationAudio = null;

// 🔥 统计记录数据对象
const wordStats = {};

// 辅助函数：将 Base64 转换为 Blob
function base64ToBlob(base64, mimeType = "audio/mpeg") {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

// 🔥 预加载音频数据
async function preloadAudio() {
  if (rawData.length === 0) return;

  const toast = showLoadingToast({
    duration: 0,
    forbidClick: true,
    message: "加载音频...",
    loadingType: "spinner",
  });

  try {
    const wordList = rawData.map((item) => ({
      英文: item.e,
      showChinese: false,
      audio: null,
    }));

    let params = new URLSearchParams();
    params.append("method", "getAudioList");
    params.append("word_list", JSON.stringify(wordList));
    const response = await axios.post("words/", params);

    if (response.data && response.data.success && response.data.audio_data) {
      Object.entries(response.data.audio_data).forEach(([word, obj]) => {
        try {
          const blob = base64ToBlob(obj.data, "audio/mpeg");
          const url = URL.createObjectURL(blob);
          audioCache.set(word, url);
        } catch (err) {
          console.warn(`音频转换失败: ${word}`, err);
        }
      });
    }

    if (response.data.failed_words && response.data.failed_words.length > 0) {
      console.warn("部分音频加载失败:", response.data.failed_words);
    }
  } catch (error) {
    console.error("加载音频数据请求出错", error);
  } finally {
    toast.close();
  }
}

// 🔥 播放单词发音
function playPronunciation(word) {
  if (currentPronunciationAudio) {
    currentPronunciationAudio.pause();
    currentPronunciationAudio.currentTime = 0;
  }

  const audioUrl = audioCache.get(word);
  if (audioUrl) {
    currentPronunciationAudio = new Audio(audioUrl);
    currentPronunciationAudio.play().catch((err) => {
      console.warn("单词发音播放失败", err);
    });
  }
}

// 🔥 新增：用于强制刷新 GIF 的 Key
const animKey = ref(0);

function triggerFeedback(isCorrect, isWarning = false) {
  let baseAnimSrc = "";
  if (isWarning) {
    baseAnimSrc = flagTheme.value == 1 ? matchgameWarningGoatandWolf : matchgameWarningBears;
  } else {
    if (flagTheme.value == 1) {
      baseAnimSrc = isCorrect ? matchgameVictoryGoatandWolf : matchgameFailGoatandWolf;
    } else {
      baseAnimSrc = isCorrect ? matchgameVictoryBears : matchgameFailBears;
    }
  }

  // 🌟 1. 释放上一次播放的 Blob 内存，防止手机内存泄漏崩溃
  if (currentBlobUrl && currentBlobUrl.startsWith("blob:")) {
    URL.revokeObjectURL(currentBlobUrl);
  }

  // 🌟 2. 从内存池中取出 Blob，生成全新的本地 URL，实现完美重新播放
  const blobData = gifBlobs.get(baseAnimSrc);
  if (blobData instanceof Blob) {
    currentBlobUrl = URL.createObjectURL(blobData);
    currentAnim.value = currentBlobUrl;
  } else if (typeof blobData === "string") {
    currentAnim.value = blobData; // 如果 Vite 打包成了 base64，直接用
  } else {
    // 兜底：如果还没加载完就触发了，退回老方法
    currentAnim.value = baseAnimSrc + "?t=" + Date.now(); 
  }

  animKey.value++; // 强制 Vue 销毁并重建 <img>

  // 显示反馈面板
  showAnim.value = true;
  isWarningOverlay.value = isWarning;

  // 倒计时隐藏逻辑
  if (animTimer) clearTimeout(animTimer);
  if (!isWarning) {
    animTimer = setTimeout(() => {
      showAnim.value = false;
    }, 1200);
  }
}

// 🔥 新增：用户手动关闭警告面板
function dismissWarning() {
  showAnim.value = false;
  isWarningOverlay.value = false;
}

function onAnimLoad() {
  // 图片真正加载并渲染完毕后，才开始 1 秒的倒计时
  if (!isWarningOverlay.value) {
    if (animTimer) clearTimeout(animTimer);
    animTimer = setTimeout(() => {
      showAnim.value = false;
    }, 1000);
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────
const PILL_W = 86,
  PILL_H = 34,
  PAD = 6;

// ── State ─────────────────────────────────────────────────────────────────────
const cnArea = ref(null);
const pool = ref([]);
const leftCards = ref([]);
const rightCards = ref([]);
const selectedLeft = ref(null);
const errorCount = ref(0);
const wordsDone = ref(0);
const gameComplete = ref(false);
const multiState = ref(null);

const totalWords = ref(0);
let rawData = [];

// ── Computed ──────────────────────────────────────────────────────────────────
const visiblePills = computed(() =>
  rightCards.value.filter((c) => c.state !== "done")
);

const subtitleText = computed(() => {
  if (multiState.value)
    return `多选进行中：还需选 ${
      multiState.value.total - multiState.value.matched
    } 个（再次点击英文可取消）`;
  if (selectedLeft.value)
    return `已选「${selectedLeft.value.english}」→ 点上方对应中文；再次点击可取消`;
  return "选择下方英文，再点击上方对应中文";
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getAreaSize() {
  const el = cnArea.value;
  return { w: el ? el.clientWidth : 300, h: el ? el.clientHeight : 300 };
}

function placeNew(existing) {
  const { w, h } = getAreaSize();
  const halfW = PILL_W / 2 + PAD,
    halfH = PILL_H / 2 + PAD;

  const minX = halfW;
  const maxX = Math.max(minX, w - halfW);
  const minY = halfH;
  const maxY = Math.max(minY, h - halfH);

  const placed = Object.values(existing);

  for (let t = 0; t < 300; t++) {
    const x = minX + Math.random() * (maxX - minX);
    const y = minY + Math.random() * (maxY - minY);
    let ok = true;
    for (const p of placed) {
      if (
        Math.abs(p.x - x) < PILL_W + PAD &&
        Math.abs(p.y - y) < PILL_H + PAD
      ) {
        ok = false;
        break;
      }
    }
    if (ok) return { x: Math.round(x), y: Math.round(y) };
  }

  for (let t = 0; t < 200; t++) {
    const x = minX + Math.random() * (maxX - minX);
    const y = minY + Math.random() * (maxY - minY);
    let ok = true;
    for (const p of placed) {
      if (
        Math.abs(p.x - x) < PILL_W * 0.8 &&
        Math.abs(p.y - y) < PILL_H * 0.8
      ) {
        ok = false;
        break;
      }
    }
    if (ok) return { x: Math.round(x), y: Math.round(y) };
  }

  return {
    x: Math.round(minX + Math.random() * (maxX - minX)),
    y: Math.round(minY + Math.random() * (maxY - minY)),
  };
}

function assignPositions(cards) {
  const existing = {};
  cards.forEach((c) => {
    if (c.x) existing[c.id] = { x: c.x, y: c.y };
  });
  cards.forEach((c) => {
    if (!c.x) {
      const pos = placeNew(existing);
      c.x = pos.x;
      c.y = pos.y;
      existing[c.id] = pos;
    }
  });
}

function enCardClass(card) {
  const isActive =
    selectedLeft.value && selectedLeft.value.wordId === card.wordId;
  if (isActive) return multiState.value ? "partial" : "selected";
  return card.state;
}

// ── Game logic ────────────────────────────────────────────────────────────────
function loadWordsData() {
  try {
    const passedWords = history.state?.words
      ? JSON.parse(history.state.words)
      : [];

    if (!passedWords || passedWords.length === 0) {
      router.replace("/studentAccountList");
      return false;
    }

    rawData = passedWords.map((item) => {
      const e = item["英文"];
      const a = item["答案"];
      const t = item["times"] || 1;

      // 🔥 初始化此单词的点击记录
      wordStats[e] = {
        英文: e,
        中文: a,
        次数: t,
        flag: false, // 初始状态为无错误
      };

      return { e, a, t };
    });

    rawData = shuffle(rawData);
  } catch (error) {
    console.error(error);
    router.replace("/studentAccountList");
    return false;
  }
  totalWords.value = rawData.length;
  return true;
}

function buildPool() {
  const items = [];
  rawData.forEach((d, wi) => {
    const parts = d.a.split("；").filter(Boolean);
    const count = Math.min(d.t, parts.length);
    shuffle(parts)
      .slice(0, count)
      .forEach((c, ci) => {
        items.push({
          id: `${wi}-${ci}`,
          wordId: wi,
          english: d.e,
          chinese: c,
          groupSize: count,
        });
      });
  });
  return shuffle(items);
}

function fillBoard() {
  const groups = {};
  pool.value.forEach((p) => {
    if (!groups[p.wordId]) groups[p.wordId] = [];
    groups[p.wordId].push(p);
  });
  const existingWids = new Set(leftCards.value.map((c) => c.wordId));
  const needed = 6 - leftCards.value.length;
  const newRight = [];

  Object.values(groups)
    .filter((g) => !existingWids.has(g[0].wordId))
    .slice(0, needed)
    .forEach((g) => {
      leftCards.value.push({
        wordId: g[0].wordId,
        english: g[0].english,
        groupSize: g[0].groupSize,
        pending: g.length,
        state: "idle",
      });
      g.forEach((item) =>
        newRight.push({
          id: item.id,
          wordId: item.wordId,
          chinese: item.chinese,
          state: "idle",
          isWrong: false,
          x: 0,
          y: 0,
          animClass: "fly-in",
        })
      );
    });

  rightCards.value.push(...newRight);
  nextTick(() => {
    assignPositions(rightCards.value.filter((c) => c.state !== "done"));
  });
}

// 初始化游戏
async function initGame() {
  if (rawData.length === 0 || gameComplete.value) {
    const loaded = loadWordsData();
    if (!loaded) return;

    await preloadAudio();
  }

  pool.value = buildPool();
  leftCards.value = [];
  rightCards.value = [];
  selectedLeft.value = null;
  errorCount.value = 0;
  wordsDone.value = 0;
  gameComplete.value = false;
  multiState.value = null;
  nextTick(() => fillBoard());
}

// 🔥 提交成绩到后端
async function submitMatchResult() {
  try {
    const logArray = Object.values(wordStats);
    const token =
      new Date().getTime().toString() + Math.floor(Math.random() * 1000);
    let params = new URLSearchParams();
    params.append("method", "submitMatchGameLog");
    params.append("username", username.value);
    params.append("log", JSON.stringify(logArray));
    params.append("submittoken", token);

    const response = await axios.post("words/", params);
    console.log("成绩提交成功", response.data);
  } catch (error) {
    console.error("提交连线成绩失败", error);
  }
}

function cancelSelection() {
  if (!selectedLeft.value) return;
  rightCards.value.forEach((c) => {
    if (c.state === "pending") c.state = "idle";
  });
  if (
    multiState.value &&
    multiState.value.wordId === selectedLeft.value.wordId
  ) {
    selectedLeft.value.pending += multiState.value.matched;
    multiState.value = null;
  }
  selectedLeft.value.state = "idle";
  selectedLeft.value = null;
}

function selectLeft(wid) {
  const card = leftCards.value.find((c) => c.wordId === wid);
  if (!card || card.state === "correct") return;

  playPronunciation(card.english);

  if (selectedLeft.value && selectedLeft.value.wordId === wid) {
    cancelSelection();
    return;
  }
  if (selectedLeft.value) cancelSelection();
  selectedLeft.value = card;
  card.state = "selected";
}

function selectRight(id) {
  if (!selectedLeft.value) return;
  const rc = rightCards.value.find((c) => c.id === id);
  if (!rc || rc.state === "done" || rc.state === "pending") return;
  const lc = selectedLeft.value;

  // 🔥 【新增逻辑：跨词同义替换】
  // 如果当前点击的中文卡片不属于选中的英文单词，
  // 但它身上的中文内容，恰好是选中英文单词需要的（且那个需要的卡片还在场上 idle），就互换它们的身份！
  if (rc.wordId !== lc.wordId) {
    const targetRc = rightCards.value.find(
      (c) => c.wordId === lc.wordId && c.chinese === rc.chinese && c.state === "idle"
    );
    if (targetRc) {
      // 🌟 核心修正：只互换底层的从属关系 (wordId)，绝对不能互换卡片 id！
      // 这样 Vue 渲染就不会乱跳，完美完成“移花接木”
      const tempWordId = rc.wordId;
      rc.wordId = targetRc.wordId;
      targetRc.wordId = tempWordId;
    }
  }
  // 🔥 新增逻辑结束

  if (rc.wordId === lc.wordId) {
    rc.state = "pending";
    lc.pending--;

    if (lc.groupSize > 1) {
      if (!multiState.value)
        multiState.value = {
          wordId: lc.wordId,
          matched: 1,
          total: lc.groupSize,
        };
      else multiState.value.matched++;
    }

    if (lc.pending === 0) {
      // ✅ 和能用的组件写法完全一样
      const audioSuccessPage = new Audio(successSound);
      audioSuccessPage.play().catch((err) => {
        console.warn("播放失败：", err);
      });

      triggerFeedback(true);

      rightCards.value.forEach((c) => {
        if (c.state === "pending") c.state = "done";
      });
      lc.state = "correct";
      multiState.value = null;
      selectedLeft.value = null;
      wordsDone.value++;
      pool.value = pool.value.filter((p) => p.wordId !== lc.wordId);

      rightCards.value
        .filter((c) => c.state === "done")
        .forEach((c) => {
          c.animClass = "fly-out";
        });

      setTimeout(() => {
        rightCards.value = rightCards.value.filter((c) => c.state !== "done");
        leftCards.value = leftCards.value.filter((c) => c.wordId !== lc.wordId);

        if (leftCards.value.length === 0 && pool.value.length === 0) {
          gameComplete.value = true;
          submitMatchResult();
          setTimeout(() => {
            showDialog({
              title: "恭喜你！",
              message: "完成全部连线！20天后见！",
              confirmButtonText: "确定",
              theme: "round-button",
            }).then(() => {
              router.replace("/studentAccountList");
            });
          }, 100);
          return;
        }
        fillBoard();
      }, 400);
    } else {
      lc.state = "partial";
    }
  } else {
    // ❌ 和能用的组件写法完全一样
    const audioFailPage = new Audio(turnfailSound);
    audioFailPage.play().catch((err) => {
      console.warn("播放失败：", err);
    });

    errorCount.value++;

    if (errorCount.value === 4) {
      triggerFeedback(false, true);
    } else if (errorCount.value < 5) {
      triggerFeedback(false);
    }

    const prev = lc.state;
    lc.state = "wrong";
    rc.isWrong = true;

    if (wordStats[lc.english]) {
      wordStats[lc.english].flag = true;
    }

    if (errorCount.value >= 5) {
      setTimeout(() => {
        showDialog({
          title: "警告⚠️",
          message: "错误已达 5 次，挑战结束！",
        }).then(() => {
          router.replace("/studentAccountList");
        });
      }, 100);
      return;
    }

    setTimeout(() => {
      lc.state = prev;
      rc.state = "idle";
      rc.isWrong = false;
    }, 600);
  }
}


let hiddenAt = 0;
let leftByRoute = false;
let pendingLeaveMark = false;
const IGNORE_HIDDEN_MS = 6 * 1000;

async function onVisibilityChange() {
  if (document.visibilityState === "hidden") {
    hiddenAt = Date.now();
    pendingLeaveMark = true;
  } else if (document.visibilityState === "visible") {
    if (!pendingLeaveMark) return;
    const hiddenDuration = Date.now() - hiddenAt;
    pendingLeaveMark = false;
  }
}

// 防止页面下拉刷新
let startY = 0;
let triggered = false;

const onTouchStart = (e) => {
  startY = e.touches[0].clientY;
  triggered = false;
};
const onTouchMove = (e) => {
  const currentY = e.touches[0].clientY;
  const deltaY = currentY - startY;

  // 条件：页面在最顶部 + 向下拉
  if (window.scrollY === 0 && deltaY > 15 && !triggered) {
    triggered = true;

    // 关键：阻止浏览器下拉刷新
    e.preventDefault();

    showConfirmDialog({
      title: "提示",
      message: "刷新将重新挑战，是否确认？",
      confirmButtonText: "确认刷新",
      cancelButtonText: "取消",
    })
      .then(() => {
        window.location.reload();
      })
      .catch(() => {
        // 什么都不做，留在页面
      });
  }
};

const handleBeforeUnload = (e) => {
  e.preventDefault();
  e.returnValue = "";
};

// 状态：用于在内存中存储 GIF 的二进制数据
const gifBlobs = new Map();
let currentBlobUrl = null; // 记录当前正在播放的 Blob URL，用完需要释放

// 终极预加载函数：将 GIF 抓取到内存中变成 Blob
async function preloadGifsToBlobs(imageUrls) {
  for (const url of imageUrls) {
    try {
      // 如果 Vite 打包时将小图片转成了 base64，直接存
      if (url.startsWith("data:")) {
        gifBlobs.set(url, url);
        continue;
      }
      // 将图片拉取到本地内存
      const response = await fetch(url);
      const blob = await response.blob();
      gifBlobs.set(url, blob);
    } catch (e) {
      console.warn("GIF 预加载到内存失败", url, e);
    }
  }
}

// ── 生命周期钩子 ───────────────────────────────────────────────────────────────
onUnmounted(() => {
  window.removeEventListener("beforeunload", handleBeforeUnload);
  document.removeEventListener("touchstart", onTouchStart);
  document.removeEventListener("touchmove", onTouchMove);
  document.removeEventListener("visibilitychange", onVisibilityChange);

  for (const url of audioCache.values()) {
    URL.revokeObjectURL(url);
  }
  audioCache.clear();
  if (currentBlobUrl && currentBlobUrl.startsWith("blob:")) {
    URL.revokeObjectURL(currentBlobUrl);
  }

});

onMounted(() => {
  document.addEventListener("touchstart", onTouchStart, { passive: false });
  document.addEventListener("touchmove", onTouchMove, { passive: false });
  document.addEventListener("visibilitychange", onVisibilityChange, {
    passive: true,
  });
  window.addEventListener("beforeunload", handleBeforeUnload);
  // 预加载 GIF
  preloadGifsToBlobs([
    matchgameVictoryGoatandWolf,
    matchgameFailGoatandWolf,
    matchgameVictoryBears,
    matchgameFailBears,
    matchgameWarningGoatandWolf,
    matchgameWarningBears,
  ]);

  initGame();
});
</script>

<style scoped>
/* CSS 样式未作任何修改，保持防溢出设定 */
.game-wrapper {
  font-family: system-ui, sans-serif;
  padding: 16px;
  box-sizing: border-box;
  width: 100vw;
  max-width: 100%;
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  margin: 0 auto;
  overflow: hidden;
}

.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
  gap: 12px;
}

.header > div:first-child {
  flex: 1;
  min-width: 0;
}

.title {
  font-size: 15px;
  font-weight: 500;
  color: #1a1a1a;
}

.subtitle {
  font-size: 12px;
  color: #888;
  margin-top: 2px;
  height: 34px;
  line-height: 17px;
  overflow: hidden;
}

.stats {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  align-items: center;
  padding-top: 0.5rem;
}

.stat {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 5px 12px;
  font-size: 12px;
  color: #888;
  border: 0.5px solid #e0e0e0;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 4px;
  line-height: 1.2;
  min-height: 28px;
}

.stat-val {
  font-weight: 500;
  color: #1a1a1a;
}
.stat.err .stat-val {
  color: #e24b4a;
}

.pbar-wrap {
  height: 3px;
  background: #f0f0f0;
  border-radius: 2px;
  margin-bottom: 14px;
}
.pbar {
  height: 100%;
  background: #1d9e75;
  border-radius: 2px;
  transition: width 0.4s ease;
}

.cn-area {
  position: relative;
  flex: 1;
  min-height: 200px;
  border: 0.5px solid #e0e0e0;
  border-radius: 12px;
  background: #fafafa;
  margin-bottom: 14px;
  overflow: hidden;
}

.cn-pill {
  position: absolute;
  background: #fff;
  border: 0.5px solid #e0e0e0;
  border-radius: 20px;
  padding: 7px 14px;
  font-size: 13px;
  color: #1a1a1a;
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
  transform: translate(-50%, -50%);
  transition: border-color 0.15s, background 0.15s, color 0.15s;
}
.cn-pill:hover {
  border-color: #bbb;
  background: #f5f5f5;
}
.cn-pill.matched {
  border-color: #1d9e75;
  background: #e1f5ee;
  color: #085041;
  pointer-events: none;
}
.cn-pill.wrong {
  border-color: #e24b4a;
  background: #fcebeb;
  color: #501313;
  animation: wag 0.4s ease;
}

@keyframes wag {
  0%,
  100% {
    transform: translate(-50%, -50%) translateX(0);
  }
  25% {
    transform: translate(-50%, -50%) translateX(-5px);
  }
  75% {
    transform: translate(-50%, -50%) translateX(5px);
  }
}
@keyframes flyIn {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.5);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}
@keyframes flyOut {
  from {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  to {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.3);
  }
}
.cn-pill.fly-in {
  animation: flyIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
.cn-pill.fly-out {
  animation: flyOut 0.3s ease forwards;
  pointer-events: none;
}

.en-row {
  flex-shrink: 0;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
  max-height: 35vh;
  overflow-y: auto;
}
.en-card {
  background: #fff;
  border: 0.5px solid #e0e0e0;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 500;
  color: #1a1a1a;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  user-select: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  flex: 1;
  min-width: 80px;
  max-width: 120px;
  text-align: center;
}
.en-card:hover {
  border-color: #bbb;
  background: #f5f5f5;
}
.en-card.selected {
  border: 2px solid #378add;
  background: #e6f1fb;
  color: #0c447c;
}
.en-card.partial {
  border: 2px solid #1d9e75;
  background: #e1f5ee;
  color: #085041;
}
.en-card.correct {
  border-color: #1d9e75;
  background: #e1f5ee;
  color: #085041;
  opacity: 0.4;
  pointer-events: none;
}
.en-card.wrong {
  border-color: #e24b4a;
  background: #fcebeb;
  color: #501313;
  animation: wagEn 0.4s ease;
}

@keyframes wagEn {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-4px);
  }
  75% {
    transform: translateX(4px);
  }
}

.en-word {
  line-height: 1.2;
}
.en-count {
  font-size: 11px;
  font-weight: 400;
  color: #aaa;
  line-height: 1;
}
.en-card.selected .en-count {
  color: #85b7eb;
}
.en-card.partial .en-count {
  color: #5dcaa5;
}
.en-card.correct .en-count {
  color: #5dcaa5;
}

.victory-area {
  display: flex;
  align-items: center;
  justify-content: center;
}
.victory-inner {
  text-align: center;
  padding: 32px 24px;
}
.victory-inner h2 {
  font-size: 20px;
  font-weight: 500;
  margin-bottom: 8px;
  color: #1a1a1a;
}
.victory-inner p {
  font-size: 14px;
  color: #888;
  margin-bottom: 20px;
}
.victory-inner p strong {
  color: #e24b4a;
}
.restart-btn {
  padding: 8px 24px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  border-radius: 8px;
  border: 0.5px solid #ccc;
  background: #fff;
  color: #1a1a1a;
  transition: background 0.15s;
}
.restart-btn:hover {
  background: #f5f5f5;
}

/* 🔥 修改反馈层，增加 dVH 适配移动端工具栏，并增加 padding 防止贴边 */
.feedback-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  height: 100dvh; /* 关键：适配移动端 Safari/微信 底部工具栏动态高度 */
  z-index: 9999;
  pointer-events: none;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: transparent;
  transition: background-color 0.3s ease;
  padding: 20px; /* 增加四周的安全距离 */
  box-sizing: border-box;
}

.feedback-overlay.warning-mode {
  pointer-events: auto;
  background-color: rgba(0, 0, 0, 0.6);
}

/* 限制内容容器不超出屏幕 */
.feedback-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-height: 100%; /* 防止被挤出屏幕外 */
  justify-content: center;
}

/* 🔥 将固定的 px 改为基于屏幕高度的比例 */
.feedback-overlay img {
  max-width: 100%; /* 防止图片宽度溢出 */
  max-height: 45vh; /* 关键：限制 GIF 最高只占屏幕 45%，给下方按钮留出充足空间 */
  width: auto;
  object-fit: contain;
  animation: popIn 0.2s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
}

/* 警告面板容器 */
.warning-box {
  margin-top: 16px; /* 间距稍微收紧 */
  background: #fff;
  padding: 20px; /* 稍微优化内边距 */
  border-radius: 16px;
  text-align: center;
  width: 100%;
  max-width: 320px; /* 限制最大宽度，在所有手机上都居中好看 */
  box-sizing: border-box;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  animation: slideUpFade 0.4s 0.2s ease forwards;
  opacity: 0;
  transform: translateY(20px);
}

.warning-text {
  color: #ee0a24;
  font-size: 16px;
  font-weight: bold;
  margin: 0 0 16px 0;
}

.warning-btn {
  background: #1d9e75;
  color: #fff;
  border: none;
  padding: 10px 48px;
  border-radius: 24px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(29, 158, 117, 0.3);
  transition: transform 0.1s, box-shadow 0.1s;
}

.warning-btn:active {
  transform: scale(0.95);
  box-shadow: 0 2px 6px rgba(29, 158, 117, 0.2);
}

@keyframes popIn {
  from {
    opacity: 0;
    transform: scale(0.6);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes slideUpFade {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>