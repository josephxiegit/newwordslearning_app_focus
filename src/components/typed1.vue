<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import Typed from 'typed.js';


// let typed: any = null;
// const pRef = ref<HTMLParagraphElement>();
const typed = ref(null);
const pRef = ref(null);

const onceAgain = () => {
  typed.value.reset();
  typed.value.start();
};

onMounted(() => {
    const options = {
      strings: ["扫码背单词"],
      typeSpeed: 120,
      showCursor: false,
    };
    typed = new Typed(pRef.value, options);
})

onUnmounted(() => {
  typed?.destroy();
})
</script>

<template>
  <div style="width: 100%">
    <div class="container">
      <p ref="pRef" ></p>
      <van-button type="primary" class="btn" @click="onceAgain">
        Once Again
      </van-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-image: linear-gradient(to right, #d9dfe5, #e4e8ec, #ced6de);

  p {
    font-size: 44px;
    font-weight: 500;
    height: 54px;
    line-height: 48px;
    text-align: center;
    white-space: nowrap;
  }

  .btn {
    margin-top: 80px;
  }
}
</style>