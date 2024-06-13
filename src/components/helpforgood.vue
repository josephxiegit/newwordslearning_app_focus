<template>
  <div v-if="visible" :class="['help_for_good-overlay', { 'exit': isExiting, 'enter': isEntering }]">
    <div class="help_for_good">
      <!-- 这里放置恶魔微笑的 SVG 或图片 -->
      <img src="../assets/victory5.gif" alt="help_for_good">
      <!-- 添加艺术字体的文字 -->
      <div class="help_for_good-text">全对了！</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, defineExpose } from 'vue';

const visible = ref(false);
const isEntering = ref(false);
const isExiting = ref(false);

function show() {
  isEntering.value = true;
  visible.value = true;
  isExiting.value = false;
  setTimeout(() => {
    isEntering.value = false;
  }, 500); // 进入动画时长

  // 三秒后消失
  setTimeout(() => {
    hide();
  }, 3000);
}

function hide() {
  isExiting.value = true;
  setTimeout(() => {
    visible.value = false;
    isExiting.value = false;
  }, 400); // 匹配退出动画时长
}

const methods = { show, hide };

defineExpose({ ...methods, visible });

onMounted(() => {
  isEntering.value = false;
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Zhi+Mang+Xing&display=swap'); /* 引入艺术字体 */

.help_for_good-overlay {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%); /* 使元素居中 */
  background-color: rgba(0, 0, 0, 0);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  transition: transform 1s linear; /* 添加平滑过渡效果 */
}

.help_for_good-overlay.enter {
  animation: enter-animation 0.5s forwards; /* 进入动画 */
}

.help_for_good-overlay.exit {
  animation: exit-animation 0.5s forwards; /* 退出动画 */
}

@keyframes enter-animation {
  0% {
    transform: translate(-50%, -150%); /* 从屏幕顶部开始 */
  }
  100% {
    transform: translate(-50%, -50%); /* 移动到屏幕中央 */
  }
}

@keyframes exit-animation {
  0% {
    transform: translate(-50%, -50%); /* 从屏幕中央开始 */
  }
  100% {
    transform: translate(-50%, -150%); /* 移动到屏幕顶部外 */
  }
}

.help_for_good {
  display: flex;
  align-items: center;
}

.help_for_good img {
  width: 150px; /* 调整图片宽度 */
  height: auto; /* 让高度自动调整，保持宽高比 */
  max-width: 100%; /* 确保图片不会超过容器宽度 */
  max-height: 100%; /* 确保图片不会超过容器高度 */
  margin-right: 20px; /* 调整图片与文字之间的间距 */
}

.help_for_good-text {
  writing-mode: vertical-rl; /* 竖排文字 */
  text-orientation: upright; /* 文字直立方向 */
  font-family: 'Zhi Mang Xing', cursive;
  font-size: 20px; /* 调整文字大小 */
  color: black; /* 设置文字颜色 */
}
</style>
