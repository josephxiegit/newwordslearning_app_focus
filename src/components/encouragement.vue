<template>
  <div v-if="visible" :class="['encouragement-overlay', { 'exit': isExiting, 'enter': isEntering }]">
    <div class="encouragement">
      <!-- 这里放置恶魔微笑的 SVG 或图片 -->
      <img :src="srcTheme" alt="encouragement">
      <!-- 添加艺术字体的文字 -->
      <div class="encouragement-text">完成一半了哦！</div>
      <!-- 关闭按钮 -->
      <button class="close-button" @click="hide">关闭</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, defineExpose, inject } from 'vue';
// 主题路径
import encouragementSrcGoatAndWolf from '../assets/encouragement.gif';
import encouragementSrcBears from '../assets/Boonie Bears/encouragement.gif';
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

  // 三秒后消失
  setTimeout(() => {
    hide();
  }, 5000);
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
    srcTheme.value = encouragementSrcGoatAndWolf;
  }
  if (flagTheme.value == 2) {
    srcTheme.value = encouragementSrcBears;
  }
  isEntering.value = false;
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Zhi+Mang+Xing&display=swap'); /* 引入艺术字体 */

.encouragement-overlay {
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

.encouragement-overlay.enter {
  animation: enter-animation 0.5s forwards; /* 进入动画 */
}

.encouragement-overlay.exit {
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
    transform: translateX(100vw); /* 移动到屏幕右侧外 */
  }
}

.encouragement {
  display: flex;
  align-items: center;
  position: relative; /* 添加相对定位 */
  flex-direction: column; /* 让内容垂直排列 */
}

.encouragement img {
  width: 150px; /* 调整图片宽度 */
  height: auto; /* 让高度自动调整，保持宽高比 */
  max-width: 100%; /* 确保图片不会超过容器宽度 */
  max-height: 100%; /* 确保图片不会超过容器高度 */
  margin-bottom: 20px; /* 调整图片与文字之间的间距 */
}

.encouragement-text {
  font-family: 'Zhi Mang Xing', cursive;
  font-size: 20px; /* 调整文字大小 */
  color: black; /* 设置文字颜色 */
  margin-bottom: 20px; /* 调整文字与按钮之间的间距 */
}

/* 新增的关闭按钮样式 */
.close-button {
  background-color: white;
  border: 2px solid red; /* 修改边框为红色 */
  color: red;
  padding: 5px 10px; /* 缩小按钮的尺寸 */
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 14px; /* 调整字体大小 */
  margin-top: 10px;
  cursor: pointer;
  border-radius: 12px; /* 圆角 */
}

.close-button:hover {
  background-color: darkred; /* 鼠标悬停时的颜色 */
  color: white; /* 鼠标悬停时的字体颜色 */
}
</style>
