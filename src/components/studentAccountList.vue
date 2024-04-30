<script setup>
import {
  watch,
  onMounted,
  ref,
  getCurrentInstance,
  onBeforeUpdate,
  computed,
} from "vue";
import "vant/lib/index.css"; // 确保引入样式
import cover3500Image from "../assets/3500_cover.png";
import itemList from "../assets/item_list.png";

import { useRouter } from "vue-router";
import {
  showFailToast,
  showToast,
  showLoadingToast,
  showConfirmDialog,
  showDialog,
  Divider,
  Toast,
  closeToast,
} from "vant";
const instance = getCurrentInstance();
const axios = instance.appContext.config.globalProperties.$ajax;
const router = useRouter();
// 返回首页
const gobackHomepage = () => {
  router.push({
    path: "/homepage",
  });
};

// 显示答案
const showAnswerSheet = ref(false);
const answerSheetList = ref([]);

// 点击跳转明细
const goToNextPage = (index, data) => {
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

  console.log(processData(data));
  router.push({
    path: "/studentAccountItem",
    state: {
      data: JSON.stringify(data),
      nid: originalData.value[index].nid,
      title: data["title"],
      username: data["username"],
    },
  });
};
const gotoItem = (index) => {
  console.log(originalData.value[index]);
  const data = originalData.value[index];
  if (
    originalData.value[index]["rate"] == 0 &&
    originalData.value[index]["attempt"] == 0
  ) {
    showConfirmDialog({
      title: "是否需要复习答案？",
      message: "在挑战前，你有机会先复习词汇，一旦开始，将无法提前复习",
      confirmButtonText: "查看答案",
      cancelButtonText: "开启挑战",
      cancelButtonColor: "red",
    })
      .then(() => {
        // 查看答案
        showAnswerSheet.value = true;
        answerSheetList.value = originalData.value[index]["answers"];
      })
      .catch(() => {
        // 跳转页面
        goToNextPage(index, data);
      });
  } else {
    goToNextPage(index, data);
  }
};

// 星星plus显示
const showRatePlus = computed(() => {
  return originalData.value.map((item) => item.rate > 3);
});

// 总进度环形circle
const currentRate = ref(0);
const textCircle = computed(() => currentRate.value.toFixed(0) + "%");
const gradientColor = {
  "0%": "#3fecff",
  "100%": "#6149f6",
};
const rateCircle = computed(() => {
  const rates = originalData.value.map((item) => item.rate / 3);
  const averageRate =
    rates.reduce((sum, current) => sum + current, 0) / rates.length;
  return averageRate * 100;
});
const starRate = ref(1); // 总星星数
const starRateNumber = computed(() => {
  return originalData.value.reduce((sum, item) => sum + item.rate, 0);
});
const completeNumber = computed(() => {
  return originalData.value.filter((item) => item.rate >= 3).length;
});

// textbook单词表
const textbookData = ref([]);
const showTextbookPop = ref(false);
const meaningShow = ref(false);
const meaningTitle = ref("");
const meaningData = ref({
  高考: { 英文: "", 中文: "" },
  教材: [{ 中文: "", 模块: "", 教材: "" }],
});

const showTextbook = () => {
  showTextbookPop.value = true;
  async function queryTextbook() {
    // 查询textbook
    let params = new URLSearchParams();
    params.append("method", "queryTextbook");
    params.append("username", username.value);
    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }
  queryTextbook().then((res) => {
    if (res.length != 0) {
      textbookData.value = JSON.parse(res[0]["textbook"]);
      textbookData.value.sort((a, b) => b.times - a.times);
      console.log("textbookData: ", textbookData.value);
    } else {
      showConfirmDialog({
        title: "你还没有尝试单词挑战",
        theme: "round-button",
        showCancelButton: false,
        message: "单词表会随着挑战自动定制专属词汇\n开始挑战吧！",
      }).then(() => {
        showTextbookPop.value = false;
      });
    }
  });
};
const getVocabularyMeaning = (index) => {
  const word = textbookData.value[index].英文;
  async function getWordMeaning() {
    // 查询单词含义
    let params = new URLSearchParams();
    params.append("method", "getTextbookMeaning");
    params.append("word", word);
    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }
  showLoadingToast({
    message: "加载中...",
    // forbidClick: true, // 禁止背景点击
    duration: 0, // 持续显示Toast直到被手动清除
  });
  getWordMeaning()
    .then((res) => {
      console.log("res", res);
      const sortOrder = [
        "七上",
        "七下",
        "八上",
        "八下",
        "九上",
        "九下",
        "必修一",
        "必修二",
        "必修三",
        "选修一",
        "选修二",
        "选修三",
        "选修四",
      ];
      res["教材"].sort((a, b) => {
        return sortOrder.indexOf(a.教材) - sortOrder.indexOf(b.教材);
      });
      meaningTitle.value = word;
      if (res["教材"] == []) {
        meaningData.value["教材"] = ["无"];
      } else {
        meaningData.value["教材"] = res["教材"];
      }

      if (Object.keys(res["高考"]).length === 0) {
        meaningData.value["高考"]["中文"] = "无";
      } else {
        meaningData.value["高考"]["中文"] = res["高考"]["中文"];
        meaningData.value["高考"]["英文"] = res["高考"]["英文"];
      }
      // console.log("meaningData", meaningData.value);
    })
    .then((res) => {
      closeToast();
      meaningShow.value = true;
    })
    .catch((err) => {
      closeToast();
      showFailToast("查询失败");
    });
};

// 终局之战
const rollingShow = ref(false);
const rollingList = ref([]);
const intervalId = ref(null);
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

const startRollingGame = () => {
  rollingShow.value = true;
  rollingList.value = textbookData.value.map((item) => {
    return item.英文;
  });
  const originalArray = [...rollingList.value];
  // const originalArray = rollingList.value;
  let lastElement = null;
  let counter = 0;
  const lastElementHistory = new Set();
  rollingList.value = setInterval(() => {
    let newArray;
    do {
      newArray = [...originalArray];
      shuffleArray(newArray);
    } while (lastElement === newArray[newArray.length - 1]);

    lastElement = newArray[newArray.length - 1];
    rollingList.value = [...newArray];
    lastElementHistory.add(lastElement);
    console.log(newArray); // 打印乱序后的数组

    counter++;
    if (
      lastElementHistory.size === originalArray.length ||
      counter >= rollingList.value.length
    ) {
      clearInterval(rollingList.value);
      console.log(
        "All elements have been the last item at least once or 10 shuffles reached."
      );
    }
  }, 2000);

  console.log("rollingList: ", rollingList.value);
};

// 加载数据
const originalData = ref([]);
const showStars = ref(false);
const username = ref("");
function formatDateString(dateString) {
  const date = new Date(dateString);

  const year = date.getFullYear();
  const month = date.getMonth() + 1; // getMonth() 返回的月份是从0开始的
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();

  // 使用模板字符串来格式化日期，确保月份和日期总是显示为两位数
  return `${year}年${month.toString().padStart(2, "0")}月${day
    .toString()
    .padStart(2, "0")}日${hours}时${minutes}分`;
}
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
    let res = JSON.parse(history.state.data);
    res.sort((a, b) => {
      // 将 create_time 字符串转换为 Date 对象，并比较
      return new Date(b.create_time) - new Date(a.create_time);
    });
    for (let i = 0; i < res.length; i++) {
      originalData.value.push({
        answers: JSON.parse(res[i].answers),
        synonyms: JSON.parse(res[i].synonyms),
        nid: res[i].nid,
        title: res[i].title.replace(".xlsm", ""),
        username: res[i].username,
        complete_status: res[i].complete_status,
        alias: res[i].alias,
        create_time: formatDateString(res[i].create_time),
        attempt: res[i].attempt,
        rate: res[i].rate,
      });
    }
    username.value = originalData.value[0].username;
    console.log("originalData", originalData.value);
    resolve(originalData.value);
  });
});
</script>

<template>
  <div>
    <div class="nav-bar-container">
      <van-nav-bar
        :right-text="username"
        left-text="首页"
        @click-left="gobackHomepage"
      >
        <template #title>
          <div>任务列表</div>
        </template>
      </van-nav-bar>
    </div>
    <div
      style="
        display: flex;
        justify-content: space-between;
        background-color: #fff; /* 设置背景颜色为白色或其他浅色 */
        border-radius: 8px; /* 轻微圆角效果 */
        box-shadow: 0 0 8px rgba(0, 0, 0, 0.2); /* 应用阴影效果 */
        margin: 10px; /* 为了更好的视觉效果和空间感，添加外边距 */
        padding: 15px 10px; /* 增加内边距，使内容与边框有一定距离 */
        transition: box-shadow 0.3s ease; /* 平滑过渡效果 */
        width: 89.5%;
        font-size: 13px;
      "
    >
      <div style="margin-left: 1rem; margin-top: 1rem">
        <!-- 共获得星星 -->
        <div style="display: flex">
          <div style="margin-top: 0.3rem;">共获得</div>
          <van-rate
            v-model="starRate"
            color="#ffd21e"
            icon="like"
            :count="1"
            readonly
            size="28"
            style=""
          >
          </van-rate>
          <div style="margin-top: 0.3rem;">&nbsp;&nbsp;✖️ {{ starRateNumber }}</div>
        </div>

        <!-- 共完成任务 -->
        <div style="display: flex; margin-top: 2rem">
          <div style="margin-top: 0.2rem;">共完成</div>
          <img
            src="../assets/item_list_complete.png"
            style="
              width: 28px;
              height: auto;
              margin-right: rem;
              margin-left: 0.5rem;
              margin-top: -0.1rem;
            "
          />
          <div style="margin-top: 0.2rem;">&nbsp;&nbsp;✖️ {{ completeNumber }}</div>
        </div>
      </div>

      <div style="margin-right: 2rem">
        <div style="margin-bottom: 0.5rem; text-align: center">总进度：</div>
        <van-circle
          v-model:current-rate="currentRate"
          :rate="rateCircle"
          :speed="100"
          :text="textCircle"
          :color="gradientColor"
          size="90px"
          :stroke-width="60"
        />
      </div>
    </div>
    <!-- 任务列表 -->
    <van-cell-group v-model="originalData">
      <div v-for="(item, index) in originalData" :key="index">
        <van-cell
          is-link
          center
          clickable
          @click="gotoItem(index)"
          style="
            background-color: #fff; /* 设置背景颜色为白色或其他浅色 */
            border-radius: 8px; /* 轻微圆角效果 */
            box-shadow: 0 0 8px rgba(0, 0, 0, 0.2); /* 应用阴影效果 */
            margin: 10px; /* 为了更好的视觉效果和空间感，添加外边距 */
            padding: 15px 10px; /* 增加内边距，使内容与边框有一定距离 */
            transition: box-shadow 0.3s ease; /* 平滑过渡效果 */
            width: 94.5%;
            font-size: 13px;
          "
        >
          <template #icon>
            <img
              v-if="item.rate < 3"
              src="../assets/item_list.png"
              style="width: 27px; height: auto; margin-right: 0.5rem"
              alt="Item List"
            />
            <img
              v-else
              src="../assets/item_list_complete.png"
              style="width: 27px; height: auto; margin-right: 0.5rem"
              alt="Item List Complete"
            />
          </template>
          <template #title>
            <!-- <img :src="itemList" style="width: 30px; height: auto"/> -->
            <div style="width: 160%; margin-bottom: 7px; font-weight: 700">
              {{ item.title }}
            </div>
          </template>

          <template #value>
            <div style="font-size: 12px">
              <div>
                <div style="display: flex; justify-content: flex-end">
                  尝试了
                  <div style="font-weight: 700; color: red">
                    {{ item.attempt }}
                  </div>
                  次
                </div>
                <div style="margin-top: 0.5rem">
                  {{ item.answers.length }}词
                </div>
              </div>
            </div>
          </template>

          <template #label>
            <div style="display: flex">
              <van-rate
                v-model="item.rate"
                :size="20"
                color="#ffd21e"
                void-icon="like"
                icon="like"
                void-color="#eee"
                :count="3"
                readonly
              />
              <div
                style="margin-top: 3%; margin-left: 0.2rem"
                v-if="showRatePlus[index]"
              >
                + {{ item.rate - 3 }}
              </div>
            </div>
            <div
              style="
                margin-left: 4px;
                margin-top: 7px;
                width: 140%;
                font-size: 12px;
              "
            >
              {{ item.create_time }}
            </div>
          </template>
        </van-cell>
      </div>
    </van-cell-group>

    <!-- 显示答案 -->
    <van-popup
      closeable
      v-model:show="showAnswerSheet"
      position="bottom"
      :style="{ height: '90%' }"
    >
      <div style="font-size: 18px; font-weight: 700; margin: 1rem">
        挑战前复习
      </div>
      <div
        style="
          display: flex;
          justify-content: space-between;
          margin-right: 1rem;
          font-weight: 700;
        "
      >
        <div
          style="font-size: 14px; font-weight: 600; margin: 1rem; color: red"
        >
          注意：只能在挑战前复习！
        </div>
        <div style="font-size: 13px; margin: 1rem">
          {{ answerSheetList.length }}词
        </div>
      </div>
      <van-cell-group inset style="margin-top: 0.5rem; margin-left: -0.2rem">
        <van-cell-group>
          <div v-for="(item, index) in answerSheetList" :key="index">
            <van-cell :title="`${index + 1}. ${item.英文}`" :value="item.中文">
            </van-cell>
          </div>
        </van-cell-group>
      </van-cell-group>
    </van-popup>

    <!-- 单词表textbook -->
    <van-floating-bubble
      axis="xy"
      magnetic="x"
      icon="vip-card-o"
      @click="showTextbook"
    />
    <van-popup
      closeable
      v-model:show="showTextbookPop"
      position="bottom"
      :style="{ height: '90%' }"
      :overlay-style="{ backgroundColor: 'rgba(0, 0, 0, 1)' }"
    >
      <div style="display: flex; align-items: center">
        <div style="font-size: 18px; font-weight: 700; margin: 1rem">
          个人定制单词手册
        </div>
        <div style="font-size: 12px; color: red; margin-top: 0.4rem">
          单击显示单词讲解
        </div>
        <!-- <van-button round type="success" @click="startRollingGame" size="sm"
          >终局之战</van-button
        > -->
      </div>
      <van-cell-group inset style="margin-top: 0.5rem">
        <van-cell-group>
          <div v-for="(item, index) in textbookData" :key="index">
            <van-cell
              clickable
              @click="getVocabularyMeaning(index)"
              :title="item.英文"
              :value="item.答案"
              :label="`累计${item.times}次`"
              is-link
            >
            </van-cell>
          </div>
        </van-cell-group>
      </van-cell-group>
    </van-popup>

    <!-- vocabulary meaning -->
    <van-popup
      position="bottom"
      :style="{ height: '80%' }"
      v-model:show="meaningShow"
      style="padding: 1rem"
      closeable
    >
      <div
        style="
          font-weight: 700;
          font-size: 25px;
          color: red;
          margin-bottom: 1rem;
        "
      >
        {{ meaningTitle }}
      </div>
      <div v-if="meaningData['教材'] && meaningData['教材'].length > 0">
        <div v-for="(item, index) in meaningData['教材']" :key="index">
          <div style="display: flex; font-weight: 700">
            <div>{{ item["教材"] }}</div>
            &nbsp;&nbsp;&nbsp;
            <div style="margin-top: 0.07rem">{{ item["模块"] }}</div>
          </div>
          <div style="font-size: 14px; margin-top: 0.3rem">
            {{ item["中文"] }}
          </div>
          <Divider></Divider>
        </div>
      </div>
      <div v-else>
        <div style="font-weight: 700; margin-bottom: 0.3rem">教材：</div>
        <div>无</div>
        <Divider></Divider>
      </div>
      <div style="display: flex; justify-content: space-between">
        <div style="font-weight: 700; margin-bottom: 0.3rem">天津3500:</div>
        <img
          :src="cover3500Image"
          style="width: 40px; height: auto"
          fit="cover"
        />
      </div>
      <div style="white-space: pre-wrap; font-size: 14px">
        {{ meaningData["高考"]["中文"] }}
      </div>
    </van-popup>

    <!-- 终局之战翻转 -->
    <van-popup
      position="bottom"
      :style="{ height: '60%' }"
      v-model:show="rollingShow"
      style="padding: 1rem"
      closeable
    >
      <van-rolling-text :text-list="rollingList" :duration="1" />
    </van-popup>

    <!-- 庆祝三星 -->
    <div v-if="showStars" class="stars">
      <div class="star">🐻</div>
      <div class="star" style="animation-delay: 0.5s">🐻</div>
      <div class="star" style="animation-delay: 1s">🐻</div>
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
  0%,
  100% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1); /* 中间状态最大 */
    opacity: 1;
  }
}
</style>
