<template>
  <van-popup
    v-model:show="isVisible"
    position="right"
    :style="{ width: '100%', height: '100%' }"
    @open="handleOpen"
  >
    <div
      style="
        padding-top: 13%;
        text-align: center;
        font-size: 24px;
        font-weight: bold;
        position: relative;
      "
    >
      <span>本周任务</span>
      <img
        v-if="isVisible"
        :src="currentThemeImage"
        alt="任务图标"
        class="slide-in-image"
        style="
          width: 80px;
          height: 80px;
          object-fit: contain;
          position: absolute;
          right: 2rem;
          top: 80%;
          transform: translateY(-50%);
        "
      />
    </div>
    <div style="display: flex; justify-content: center; margin-top: 1rem">
      <van-steps
        direction="vertical"
        :active="animatedStep"
        active-icon="success"
        class="animated-steps"
      >
        <van-step>
          <h3>开始学习</h3>
        </van-step>
        <van-step>
          <h3>本周首次</h3>
        </van-step>
        <van-step>
          <h3>本周二次</h3>
        </van-step>
        <van-step>
          <h3>任务完成</h3>
        </van-step>
        <van-step>
          <h3>完成四次</h3>
        </van-step>
        <van-step>
          <h3>完成五次</h3>
        </van-step>
        <van-step>
          <h3>金色传说</h3>
        </van-step>
      </van-steps>
    </div>
    <div
      v-show="showButton"
      style="display: flex; justify-content: center; margin-top: 1rem"
    >
      <van-button type="success" style="width: 60%" @click="handleContinue"
        >继续</van-button
      >
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
      startTimers(); // 👈 关键
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
    // isVisible.value = false;
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
.animated-steps :deep(.van-step__circle),
.animated-steps :deep(.van-step__line),
.animated-steps :deep(.van-step__title) {
  transition: all 0.3s ease-in-out;
}

.slide-in-image {
  animation: slideInFromRight 0.9s ease-out 0.9s both;
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