<template>
  <div v-if="visible" class="wolf-back-overlay">
    <div class="wolf-back">
      <img :src="srcTheme" :style="{ width: imgWidth, height: 'auto', maxWidth: '100%', maxHeight: '100%' }" alt="Wolf Back">
    </div>
  </div>
</template>

<script setup>
import { ref, inject, onMounted, defineProps, watch, computed } from 'vue';
const props = defineProps({
  flagChoose: {
    type: Boolean,
    required: true
  },
});
// 主题路径
import gray_wolfSrcGoatAndWolf_true from '../assets/preExam-true.gif';
import gray_wolfSrcGoatAndWolf_false from '../assets/preExam-false.gif';

import gray_wolfSrcBears_true from '../assets/Boonie Bears/preExam-true.gif';
import gray_wolfSrcBears_false from '../assets/Boonie Bears/preExam-false.gif';
const flagTheme = inject("flagTheme");
const srcTheme = ref("");


const visible = ref(false);

function show() {
  visible.value = true;
  setTimeout(hide, 300);
}

function hide() {
  visible.value = false;

}
const imgWidth = computed(() => {
  return props.flagChoose ? '250px' : '300px';
});

const methods = { show, hide };
onMounted(() => {
  // console.log("flagTheme", flagTheme.value);
  updateSrcTheme(props.flagChoose);

});
watch(() => props.flagChoose, (newVal) => {
    updateSrcTheme(newVal);
});
function updateSrcTheme(flag) {
  if (flagTheme.value == 1) {
    srcTheme.value = flag ? gray_wolfSrcGoatAndWolf_true : gray_wolfSrcGoatAndWolf_false;
  }
  if (flagTheme.value == 2) {
    srcTheme.value = flag ? gray_wolfSrcBears_true : gray_wolfSrcBears_false;
  }
  // console.log("srcTheme", srcTheme.value);
  
}
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

.wolf-text {
  margin-top: 20px; /* 调整文字与图片的间距 */
  font-family: 'Zhi Mang Xing', cursive; /* 使用艺术字体 */
  font-size: 36px; /* 调整文字大小 */
  color: white; /* 设置文字颜色 */
  animation: smile-animation 1s infinite; /* 应用与图片相同的动画 */
  text-align: center; /* 文本居中 */
}
</style>
