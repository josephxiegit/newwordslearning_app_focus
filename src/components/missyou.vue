<template>
  <div v-if="visible" class="miss-you-overlay">
    <div class="miss-you">
      <!-- 这里放置恶魔微笑的 SVG 或图片 -->
      <img :src="srcTheme" alt="miss you">
      <!-- 添加艺术字体的文字 -->
      <div class="miss-text">已经 {{ days }} 天没学习了？好想你啊！</div>
      <!-- 关闭按钮 -->
      <button class="close-button" @click="hide">×</button>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, defineExpose, inject, onMounted } from 'vue';
// 主题路径
import missyouSrcGoatAndWolf from '../assets/missyou.gif';
import missyouSrcBears from '../assets/Boonie Bears/missyou.gif';
const flagTheme = inject("flagTheme");
const srcTheme = ref("");

const props = defineProps({
  days: {
    type: Number,
    required: true
  }
});

const visible = ref(false);

function show() {
  visible.value = true;
}

function hide() {
  visible.value = false;
}

const methods = { show, hide };

onMounted(() => {
  if (flagTheme.value == 1) {
    srcTheme.value = missyouSrcGoatAndWolf;
  }
  if (flagTheme.value == 2) {
    srcTheme.value = missyouSrcBears;
  }
});

defineExpose(methods);
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Zhi+Mang+Xing&display=swap'); /* 引入艺术字体 */

.miss-you-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: transparent;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.miss-you {
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: white;
  padding: 20px;
  border-radius: 10px;
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
}

.miss-you img {
  width: 300px;
  height: auto;
  max-width: 100%;
  max-height: 60vh; /* 限制最大高度 */
  object-fit: contain;
}

.miss-text {
  margin-top: 20px;
  font-family: 'Zhi Mang Xing', cursive;
  font-size: 24px;
  color: red;
  text-align: center;
  line-height: 1.4;
}

/* 重置并强制设置关闭按钮样式 */
.close-button {
  /* 重置所有可能的继承样式 */
  all: initial;
  
  /* 设置基本样式 */
  position: absolute !important;
  top: 10px !important;
  right: 10px !important;
  
  /* 尺寸和外观 */
  width: 32px !important;
  height: 32px !important;
  min-width: 32px !important;
  min-height: 32px !important;
  max-width: 32px !important;
  max-height: 32px !important;
  
  /* 背景和边框 */
  background-color: #ff4444 !important;
  border: none !important;
  border-radius: 50% !important;
  
  /* 文字样式 */
  color: white !important;
  font-size: 18px !important;
  font-weight: bold !important;
  line-height: 1 !important;
  
  /* 布局 */
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  
  /* 交互 */
  cursor: pointer !important;
  user-select: none !important;
  
  /* 盒模型 */
  padding: 0 !important;
  margin: 0 !important;
  box-sizing: border-box !important;
  
  /* 过渡效果 */
  transition: all 0.2s ease !important;
}

.close-button:hover {
  background-color: #cc3333 !important;
  transform: scale(1.1) !important;
}

.close-button:active {
  transform: scale(0.95) !important;
}

.close-button:focus {
  outline: none !important;
  box-shadow: 0 0 0 2px rgba(255, 68, 68, 0.3) !important;
}

/* 响应式调整 */
@media (max-width: 480px) {
  .miss-you {
    padding: 15px;
    margin: 20px;
  }
  
  .miss-you img {
    width: 250px;
    max-height: 50vh;
  }
  
  .miss-text {
    font-size: 20px;
    margin-top: 15px;
  }
  
  .close-button {
    width: 28px !important;
    height: 28px !important;
    min-width: 28px !important;
    min-height: 28px !important;
    max-width: 28px !important;
    max-height: 28px !important;
    font-size: 16px !important;
    top: 8px !important;
    right: 8px !important;
  }
}
</style>