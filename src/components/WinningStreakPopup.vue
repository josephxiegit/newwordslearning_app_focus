<template>
  <van-popup
    v-model:show="isVisible"
    position="right"
    :style="{ width: '100%', height: '100%' }"
    @open="handleOpen"
  >
    <div class="popup-container">
      <!-- 头部标题 -->
      <div class="header-section">
        <span>任务清单</span>
        <img
          v-if="isVisible"
          :src="currentThemeImage"
          alt="任务图标"
          class="slide-in-image"
        />
      </div>

      <!-- 步骤区域 -->
      <div class="steps-section">
        <!-- 进度条 -->
        <div class="progress-section">
          <div class="progress-header">
            <span class="progress-title-group">本组进度</span>
            <span class="progress-legend">任务完成</span>
          </div>
          <div class="progress-bar-wrapper">
            <van-progress
              :pivot-text="`${progressPercentagerate}%`"
              color="#ee0a24"
              :percentage="progressPercentagerate"
            />
            <span class="progress-count-group">{{ rateanimatedStep }}/3</span>
          </div>
        </div>

        <div class="progress-section">
          <div class="progress-header">
            <span class="progress-title-day">日任务(🌸)</span>
            <span class="progress-legend">任务完成</span>
          </div>
          <div class="progress-bar-wrapper">
            <van-progress
              :pivot-text="`${progressPercentagedaily}%`"
              color="#7232dd"
              :percentage="progressPercentagedaily"
            />
            <span class="progress-count-day">{{ dailyanimatedStep }}/2</span>
          </div>
        </div>

        <div class="progress-section">
          <div class="progress-header">
            <span class="progress-title-week">周任务</span>
            <span class="progress-requirement">任务完成</span>
            <span class="progress-legend">金色传说</span>
          </div>
          <div class="progress-bar-wrapper">
            <van-progress
              :pivot-text="`${progressPercentage}%`"
              color="#f2826a"
              :percentage="progressPercentage"
            />
            <span class="progress-count-week">{{ animatedStep }}/6</span>
          </div>
        </div>

        <!-- 圆形箭头按钮 -->
        <button
          v-show="showButton"
          class="circle-arrow-btn"
          @click="handleContinue"
        >
          →
        </button>
      </div>
    </div>
  </van-popup>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import winningstreak_1 from "../assets/sound/winningstreak-1.mp3";
import winningstreak_2 from "../assets/sound/winningstreak-2.mp3";
import winningstreak_3 from "../assets/sound/winningstreak-3.mp3";
import winningstreak_goatjpg from "../assets/winningstreak.jpg";
import winningstreak_bearjpg from "../assets/Boonie Bears/winningstreak.jpg";
import winningstreak_goatjpg2 from "../assets/winningstreak2.jpg";
import winningstreak_bearjpg2 from "../assets/Boonie Bears/winningstreak2.jpg";

// Props
const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  activeStep: {
    type: Number,
    default: 0,
  },
  dailyStep: {
    type: Number,
    default: 0,
  },
  rateStep: {
    type: Number,
    default: 0,
  },
  // oldRate: {
  //   type: Number,
  //   default: 0,
  // },
  flagTheme: {
    type: Number,
    default: 1,
  },
  autoCloseDelay: {
    type: Number,
    default: 8000,
  },
  buttonDelay: {
    type: Number,
    default: 2000,
  },
});

// Emits
const emit = defineEmits(["update:show", "continue", "auto-close"]);

// State
const isVisible = ref(props.show);
const showButton = ref(false);
const animatedStep = ref(0);
const dailyanimatedStep = ref(0);
const rateanimatedStep = ref(0);
let autoCloseTimer = null;
let buttonTimer = null;

watch(isVisible, (newVal) => {
  emit("update:show", newVal);
  if (!newVal) {
    clearTimers();
    showButton.value = false;
    animatedStep.value = 0;
  }
});
watch(
  () => props.show,
  (newVal) => {
    isVisible.value = newVal;
    if (newVal) {
      startTimers();
    } else {
      clearTimers();
    }
  }
);

// Methods
const handleOpen = () => {
  startStreakAnimation();
  startTimers();
};

const startStreakAnimation = () => {
  // 延迟500ms后播放音效
  setTimeout(() => {
    playSound();
  }, 500);

  animatedStep.value = 0;
  dailyanimatedStep.value = 0;
  rateanimatedStep.value = 0;

  // 延迟后一步到位跳到目标步骤，这样能看到动画过程
  setTimeout(() => {
    animatedStep.value = props.activeStep;
    dailyanimatedStep.value = props.dailyStep;
    rateanimatedStep.value = props.rateStep;
  }, 1200); // 延迟，给用户看到进度条动画的时间
};

const currentThemeImage = computed(() => {
  const useSecondImage =
    animatedStep.value === 3 ||
    animatedStep.value === 6 ||
    dailyanimatedStep.value === 2;

  if (props.flagTheme === 1) {
    return useSecondImage ? winningstreak_goatjpg2 : winningstreak_goatjpg;
  } else {
    return useSecondImage ? winningstreak_bearjpg2 : winningstreak_bearjpg;
  }
});

const progressPercentage = computed(() => {
  return Math.min(Math.round((animatedStep.value / 6) * 100), 100);
});

const progressPercentagedaily = computed(() => {
  return Math.min(Math.round((dailyanimatedStep.value / 2) * 100), 100);
});

const progressPercentagerate = computed(() => {
  return Math.min(Math.round((rateanimatedStep.value / 3) * 100), 100);
});

const playSound = () => {
  let soundFile = null;
  const value = props.activeStep; // 周任务
  const value2 = props.dailyStep; // 日任务
  // const oldRate = props.oldRate; // 组任务
  // const rateStep = props.rateStep; // 组任务

  // 若value=6或value2=2，使用winningstreak_3
  if (value === 6 || value2 === 2) {
    soundFile = winningstreak_3;
  }
  // 若value=3，使用winningstreak_2
  else if (value === 3) {
    soundFile = winningstreak_2;
  }
  // 其余情况均使用winningstreak_1
  else {
    soundFile = winningstreak_1;
  }

  if (soundFile) {
    const audio = new Audio(soundFile);
    audio.play();
  }
};

const startTimers = () => {
  clearTimers();

  // 显示按钮
  buttonTimer = setTimeout(() => {
    showButton.value = true;
  }, props.buttonDelay);

  // 自动关闭
  autoCloseTimer = setTimeout(() => {
    emit("auto-close");
  }, props.autoCloseDelay);
};

const clearTimers = () => {
  if (buttonTimer) {
    clearTimeout(buttonTimer);
    buttonTimer = null;
  }
  if (autoCloseTimer) {
    clearTimeout(autoCloseTimer);
    autoCloseTimer = null;
  }
};

const handleContinue = () => {
  emit("continue");
  isVisible.value = false;
};
</script>

<style scoped>
/* 主容器 - 使用 flex 布局，充满整个弹窗 */
.popup-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

/* 头部区域 */
.header-section {
  flex-shrink: 0;
  padding-top: max(2vh, 15px);
  padding-bottom: 0;
  text-align: center;
  font-size: 24px;
  font-weight: bold;
  position: relative;
}

.slide-in-image {
  width: 80px;
  height: 80px;
  object-fit: contain;
  position: absolute;
  right: 2rem;
  top: 100%;
  transform: translateY(-50%);
  animation: slideInFromRight 0.9s ease-out 0.9s both;
}

/* 步骤区域 */
.steps-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: top;
  padding: 2rem 0 0 0;
  min-height: 0;
  position: relative;
  overflow: hidden;
}

/* 横向步骤包装器 */
.horizontal-steps-wrapper {
  width: 80%;
  max-width: 80%;
  overflow-x: hidden;
  overflow-y: hidden;
  display: flex;
  justify-content: center;
  margin-top: 2rem;
}

/* 进度条区域 */
.progress-section {
  flex-shrink: 0;
  width: 80%;
  margin: 2rem auto 0;
  display: flex;
  flex-direction: column;
  padding: 0 2rem;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.progress-title-week {
  font-size: 24px;
  font-weight: 700;
  color: #f2826a;
}
.progress-title-day {
  font-size: 24px;
  font-weight: 700;
  color: #7232dd;
}
.progress-title-group {
  font-size: 24px;
  font-weight: 700;
  color: #ee0a24;
}
.progress-requirement {
  font-size: 14px;
  font-weight: 900;
  color: #000;
}

.progress-legend {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.progress-bar-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.progress-bar-wrapper :deep(.van-progress) {
  flex: 1;
}

.progress-bar-wrapper :deep(.van-progress__bar) {
  height: 8px;
}

.progress-count-week {
  font-size: 14px;
  font-weight: 600;
  color: #f2826a;
  white-space: nowrap;
}
.progress-count-day {
  font-size: 14px;
  font-weight: 600;
  color: #7232dd;
  white-space: nowrap;
}
.progress-count-group {
  font-size: 14px;
  font-weight: 600;
  color: #ee0a24;
  white-space: nowrap;
}

/* 圆形箭头按钮 */
.circle-arrow-btn {
  flex-shrink: 0;
  margin: 4rem auto 0;

  transform: translateY(-50%);
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #07c160;
  color: white;
  border: none;
  font-size: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(7, 193, 96, 0.3);
  transition: all 0.3s ease;
  animation: fadeInScale 0.3s ease-out;
  z-index: 10;
}

.circle-arrow-btn:hover {
  background: #06ad56;
  transform: translateY(-50%) scale(1.05);
  box-shadow: 0 4px 12px rgba(7, 193, 96, 0.4);
}

.circle-arrow-btn:active {
  transform: translateY(-50%) scale(0.95);
}

@keyframes fadeInScale {
  0% {
    opacity: 0;
    transform: translateY(-50%) scale(0.8);
  }
  100% {
    opacity: 1;
    transform: translateY(-50%) scale(1);
  }
}

/* 横向步骤样式 */
.animated-steps {
  width: 100% !important;
  display: flex !important;
  flex-wrap: nowrap !important;
}

.animated-steps :deep(.van-steps) {
  display: flex !important;
  width: 100% !important;
}

.animated-steps :deep(.van-step) {
  flex: 1 !important;
  min-width: 0 !important;
  padding: 0 8px !important;
}

.animated-steps :deep(.van-step__wrapper) {
  width: 100% !important;
}

.animated-steps :deep(.van-step__line) {
  flex: 1 !important;
}

.animated-steps :deep(.van-step__circle),
.animated-steps :deep(.van-step__line),
.animated-steps :deep(.van-step__title) {
  transition: all 0.3s ease-in-out;
}

.animated-steps :deep(h5) {
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

@keyframes slideInFromRight {
  0% {
    transform: translate(calc(100vw + 100px), -50%);
    opacity: 0;
  }
  100% {
    transform: translateY(-50%);
    opacity: 1;
  }
}
</style>