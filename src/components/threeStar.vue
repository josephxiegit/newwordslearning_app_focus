<template>
  <div v-if="visible" :class="['three-star-overlay', { 'exit': isExiting, 'enter': isEntering }]">
    <div class="three-star">
      <img src="../assets/victory7.gif" alt="three star">
      <img src="../assets/victory7.gif" alt="three star">
      <img src="../assets/victory7.gif" alt="three star">
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
  }, 2000); // 进入动画时长

  // 五秒后消失
  setTimeout(() => {
    hide();
  }, 3000); // 保证动画持续5秒后开始退出
}

function hide() {
  isExiting.value = true;
  setTimeout(() => {
    visible.value = false;
    isExiting.value = false;
  }, 2000); // 匹配退出动画时长
}

const methods = { show, hide };

defineExpose({ ...methods, visible });

onMounted(() => {
  visible.value = false;
});
</script>

<style scoped>
.three-star-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%; /* 覆盖整个视窗 */
  background-color: rgba(0, 0, 0, 0); /* 半透明背景 */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.three-star {
  display: flex;
  flex-direction: column; /* 纵向排列 */
  justify-content: center;
  align-items: center;
}

.three-star img {
  width: 80%; /* 放大图片 */
  height: auto; /* 保持宽高比 */
  object-fit: contain;
  transition: transform 2s ease-in-out, opacity 2s ease-in-out; /* 添加平滑过渡效果 */
  margin-bottom: 5px; /* 图片之间的间距 */
}

.three-star-overlay.enter .three-star img {
  animation: enter-animation 2s forwards ease-in-out;
}

.three-star-overlay.exit .three-star img {
  animation: exit-animation 2s forwards ease-in-out;
}

@keyframes enter-animation {
  0% {
    transform: translateX(100%); /* 从屏幕右侧开始 */
    opacity: 1;
  }
  100% {
    transform: translateX(0); /* 移动到屏幕中央 */
    opacity: 1;
  }
}

@keyframes exit-animation {
  0% {
    transform: translateX(0); /* 从屏幕中央开始 */
    opacity: 1;
  }
  100% {
    transform: translateX(-150%); /* 移动到屏幕左侧 */
    opacity: 1;
  }
}
</style>
