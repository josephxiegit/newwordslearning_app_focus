<template>
  <div v-if="visible" :class="['help_for_bad-overlay', { 'exit': isExiting }]">
    <div class="help_for_bad">
      <img src="../assets/fail1.gif" alt="help_for_bad">
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, defineExpose } from 'vue';

const visible = ref(false);
const isEntering = ref(false);
const isExiting = ref(false);

function show() {
  visible.value = true;
  isExiting.value = false;
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
  visible.value = false;
});
</script>

<style scoped>
.help_for_bad-overlay {
  position: fixed;
  top: 35%;
  left: 72%;
  transform: translate(-50%, -50%); /* 使元素居中 */
  background-color: rgba(0, 0, 0, 0);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  transition: none; /* 移除进入动画 */
}

.help_for_bad-overlay.exit {
  animation: exit-animation 1s forwards; /* 退出动画 */
}

@keyframes exit-animation {
  0% {
    transform: translate(-50%, -50%); /* 从屏幕中央开始 */
  }
  100% {
    transform: translate(100%, -50%); /* 移动到屏幕右侧外 */
  }
}

.help_for_bad {
  display: flex;
  align-items: center;
}

.help_for_bad img {
  width: 150px; /* 调整图片宽度 */
  height: auto; /* 让高度自动调整，保持宽高比 */
  max-width: 100%; /* 确保图片不会超过容器宽度 */
  max-height: 100%; /* 确保图片不会超过容器高度 */
  margin-right: 20px; /* 调整图片与文字之间的间距 */
}
</style>
