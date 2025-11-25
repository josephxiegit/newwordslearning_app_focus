<template>
  <div class="container">
    <!-- 用于测量单词尺寸的隐藏元素 -->
    <span ref="measureRef" class="word measure">{{ currentWord }}</span>

    <!-- 渲染当前单词的 20 次展示 -->
    <div
      v-for="(item, index) in wordPositions"
      :key="index"
      class="word"
      :style="{ left: item.x + 'px', top: item.y + 'px' }"
    >
      {{ currentWord }}
    </div>

    <!-- 随机弹出的按钮 -->
    <div v-if="showButton" @click="handleButtonClick" class="random-button">
      <img :src="srcTheme" alt="" />
      <div>戳 我</div>
    </div>

    <!-- 底部区域：显示文字和进度条 -->
    <div class="progress-area">
      <div class="progress-text">
        <span v-if="isPreloading">正在缓存音频... ({{ preloadProgress }}/{{ props.words.length }})</span>
        <span v-else>打开音量, 注入大脑中...</span>
      </div>
      <div class="progress-container">
        <div
          class="progress-bar"
          :style="{ width: progressPercentage + '%' }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed, inject } from "vue";
import { showLoadingToast, showSuccessToast, showFailToast, showNotify } from "vant";
import videoListrcGoatAndWolf from "../assets/videoList.gif";
import videoListSrcBears from "../assets/Boonie Bears/videoList.gif";

const flagTheme = inject("flagTheme");
const srcTheme = ref("");
const props = defineProps({
  words: {
    type: Array,
    required: true,
    default: () => [],
  },
});

const emit = defineEmits(["finished", "exit", "exit2"]);

const currentWordIndex = ref(0);
const currentWord = computed(() => props.words[currentWordIndex.value]);

const wordWidth = ref(0);
const wordHeight = ref(0);
const measureRef = ref(null);
const wordPositions = ref([]);

const maxTimes = 20;
const count = ref(0);
const progressPercentage = computed(() => (count.value / maxTimes) * 100);

const progressAreaHeight = 60;

// 按钮相关状态
const showButton = ref(false);
let buttonTimer = null;

// 音频缓存相关
const audioCache = ref(new Map());
const isPreloading = ref(false);
const preloadProgress = ref(0);

// 检测两个矩形是否重叠
function isOverlap(rect1, rect2) {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
}

// 生成不会重叠的随机位置
function getRandomPosition() {
  let candidate;
  let attempts = 0;
  
  // 设定一个安全距离，比如 10px 或 20px
  // 让文字不要紧贴着屏幕边缘
  const padding = 15; 

  do {
    // 1. 计算 X 轴可用空间
    // 窗口宽度 - 文字宽度 - 双倍padding(左边和右边都要留空)
    const availableWidth = window.innerWidth - wordWidth.value - (padding * 2);
    
    // 生成 x: 在可用空间内随机 + 左侧 padding
    // Math.max(0, ...) 是为了防止屏幕太窄导致负数报错
    const x = Math.floor(Math.random() * Math.max(0, availableWidth)) + padding;

    // 2. 计算 Y 轴可用空间
    // 窗口高度 - 底部进度条高度 - 文字高度 - 双倍padding(顶部和底部都要留空)
    const availableHeight = window.innerHeight - progressAreaHeight - wordHeight.value - (padding * 2);
    
    // 生成 y: 在可用空间内随机 + 顶部 padding
    const y = Math.floor(Math.random() * Math.max(0, availableHeight)) + padding;

    candidate = { x, y, width: wordWidth.value, height: wordHeight.value };
    attempts++;
    
    // 增加尝试次数上限，防止死循环
    if (attempts > 100) break;
    
  } while (
    wordPositions.value.some((existing) => isOverlap(existing, candidate))
  );
  
  return candidate;
}

// 提取英文单词
const extractEnglishText = (word) => {
  const parts = word.split(" ");
  const englishParts = parts.filter((part) => /[a-zA-Z]/.test(part));
  return englishParts.join(" ");
};

// 预加载所有音频
const preloadAudios = async () => {
  isPreloading.value = true;
  preloadProgress.value = 0;
  
  // 显示加载toast
  const loadingToast = showLoadingToast({
    message: "正在缓存音频，请稍候...",
    forbidClick: true,
    duration: 0, // 不自动关闭
  });
  
  let successCount = 0;
  let failCount = 0;
  
  try {
    for (let i = 0; i < props.words.length; i++) {
      const word = props.words[i];
      const englishText = extractEnglishText(word);
      
      if (englishText && !audioCache.value.has(englishText)) {
        try {
          // 更新loading toast消息
          loadingToast.message = `正在缓存音频 ${i + 1}/${props.words.length}: ${englishText}`;
          
          // 尝试从有道获取音频
          const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(englishText)}&type=1`;
          const audio = new Audio(url);
          
          // 等待音频加载完成
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Audio load timeout'));
            }, 10000); // 10秒超时，给网络更多时间
            
            audio.addEventListener('canplaythrough', () => {
              clearTimeout(timeout);
              resolve();
            }, { once: true });
            
            audio.addEventListener('error', () => {
              clearTimeout(timeout);
              reject(new Error('Audio load error'));
            }, { once: true });
            
            // 开始加载音频
            audio.load();
          });
          
          // 存储音频对象，标记为音频类型
          audioCache.value.set(englishText, {
            type: 'audio',
            audio: audio
          });
          successCount++;
          console.log(`Successfully cached audio for: ${englishText}`);
          
        } catch (error) {
          console.log(`Failed to cache audio for ${englishText}, will use speech synthesis`);
          // 将语音合成标记存储到缓存中
          audioCache.value.set(englishText, {
            type: 'speech',
            text: englishText
          });
          failCount++;
        }
      }
      
      preloadProgress.value = i + 1;
    }
    
    // 关闭loading toast
    loadingToast.close();
    
    // 显示缓存结果toast
    if (failCount === 0) {
      // 全部成功
      showSuccessToast(`音频缓存完成！共缓存 ${successCount} 个音频`);
    } else if (successCount === 0) {
      // 全部失败
      showFailToast(`音频缓存失败，将使用语音合成播放 ${failCount} 个单词`);
    } else {
      // 部分成功
      showNotify({
        type: 'warning',
        message: `缓存完成：${successCount} 个音频成功，${failCount} 个使用语音合成`,
        duration: 3000
      });
    }
    
    console.log(`Audio preloading completed. Success: ${successCount}, Failed: ${failCount}`);
    
  } catch (error) {
    // 关闭loading toast
    loadingToast.close();
    // 显示错误toast
    showFailToast('音频缓存过程出现错误，将使用语音合成');
    console.error('Audio preloading error:', error);
  } finally {
    isPreloading.value = false;
  }
};

// 播放单词发音（使用缓存的音频或语音合成）
const speakWord = (word) => {
  const englishText = extractEnglishText(word);
  
  if (!englishText) return;
  
  // 首先尝试使用缓存的音频
  if (audioCache.value.has(englishText)) {
    const audioData = audioCache.value.get(englishText);
    if (audioData.type === 'audio') {
      // 使用缓存的音频文件
      audioData.audio.currentTime = 0;
      audioData.audio.play().catch((error) => {
        console.log(`Failed to play cached audio for ${englishText}:`, error);
        // 如果缓存音频播放失败，使用语音合成
        playSpeechSynthesis(englishText);
      });
    } else if (audioData.type === 'speech') {
      // 使用语音合成
      playSpeechSynthesis(englishText);
    }
  } else {
    // 如果没有缓存，使用语音合成
    playSpeechSynthesis(englishText);
  }
};

// 语音合成播放函数
const playSpeechSynthesis = (englishText) => {
  // 停止之前可能正在进行的语音合成
  window.speechSynthesis.cancel();
  
  try {
    const utterance = new SpeechSynthesisUtterance(englishText);
    utterance.lang = /[a-zA-Z]/.test(englishText) ? "en-US" : "zh-CN";
    utterance.pitch = 0.5;
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  } catch (error) {
    console.log('Speech synthesis failed:', error);
  }
};

// 显示按钮并启动倒计时
function showRandomButton() {
  const randomDelay = Math.floor(Math.random() * 4) + 11;
  setTimeout(() => {
    showButton.value = true;
    // 3 秒倒计时
    buttonTimer = setTimeout(() => {
      if (showButton.value) {
        emit("exit");
      }
    }, 3000);
  }, randomDelay * 1000);
}

// 点击按钮处理
const handleButtonClick = () => {
  showButton.value = false;
  clearTimeout(buttonTimer);
};

// 计时器
let timer = null;
function startAnimation() {
  if (isPreloading.value) {
    // 如果还在预加载，等待完成
    const waitForPreload = setInterval(() => {
      if (!isPreloading.value) {
        clearInterval(waitForPreload);
        beginAnimation();
      }
    }, 100);
  } else {
    beginAnimation();
  }
}

function beginAnimation() {
  count.value = 0;
  showRandomButton();

  timer = setInterval(() => {
    if (count.value >= maxTimes) {
      count.value = 0;
      wordPositions.value = [];
      if (currentWordIndex.value < props.words.length - 1) {
        currentWordIndex.value++;
        showRandomButton();
      } else {
        clearInterval(timer);
        emit("finished");
        return;
      }
    }

    const newPos = getRandomPosition();
    wordPositions.value.push(newPos);
    count.value++;
    speakWord(currentWord.value);
  }, 1000);
}

// 统计点击次数
const clickCount = ref(0);
const handleScreenClick = () => {
  clickCount.value++;
  if (clickCount.value >= 10) {
    emit("exit2");
    clickCount.value = 0;
  }
};

onMounted(async () => {
  localStorage.setItem("listBarrage", JSON.stringify({
    words: props.words,
    timestamp: new Date().toISOString()
  }));
  window.addEventListener("click", handleScreenClick);

  await nextTick();
  
  if (flagTheme.value == 1) {
    srcTheme.value = videoListrcGoatAndWolf;
  }
  if (flagTheme.value == 2) {
    srcTheme.value = videoListSrcBears;
  }
  
  if (measureRef.value) {
    wordWidth.value = measureRef.value.offsetWidth;
    wordHeight.value = measureRef.value.offsetHeight;
  }
  
  // 先预加载音频，再开始动画
  await preloadAudios();
  startAnimation();
});

onUnmounted(() => {
  window.removeEventListener("click", handleScreenClick);
  if (timer) clearInterval(timer);
  if (buttonTimer) clearTimeout(buttonTimer);
  
  // 停止语音合成
  window.speechSynthesis.cancel();
  
  // 清理音频缓存
  audioCache.value.forEach((audioData) => {
    if (audioData.type === 'audio') {
      audioData.audio.src = '';
      audioData.audio.load();
    }
  });
  audioCache.value.clear();
});
</script>

<style scoped>
.container {
  position: relative;
  width: 100%;
  height: 100%;
  background-image: url("../assets/background_video.png");
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  overflow: hidden;
}

.word {
  position: absolute;
  font-size: 18px;
  font-weight: 700;
  color: #333;
}

.measure {
position: fixed; /* 或者 absolute */
  top: 0;
  left: 0;
  visibility: hidden; /* 占位但不显示 */
  opacity: 0;         /* 双重保险 */
  z-index: -999;      /* 放在最底层 */
  pointer-events: none; /* 确保点不到 */
}

.progress-area {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 60px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.progress-container {
  margin-bottom: 10px;
  width: 90%;
  height: 30px;
  background-color: #e0e0e0;
}

.progress-bar {
  height: 100%;
  background-color: #76c7c0;
  transition: width 0.5s;
}

.progress-text {
  margin-bottom: 0.5rem;
}

.random-button {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  cursor: pointer;
  z-index: 10;
  width: 80px;
  height: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.random-button img {
  width: 120px;
  height: 120px;
}

.random-button div {
  font-size: 22px;
  margin-top: 5px;
  font-weight: 600;
  color: red;
}
</style>
