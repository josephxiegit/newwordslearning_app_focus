<template>
  <div v-if="visible" class="passive-magic-overlay">
    <div class="passive-magic">
      <img :src="srcLeaf" alt="" style="width: auto; height: 50%;">
      <img :src="srcTheme" alt="miss you">
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
  visible.value = true;
}

function hide() {
  visible.value = false;
}

const methods = { show, hide };
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


</style>
