<template>
  <div v-if="visible" class="wolf-back-overlay">
    <div class="wolf-back">
      <!-- 这里放置恶魔微笑的 SVG 或图片 -->
      <img :src="srcTheme" alt="Wolf Back">
      <!-- 添加艺术字体的文字 -->
      <div class="wolf-text">我会回来的</div>
      <!-- 关闭按钮 -->
      <button class="close-button" @click="hide">关闭</button>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, onMounted } from 'vue';
// 主题路径
import gray_wolfSrcGoatAndWolf from '../assets/gray_wolf.png';
import gray_wolfSrcBears from '../assets/Boonie Bears/gray_wolf.png';
const flagTheme = inject("flagTheme");
const srcTheme = ref("");


const visible = ref(false);

function show() {
  visible.value = true;
  setTimeout(hide, 4000);
}

function hide() {
  visible.value = false;

}

const methods = { show, hide };
onMounted(() => {
  if (flagTheme.value == 1) {
    srcTheme.value = gray_wolfSrcGoatAndWolf;
  }
  if (flagTheme.value == 2) {
    srcTheme.value = gray_wolfSrcBears;
  }
});
defineExpose(methods);
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Zhi+Mang+Xing&display=swap'); /* 引入艺术字体 */

.wolf-back-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.2);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.wolf-back {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative; /* 相对定位以便于定位关闭按钮 */
}

.wolf-back img {
  width: 150px; /* 调整图片宽度 */
  height: auto; /* 让高度自动调整，保持宽高比 */
  max-width: 100%; /* 确保图片不会超过容器宽度 */
  max-height: 100%; /* 确保图片不会超过容器高度 */
  animation: slide-across 4s linear; /* 应用滑动动画 */
}

.wolf-text {
  margin-top: 20px; /* 调整文字与图片的间距 */
  font-family: 'Zhi Mang Xing', cursive; /* 使用艺术字体 */
  font-size: 36px; /* 调整文字大小 */
  color: white; /* 设置文字颜色 */
  animation: smile-animation 1s infinite; /* 应用与图片相同的动画 */
  text-align: center; /* 文本居中 */
}

/* 关闭按钮样式 */
.close-button {
  background-color: white;
  border: 2px solid red; /* 边框颜色 */
  color: red;
  padding: 5px 10px; /* 按钮尺寸 */
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 14px; /* 字体大小 */
  cursor: pointer;
  border-radius: 12px; /* 圆角 */
  margin-top: 20px; /* 按钮与文字的距离 */
}

.close-button:hover {
  background-color: darkred; /* 鼠标悬停时的背景颜色 */
  color: white; /* 鼠标悬停时的字体颜色 */
}

@keyframes smile-animation {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.4);
  }
}

@keyframes slide-across {
  0% {
    transform: translateX(-100%); /* 从屏幕左侧开始 */
  }
  50% {
    transform: translateX(50%); /* 屏幕中间 */
  }
  100% {
    transform: translateX(200%); /* 到屏幕右侧结束 */
  }
}

@keyframes slide-out-fast {
  0% {
    transform: translateX(50%); /* 从当前位置开始 */
  }
  100% {
    transform: translateX(200%); /* 快速移到屏幕右侧外 */
  }
}
</style>
