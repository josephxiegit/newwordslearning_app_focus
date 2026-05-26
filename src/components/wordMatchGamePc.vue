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

import failSound from "../assets/sound/matchGameFail.mp3";
import turnfailSound from "../assets/sound/turnfail.mp3";
import victorySound from "../assets/sound/matchGameVictory.mp3";
import successSound from "../assets/sound/success.mp3";

// 实例化 router
const router = useRouter();

// 注入主题标志
const flagTheme = inject("flagTheme", ref(1));

// 🔥 用户名，从路由 state 提取
const username = ref(
  (history.state?.username || sessionStorage.getItem("username") || "")
    .replace(/"/g, "")
    .trim()
);
console.log("username:", username.value);

// ── 音效与动效状态 ─────────────────────────────────────────────────────────────
const showAnim = ref(false);
const currentAnim = ref("");
let animTimer = null;

// 控制是否显示警告强制确认面板
const isWarningOverlay = ref(false);

// 单词发音相关状态
const audioCache = new Map();
let currentPronunciationAudio = null;

// 音效 Blob URL（解决 Safari 延迟播放被拦截的问题）
let blobSuccessSoundUrl = null;
let blobTurnFailSoundUrl = null;

// 统计记录数据对象
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

// 🔥 预加载交互音效为本地 Blob (Safari 必杀技)
async function preloadLocalSounds() {
  try {
    const [succRes, failRes] = await Promise.all([
      fetch(successSound),
      fetch(turnfailSound)
    ]);
    blobSuccessSoundUrl = URL.createObjectURL(await succRes.blob());
    blobTurnFailSoundUrl = URL.createObjectURL(await failRes.blob());
  } catch (e) {
    console.warn("预加载音效 Blob 失败，回退默认:", e);
    blobSuccessSoundUrl = successSound;
    blobTurnFailSoundUrl = turnfailSound;
  }
}

// 🔥 预加载单词音频数据
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

// 用于强制刷新 GIF 的 Key
const animKey = ref(0);

// 🔥 触发反馈动画 (iOS Safari Blob 方案)
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

  // 释放上一次播放的 Blob 内存
  if (currentBlobUrl && currentBlobUrl.startsWith("blob:")) {
    URL.revokeObjectURL(currentBlobUrl);
  }

  // 从内存池中取出 Blob，生成全新的本地 URL，实现完美重新播放
  const blobData = gifBlobs.get(baseAnimSrc);
  if (blobData instanceof Blob) {
    currentBlobUrl = URL.createObjectURL(blobData);
    currentAnim.value = currentBlobUrl;
  } else if (typeof blobData === "string") {
    currentAnim.value = blobData; // base64
  } else {
    currentAnim.value = baseAnimSrc + "?t=" + Date.now(); 
  }

  animKey.value++; 

  showAnim.value = true;
  isWarningOverlay.value = isWarning;

  if (animTimer) clearTimeout(animTimer);
  if (!isWarning) {
    animTimer = setTimeout(() => {
      showAnim.value = false;
    }, 1200);
  }
}

function dismissWarning() {
  showAnim.value = false;
  isWarningOverlay.value = false;
}

// ── 布局与碰撞辅助函数 (支持大屏动态计算) ───────────────────────────────────

function getPillSize(text) {
  if (!text) return { w: 100, h: 56 };
  // 单个中文字宽约22px + 48px padding + 4px 边框 + 10px 容错余量 = 动态宽度
  const w = text.length * 22 + 62; 
  // 22px 行高 + 24px padding + 4px 边框 + 6px 容错余量 = 固定高度 56px
  const h = 56; 
  return { w, h };
}

function getAreaSize() {
  const el = cnArea.value;
  return { w: el ? el.clientWidth : 800, h: el ? el.clientHeight : 400 };
}

function placeNew(existing, currentText) {
  const { w: areaW, h: areaH } = getAreaSize();
  const { w: currentW, h: currentH } = getPillSize(currentText);
  const PAD = 10; 

  const minX = currentW / 2 + PAD;
  const maxX = Math.max(minX, areaW - currentW / 2 - PAD);
  const minY = currentH / 2 + PAD;
  const maxY = Math.max(minY, areaH - currentH / 2 - PAD);

  const placed = Object.values(existing);

  // 第一轮尝试：严格防重叠检测
  for (let t = 0; t < 300; t++) {
    const x = minX + Math.random() * (maxX - minX);
    const y = minY + Math.random() * (maxY - minY);
    let ok = true;
    for (const p of placed) {
      const { w: pW, h: pH } = getPillSize(p.text);
      if (
        Math.abs(p.x - x) < (currentW + pW) / 2 + PAD &&
        Math.abs(p.y - y) < (currentH + pH) / 2 + PAD
      ) {
        ok = false;
        break;
      }
    }
    if (ok) return { x: Math.round(x), y: Math.round(y) };
  }

  // 第二轮尝试：稍微放宽重叠限制 (0.85倍)
  for (let t = 0; t < 200; t++) {
    const x = minX + Math.random() * (maxX - minX);
    const y = minY + Math.random() * (maxY - minY);
    let ok = true;
    for (const p of placed) {
      const { w: pW, h: pH } = getPillSize(p.text);
      if (
        Math.abs(p.x - x) < ((currentW + pW) / 2) * 0.85 &&
        Math.abs(p.y - y) < ((currentH + pH) / 2) * 0.85
      ) {
        ok = false;
        break;
      }
    }
    if (ok) return { x: Math.round(x), y: Math.round(y) };
  }

  // 兜底方案
  return {
    x: Math.round(minX + Math.random() * (maxX - minX)),
    y: Math.round(minY + Math.random() * (maxY - minY)),
  };
}

function assignPositions(cards) {
  const existing = {};
  cards.forEach((c) => {
    if (c.x) existing[c.id] = { x: c.x, y: c.y, text: c.chinese };
  });
  cards.forEach((c) => {
    if (!c.x) {
      const pos = placeNew(existing, c.chinese);
      c.x = pos.x;
      c.y = pos.y;
      existing[c.id] = { x: pos.x, y: pos.y, text: c.chinese };
    }
  });
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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

      wordStats[e] = {
        英文: e,
        中文: a,
        次数: t,
        flag: false,
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

// 提交成绩
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

// ── 滑动与生命周期 ─────────────────────────────────────────────────────────────
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

// GIF Blob 存储区
const gifBlobs = new Map();
let currentBlobUrl = null; 

async function preloadGifsToBlobs(imageUrls) {
  for (const url of imageUrls) {
    try {
      if (url.startsWith("data:")) {
        gifBlobs.set(url, url);
        continue;
      }
      const response = await fetch(url);
      const blob = await response.blob();
      gifBlobs.set(url, blob);
    } catch (e) {
      console.warn("GIF 预加载到内存失败", url, e);
    }
  }
}

onUnmounted(() => {
  window.removeEventListener("beforeunload", handleBeforeUnload);
  document.removeEventListener("touchstart", onTouchStart);
  document.removeEventListener("touchmove", onTouchMove);

  for (const url of audioCache.values()) {
    URL.revokeObjectURL(url);
  }
  audioCache.clear();
  
  if (currentBlobUrl && currentBlobUrl.startsWith("blob:")) {
    URL.revokeObjectURL(currentBlobUrl);
  }
  if (blobSuccessSoundUrl && blobSuccessSoundUrl.startsWith("blob:")) {
    URL.revokeObjectURL(blobSuccessSoundUrl);
  }
  if (blobTurnFailSoundUrl && blobTurnFailSoundUrl.startsWith("blob:")) {
    URL.revokeObjectURL(blobTurnFailSoundUrl);
  }
});

onMounted(() => {
  document.addEventListener("touchstart", onTouchStart, { passive: false });
  document.addEventListener("touchmove", onTouchMove, { passive: false });
  window.addEventListener("beforeunload", handleBeforeUnload);

  // 1. 预加载本地音效 (解决 Safari 网络请求阻断问题)
  preloadLocalSounds();

  // 2. 预加载 GIF 为 Blob (解决 iOS Safari 重新渲染卡一帧问题)
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
/* 基础容器：增加留白，适配大屏 */
.game-wrapper {
  font-family: system-ui, sans-serif;
  padding: 32px 40px; 
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
  margin-bottom: 20px;
  gap: 20px;
}

.header > div:first-child {
  flex: 1;
  min-width: 0;
}

.title {
  font-size: 28px;
  font-weight: 600;
  color: #1a1a1a;
}

.subtitle {
  font-size: 18px;
  color: #888;
  margin-top: 8px;
  line-height: 1.4;
}

.stats {
  display: flex;
  gap: 16px;
  flex-shrink: 0;
  align-items: center;
  padding-top: 0.5rem;
}

.stat {
  background: #f5f5f5;
  border-radius: 12px;
  padding: 10px 20px;
  font-size: 18px;
  color: #888;
  border: 1px solid #e0e0e0;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 8px;
  line-height: 1.2;
}

.stat-val {
  font-weight: 600;
  font-size: 20px;
  color: #1a1a1a;
}
.stat.err .stat-val {
  color: #e24b4a;
}

.pbar-wrap {
  height: 6px;
  background: #f0f0f0;
  border-radius: 4px;
  margin-bottom: 24px;
}
.pbar {
  height: 100%;
  background: #1d9e75;
  border-radius: 4px;
  transition: width 0.4s ease;
}

.cn-area {
  position: relative;
  flex: 1;
  min-height: 25vh;
  border: 1px solid #e0e0e0;
  border-radius: 16px;
  background: #fafafa;
  margin-bottom: 24px;
  overflow: hidden;
}

.cn-pill {
  position: absolute;
  background: #fff;
  border: 2px solid #e0e0e0;
  border-radius: 30px;
  padding: 12px 24px;
  font-size: 22px;
  font-weight: 500;
  color: #1a1a1a;
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
  transform: translate(-50%, -50%);
  transition: border-color 0.15s, background 0.15s, color 0.15s;
  box-shadow: 0 4px 8px rgba(0,0,0,0.05);
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
  box-shadow: none;
}
.cn-pill.wrong {
  border-color: #e24b4a;
  background: #fcebeb;
  color: #501313;
  animation: wag 0.4s ease;
}

/* 🌟 1. 改为 Grid 布局，精准控制列数 */
.en-row {
  flex-shrink: 0; /* 关键：坚决不让上方的连线区把这个区域挤出屏幕 */
  display: grid;
  /* 强制设定为 3 列，每列最小 130px，最大 220px，保证均匀分布 */
  grid-template-columns: repeat(3, minmax(130px, 220px));
  gap: 16px;
  justify-content: center;
  padding-bottom: 12px;
  width: 100%;
}

/* 🌟 2. 移除旧的 flex 宽度限制，让 Grid 完全接管宽度 */
.en-card {
  background: #fff;
  border: 2px solid #e0e0e0;
  border-radius: 16px;
  padding: 16px 12px; /* 稍微缩小左右 padding，防止长单词换行 */
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, transform 0.1s;
  user-select: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  
  /* 移除原本的 flex: 1, min-width, max-width，改为 100% 撑满网格 */
  width: 100%;
  box-sizing: border-box;
  box-shadow: 0 4px 12px rgba(0,0,0,0.04);
}

/* 状态伪类保持不变 */
.en-card:hover { border-color: #bbb; background: #f5f5f5; }
.en-card:active { transform: scale(0.98); }
.en-card.selected { border: 2px solid #378add; background: #e6f1fb; color: #0c447c; }
.en-card.partial { border: 2px solid #1d9e75; background: #e1f5ee; color: #085041; }
.en-card.correct { border-color: #1d9e75; background: #e1f5ee; color: #085041; opacity: 0.5; pointer-events: none; box-shadow: none; }
.en-card.wrong { border-color: #e24b4a; background: #fcebeb; color: #501313; animation: wagEn 0.4s ease; }

/* 内部文字样式 */
.en-word { line-height: 1.2; word-break: break-word; text-align: center; }
.en-count {
  font-size: 15px;
  font-weight: 500;
  color: #aaa;
  line-height: 1;
}
.en-card.selected .en-count { color: #85b7eb; }
.en-card.partial .en-count { color: #5dcaa5; }
.en-card.correct .en-count { color: #5dcaa5; }

/* 🌟 3. 防御性设计：如果是窄屏手机竖屏，3列会挤爆，自动退化为 2 列 (3行) */
@media (max-width: 600px) {
  .en-row {
    grid-template-columns: repeat(2, minmax(120px, 1fr));
    gap: 12px;
  }
  .en-card {
    padding: 12px 8px;
    font-size: 16px;
  }
}

/* 🌟 4. 高度自适应：处理横屏/矮屏情况，确保底部不会出界 */
@media (max-height: 768px) {
  .game-wrapper {
    padding: 16px 24px;
  }
  .header {
    margin-bottom: 12px;
  }
  .cn-area {
    margin-bottom: 16px;
    min-height: 25vh; /* 允许中间的连线区被压缩，把空间让给底部按钮 */
  }
  .en-row {
    gap: 12px;
  }
  .en-card {
    padding: 12px;
    font-size: 18px; 
  }
}

.victory-area {
  display: flex;
  align-items: center;
  justify-content: center;
}
.victory-inner {
  text-align: center;
  padding: 40px;
}
.victory-inner h2 {
  font-size: 32px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #1a1a1a;
}
.victory-inner p {
  font-size: 20px;
  color: #888;
  margin-bottom: 32px;
}
.victory-inner p strong { color: #e24b4a; }

.restart-btn {
  padding: 14px 40px;
  font-size: 20px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  border-radius: 12px;
  border: 1px solid #ccc;
  background: #fff;
  color: #1a1a1a;
  transition: background 0.15s;
}
.restart-btn:hover { background: #f5f5f5; }

/* 🔥 修改反馈层：大屏防溢出适配 */
.feedback-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  height: 100dvh; /* 适配带浏览器边框的动态视口高度 */
  z-index: 9999;
  pointer-events: none;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: transparent;
  transition: background-color 0.3s ease;
  padding: 32px; /* 增加四周的安全留白 */
  box-sizing: border-box;
}
.feedback-overlay.warning-mode {
  pointer-events: auto;
  background-color: rgba(0, 0, 0, 0.6);
}

/* 限制内容容器高度，确保内部元素始终处于可见区 */
.feedback-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-height: 100%; /* 防止撑破父级 */
  justify-content: center;
}

/* 🔥 动态高度限制：无论屏幕多矮，图片最多占 45% 高度 */
.feedback-overlay img {
  max-width: 600px; /* 大屏下限制最大宽度，防止 GIF 糊掉或过大 */
  max-height: 45vh; /* 🌟 核心：高度动态限制，给下方的警告面板留足一半以上的空间 */
  width: auto;
  object-fit: contain;
  animation: popIn 0.2s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
}

/* 警告面板：大屏适度收缩边距与宽幅 */
.warning-box {
  margin-top: 24px; /* 原本是 32px，稍微缩紧一点节省垂直空间 */
  background: #fff;
  padding: 32px 48px;
  border-radius: 24px;
  text-align: center;
  width: 100%;
  max-width: 480px; /* 控制弹窗最大宽度，确保布局紧凑且居中 */
  box-sizing: border-box;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
  animation: slideUpFade 0.4s 0.2s ease forwards;
  opacity: 0;
  transform: translateY(20px);
}
.warning-text {
  color: #ee0a24;
  font-size: 24px;
  font-weight: bold;
  margin: 0 0 24px 0;
}
.warning-btn {
  background: #1d9e75;
  color: #fff;
  border: none;
  padding: 16px 64px;
  border-radius: 32px;
  font-size: 20px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(29, 158, 117, 0.3);
  transition: transform 0.1s, box-shadow 0.1s;
}
.warning-btn:active {
  transform: scale(0.95);
  box-shadow: 0 2px 6px rgba(29, 158, 117, 0.2);
}

@keyframes wag {
  0%, 100% { transform: translate(-50%, -50%) translateX(0); }
  25% { transform: translate(-50%, -50%) translateX(-8px); }
  75% { transform: translate(-50%, -50%) translateX(8px); }
}
@keyframes flyIn {
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}
@keyframes flyOut {
  from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  to { opacity: 0; transform: translate(-50%, -50%) scale(0.3); }
}
@keyframes wagEn {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-6px); }
  75% { transform: translateX(6px); }
}
@keyframes popIn {
  from { opacity: 0; transform: scale(0.6); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes slideUpFade {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-height: 768px) {
  .game-wrapper {
    padding: 16px 24px; /* 屏幕较矮时，削减四周的大留白 */
  }
  .header {
    margin-bottom: 12px; /* 紧凑头部 */
  }
  .cn-area {
    margin-bottom: 16px; /* 紧凑中下间距 */
  }
  .en-card {
    padding: 12px 16px; /* 稍微缩小卡片内边距，确保两行完美放下 */
    font-size: 18px; 
    min-width: 120px;
  }
}
</style>