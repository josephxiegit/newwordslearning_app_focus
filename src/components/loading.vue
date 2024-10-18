<template>
  <div class="loading-overlay">
    <div class="loading">
      <img :src="srcTheme" alt="Loading" class="loading-icon" />
      <span class="loading-text">{{ loadingText }}</span>
    </div>
  </div>
</template>

<script setup>
import {
  ref,
  computed,
  onMounted,
  onUnmounted,
  defineProps,
  inject,
} from "vue";
import loadingSrcGoatAndWolf from '../assets/loading.gif';
import loadingSrcBears from '../assets/Boonie Bears/loading.gif';



const dotCount = ref(1);
const flagTheme = inject("flagTheme");
const srcTheme = ref("");
const loadingText = computed(() => `加载中${".".repeat(dotCount.value)}`);

onMounted(() => {
  if (flagTheme.value == 1) {
    srcTheme.value = loadingSrcGoatAndWolf
  }
  if (flagTheme.value == 2) {
    srcTheme.value = loadingSrcBears;
  }
});
onUnmounted(() => {
  const interval = setInterval(() => {
    dotCount.value = (dotCount.value % 3) + 1;
  }, 500);
  clearInterval(interval);
});
</script>

<style scoped>
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0); /* 可选: 添加半透明背景 */
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.loading-icon {
  width: 60px;
  height: 60px;
  margin-bottom: 10px;
}

.loading-text {
  font-size: 13px;
}
</style>
