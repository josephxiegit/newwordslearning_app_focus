<template>
  <transition name="fade" @after-leave="onAfterLeave">
    <div v-if="visible" class="miss-you-overlay">
      <transition name="modal" appear>
        <div v-if="visible" class="miss-you">
          <!-- 这里放置恶魔微笑的 SVG 或图片 -->
          <img :src="srcTheme" alt="miss you">
          <!-- 添加艺术字体的文字 -->
          <div class="miss-text">你真的准备好了？</div>
          <!-- 按钮组 -->
          <div class="button-group">
            <button class="confirm-button" @click="confirm">确认</button>
            <button class="cancel-button" @click="cancel">取消</button>
          </div>
          <!-- 关闭按钮 -->
          <button class="close-button" @click="hide">×</button>
        </div>
      </transition>
    </div>
  </transition>
</template>

<script setup>
import { ref, defineProps, defineExpose, defineEmits, inject, onMounted } from 'vue';

// 定义 emits
const emit = defineEmits(['confirm', 'cancel']);

// 主题路径
import challengeConfirmSrcGoatAndWolf from '../assets/challengeConfirm.png';
import challengeConfirmSrcBears from '../assets/Boonie Bears/challengeConfirm.png';

const flagTheme = inject("flagTheme");
const srcTheme = ref("");

const visible = ref(false);
const isHiding = ref(false);

function show() {
  visible.value = true;
  isHiding.value = false;
}

function hide() {
  isHiding.value = true;
  // 延迟设置 visible 为 false，让过渡动画有时间执行
  setTimeout(() => {
    visible.value = false;
  }, 100);
}

function onAfterLeave() {
  // 动画完成后的回调，可以在这里执行额外的清理工作
  isHiding.value = false;
}

function confirm() {
  // 触发确认事件，传递给父组件
  emit('confirm');
  hide();
}

function cancel() {
  // 触发取消事件，传递给父组件
  emit('cancel');
  hide();
}

const methods = { show, hide };

onMounted(() => {
  if (flagTheme.value == 1) {
    srcTheme.value = challengeConfirmSrcGoatAndWolf;
  }
  if (flagTheme.value == 2) {
    srcTheme.value = challengeConfirmSrcBears;
  }
});

defineExpose(methods);
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Zhi+Mang+Xing&display=swap'); /* 引入艺术字体 */

/* 过渡动画样式 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.modal-enter-active {
  transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
}

.modal-leave-active {
  transition: all 0.3s cubic-bezier(0.755, 0.05, 0.855, 0.06);
}

.modal-enter-from {
  opacity: 0;
  transform: scale(0.7) translateY(-30px);
}

.modal-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(-10px);
}

.miss-you-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.miss-you {
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: white;
  padding: 20px;
  border-radius: 10px;
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.miss-you img {
  width: 300px;
  height: auto;
  max-width: 100%;
  max-height: 60vh; /* 限制最大高度 */
  object-fit: contain;
}

.miss-text {
  margin-top: 20px;
  font-family: 'Zhi Mang Xing', cursive;
  font-size: 24px;
  color: red;
  text-align: center;
  line-height: 1.4;
}

/* 按钮组样式 */
.button-group {
  display: flex;
  gap: 20px;
  margin-top: 25px;
  justify-content: center;
}

.confirm-button,
.cancel-button {
  all: initial;
  padding: 12px 24px !important;
  border: none !important;
  border-radius: 6px !important;
  font-size: 16px !important;
  font-weight: 500 !important;
  cursor: pointer !important;
  transition: all 0.3s ease !important;
  min-width: 80px !important;
  text-align: center !important;
  user-select: none !important;
  box-sizing: border-box !important;
}

.confirm-button {
  background-color: #4CAF50 !important;
  color: white !important;
}

.confirm-button:hover {
  background-color: #45a049 !important;
  transform: translateY(-2px) !important;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4) !important;
}

.cancel-button {
  background-color: #f44336 !important;
  color: white !important;
}

.cancel-button:hover {
  background-color: #da190b !important;
  transform: translateY(-2px) !important;
  box-shadow: 0 4px 12px rgba(244, 67, 54, 0.4) !important;
}

.confirm-button:active,
.cancel-button:active {
  transform: translateY(0px) !important;
}

/* 重置并强制设置关闭按钮样式 */
.close-button {
  /* 重置所有可能的继承样式 */
  all: initial;
  
  /* 设置基本样式 */
  position: absolute !important;
  top: 10px !important;
  right: 10px !important;
  
  /* 尺寸和外观 */
  width: 32px !important;
  height: 32px !important;
  min-width: 32px !important;
  min-height: 32px !important;
  max-width: 32px !important;
  max-height: 32px !important;
  
  /* 背景和边框 */
  background-color: #ff4444 !important;
  border: none !important;
  border-radius: 50% !important;
  
  /* 文字样式 */
  color: white !important;
  font-size: 18px !important;
  font-weight: bold !important;
  line-height: 1 !important;
  
  /* 布局 */
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  
  /* 交互 */
  cursor: pointer !important;
  user-select: none !important;
  
  /* 盒模型 */
  padding: 0 !important;
  margin: 0 !important;
  box-sizing: border-box !important;
  
  /* 过渡效果 */
  transition: all 0.2s ease !important;
}

.close-button:hover {
  background-color: #cc3333 !important;
  transform: scale(1.1) !important;
}

.close-button:active {
  transform: scale(0.95) !important;
}

.close-button:focus {
  outline: none !important;
  box-shadow: 0 0 0 2px rgba(255, 68, 68, 0.3) !important;
}

/* 响应式调整 */
@media (max-width: 480px) {
  .miss-you {
    padding: 15px;
    margin: 20px;
  }
  
  .miss-you img {
    width: 250px;
    max-height: 50vh;
  }
  
  .miss-text {
    font-size: 20px;
    margin-top: 15px;
  }
  
  .button-group {
    gap: 15px;
    margin-top: 20px;
  }
  
  .confirm-button,
  .cancel-button {
    padding: 10px 20px !important;
    font-size: 14px !important;
    min-width: 70px !important;
  }
  
  .close-button {
    width: 28px !important;
    height: 28px !important;
    min-width: 28px !important;
    min-height: 28px !important;
    max-width: 28px !important;
    max-height: 28px !important;
    font-size: 16px !important;
    top: 8px !important;
    right: 8px !important;
  }
}
</style>