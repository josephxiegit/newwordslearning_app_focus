<template>
  <div v-if="visible" class="half-true-overlay">
    <div class="half-true">
      <!-- 这里放置恶魔微笑的 SVG 或图片 -->
      <img
        :class="{ 'slide-out': isExiting }"
        :src="srcTheme"
        alt="Half True"
      />
      <!-- 添加艺术字体的文字 -->
      <div class="half-true-text">至少这次没白做！</div>
      <!-- 关闭按钮 -->
      <button class="close-button" @click="exitAnimation">关闭</button>
    </div>
  </div>
</template>

  
<script setup>
import { ref, inject, onMounted } from "vue";
// 主题路径
import halftrueSrcGoatAndWolf from '../assets/halftrue.png';
import halftrueSrcBears from '../assets/Boonie Bears/halftrue.gif';
const flagTheme = inject("flagTheme");
const srcTheme = ref("");

const visible = ref(false);
const isExiting = ref(false);

function show() {
  visible.value = true;
  setTimeout(hide, 4000);
}

function hide() {
  visible.value = false;
  isExiting.value = false; // 重置退出状态
}

function exitAnimation() {
  isExiting.value = true;
  setTimeout(hide, 500); // 加速动画时间
}

const methods = { show, hide, exitAnimation };
onMounted(() => {
  if (flagTheme.value == 1) {
    srcTheme.value = halftrueSrcGoatAndWolf;
  }
  if (flagTheme.value == 2) {
    srcTheme.value = halftrueSrcBears;
  }
});
defineExpose(methods);
</script>

  
<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Zhi+Mang+Xing&display=swap'); /* 引入艺术字体 */

.half-true-overlay {
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

.half-true {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.half-true img {
  width: 300px; /* 调整图片宽度 */
  height: auto; /* 让高度自动调整，保持宽高比 */
  max-width: 100%; /* 确保图片不会超过容器宽度 */
  max-height: 100%; /* 确保图片不会超过容器高度 */
  animation: slide-across 4s linear; /* Apply the slide animation */
}

.half-true img.slide-out {
  animation: slide-across-fast 0.5s linear forwards; /* 加速退出动画 */
}

.half-true-text {
  margin-top: 20px; /* 调整文字与图片的间距 */
  font-family: 'Zhi Mang Xing', cursive; /* 使用艺术字体 */
  font-size: 36px; /* 调整文字大小 */
  color: red; /* 设置文字颜色 */
  animation: smile-animation 1s infinite; /* 应用与图片相同的动画 */
}

.close-button {
  margin-top: 20px;
  padding: 10px 20px;
  font-size: 16px;
  cursor: pointer;
  background-color: white; /* 背景颜色白色 */
  color: red; /* 文字颜色红色 */
  border: 2px solid red; /* 红色边框 */
  border-radius: 20px; /* 圆角 */
  transition: background-color 0.3s, color 0.3s; /* 背景颜色和文字颜色过渡效果 */
}

.close-button:hover {
  background-color: darkred; /* 鼠标悬停时的背景颜色 */
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
    transform: translateX(-100%); /* Start off-screen to the left */
  }
  50% {
    transform: translateX(50%); /* Center of the screen */
  }
  100% {
    transform: translateX(200%); /* End off-screen to the right */
  }
}

@keyframes slide-across-fast {
  0% {
    transform: translateX(50%); /* 从屏幕中央开始 */
  }
  100% {
    transform: translateX(200%); /* 移动到屏幕右侧外 */
  }
}
</style>


  