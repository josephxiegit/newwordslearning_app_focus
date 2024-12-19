<template>
  <div v-if="visible" class="wolf-back-overlay">
    <div class="wolf-back">
      <!-- 这里放置恶魔微笑的 SVG 或图片 -->
      <div class="text_give">标签栏点击期末庆典,获得技能</div>
      <img :src="srcTheme" alt="Wolf Back">
      
      <!-- 关闭按钮 -->
      <button class="close-button" @click="hide">关闭</button>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, onMounted } from 'vue';
// 主题路径
import bearWarmup from '../assets/Boonie Bears/bearWarmup.gif';
const flagTheme = inject("flagTheme");
const srcTheme = ref("");


const visible = ref(false);

function show() {
  srcTheme.value = bearWarmup;
  visible.value = true;
  setTimeout(hide, 20000);
}

function hide() {
  visible.value = false;

}

const methods = { show, hide, visible };
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

.wolf-back {
  position: relative; /* 使子元素的绝对定位相对于这个元素 */
  max-width: 90vw;
  padding: 10px;
  display: flex;
  flex-direction: column;
  align-items: center; /* 水平居中对齐 */
  justify-content: center; /* 垂直居中对齐 */
}

.text_give {
  margin-bottom: 10px; /* 确保文本与图片之间有合适的间距 */
  color: red; 
  font-size: 24px;
  font-weight: bold;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.7);
  pointer-events: none;
}
</style>
