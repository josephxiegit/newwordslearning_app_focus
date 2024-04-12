<script setup>
import {
  watch,
  onMounted,
  ref,
  getCurrentInstance,
  onBeforeUpdate,
  computed,
} from "vue";
import { useRouter } from "vue-router";
import { showFailToast, showToast, showLoadingToast, showDialog } from "vant";
const router = useRouter();
// 返回首页
const gobackHomepage = () => {
  router.push({
    path: "/homepage",
  });
};

// 点击跳转明细
const gotoItem = (index) => {
  // console.log(originalData.value[index]);
  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]]; // 交换元素
    }
    return array;
  }

  function processData(data) {
    // 1. 乱序 synonyms
    const shuffledSynonyms = shuffle([...data.synonyms]);

    // 先构建一个包含所有中文的大数组，为了确保足够的唯一性，可以用Set去重
    const allChineseSet = new Set(data.synonyms.flatMap((s) => s.中文));

    shuffledSynonyms.forEach((synonym) => {
      // 对于每个synonym，找到它的正确中文答案
      const answerObj = data.answers.find((a) => a.英文 === synonym.英文);
      console.log('data: ', data);
      const correctChineseAnswers = answerObj.中文.includes("；")
        ? answerObj.中文.split("；")
        : [answerObj.中文];

      // 从allChineseSet中移除所有正确答案，以防在选择额外中文时重复选择
      correctChineseAnswers.forEach((answer) => allChineseSet.delete(answer));

      // 将剩余的中文转换成数组并乱序
      const remainingChinese = shuffle(Array.from(allChineseSet));

      // 确保正确答案都被包含，然后选取随机中文填充，保持总数不超过6
      const mixedChinese = shuffle([
        ...correctChineseAnswers,
        ...remainingChinese.slice(0, 6 - correctChineseAnswers.length),
      ]);

      synonym.中文 = mixedChinese;

      // 把正确答案添加回allChineseSet中，以便下一个synonym使用
      correctChineseAnswers.forEach((answer) => allChineseSet.add(answer));
    });

    // 2. 根据乱序后的synonyms调整answers的顺序
    data.answers.sort((a, b) => {
      const indexA = shuffledSynonyms.findIndex((s) => s.英文 === a.英文);
      const indexB = shuffledSynonyms.findIndex((s) => s.英文 === b.英文);
      return indexA - indexB;
    });

    // 更新乱序后的synonyms
    data.synonyms = shuffledSynonyms;

    // 重新设置synonyms的序号
    data.synonyms.forEach((item, index) => {
      item.序号 = index + 1;
    });

    // 根据synonyms的顺序重新设置answers的序号
    data.answers.forEach((item, index) => {
      item.序号 = index + 1;
    });

    return data;
  }

  const data = originalData.value[index];
  console.log(processData(data));
  router.push({
    path: "/studentAccountItem",
    state: {
      data: JSON.stringify(data),
      nid: originalData.value[index].nid,
    },
  });
};

// 加载数据
const originalData = ref([]);
const showStars = ref(false);
onMounted(async () => {
  // 弹出庆祝
  const flagRate = history.state?.flagRate;
  // console.log("flagRate", flagRate);
  // let flagRate = 3;
  if (flagRate !== undefined && flagRate >= 3) {
    showStars.value = true;
    // 设置定时器以在动画完成后隐藏星星
    setTimeout(() => {
      showStars.value = false;
    }, 3000); // 假设动画时长为2秒
  }
  // 加载数据
  originalData.value = [];
  let res = new Promise((resolve, reject) => {
    const res = JSON.parse(history.state.data);
    for (let i = 0; i < res.length; i++) {
      originalData.value.push({
        answers: JSON.parse(res[i].answers),
        synonyms: JSON.parse(res[i].synonyms),
        nid: res[i].nid,
        title: res[i].title,
        username: res[i].username,
        complete_status: res[i].complete_status,
        alias: res[i].alias,
        create_time: res[i].create_time,
        attempt: res[i].attempt,
        rate: res[i].rate,
      });
    }
    console.log(originalData.value);
    resolve(originalData.value);
  });
});
</script>

<template>
  <div>
    <div class="nav-bar-container">
      <van-nav-bar right-text="" left-text="首页" @click-left="gobackHomepage">
        <template #title>
          <div>任务列表</div>
        </template>
      </van-nav-bar>
    </div>

    <van-cell-group v-model="originalData">
      <div v-for="(item, index) in originalData" :key="index">
        <van-cell
          :title="`${item.title}：${item.answers.length}词`"
          is-link
          clickable
          @click="gotoItem(index)"
        >
          <template #value>
            <div>{{ item.username }}：尝试了{{ item.attempt }}次</div>
          </template>
          <template #label>
            <van-rate
              v-model="item.rate"
              :size="20"
              color="#ffd21e"
              void-icon="star"
              void-color="#eee"
              :count="3"
            />
            <div style="margin-left: 8px; margin-top: 5px">
              {{ item.create_time.substring(0, 10) }}
            </div>
          </template>
        </van-cell>
      </div>
    </van-cell-group>
    <!-- 庆祝三星 -->
    <div v-if="showStars" class="stars">
      <div class="star">★</div>
      <div class="star" style="animation-delay: 0.5s">★</div>
      <div class="star" style="animation-delay: 1s">★</div>
    </div>
  </div>
</template>




<style>
.nav-bar-container {
  position: sticky;
  top: 0;
  z-index: 100;
}
.stars {
  position: fixed;
  top: 40%;
  left: 65%;
  transform: translate(-50%, -50%);
  display: flex; /* 使用flex布局让星星横向排列 */
  gap: 20px; /* 星星之间的间距 */
}

.star {
  transform: scale(0); /* 开始时大小为0 */
  font-size: 5rem; /* 星星的基础大小 */
  color: gold;
  opacity: 0; /* 开始时透明度为0 */
  animation: starFadeInOut 5s forwards; /* 动画名称，持续时间，以及动画结束时的状态 */
}

@keyframes starFadeInOut {
  0%, 100% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1); /* 中间状态最大 */
    opacity: 1;
  }
}

</style>
