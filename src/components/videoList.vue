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
    <!-- <van-button v-if="showButton" type="warning" class="random-button" round @click="handleButtonClick"> 点击继续</van-button> -->
    <div v-if="showButton" @click="handleButtonClick" class="random-button">
      <img :src="srcTheme" alt="" />
      <div>戳 我</div>
    </div>

    <!-- 底部区域：显示文字和进度条 -->
    <div class="progress-area">
      <div class="progress-text">打开音量, 注入大脑中...</div>
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

const emit = defineEmits(["finished", "exit", "exit2"]); // 添加 exit 事件

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
  do {
    const x = Math.floor(Math.random() * (window.innerWidth - wordWidth.value));
    const y = Math.floor(
      Math.random() *
        (window.innerHeight - progressAreaHeight - wordHeight.value)
    );
    candidate = { x, y, width: wordWidth.value, height: wordHeight.value };
    attempts++;
    if (attempts > 100) break;
  } while (
    wordPositions.value.some((existing) => isOverlap(existing, candidate))
  );
  return candidate;
}

// 单词发音函数
const speakWord = (word) => {
  try {
    const parts = word.split(" ");
    const englishParts = parts.filter((part) => /[a-zA-Z]/.test(part));
    const englishText = englishParts.join(" ");
    if (englishText) {
      const utterance = new SpeechSynthesisUtterance(englishText);
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
    }
  } catch (error) {
    console.error("发音出错:", error);
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
        // 如果按钮仍未被点击
        emit("exit"); // 触发退出事件
      }
    }, 3000);
  }, randomDelay * 1000);
}


// 点击按钮处理
const handleButtonClick = () => {
  showButton.value = false;
  clearTimeout(buttonTimer); // 清除倒计时
};

// 计时器
let timer = null;
function startAnimation() {
  count.value = 0; // 重置计数器
  showRandomButton(); // 为当前单词设置随机按钮

  timer = setInterval(() => {
    if (count.value >= maxTimes) {
      count.value = 0;
      wordPositions.value = [];
      if (currentWordIndex.value < props.words.length - 1) {
        currentWordIndex.value++;
        showRandomButton(); // 为新单词设置随机按钮
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
  localStorage.setItem("listBarrage", JSON.stringify(props.words));
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
  startAnimation();
});

onUnmounted(() => {
  window.removeEventListener("click", handleScreenClick);
  if (timer) clearInterval(timer);
  if (buttonTimer) clearTimeout(buttonTimer);
});
</script>

<style scoped>
.container {
  position: relative;
  width: 100vw;
  height: 100vh;
}

.word {
  position: absolute;
  font-size: 18px;
  font-weight: 700;
  color: #333;
}

.measure {
  visibility: hidden;
  position: absolute;
  top: -9999px;
  left: -9999px;
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
  transform: translate(-50%, -50%); /* 确保按钮居中 */
  cursor: pointer;
  z-index: 10;
  width: 80px; /* 调整按钮的宽度 */
  height: 80px; /* 调整按钮的高度 */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.random-button img {
  width: 120px; /* 调整图片的宽度 */
  height: 120px; /* 调整图片的高度 */
}

.random-button div {
  font-size: 22px; /* 调整文本的字体大小 */
  margin-top: 5px; /* 调整文本与图片之间的间距 */
  font-weight: 600;
  color: red;
}
.container {
  position: relative;
  width: 100vw;
  height: 100vh;
  background-image: url("../assets/background_video.png"); /* 背景图片路径 */
  background-size: cover; /* 让图片铺满整个容器 */
  background-position: center; /* 居中对齐 */
  background-repeat: no-repeat; /* 不重复 */
}
</style>

