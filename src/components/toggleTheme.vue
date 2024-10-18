<template>
  <div v-if="visible" class="wolf-back-overlay">
    <div class="wolf-back">
      <!-- 这里放置恶魔微笑的 SVG 或图片 -->
      <img :src="srcTheme" alt="Wolf Back">
      <div class="text_give">{{ props.textGive }}</div>
      <!-- 关闭按钮 -->
      <button class="close-button" @click="hide">关闭</button>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, onMounted } from 'vue';
// 主题路径
import gray_wolfSrcGoatAndWolf from '../assets/toggle_theme.gif';
import gray_wolfSrcBears from '../assets/Boonie Bears/toggle_theme.gif';
const flagTheme = inject("flagTheme");
const srcTheme = ref("");

const props = defineProps({
  textGive: {
    type: String,
    required: false,
  },
});
const visible = ref(false);

function show() {
  // console.log('flagTheme', flagTheme.value);
  if (flagTheme.value == 1) {
    srcTheme.value = gray_wolfSrcGoatAndWolf;
  }
  if (flagTheme.value == 2) {
    srcTheme.value = gray_wolfSrcBears;
  }
  visible.value = true;
  setTimeout(hide, 20000);
}

function hide() {
  visible.value = false;

}

const methods = { show, hide };
onMounted(() => {
});
defineExpose(methods);
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Zhi+Mang+Xing&display=swap'); /* 引入艺术字体 */

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
  max-width: 90vw; /* 父容器的最大宽度设置为视口宽度的90% */
  padding: 10px; /* 可以给父容器设置一些内边距，以便于控制布局 */
}
.wolf-back img {
  width: 100%; /* 设置宽度为父元素的100% */
  height: auto; /* 保持宽高比 */
  max-width: 600px; /* 你可以添加一个最大宽度限制 */
  max-height: 90vh; /* 使用视口高度限制，确保在移动设备上不过于小 */
}

/* 关闭按钮样式 */
.close-button {
  background-color: white;
  border: 2px solid red; /* 边框颜色 */
  color: red;
  padding: 5px 10px; /* 按钮尺寸 */
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 14px; /* 字体大小 */
  cursor: pointer;
  border-radius: 12px; /* 圆角 */
  margin-top: 20px; /* 按钮与文字的距离 */
}

.close-button:hover {
  background-color: darkred; /* 鼠标悬停时的背景颜色 */
  color: white; /* 鼠标悬停时的字体颜色 */
}

.text_give {
  position: absolute;
  top: -30%; /* 根据需要调整，决定文本距离图片顶部的距离 */
  left: 50%;
  transform: translateX(-50%); /* 水平居中 */
  color: red; /* 文本颜色 */
  font-size: 24px; /* 字体大小 */
  font-weight: bold; /* 粗体 */
  z-index: 1; /* 确保文本在图片上方 */
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.7); /* 文本阴影，增加可读性 */
  pointer-events: none; /* 确保点击穿透到图片和按钮 */
}
</style>
