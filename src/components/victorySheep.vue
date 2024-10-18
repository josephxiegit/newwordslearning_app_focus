<template>
  <div v-if="visible" :class="['victory-sheep-overlay', { 'exit': isExiting, 'enter': isEntering }]">
    <div class="victory-sheep">
      <img :src="srcTheme" alt="sheep victory">
      <button class="close-button" @click="hide">关闭</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, defineExpose, inject } from 'vue';
// 主题路径
import wolfkissSrcGoatAndWolf from '../assets/wolfkiss.gif';
import wolfkissSrcBears from '../assets/Boonie Bears/wolfkiss.gif';
const flagTheme = inject("flagTheme");
const srcTheme = ref("");

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
}

function hide() {
  isExiting.value = true;
  setTimeout(() => {
    visible.value = false;
    isExiting.value = false;
  }, 1000); // 匹配退出动画时长
}

const methods = { show, hide };

defineExpose({ ...methods, visible });

onMounted(() => {
  if (flagTheme.value == 1) {
    srcTheme.value = wolfkissSrcGoatAndWolf;
  }
  if (flagTheme.value == 2) {
    srcTheme.value = wolfkissSrcBears;
  }
  isEntering.value = false;
});
</script>

<style scoped>
.victory-sheep-overlay {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%); /* 使元素居中 */
  width: 100%; /* 占满整个屏幕宽度 */
  height: 100%; /* 占满整个屏幕高度 */
  background-color: rgba(0, 0, 0, 0); /* 半透明灰色背景 */
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px; /* 添加一些内边距 */
  z-index: 9999;
  transition: transform 1s linear; /* 添加平滑过渡效果 */
}

.victory-sheep-overlay.enter {
  animation: enter-animation 0.5s forwards; /* 进入动画 */
}

.victory-sheep-overlay.exit {
  animation: exit-animation 1s forwards; /* 退出动画 */
}

@keyframes enter-animation {
  0% {
    transform: translate(-50%, -150%); /* 从屏幕顶部开始 */
    opacity: 0; /* 初始透明度 */
  }
  100% {
    transform: translate(-50%, -50%); /* 移动到屏幕中央 */
    opacity: 1; /* 最终透明度 */
  }
}

@keyframes exit-animation {
  0% {
    transform: translate(-50%, -50%); /* 从屏幕中央开始 */
    opacity: 1; /* 初始透明度 */
  }
  100% {
    transform: translate(0%, -150%); /* 移动到屏幕顶部外 */
    opacity: 0; /* 最终透明度 */
  }
}

.victory-sheep {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.victory-sheep img {
  width: 100%; /* 设置图片宽度为容器宽度 */
  height: auto; /* 让高度自动调整，保持宽高比 */
  max-width: 800px; /* 确保图片不会超过800px宽 */
  max-height: 90vh; /* 确保图片不会超过屏幕高度的90% */
}

.close-button {
  margin-top: 20px;
  padding: 8px 16px;
  font-size: 16px;
  background-color: transparent; /* 按钮背景颜色 */
  color: red; /* 按钮文本颜色 */
  font-weight: 700;
  border: 2px solid red; /* 去掉边框 */
  border-radius: 5px; /* 添加圆角 */
  cursor: pointer; /* 鼠标悬停样式 */
  transition: background-color 0.3s; /* 平滑过渡效果 */
}

.close-button:hover {
  background-color: #d32f2f; /* 悬停时按钮背景颜色 */
}
</style>
