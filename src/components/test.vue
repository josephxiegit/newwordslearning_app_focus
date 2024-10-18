<template>
  <div
    v-if="visible"
    :class="['wolf-back-overlay', { exit: isExiting, enter: isEntering }]"
  >
    <div class="wolf-back">
      <!-- 这里放置恶魔微笑的 SVG 或图片 -->
      <img :src=srcTheme alt="test" />
      <!-- 添加艺术字体的文字 -->
      <div class="test-text">考试了！</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, defineExpose, inject } from "vue";
// 主题路径
import testSrcGoatAndWolf from '../assets/test.gif';
import testSrcBears from '../assets/Boonie Bears/test.gif';
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
    srcTheme.value = testSrcGoatAndWolf;
  }
  if (flagTheme.value == 2) {
    srcTheme.value = testSrcBears;
  }
  isEntering.value = false;
});
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Zhi+Mang+Xing&display=swap"); /* 引入艺术字体 */

.wolf-back-overlay {
  position: absolute;
  top: calc(80% + 6px);
  left: 50%; /* 水平居中 */
  transform: translateX(-50%); /* 水平方向的平移使得元素中心与屏幕中心对齐 */
  background-color: rgba(0, 0, 0, 0); /* 背景透明 */
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px; /* 添加内边距 */
  z-index: 9999; /* 设置足够高的层级以确保元素可见 */
  transition: transform 1s linear; /* 平滑的过渡效果 */
}

.wolf-back-overlay.exit {
  animation: exit-animation 1s forwards; /* 定义退出动画 */
}

@keyframes enter-animation {
  0% {
    transform: translateY(-100vh); /* 从屏幕顶部进入 */
  }
  100% {
    transform: translateY(0); /* 移动到最终位置 */
  }
}

@keyframes exit-animation {
  0% {
    transform: translateX(0); /* 开始时在原位置 */
  }
  100% {
    transform: translateX(100vw); /* 移动到屏幕右侧外 */
  }
}

.wolf-back {
  display: flex;
  flex-direction: column;
  align-items: center; /* 确保所有子元素都水平居中 */
}

.wolf-back img {
  width: 60px; /* 图片宽度 */
  height: auto; /* 高度自动调整以保持宽高比 */
}

.test-text {
  font-family: 'Zhi Mang Xing', cursive; /* 使用特定的艺术字体 */
  font-size: 15px; /* 字体大小 */
  color: red; /* 文字颜色 */
  text-align: center; /* 文字居中对齐 */
  width: 100%; /* 宽度调整为100%以匹配父容器的宽度 */
}
</style>
