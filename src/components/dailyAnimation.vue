<template>
  <div v-if="visible" class="wolf-back-overlay">
    <div class="wolf-back">
      <img :src="srcTheme" :style="{ width: '300px', height: 'auto', maxWidth: '100%', maxHeight: '100%' }" alt="Wolf Back">
      <div class="text">还要再来一次？！</div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, onMounted} from 'vue';

// 主题路径
import dailySrcGoatAndWolf from '../assets/dailyTask.gif';

import dailySrcBears_true from '../assets/Boonie Bears/dailyTask.gif';
const flagTheme = inject("flagTheme");
const srcTheme = ref("");


const visible = ref(false);

function show() {
  visible.value = true;
  setTimeout(hide, 2700);
}

function hide() {
  visible.value = false;

}


const methods = { show, hide };
onMounted(() => {
  if (flagTheme.value == 1) {
    srcTheme.value = dailySrcGoatAndWolf
  }
  if (flagTheme.value == 2) {
    srcTheme.value = dailySrcBears_true
  }
});


defineExpose(methods);
</script>

<style scoped>

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

.text {
  margin-top: 20px; /* 调整文字与图片的间距 */
  font-size: 28px; /* 调整文字大小 */
  color: red; /* 设置文字颜色 */
}
</style>
