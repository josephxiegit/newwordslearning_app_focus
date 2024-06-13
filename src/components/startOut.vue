<template>
  <div v-if="visible" class="start-out-overlay">
    <div class="start-out">
      <img src="../assets/startout.png" alt="Wolf Back">
    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue';

const visible = ref(false);

function show() {
  visible.value = true;
  setTimeout(hide, 3000); // 延长显示时间以包含落叶动画
}

function hide() {
  visible.value = false;
}

const methods = { show, hide };

defineExpose(methods);
</script>

<style scoped>
.start-out-overlay {
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

.start-out img {
  width: 300px; /* 调整图片宽度 */
  height: auto; /* 让高度自动调整，保持宽高比 */
  max-width: 100%; /* 确保图片不会超过容器宽度 */
  max-height: 100%; /* 确保图片不会超过容器高度 */
  animation: slide-across 1s linear forwards; /* Apply the slide animation with 1s duration and forwards fill mode */
}


@keyframes slide-across {
  0% {
    transform: translateX(-100%); /* Start off-screen to the left */
  }
  100% {
    transform: translateX(180%); /* End off-screen to the right */
  }
}

</style>
