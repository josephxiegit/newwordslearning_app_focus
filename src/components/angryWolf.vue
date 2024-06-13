<template>
  <div v-if="visible" :class="['wolf-back-overlay', { 'exit': isExiting, 'enter': isEntering }]">
    <div class="wolf-back">
      <!-- 添加艺术字体的文字 -->
      <div class="wolf-text">不能看答案</div>
      <!-- 这里放置恶魔微笑的 SVG 或图片 -->
      <img src="../assets/angry_wolf.gif" alt="Wolf Back">
      
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
  isEntering.value = false;
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Zhi+Mang+Xing&display=swap'); /* 引入艺术字体 */

.wolf-back-overlay {
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

.wolf-back-overlay.enter {
  animation: enter-animation 0.5s forwards; /* 进入动画 */
}

.wolf-back-overlay.exit {
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

.wolf-back {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.wolf-back img {
  width: 150px; /* 调整图片宽度 */
  height: auto; /* 让高度自动调整，保持宽高比 */
  max-width: 100%; /* 确保图片不会超过容器宽度 */
  max-height: 100%; /* 确保图片不会超过容器高度 */
}

.wolf-text {
  margin-top: 20px; /* 调整文字与图片的间距 */
  font-family: 'Zhi Mang Xing', cursive; /* 使用艺术字体 */
  font-size: 30px; /* 调整文字大小 */
  color: white; /* 设置文字颜色 */
  transform: translateX(-20px); /* 向左移动 20px */
}
</style>
