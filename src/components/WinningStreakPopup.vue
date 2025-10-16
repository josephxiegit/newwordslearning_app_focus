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
        <span>本周任务</span>
        <img
          v-if="isVisible"
          :src="currentThemeImage"
          alt="任务图标"
          class="slide-in-image"
        />
      </div>

      <!-- 步骤区域（可滚动） -->
      <div class="steps-section">
        <!-- 圆形箭头按钮 -->
        <button
          v-show="showButton"
          class="circle-arrow-btn"
          @click="handleContinue"
        >
          →
        </button>
        
        <van-steps
          direction="vertical"
          :active="animatedStep"
          active-icon="success"
          class="animated-steps"
        >
          <van-step>
            <h5>开始学习</h5>
          </van-step>
          <van-step>
            <h5>本周首次</h5>
          </van-step>
          <van-step>
            <h5>本周二次</h5>
          </van-step>
          <van-step>
            <h5>任务完成</h5>
          </van-step>
          <van-step>
            <h5>完成四次</h5>
          </van-step>
          <van-step>
            <h5>完成五次</h5>
          </van-step>
          <van-step>
            <h5>金色传说</h5>
          </van-step>
        </van-steps>
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

  if (props.activeStep === 0) {
    return;
  }

  const duration = 2000;
  const steps = props.activeStep;
  const delayPerStep = duration / steps;

  // 逐步激活每个步骤
  for (let i = 1; i <= steps; i++) {
    setTimeout(() => {
      animatedStep.value = i;
    }, delayPerStep * i);
  }
};

const currentThemeImage = computed(() => {
  // 如果 animatedStep >= 3，使用第二张图
  const useSecondImage = animatedStep.value >= 3;

  if (props.flagTheme === 1) {
    return useSecondImage ? winningstreak_goatjpg2 : winningstreak_goatjpg;
  } else {
    return useSecondImage ? winningstreak_bearjpg2 : winningstreak_bearjpg;
  }
});

const playSound = () => {
  let soundFile = null;
  const value = props.activeStep;

  if ([0, 1, 2, 4, 5].includes(value)) {
    soundFile = winningstreak_1;
  } else if (value === 3) {
    soundFile = winningstreak_2;
  } else if (value === 6) {
    soundFile = winningstreak_3;
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
  padding-bottom: 0rem;
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
  flex: 0.8;
  overflow-y: auto;
  display: flex;
  justify-content: center;
  padding: 0.5rem 0;
  min-height: 0;
  position: relative; /* 为按钮的绝对定位提供参考 */
}

/* 圆形箭头按钮 - 使用绝对定位 */
.circle-arrow-btn {
  position: absolute;
  left: 50px; /* 距离左侧的距离 */
  top: 50%; /* 垂直居中 */
  transform: translateY(-50%); /* 精确垂直居中 */
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

.animated-steps :deep(.van-step__circle),
.animated-steps :deep(.van-step__line),
.animated-steps :deep(.van-step__title) {
  transition: all 0.3s ease-in-out;
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

/* 缩小步骤间距 */
.animated-steps :deep(.van-step) {
  padding-top: 1px;
  padding-bottom: 1px;
}

.animated-steps :deep(h5) {
  font-size: 18px;
  font-weight: 600;
}
</style>