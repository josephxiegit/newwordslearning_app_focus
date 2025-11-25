<template>
  <div v-if="visible" class="passive-magic-overlay">
    <div class="passive-magic">
      <img :src="srcLeaf" alt="" style="width: auto; height: 50%;" @load="onImageLoad" v-if="srcLeaf">
      <img :src="srcTheme" alt="miss you" @load="onImageLoad">
      <div style="font-weight: 700;font-size: larger;color:chocolate">做错了，重新选吧</div>
    </div>
  </div>
</template>

<script setup>
import { ref, defineExpose, inject, onMounted } from 'vue';
// 主题路径
import passiveMagicSrcGoatAndWolf from '../assets/passive_magic.gif';
import fallingLeaf from '../assets/Boonie Bears/fallingleaf.gif';
import passiveMagicSrcBears from '../assets/Boonie Bears/passive_magic.gif';
const flagTheme = inject("flagTheme");
const srcTheme = ref("");
const srcLeaf = ref("");


const visible = ref(false);

function show() {
  console.log(111);
  visible.value = true;
}

function hide() {
  visible.value = false;
}

const methods = { show, hide };
const onImageLoad = () => {
  // 触发一次重绘，确保图片尺寸正确
  requestAnimationFrame(() => {
    const container = document.querySelector('.passive-magic');
    if (container) {
      container.style.display = 'none';
      void container.offsetHeight; // 强制重绘
      container.style.display = '';
    }
  });
};
onMounted(() => {
  
  if (flagTheme.value == 1) {
    srcLeaf.value = null;
    srcTheme.value = passiveMagicSrcGoatAndWolf;
  }
  if (flagTheme.value == 2) {
    srcLeaf.value = fallingLeaf;
    srcTheme.value = passiveMagicSrcBears;
  }
});
defineExpose(methods);
</script>

<style scoped>
.passive-magic-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: transparent;
  display: flex;
  /* 修改这里：改为 flex-start 让内容靠左、靠上 */
  justify-content: flex-start; 
  align-items: flex-start;
  z-index: 9999;
  /* 关键：让鼠标点击穿透透明区域，否则你整个屏幕都点不了 */
  pointer-events: none; 
}

.passive-magic {
  display: flex;
  flex-direction: column;
  align-items: center;
  /* 修改这里：给一点内边距，不要紧贴屏幕边缘 */
  padding: 10px; 
  /* 或者使用 margin: 10px; */
  
  border-radius: 10px;
  position: relative;
  /* 限制一下最大宽度，防止图片太大挡住太多内容 */
  max-width: 300px; 
  box-sizing: border-box;
  
  /* 恢复内容区域的点击（如果需要的话） */
  pointer-events: auto; 
}

.passive-magic img {
  width: auto;
  height: auto;
  max-width: 100%;
  /* 图片自适应 */
  object-fit: contain;
}
</style>
