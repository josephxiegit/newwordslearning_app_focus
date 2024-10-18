<template>
  <div
    v-if="visible"
    :class="['wolf-back-overlay', { exit: isExiting, enter: isEntering }]"
    :style="positionStyle"
  >
    <div class="wolf-back">
      <!-- 添加艺术字体的文字 -->
      <div :class="wolfTextClass" style="">不能看答案</div>
      <!-- 这里放置恶魔微笑的 SVG 或图片 -->
      <img :src="srcTheme" alt="Wolf Back" />
    </div>
  </div>
</template>

<script setup>
import {
  ref,
  onMounted,
  defineExpose,
  inject,
  computed,
  defineProps,
  watch,
} from "vue";
// 主题路径
import angryWolfGoatAndWolf from "../assets/angry_wolf.gif";
import angryWolfSrcBears from '../assets/Boonie Bears/angryWolf.gif';

const flagTheme = inject("flagTheme");
const srcTheme = ref("");
const wolfTextClass = computed(() => {
  return flagTheme.value === 0 ? "wolf-text-wolf" : "wolf-text-bear";
});

const props = defineProps({
  dialogPosition: {
    type: Object,
    required: true,
  },
});
const visible = ref(false);
const isEntering = ref(false);
const isExiting = ref(false);

function show() {
  isEntering.value = true;
  visible.value = true;
  isExiting.value = false;
  setTimeout(() => {
    isEntering.value = false;
  }, 500); // 进入动画时长
}

function hide() {
  isExiting.value = true;
  setTimeout(() => {
    visible.value = false;
    isExiting.value = false;
  }, 1000); // 匹配退出动画时长
}

const methods = { show, hide };

defineExpose({ ...methods, visible });
const positionStyle = computed(() => {
  if (
    props.dialogPosition &&
    props.dialogPosition.x !== undefined &&
    props.dialogPosition.y !== undefined
  ) {
    return {
      position: "absolute",
      top: `${props.dialogPosition.y}px`, // 根据父组件传递的坐标设置 top
      left: `${props.dialogPosition.x}px`, // 根据父组件传递的坐标设置 left
    };
  }
  return {};
});
// 监听 dialogPosition 的变化
// watch(
//   () => props.dialogPosition,
//   (newValue, oldValue) => {
//     console.log("Dialog position changed:", newValue);
//   }
// );
onMounted(() => {
  isEntering.value = false;
  if (flagTheme.value == 1) {
    srcTheme.value = angryWolfGoatAndWolf;
  }
  if (flagTheme.value == 2) {
    srcTheme.value = angryWolfSrcBears;
  }
});
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Zhi+Mang+Xing&display=swap"); /* 引入艺术字体 */

.wolf-back-overlay {
  position: fixed;
  top: 12%;
  left: 3%;
  width: auto;
  height: auto;
  background-color: rgba(0, 0, 0, 0);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px; /* 添加一些内边距 */
  z-index: 9999;
  transition: transform 1s linear; /* 添加平滑过渡效果 */
}

.wolf-back-overlay.enter {
  animation: enter-animation 0.5s forwards; /* 进入动画 */
}

.wolf-back-overlay.exit {
  animation: exit-animation 1s forwards; /* 退出动画 */
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

.wolf-back {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.wolf-back img {
  width: 150px; /* 调整图片宽度 */
  height: auto; /* 让高度自动调整，保持宽高比 */
  max-width: 100%; /* 确保图片不会超过容器宽度 */
  max-height: 100%; /* 确保图片不会超过容器高度 */
}

.wolf-text-wolf {
  margin-top: 20px;
  font-family: "Zhi Mang Xing", cursive;
  font-size: 30px;
  color: white;
  transform: translateX(-20px);
}

.wolf-text-bear {
  margin-top: 20px;
  margin-left: 50px;
  font-family: "Zhi Mang Xing", cursive;
  font-size: 30px;
  color: white;
  transform: translateX(-20px);
  @media (min-width: 765px) {
    .parent-version {
      top: 35%;
    }
  }
}
</style>
