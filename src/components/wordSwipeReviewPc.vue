<template>
  <div class="word-swipe-container">
    <!-- 顶部导航栏 -->
    <div class="top-nav">
      <div class="nav-content">
        <span class="nav-title">{{ title }}</span>
        <span class="nav-username">{{ username }}</span>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
    <!-- 左侧控制区 -->
    <div class="left-control-area">
      <!-- 进度条 -->
      <div class="progress-wrapper">
        <div class="progress-info">
          <span
            >{{
              currentIndex >= cards.length ? cards.length : currentIndex + 1
            }}
            / {{ cards.length }}</span
          >
          <span>不认识: {{ unknownWords.length }}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div v-if="currentIndex < cards.length" class="action-buttons">
        <div class="button-row">
          <button
            @click="handleUnknown"
            class="action-btn unknown-btn"
            :disabled="isLocked"
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <span class="button-label">不认识</span>
        </div>
        <div class="button-row">
          <button
            @click="handleKnow"
            class="action-btn know-btn"
            :disabled="isLocked"
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
            >
              <path
                d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
              ></path>
            </svg>
          </button>
          <span class="button-label">认识</span>
        </div>
      </div>
    </div>

    <!-- 右侧卡片区域 -->
    <div class="right-card-area">
      <!-- 完成页面 -->
      <div v-if="currentIndex >= cards.length" class="completion-screen">
        <div class="completion-card">

          <div class="unknown-count">
            <p class="count-label">需要复习的单词</p>
            <div class="count-number">{{ unknownWords.length }}</div>
          </div>

          <div v-if="unknownWords.length > 0" class="unknown-list">
            <div
              v-for="(word, idx) in unknownWords"
              :key="idx"
              class="unknown-item"
            >
              <div class="unknown-english">{{ word.英文 }}</div>
              <div class="unknown-answer">{{ word.中文 }}</div>
            </div>
          </div>

          <van-button 
              type="primary" 
              round 
              @click="finishCards" 
              :disabled="isSubmitting" 
              size="large"
              
            >完成复习</van-button
          >
        </div>
      </div>

      <!-- 卡片区域 -->
      <div v-else class="cards-wrapper">
        <!-- 下一张卡片预览 -->
        <div v-if="currentIndex + 1 < cards.length" class="card-preview"></div>

        <!-- 当前卡片 -->
        <div
          ref="cardRef"
          class="card"
          :class="{ dragging: isDragging, locked: isLocked }"
          :style="cardStyle"
          @mousedown="handleDragStart"
          @mousemove="handleDragMove"
          @mouseup="handleDragEnd"
          @mouseleave="handleDragEnd"
          @touchstart="handleDragStart"
          @touchmove="handleDragMove"
          @touchend="handleDragEnd"
        >
          <!-- 滑动提示 -->
          <div class="swipe-hint left" :style="{ opacity: leftHintOpacity }">
            不认识
          </div>
          <div class="swipe-hint right" :style="{ opacity: rightHintOpacity }">
            认识
          </div>

          <!-- 卡片内容 -->
          <div class="card-content">
            <div class="english-text">{{ currentCard.英文 }}</div>
            <div class="answer-text">
              {{ currentCard.中文 }}
            </div>
          </div>

          <!-- 提示文字 -->
          <div class="tap-hint">上下滑动或点击按钮选择</div>
        </div>
      </div>
    </div>
    </div>

    <!-- 鼓励动画 -->
    <img
      v-if="showEncouragement"
      :src="srcswipeEncouragement"
      alt="鼓励动画"
      class="encouragement-overlay"
      style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 999;
        pointer-events: none;
      "
    />

    <!-- 滑动提示动画 -->
    <div v-if="showSwipeTutorial" class="swipe-tutorial-overlay">
      <div class="tutorial-content">
        <!-- 模拟卡片 -->
        <div class="tutorial-card-wrapper">
          <div class="tutorial-card">
            <div class="tutorial-card-text">单词</div>
          </div>
        </div>

        <div class="tutorial-arrows">
          <div class="arrow-left">
            <svg
              width="60"
              height="60"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ef4444"
              stroke-width="2"
            >
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span class="arrow-text left-text">不认识</span>
          </div>
          <div class="arrow-right">
            <svg
              width="60"
              height="60"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#10b981"
              stroke-width="2"
            >
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
            <span class="arrow-text right-text">认识</span>
          </div>
        </div>
        <p class="tutorial-hint">左右滑动卡片进行选择</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject, onUnmounted } from "vue";
import { showLoadingToast, showConfirmDialog, showFailToast } from "vant";
import axios from "axios";
import turnpage from "../assets/sound/turnpage.mp3";
import halfencouragement from "../assets/sound/goodjob.mp3";
import goodjob1 from "../assets/goodjob.gif";
import goodjob2 from "../assets/Boonie Bears/goodjob.gif";
import { useRouter } from "vue-router";

const router = useRouter();
const flagTheme = inject("flagTheme");
const cards = ref([]);
const currentIndex = ref(0);
const answers = ref([]);
const unknownWords = ref([]);
const dragStart = ref({ x: 0, y: 0 });
const dragOffset = ref({ x: 0, y: 0 });
const isDragging = ref(false);
const cardRef = ref(null);
const isLocked = ref(false);

const currentCard = computed(() => cards.value[currentIndex.value]);
const progress = computed(
  () => (currentIndex.value / cards.value.length) * 100
);

const cardStyle = computed(() => {
  const rotation = dragOffset.value.x * 0.05;
  const opacity = 1 - Math.abs(dragOffset.value.x) / 500;
  const transition = isDragging.value
    ? "none"
    : "transform 0.3s ease, opacity 0.3s ease";

  return {
    transform: `translateX(${dragOffset.value.x}px) translateY(${dragOffset.value.y}px) rotate(${rotation}deg)`,
    opacity: opacity,
    transition: transition,
  };
});

const leftHintOpacity = computed(() => {
  return dragOffset.value.x < -50
    ? Math.min(1, Math.abs(dragOffset.value.x) / 100)
    : 0;
});

const rightHintOpacity = computed(() => {
  return dragOffset.value.x > 50 ? Math.min(1, dragOffset.value.x / 100) : 0;
});

const handleDragStart = (e) => {
  if (isLocked.value) return;

  const clientX = e.type.includes("mouse") ? e.clientX : e.touches[0].clientX;
  const clientY = e.type.includes("mouse") ? e.clientY : e.touches[0].clientY;
  dragStart.value = { x: clientX, y: clientY };
  isDragging.value = true;
};

const handleDragMove = (e) => {
  if (!isDragging.value || isLocked.value) return;
  e.preventDefault();
  const clientX = e.type.includes("mouse") ? e.clientX : e.touches[0].clientX;
  const clientY = e.type.includes("mouse") ? e.clientY : e.touches[0].clientY;
  const offsetX = clientX - dragStart.value.x;
  const offsetY = clientY - dragStart.value.y;
  dragOffset.value = { x: offsetX, y: offsetY };
};

const handleDragEnd = () => {
  if (!isDragging.value || isLocked.value) return;
  const threshold = 100;

  if (Math.abs(dragOffset.value.x) > threshold) {
    if (dragOffset.value.x > 0) {
      handleKnow();
    } else {
      handleUnknown();
    }
  } else {
    dragOffset.value = { x: 0, y: 0 };
  }
  isDragging.value = false;
};

const handleKnow = () => {
  if (isLocked.value) return;
  const audio = new Audio(turnpage);
  audio.play().catch((err) => console.warn("播放失败：", err));
  isLocked.value = true;
  dragOffset.value = { x: 1000, y: 0 };
  
  setTimeout(() => {
    currentIndex.value++;
    dragOffset.value = { x: 0, y: 0 };
    
    const halfPoint = Math.floor(cards.value.length / 2);
    const isHalfway = currentIndex.value === halfPoint;
    
    if (isHalfway) {
      showEncouragement.value = true;
      const audio = new Audio(halfencouragement);
      audio.play().catch((err) => console.warn("播放失败：", err));
      setTimeout(() => showEncouragement.value = false, 2000);
    }
    
    if (currentIndex.value < cards.value.length) {
      speakWord(cards.value[currentIndex.value]["英文"]);
    }
    
    setTimeout(() => isLocked.value = false, 1200);
  }, 300);
};

const handleUnknown = () => {
  if (isLocked.value) return;
  const audio = new Audio(turnpage);
  audio.play().catch((err) => console.warn("播放失败：", err));
  isLocked.value = true;
  const current = cards.value[currentIndex.value];
  unknownWords.value.push(current);
  dragOffset.value = { x: -1000, y: 0 };
  
  setTimeout(() => {
    currentIndex.value++;
    dragOffset.value = { x: 0, y: 0 };
    
    const halfPoint = Math.floor(cards.value.length / 2);
    const isHalfway = currentIndex.value === halfPoint;
    
    if (isHalfway) {
      showEncouragement.value = true;
      const audio = new Audio(halfencouragement);
      audio.play().catch((err) => console.warn("播放失败：", err));
      setTimeout(() => showEncouragement.value = false, 2000);
    }
    
    if (currentIndex.value < cards.value.length) {
      speakWord(cards.value[currentIndex.value]["英文"]);
    }
    
    setTimeout(() => isLocked.value = false, 1200);
  }, 300);
};

const nextCard = () => {
  dragOffset.value = { x: 0, y: 0 };
  currentIndex.value++;

  const halfPoint = Math.floor(cards.value.length / 2);
  const isHalfway = currentIndex.value === halfPoint;

  if (isHalfway) {
    showEncouragement.value = true;
    const audio = new Audio(halfencouragement);
    audio.play().catch((err) => {
      console.warn("播放失败：", err);
    });
    setTimeout(() => {
      showEncouragement.value = false;
    }, 2000);
  }

  if (currentIndex.value < cards.value.length) {
    speakWord(cards.value[currentIndex.value]["英文"]);

    const unlockDelay = isHalfway ? 2500 : 1200;
    setTimeout(() => {
      isLocked.value = false;
    }, unlockDelay);
  } else {
    isLocked.value = false;
  }
};

const isSubmitting = ref(false);

const finishCards = async () => {
  if (isSubmitting.value) return;
  
  if (startTime.value) {
    const currentTime = Date.now();
    timeDiff.value = currentTime - startTime.value;
    console.log("timeDiff: ", timeDiff);
  }
  
  cards.value.forEach((card) => {
    const isUnknown = unknownWords.value.some(
      (unknown) => unknown.英文 === card.英文 && unknown.序号 === card.序号
    );
    card.unknown = isUnknown;

    card.答案 = card.中文;
    card.flag = true;

    card.用户选择 = isUnknown ? ["false"] : [card.中文];
  });
  
  const params = new URLSearchParams();
  params.append("method", "updateWordSwipeReview");
  params.append("username", username.value);
  params.append("alias", alias.value);
  params.append("account_nid", account_nid.value);
  params.append("title", title.value);
  params.append("teacher_mark", timeDiff.value);
  params.append("submittoken", startTime.value);
  params.append("data", JSON.stringify(cards.value));
  
  isSubmitting.value = true;
  const toast = showLoadingToast({
    duration: 0,
    forbidClick: true,
    message: "提交中...",
    loadingType: "spinner",
  });
  
  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('请求超时')), 8000);
    });
    
    const axiosPromise = axios.post("words/", params);
    
    const response = await Promise.race([axiosPromise, timeoutPromise]);
    
    console.log('提交成功:', response.data);
    
    router.push({
      path: "/studentAccountList",
      state: {
        username: username.value,
        data: basicPreExam.value,
        reviewRequired: reviewRequired.value,
      },
    });
  } catch (error) {
    console.error('提交失败:', error);
    
    showFailToast({
      message: error.message === '请求超时' ? '网络请求超时，重新提交' : '网络请求超时，重新提交',
      duration: 3000,
    });
    
    setTimeout(() => {
      showConfirmDialog({
        title: '操作失败',
        message: '是否重试提交？',
        confirmButtonText: '重试',
        cancelButtonText: '返回',
        theme: 'round-button',
      })
      .then(() => {
        finishCards();
      })
      .catch(() => {
        router.push({
          path: "/studentAccountList",
          state: {
            username: username.value,
            data: basicPreExam.value,
            reviewRequired: reviewRequired.value,
          },
        });
      });
    }, 1000);
  } finally {
    toast.close();
    isSubmitting.value = false;
  }
};

const audioCache = new Map();
const base64ToBlob = (base64, mimeType = "audio/mpeg") => {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};

const speakWord = (english) => {
  const cached = audioCache.get(english);

  if (cached instanceof Blob) {
    const audioUrl = URL.createObjectURL(cached);
    const audio = new Audio(audioUrl);
    audio.currentTime = 0;
    audio.play().catch((err) => {
      console.warn('播放被拒（缓存 Blob），回退 TTS：', err);
      fallbackSpeech(english);
    });
    audio.addEventListener('ended', () => URL.revokeObjectURL(audioUrl));
    audio.addEventListener('error', () => {
      URL.revokeObjectURL(audioUrl);
      fallbackSpeech(english);
    });
    return;
  }

  if (cached instanceof Audio) {
    cached.currentTime = 0;
    cached.play().catch((err) => {
      console.warn('播放失败（Audio cache），回退 TTS：', err);
      fallbackSpeech(english);
    });
    return;
  }

  const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(english)}&type=1`;
  const audio = new Audio(url);
  audio.play().catch((err) => {
    console.warn('远程音频播放失败，回退 TTS：', err);
    fallbackSpeech(english);
  });
  audio.addEventListener('error', () => fallbackSpeech(english));
};

const fallbackSpeech = (english) => {
  if (window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
  }
  
  let utterance;
  utterance = new SpeechSynthesisUtterance(english);
  utterance.lang = "en-US";
  utterance.pitch = 0.5;
  
  if (document.hasFocus()) {
    window.speechSynthesis.speak(utterance);
  } else {
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 0);
  }
};

const showEncouragement = ref(false);
const srcswipeEncouragement = ref("");
const showSwipeTutorial = ref(false);
const username = ref("");
const alias = ref("");
const account_nid = ref("");
const title = ref("");
const startTime = ref(null);
const timeDiff = ref(null);
const basicPreExam = ref(null);
const reviewRequired = ref(null);

const setVH = () => {
  const vh = window.innerHeight * 0.01
  document.documentElement.style.setProperty('--vh', `${vh}px`)
}

const audioCtx = ref(null);
const unlockAudio = () => {
  if (!audioCtx.value && (window.AudioContext || window.webkitAudioContext)) {
    audioCtx.value = new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.value.resume && audioCtx.value.resume().catch(() => {});
  }
  if (window.speechSynthesis && window.speechSynthesis.paused) {
    try { window.speechSynthesis.resume(); } catch(e){ }
  }
  window.removeEventListener('touchstart', unlockAudio);
  window.removeEventListener('mousedown', unlockAudio);
};

onMounted(async () => {
  window.addEventListener('touchstart', unlockAudio, { once: true });
  window.addEventListener('mousedown', unlockAudio, { once: true });

  setVH()
  window.addEventListener('resize', setVH)
  window.addEventListener('orientationchange', () => setTimeout(setVH, 100))

  // 锁定 body 滚动
  document.body.style.overflow = 'hidden'
  
  // 禁用浏览器的左右滑动手势（返回/前进）
  const preventSwipeGesture = (e) => {
    if (e.touches && e.touches.length === 1) {
      const touch = e.touches[0];
      const startX = touch.clientX;
      
      if (startX < 30 || startX > window.innerWidth - 30) {
        e.preventDefault();
      }
    }
  };
  
  const preventHorizontalScroll = (e) => {
    if (e.touches && e.touches.length === 1) {
      e.preventDefault();
    }
  };
  
  document.addEventListener('touchstart', preventSwipeGesture, { passive: false });
  document.addEventListener('touchmove', preventHorizontalScroll, { passive: false });
  
  window._preventSwipeGesture = preventSwipeGesture;
  window._preventHorizontalScroll = preventHorizontalScroll;

  const data = JSON.parse(history.state.answers);
  username.value = history.state.username;
  alias.value = history.state.alias;
  account_nid.value = history.state.account_nid;
  title.value = history.state.title;
  basicPreExam.value = history.state.basicPreExam;
  reviewRequired.value = history.state.reviewRequired;
  startTime.value = Date.now();
  console.log('submittoken: ', startTime.value);

  if (flagTheme.value == 1) {
    srcswipeEncouragement.value = goodjob1;
  }
  if (flagTheme.value == 2) {
    srcswipeEncouragement.value = goodjob2;
  }

  const shuffledData = data.sort(() => Math.random() - 0.5);

  answers.value = shuffledData;
  cards.value = [...shuffledData];
  console.log("cards: ", cards.value);

  const toast = showLoadingToast({
    duration: 0,
    forbidClick: true,
    message: "加载音频...",
    loadingType: "spinner",
  });

  const answerSheetProList = answers.value.map((item) => ({
    ...item,
    showChinese: false,
    audio: null,
  }));

  let params = new URLSearchParams();
  params.append("method", "getAudioList");
  params.append("word_list", JSON.stringify(answerSheetProList));

  try {
    const response = await axios.post("words/", params);

    if (response.data.success && response.data.audio_data) {
      Object.entries(response.data.audio_data).forEach(([word, obj]) => {
        try {
          const blob = base64ToBlob(obj.data, "audio/mpeg");
          audioCache.set(word, blob);
        } catch (err) {
          console.warn(`音频转换失败: ${word}`, err);
        }
      });

      if (response.data.failed_words && response.data.failed_words.length > 0) {
        const failedList = response.data.failed_words.join("，");
        showConfirmDialog({
          theme: "round-button",
          title: "音频加载失败",
          message: `以下单词的音频未能加载：\n${failedList}`,
          confirmButtonText: "知道了",
        }).catch(() => {});
      }
    }
  } catch (error) {
    console.error("音频加载失败:", error);
  } finally {
    toast.close();

    showSwipeTutorial.value = true;
    setTimeout(() => {
      showSwipeTutorial.value = false;
    }, 3000);

    if (answers.value.length > 0) {
      speakWord(answers.value[0]["英文"]);
    }
  }
});

onUnmounted(() => {
  document.body.style.overflow = ''
  window.removeEventListener('resize', setVH)
  
  if (window._preventSwipeGesture) {
    document.removeEventListener('touchstart', window._preventSwipeGesture);
    delete window._preventSwipeGesture;
  }
  if (window._preventHorizontalScroll) {
    document.removeEventListener('touchmove', window._preventHorizontalScroll);
    delete window._preventHorizontalScroll;
  }
})
</script>

<style scoped>
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
  overscroll-behavior: none;
}

.word-swipe-container {
  height: 100dvh;
  max-height: 100dvh;
  min-height: 100dvh;
  height: 100vh;
  height: 100dvh;
  background: linear-gradient(135deg, #e0c3fc 0%, #fce4ec 50%, #bbdefb 100%);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  overflow: hidden;
  box-sizing: border-box;
  overscroll-behavior: none;
  touch-action: pan-y;
}

.top-nav {
  width: 100%;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 16px 32px;
  flex-shrink: 0;
  z-index: 100;
}

.nav-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  padding: 0 20px;
  box-sizing: border-box;
}
.nav-title {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  flex: 1;
  margin-right: 20px;
  background: linear-gradient(90deg, #9c27b0 0%, #e91e63 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.nav-username {
  font-size: 18px;
  font-weight: 600;
  color: #6b7280;
  padding: 8px 16px;
  background: #f3f4f6;
  border-radius: 20px;
  flex-shrink: 0;
  max-width: 200px;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  margin-right: 5rem;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  justify-content: center;
  padding: 20px;
  gap: 24px;
  overflow: hidden;
  min-height: 0;
}

.left-control-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 48px;
  width: 280px;
  flex-shrink: 0;
  margin-left: 5rem;
}

.right-card-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  position: relative;
}

.progress-wrapper {
  flex-shrink: 0;
  width: 280px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 18px;
  color: #666;
  margin-bottom: 8px;
  font-weight: 500;
}

.progress-bar {
  height: 8px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 9999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #9c27b0 0%, #e91e63 100%);
  transition: width 0.3s ease;
}

.cards-wrapper {
  position: relative;
  width: 100%;
  max-width: 600px;
  height: 100%;
  overflow: visible;
}

.card-preview {
  position: absolute;
  inset: 0;
  background: white;
  border-radius: 24px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  transform: scale(0.95);
  opacity: 0.5;
  z-index: 5;
}

.card {
  position: absolute;
  inset: 0;
  background: white;
  border-radius: 24px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  touch-action: none;
  transition: opacity 0.2s ease;
  z-index: 10;
}

.card.locked {
  opacity: 0.6;
  pointer-events: none;
}

.card.dragging {
  cursor: grabbing;
}

.card:not(.dragging):not(.locked) {
  cursor: grab;
}

.swipe-hint {
  position: absolute;
  top: 32px;
  font-weight: bold;
  font-size: 24px;
  transition: opacity 0.3s ease;
}

.swipe-hint.left {
  left: 32px;
  color: #ef4444;
  transform: rotate(-12deg);
}

.swipe-hint.right {
  right: 32px;
  color: #10b981;
  transform: rotate(12deg);
}

.card-content {
  text-align: center;
  z-index: 20;
  position: relative;
}

.english-text {
  font-size: 64px;
  font-weight: bold;
  color: #1f2937;
  margin-bottom: 32px;
  z-index: 30;
  position: relative;
}

.answer-text {
  font-size: 32px;
  color: #6b7280;
  font-weight: 500;
  z-index: 30;
  position: relative;
}

.tap-hint {
  position: absolute;
  bottom: 16px;
  font-size: 16px;
  color: #9ca3af;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 32px;
  width: 280px;
  align-items: flex-start;
  justify-content: center;
}

.button-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.button-label {
  font-size: 20px;
  font-weight: 600;
  color: #374151;
}

.action-btn {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: white;
  border: none;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn svg {
  width: 48px;
  height: 48px;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn:not(:disabled):hover {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  transform: scale(1.1);
}

.action-btn:not(:disabled):active {
  transform: scale(0.95);
}

.unknown-btn {
  color: #ef4444;
}

.know-btn {
  color: #10b981;
}

.completion-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.completion-card {
  background: white;
  border-radius: 24px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  padding: 48px;
  width: 100%;
  max-width: 600px;
  height: 80%;
  text-align: center;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.unknown-count {
  background: #fef2f2;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 24px;
}

.count-label {
  font-size: 24px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.count-number {
  font-size: 48px;
  font-weight: bold;
  color: #ef4444;
  margin-bottom: 0.8rem;
  margin-top: 0.5rem;
}

.unknown-list {
  background: #f9fafb;
  border-radius: 16px;
  padding: 15px;
  margin-bottom: 20px;
  max-height: 500px;
  overflow-y: auto;
  flex-shrink: 1;
}

.unknown-item {
  background: white;
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 12px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.unknown-item:last-child {
  margin-bottom: 0;
}

.unknown-english {
  font-weight: 600;
  font-size: 22px;
  color: #9c27b0;
  margin-bottom: 4px;
}

.unknown-answer {
  font-size: 18px;
  color: #6b7280;
}

.reset-button {
  background: linear-gradient(90deg, #9c27b0 0%, #e91e63 100%);
  color: white;
  padding: 12px 32px;
  border-radius: 9999px;
  font-weight: 600;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.reset-button:hover {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.reset-button:active {
  transform: translateY(0);
}

/* 自定义完成复习按钮样式 */
.completion-card .van-button--large {
  height: 70px;
  font-size: 20px;
  font-weight: 600;
  padding: 10px 32px;
  margin-top: 20px;
}

.encouragement-overlay {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 80vw;
  max-width: 450px;
  z-index: 1000;
  pointer-events: none;
  animation: fadeInOut 2s ease-in-out;
}

@keyframes fadeInOut {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.8);
  }
  20% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.1);
  }
  80% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.9);
  }
}

.swipe-tutorial-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.3s ease-in-out;
}

.tutorial-content {
  text-align: center;
  padding: 40px;
  position: relative;
}

.tutorial-card-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 50px;
  position: relative;
  height: 200px;
}

.tutorial-card {
  width: 280px;
  height: 180px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  animation: cardSwipeDemo 3s ease-in-out infinite;
}

.tutorial-card-text {
  font-size: 36px;
  font-weight: bold;
  color: #1f2937;
}

@keyframes cardSwipeDemo {
  0% {
    transform: translateX(0) rotate(0deg);
    opacity: 1;
  }
  15% {
    transform: translateX(0) rotate(0deg);
    opacity: 1;
  }
  35% {
    transform: translateX(150px) rotate(15deg);
    opacity: 0.3;
  }
  50% {
    transform: translateX(0) rotate(0deg);
    opacity: 1;
  }
  65% {
    transform: translateX(0) rotate(0deg);
    opacity: 1;
  }
  85% {
    transform: translateX(-150px) rotate(-15deg);
    opacity: 0.3;
  }
  100% {
    transform: translateX(0) rotate(0deg);
    opacity: 1;
  }
}

.tutorial-arrows {
  display: flex;
  gap: 80px;
  justify-content: center;
  align-items: center;
  margin-bottom: 30px;
}

.arrow-left,
.arrow-right {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.arrow-left svg {
  animation: slideLeft 1.5s ease-in-out infinite;
}

.arrow-right svg {
  animation: slideRight 1.5s ease-in-out infinite;
}

.arrow-text {
  font-size: 20px;
  font-weight: bold;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.left-text {
  color: #ef4444;
}

.right-text {
  color: #10b981;
}

.tutorial-hint {
  font-size: 18px;
  color: white;
  font-weight: 500;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideLeft {
  0%,
  100% {
    transform: translateX(0);
  }
  50% {
    transform: translateX(-15px);
  }
}

@keyframes slideRight {
  0%,
  100% {
    transform: translateX(0);
  }
  50% {
    transform: translateX(15px);
  }
}
</style>