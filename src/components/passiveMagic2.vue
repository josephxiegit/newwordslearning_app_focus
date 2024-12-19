<template>
  <div v-if="visible" class="passive-magic-overlay">
    <div class="passive-magic">
      <img :src="srcTheme" alt="miss you" class="animated-img">
      <div style="font-weight: 700;font-size: larger;color:chocolate">不灭的意志</div>
    </div>
  </div>
</template>

<script setup>
import { ref, defineExpose, inject, onMounted } from 'vue';
// 主题路径
import passiveMagicSrcGoatAndWolf from '../assets/usershop_passive_magic.png';
import passiveMagicSrcBears from '../assets/Boonie Bears/usershop_passive_magic.png';
const flagTheme = inject("flagTheme");
const srcTheme = ref("");


const visible = ref(false);

function show() {
  visible.value = true;
}

function hide() {
  visible.value = false;
}

const methods = { show, hide };
onMounted(() => {
  
  if (flagTheme.value == 1) {
    srcTheme.value = passiveMagicSrcGoatAndWolf;
  }
  if (flagTheme.value == 2) {
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
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.passive-magic {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  border-radius: 10px;
  position: relative;
  max-width: 100vw; 
  max-height: 90vh; 
  box-sizing: border-box;
}

.passive-magic img {
  width: auto;
  height: auto;
  max-width: 100%; 
  max-height: 90%; 
  object-fit: contain; 
}

.animated-img {
  animation: scale-up 1s ease-in-out forwards;
}

@keyframes scale-up {
  0% {
    transform: scale(0.5); /* 初始缩小为50% */
    opacity: 0.5;         /* 初始透明度 */
  }
  100% {
    transform: scale(1); /* 放大到100% */
    opacity: 1;          /* 完全显示 */
  }
}

</style>
