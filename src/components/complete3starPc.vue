<script setup>
import { ref, onMounted, inject } from "vue";
import { useRouter } from "vue-router";
import complete3starGoats from "../assets/complete3star.png";
import complete3starBears from "../assets/Boonie Bears/complete3star.png";
import happyending from "../assets/sound/happyending.mp3";
const router = useRouter();
const showSpeechBubble = ref(false);
const valueUsername = ref("");
const flagTheme = inject("flagTheme");
const srcTheme = ref(null);
const data = ref([]);
const unique_aliases = ref(null);
const flagRate = ref(3);

const gotoItemList = () => {
  router.push({
    path: "/studentAccountList",
    state: {
      data: data.value,
      unique_aliases: unique_aliases.value,
      username: valueUsername.value,
      flagRate: flagRate.value,
    },
  });
};
onMounted(() => {
  showSpeechBubble.value = true;
  const audio = new Audio(happyending);
  audio.play()
  // if (flagTheme.value == 1) {
  //   srcTheme.value = complete3starGoats;
  // }
  // if (flagTheme.value == 2) {
  //   srcTheme.value = complete3starBears;
  // }
  srcTheme.value = complete3starGoats
  valueUsername.value = history.state.username;
  data.value = history.state.data;
  unique_aliases.value = history.state.unique_aliases;
  flagRate.value = history.state.rate;
});
</script>

<template>
  <div class="page-container">
    <div class="content-wrapper">
      <div style="margin: 3rem 0 0 3rem; display: flex">
      <img
        :src="srcTheme"
        class="slide-in"
        style="
          width: 8rem;
          height: auto;
          margin-left: 0rem;
          margin-bottom: -1.5rem;
        "
      />
      <div class="speech-bubble" v-show="showSpeechBubble">
        <div style="text-align: left">
          <div>泰酷啦</div>
          <div style="margin-top: 1em; font-size: smaller; margin-left: 0.4rem">
            {{ valueUsername }}
          </div>
        </div>
      </div>
    </div>

    <!-- 使用v-for动态渲染星星 -->
    <div class="container">
      <div class="container-stars">
        <div class="star2"></div>
        <div class="star2"></div>
        <div class="star2"></div>
      </div>

      <div class="congratulation-text">恭喜，三颗星啦！</div>

      <van-button
        size="large"
        type="warning"
        style="width: 90%; display: block; margin: 1rem auto"
        @click="gotoItemList"
        >继续</van-button
      >
    </div>
      </div>
    </div>
</template>

<style scoped>
/* 页面容器 - 全屏背景 */
.page-container {
  width: 100%;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: radial-gradient(ellipse at top, #a8c8ff 0%, #d0e0ff 50%, #f0f4f8 100%),
              linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, transparent 100%);
  background-size: cover, 200% 200%;
  animation: subtleShift 12s ease-in-out infinite;
}

@keyframes subtleShift {
  0% { background-position: 0% 0%; }
  50% { background-position: 100% 100%; }
  100% { background-position: 0% 0%; }
}

/* 内容包装器 - 宽度50%并居中 */
.content-wrapper {
  width: 50%;
  max-width: 600px;
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  padding: 2rem;
  margin: 20px;
  text-align: center;
}

.container {
  display: flex;
  flex-direction: column;
  margin-top: 7rem;
  justify-content: center;
}
.container-stars {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding: 0 20px;
  box-sizing: border-box;
}
.congratulation-text {
  text-align: center;
  font-size: 24px;
  color: green;
  margin-top: 5%;
  animation: starFadeIn 0.5s forwards;
}
.slide-in {
  animation: slideIn 1s ease-out forwards;
}

@keyframes slideIn {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(0);
  }
}

.speech-bubble {
  position: relative;
  background-color: white;
  color: green;
  padding: 10px 20px;
  font-size: 34px;
  border-radius: 10px;

  text-align: center;
  margin: 20px 20px 20px 30px;
  max-width: 300px;
  line-height: 0.1;
  text-align: right;
  animation: starFadeIn 2s forwards;
}

.speech-bubble::before {
  content: "";
  position: absolute;
  left: -20px;
  bottom: 55px;
  width: 10px;
  height: 10px;
  background-color: white;
  border-radius: 50%;
  border: 2px solid green;
}

.speech-bubble::after {
  content: "";
  position: absolute;
  left: -10px;
  top: 20px;
  width: 20px;
  height: 20px;
  background-color: white;
  border-radius: 50%;
  border: 2px solid green;
}

.star2 {
  width: 60px;
  height: 60px;
  background-color: gold;
  clip-path: polygon(
    50% 0%,
    61% 35%,
    98% 35%,
    68% 57%,
    79% 91%,
    50% 70%,
    21% 91%,
    32% 57%,
    2% 35%,
    39% 35%
  );
  display: inline-block;
  margin: 0 10px;
  transform: scale(0); /* 开始时大小为0 */
  opacity: 0; /* 开始时透明度为0 */
  animation: starFadeIn 2s forwards;
}
@keyframes starFadeIn {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  100% {
    transform: scale(1); /* 最终状态为最大 */
    opacity: 1;
  }
}
</style>
