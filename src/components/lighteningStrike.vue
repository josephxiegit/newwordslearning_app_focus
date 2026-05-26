<template>
  <Teleport to="body">
    <div v-if="isActive" class="lightning-overlay">
      <div class="flash"></div>
      
      <svg class="bolt" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polygon points="60,0 20,50 50,50 30,100 80,40 50,40" />
      </svg>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'

const isActive = ref(false)

// 对外暴露的触发方法
const strike = () => {
  if (isActive.value) return // 防止连续点击重复触发
  
  isActive.value = true
  
  // 严格控制持续时间为 3.5 秒 (3500ms)
  setTimeout(() => {
    isActive.value = false
  }, 3500)
}

// 暴露给父组件使用
defineExpose({
  strike
})
</script>

<style scoped>
/* 全屏阴沉遮罩 */
.lightning-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  pointer-events: none; /* 关键：确保特效层不会阻挡用户的点击或滑动操作 */
  display: flex;
  justify-content: center;
  align-items: center;
  /* 阴沉感动画：瞬间变暗，然后缓慢恢复 (3.5秒版) */
  animation: gloom-animation 3.5s ease-out forwards;
}

/* 强烈的全屏白光闪烁 */
.flash {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #ffffff;
  opacity: 0;
  /* (3.5秒版) */
  animation: flash-animation 3.5s forwards;
}

/* 闪电本体样式 */
.bolt {
  position: absolute;
  top: 5%;
  left: 50%;
  width: 15vw;       /* 控制闪电宽度 */
  min-width: 60px;
  height: 70vh;      /* 控制闪电长度 */
  fill: #ffffff;
  filter: drop-shadow(0 0 15px #ffffff) drop-shadow(0 0 30px #a1c4fd); /* 增加发光效果 */
  transform: translateX(-50%);
  opacity: 0;
  /* (3.5秒版) */
  animation: bolt-animation 3.5s forwards;
}

/* --- 动画关键帧 --- */

/* 阴沉背景：0秒瞬间变暗沉(0.7透明度)，维持一会儿，在3.5秒时慢慢消失 */
@keyframes gloom-animation {
  0% { background-color: rgba(20, 25, 35, 0); }
  2% { background-color: rgba(20, 25, 35, 0.85); } /* 瞬间压抑感 */
  10% { background-color: rgba(20, 25, 35, 0.7); }
  70% { background-color: rgba(20, 25, 35, 0.6); }
  100% { background-color: rgba(20, 25, 35, 0); }
}

/* 白光闪烁：模拟真实雷电的两次快速爆闪 */
@keyframes flash-animation {
  0% { opacity: 0; }
  3% { opacity: 0.9; } /* 第一次主闪烁 */
  6% { opacity: 0; }
  12% { opacity: 0.6; } /* 第二次次级闪烁 */
  16% { opacity: 0; }
  100% { opacity: 0; }
}

/* 闪电图形显现：与白光同步 */
@keyframes bolt-animation {
  0% { opacity: 0; }
  3% { opacity: 1; }
  6% { opacity: 0; }
  12% { opacity: 1; }
  16% { opacity: 0; }
  100% { opacity: 0; }
}
</style>