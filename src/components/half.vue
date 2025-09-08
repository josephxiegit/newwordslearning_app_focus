<template>
  <van-overlay
    :show="visible"
    :z-index="9999"
    :custom-style="{ backgroundColor: 'rgba(0, 0, 0, 0)' }"
    @click.stop
  >
    <div class="encouragement-container">
      <div class="encouragement">
        <!-- 添加标题 -->
        <div class="header-text">
          <span>喘口气吧</span><br />
          <!-- <span class="mini-text">mini</span> -->
        </div>
        <img :src="srcTheme" alt="encouragement" />
        <div class="encouragement-text">加油哦！</div>
        <div class="design-text">Designed by xie</div>
        <button class="close-button" @click="hide">关闭</button>
      </div>
    </div>
  </van-overlay>
</template>


<script setup>
import { ref, onMounted, defineExpose, inject } from "vue";
// 主题路径
import encouragementSrcGoatAndWolf from "../assets/half.gif";
import encouragementSrcGoatBears from "../assets/Boonie Bears/half.gif";
const srcTheme = ref("");
const flagTheme = inject("flagTheme");

const visible = ref(false);
const isEntering = ref(false);
const isExiting = ref(false);
let autoHideTimer = null;
let onCloseCallback = null;

function show(callback) {
  visible.value = true;
  isExiting.value = false;
  onCloseCallback = callback;

  // 清除之前的定时器（如果存在）
  if (autoHideTimer) {
    clearTimeout(autoHideTimer);
  }
  // 五秒后消失
  setTimeout(() => {
    hide();
  }, 11000);
}

function hide() {
  isExiting.value = true;
  // 清除自动隐藏定时器
  if (autoHideTimer) {
    clearTimeout(autoHideTimer);
    autoHideTimer = null;
  }
  setTimeout(() => {
    visible.value = false;
    isExiting.value = false;
    // 执行回调函数（如果存在）
    if (onCloseCallback && typeof onCloseCallback === "function") {
      onCloseCallback();
      onCloseCallback = null; // 清空回调函数
    }
  }, 100); // 渐隐持续时间
}

const methods = { show, hide };

defineExpose({ ...methods, visible });

onMounted(() => {
  if (flagTheme.value == 1) {
    srcTheme.value = encouragementSrcGoatAndWolf;
  }
  if (flagTheme.value == 2) {
    srcTheme.value = encouragementSrcGoatBears;
  }
  isEntering.value = false;
});
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Zhi+Mang+Xing&display=swap"); /* 引入艺术字体 */

.encouragement-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  background-color: white; /* 保证遮罩层背景透明 */
  padding: 20px; /* 添加内边距确保内容不贴边 */
  padding-top: 2vh;
  box-sizing: border-box; /* 确保 padding 不会增加总高度 */
}

.encouragement-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw; /* 覆盖整个视口宽度 */
  height: 100vh; /* 覆盖整个视口高度 */
  background-color: rgba(
    0,
    0,
    0,
    0
  ); /* 背景透明，如需淡遮罩可改成 rgba(0,0,0,0.5) */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  opacity: 1;
  transition: opacity 1s ease;
  pointer-events: auto; /* 阻止点击穿透 */
}

/* 渐隐动画 */
.encouragement-overlay.exit {
  opacity: 0;
}

@keyframes enter-animation {
  0% {
    transform: translateY(-100vh); /* 从屏幕顶部开始 */
  }
  100% {
    transform: translateY(0); /* 移动到最终位置 */
  }
}

@keyframes exit-animation {
  0% {
    transform: translateX(0); /* 从当前位置开始 */
  }
  100% {
    transform: translateX(100vw); /* 移动到屏幕右侧外 */
  }
}

.encouragement {
  display: flex;
  align-items: center;
  position: relative;
  flex-direction: column;
  width: 100%;
  max-width: 90vw; /* 限制最大宽度 */
  max-height: 90vh; /* 限制最大高度为视口的90% */
  box-sizing: border-box;
  overflow: hidden; /* 防止内容溢出 */
}

.encouragement img {
  width: 80vw; /* 80% of viewport width */
  max-width: 300px; /* 限制最大宽度 */
  max-height: 50vh; /* 限制最大高度为视口的50% */
  height: auto;
  display: block;
  margin: 0 auto 15px auto; /* 减少下边距 */
  object-fit: contain; /* 确保图片完整显示 */
}

.encouragement-text {
  font-family: "Zhi Mang Xing", cursive;
  font-size: 18px; /* 稍微减小字体 */
  color: black;
  margin-bottom: 10px; /* 减少间距 */
  text-align: center;
}

.design-text {
  font-family: "Times New Roman", serif;
  font-size: 16px; /* 减小字体 */
  color: gray;
  margin-bottom: 15px; /* 减少间距 */
  text-align: center;
}

/* 关闭按钮样式 */
.close-button {
  background-color: white;
  border: 2px solid red;
  color: red;
  padding: 8px 16px; /* 调整按钮大小 */
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 14px;
  margin-top: 10px;
  cursor: pointer;
  border-radius: 12px;
  flex-shrink: 0; /* 防止按钮被压缩 */
}

.close-button:hover {
  background-color: darkred;
  color: white;
}

.header-text {
  font-size: 28px; /* 减小标题字体 */
  font-weight: bold;
  color: #000;
  margin-bottom: 15px; /* 减少间距 */
  text-align: center;
  font-family: "Times New Roman", serif;
  flex-shrink: 0; /* 防止标题被压缩 */
}

.mini-text {
  font-size: 20px; /* 相应减小 */
}

/* 移动端优化 */
@media (max-height: 600px) {
  .encouragement-container {
    padding-top: 10vh; /* 在小屏幕上减少顶部间距 */
  }

  .encouragement img {
    max-height: 40vh;
  }

  .header-text {
    font-size: 24px;
    margin-bottom: 10px;
  }

  .encouragement-text {
    font-size: 16px;
    margin-bottom: 8px;
  }

  .design-text {
    font-size: 14px;
    margin-bottom: 10px;
  }
}

/* 超小屏幕优化 */
@media (max-height: 480px) {
  .encouragement-container {
    padding-top: 8vh; /* 进一步减少顶部间距 */
  }

  .encouragement img {
    max-height: 35vh;
  }

  .header-text {
    font-size: 20px;
    margin-bottom: 8px;
  }

  .encouragement-text {
    font-size: 14px;
    margin-bottom: 5px;
  }

  .design-text {
    font-size: 12px;
    margin-bottom: 8px;
  }

  .close-button {
    padding: 6px 12px;
    font-size: 12px;
  }
}
</style>