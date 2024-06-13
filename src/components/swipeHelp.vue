<template>
  <div v-if="visible" :class="['swipeHelp-overlay', { 'exit': isExiting, 'enter': isEntering }]">
    <div class="swipeHelp">
      <!-- 这里放置恶魔微笑的 SVG 或图片 -->
      <img src="../assets/swipeHelp.gif" alt="swipeHelp">
      <!-- 添加艺术字体的文字 -->
      <div class="swipeHelp-text">magic！</div>
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
  }, 500);

}

function hide() {
  isExiting.value = true;
  setTimeout(() => {
    visible.value = false;
    isExiting.value = false;
  }, 0);
}

const methods = { show, hide };

defineExpose({ ...methods, visible });

onMounted(() => {
  isEntering.value = false;
});
</script>

<style scoped>
/* @import url('https://fonts.googleapis.com/css2?family=Zhi+Mang+Xing&display=swap'); */

.swipeHelp-overlay {
  position: fixed;
  top: 12%;
  left: 3%;
  width: auto;
  height: auto;
  background-color: rgba(0, 0, 0, 0);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px; /* 添加一些内边距 */
  z-index: 9999;
  transition: transform 1s linear; /* 添加平滑过渡效果 */
}

.swipeHelp-overlay.enter {
  animation: enter-animation 0.5s forwards; /* 进入动画 */
}

.swipeHelp-overlay.exit {
  animation: exit-animation 1s forwards; /* 退出动画 */
}

@keyframes enter-animation {
  0% {
    transform: translateY(-100vh); /* 从屏幕顶部开始 */
  }
  100% {
    transform: translateY(0); /* 移动到最终位置 */
  }
}

@keyframes exit-animation {
  0% {
    transform: translateX(0); /* 从当前位置开始 */
  }
  100% {
    transform: translateX(0); /* 移动到屏幕右侧外 */
  }
}

.swipeHelp {
  display: flex;
  align-items: center;
}

.swipeHelp img {
  width: 100%; /* 调整图片宽度 */
  height: auto; /* 让高度自动调整，保持宽高比 */
  max-width: 100%; /* 确保图片不会超过容器宽度 */
  max-height: 100%; /* 确保图片不会超过容器高度 */
  margin-right: 20px; /* 调整图片与文字之间的间距 */
}

.swipeHelp-text {
  writing-mode: vertical-rl; /* 竖排文字 */
  text-orientation: upright; /* 文字直立方向 */
  font-family: 'Zhi Mang Xing', cursive;
  font-size: 20px; /* 调整文字大小 */
  color: black; /* 设置文字颜色 */
}
</style>
