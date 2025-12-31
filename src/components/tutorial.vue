<!-- src/views/tutorial.vue  (或你路由里 /tutorial 指向的组件路径) -->
<template>
  <div class="tutorial-page">
    <!-- 顶部栏（可选，但推荐，且不影响你其他页面滚动） -->
    <van-nav-bar
      title="教程"
      left-text="返回"
      left-arrow
      fixed
      placeholder
      @click-left="goBack"
    />

    <!-- 只让教程区域滚动（最小影响范围） -->
    <div class="tutorial-scroll">
      <div class="tutorial-title">上课前请先看视频教程</div>

      <!-- 竖排：两张图一列往下排 -->
      <div class="tutorial-list">
        <!-- 教程 1 -->
        <div class="tutorial-card">
          <img
            :src="tutorial1"
            class="tutorial-cover"
            alt="tutorial1"
            @click="openTutorialVideo1"
          />
          <van-button type="primary" block @click="openTutorialVideo1">
            打开教程视频 1
          </van-button>
        </div>

        <!-- 教程 2 -->
        <div class="tutorial-card">
          <img
            :src="tutorial2"
            class="tutorial-cover"
            alt="tutorial2"
            @click="openTutorialVideo2"
          />
          <van-button type="success" block @click="openTutorialVideo2">
            打开教程视频 2
          </van-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

import tutorial1 from "../assets/tutorial1.jpg";
import tutorial2 from "../assets/tutorial2.jpg";

const route = useRoute();
const router = useRouter();

const username = computed(() => route.query?.param || "");

const goBack = () => {
  // 如果是 tabbar 进来的，通常返回到上一页或首页
    router.push({
    path: "/studentAccountList",
  });
};

const openTutorialVideo1 = () => {
  window.open(
    "https://www.bilibili.com/video/BV1HwqGBcEUC/?share_source=copy_web&vd_source=37b5ac22f50ed0cc9c3127291be40c90",
    "_blank",
    "noopener,noreferrer"
  );
};

const openTutorialVideo2 = () => {
  // iframe 对应 bvid 的网页链接
  window.open(
    "https://www.bilibili.com/video/BV1JKqGBtEsz",
    "_blank",
    "noopener,noreferrer"
  );
};
</script>

<style scoped>
.tutorial-page {
  width: 100%;
}

/* 只让本页教程内容滚动，不影响其他页面 */
.tutorial-scroll {
  height: calc(100vh - var(--van-nav-bar-height));
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 12px 12px 18px;
}

.tutorial-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
}

.tutorial-list {
  display: flex;
  flex-direction: column; /* 强制竖排 */
  gap: 16px;
}

.tutorial-card {
  width: 100%;
}

.tutorial-cover {
  width: 100%;
  max-width: 560px; /* iPad 竖屏也不会太大；想更大/更小改这里 */
  margin: 0 auto 10px;
  display: block;
  border-radius: 12px;
  object-fit: cover;
  cursor: pointer;
}

.tutorial-user {
  margin-top: 6px;
  font-size: 14px;
  color: #666;
}
</style>
