<template>
  <div v-if="visible" class="miss-you-overlay">
    <div class="miss-you">
      <!-- 这里放置恶魔微笑的 SVG 或图片 -->
      <img src="../assets/missyou.gif" alt="miss you">
      <!-- 添加艺术字体的文字 -->
      <div class="miss-text">已经 {{ days }} 天没学习了？好想你啊！</div>
      <!-- 关闭按钮 -->
      <button class="close-button" @click="hide">X</button>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, defineExpose } from 'vue';

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

defineExpose(methods);
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
/* 引入艺术字体 */

.miss-you-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.3);
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
}

.miss-you img {
  width: 300px; /* 调整图片宽度 */
  height: auto; /* 让高度自动调整，保持宽高比 */
  max-width: 100%; /* 确保图片不会超过容器宽度 */
  max-height: 100%; /* 确保图片不会超过容器高度 */
}

.miss-text {
  margin-top: 20px; /* 调整文字与图片的间距 */
  font-family: 'Zhi Mang Xing', cursive; /* 使用艺术字体 */
  font-size: 24px; /* 调整文字大小 */
  color: red; /* 设置文字颜色 */
}

.close-button {
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: red;
  color: white;
  border: none;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
