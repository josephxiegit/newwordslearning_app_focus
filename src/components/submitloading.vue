<template>
  <div class="loading-overlay">
    <div class="loading">
      <img :src="srcTheme" alt="Loading" class="loading-icon" />
      <span class="loading-text">{{ loadingText }}</span>
    </div>
  </div>
</template>
  
  <script setup>
import { ref, computed, onMounted, onUnmounted, inject } from "vue";
// 主题路径
import submitloadingSrcGoatAndWolf from '../assets/submitloading.gif';
import submitloadingSrcBears from '../assets/Boonie Bears/submitloading.gif';
const flagTheme = inject("flagTheme");
const srcTheme = ref("");

const dotCount = ref(1);

const loadingText = computed(() => `提交中${".".repeat(dotCount.value)}`);

onMounted(() => {
  if (flagTheme.value == 1) {
    srcTheme.value = submitloadingSrcGoatAndWolf;
  }
  if (flagTheme.value == 2) {
    srcTheme.value = submitloadingSrcBears;
  }
  const interval = setInterval(() => {
    dotCount.value = (dotCount.value % 3) + 1;
  }, 500); // 每 500 毫秒更新一次

  onUnmounted(() => {
    clearInterval(interval);
  });
});
</script>
  
  <style scoped>
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.3); /* 可选: 添加半透明背景 */
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999; /* 确保这个值大于 Popup 组件的 z-index */
}
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.loading-icon {
  width: 100px; /* 你可以根据需要调整图片大小 */
  height: 100px;
  margin-bottom: 10px;
}

.loading-text {
  font-size: 13px;
}
</style>
  