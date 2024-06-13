<template>
    <div v-if="visible" class="wolf-back-overlay">
      <div class="wolf-back">
        <!-- 这里放置恶魔微笑的 SVG 或图片 -->
        <img src="../assets/gray_wolf.png" alt="Wolf Back">
        <!-- <img src="../assets/angry_wolf.gif" alt="Wolf Back"> -->
        <!-- 添加艺术字体的文字 -->
        <div class="wolf-text">我会回来的</div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref } from 'vue';
  
  const visible = ref(false);
  
  function show() {
    visible.value = true;
    setTimeout(hide, 4000);
  }
  
  function hide() {
    visible.value = false;
  }
  
  const methods = { show, hide };
  
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
  
  .wolf-smile {
    display: flex;
    flex-direction: column;
    align-items: center;
    animation: smile-animation 1s infinite;
  }
  
  .wolf-back img {
    width: 150px; /* 调整图片宽度 */
    height: auto; /* 让高度自动调整，保持宽高比 */
    max-width: 100%; /* 确保图片不会超过容器宽度 */
    max-height: 100%; /* 确保图片不会超过容器高度 */
    animation: slide-across 4s linear; /* Apply the slide animation */
  }
  
  .wolf-text {
    margin-top: 20px; /* 调整文字与图片的间距 */
    font-family: 'Zhi Mang Xing', cursive; /* 使用艺术字体 */
    font-size: 36px; /* 调整文字大小 */
    color: white; /* 设置文字颜色 */
    animation: smile-animation 1s infinite; /* 应用与图片相同的动画 */
  }
  
  @keyframes smile-animation {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.4);
    }
  }
  @keyframes slide-across {
  0% {
    transform: translateX(-100%); /* Start off-screen to the left */
  }
  50% {
    transform: translateX(50%); /* Center of the screen */
  }
  100% {
    transform: translateX(200%); /* End off-screen to the right */
  }
}
  </style>
  