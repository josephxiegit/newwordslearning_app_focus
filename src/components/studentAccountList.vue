<script setup>
import {
  watch,
  onMounted,
  ref,
  getCurrentInstance,
  onBeforeUpdate,
  computed,
  nextTick,
  onBeforeMount,
} from "vue";
import "vant/lib/index.css"; // 确保引入样式
import cover3500Image from "../assets/3500_cover.png";
import angryWolf from "./angryWolf.vue";
import missyou from "./missyou.vue";
import startOut from "./startOut.vue";
import threeStar from "./threeStar.vue";
import { useRouter } from "vue-router";
import loading from "./loading.vue";
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
const isLoading = ref(false);
const instance = getCurrentInstance();
const axios = instance.appContext.config.globalProperties.$ajax;
const router = useRouter();
// 返回首页
const gobackHomepage = () => {
  localStorage.removeItem("userData");
  localStorage.removeItem("expirationDate");
  router.push({
    path: "/homepage",
  });
};

// 显示答案
const showAnswerSheet = ref(false);
const answerSheetList = ref([]);

// 点击跳转明细
function showAnimationShineStartout() {
  if (startOutRef.value.visible) {
    startOutRef.value.hide();
  } else {
    startOutRef.value.show();
  }
  animationVisible.value = !animationVisible.value;
}
const goToNextPage = (index, data, mode) => {
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

  processData(data);

  const newTabsName = ["全部", ...tabsName.value];
  if (mode == 0) {
    router.push({
      path: "/studentAccountItem",
      // path: "/studentAccountSwipe",
      state: {
        data: JSON.stringify(data),
        nid: originalData.value[index].nid,
        title: data["title"],
        username: data["username"],
      },
    });
  }
  if (mode == 1) {
    router.push({
      // path: "/studentAccountItem",
      path: "/studentAccountSwipe",
      state: {
        data: JSON.stringify(data),
        nid: originalData.value[index].nid,
        title: data["title"],
        username: data["username"],
      },
    });
  }
};

// 跳转下一面
const showChooseMode = ref(false);
const gotoIndex = ref("");
const gotoData = ref("");
const handleRegularMode = () => {
  goToNextPage(gotoIndex.value, gotoData.value, 0);
};
const handleSwipeMode = () => {
  goToNextPage(gotoIndex.value, gotoData.value, 1);
};
const gotoItem = (index) => {
  // console.log(originalData.value[index]);
  gotoIndex.value = index;
  gotoData.value = originalData.value[index];
  if (
    originalData.value[index]["rate"] == 0 &&
    originalData.value[index]["attempt"] == 0
    // true
  ) {
    showConfirmDialog({
      title: "是否需要复习答案？",
      message: "在挑战前，你有机会先复习词汇，一旦开始，将无法提前复习",
      confirmButtonText: "查看答案",
      cancelButtonText: "开启挑战",
      cancelButtonColor: "red",
      className: "custom-dark-dialog", // 添加自定义类名
    })
      .then(() => {
        // 查看答案
        showAnswerSheet.value = true;
        answerSheetList.value = originalData.value[index]["answers"];
      })
      .catch(() => {
        // 跳转页面
        showChooseMode.value = true;
        // 先执行动画
        // showAnimationShineStartout();
        // 1秒后跳转页面
        // setTimeout(() => {
        //   goToNextPage(index, data, mode);
        // }, 1200);
      });
  } else {
    showChooseMode.value = true;
    // 先执行动画
    // showAnimationShineStartout();
    // 1秒后跳转页面
    // setTimeout(() => {
    //   goToNextPage(index, data, mode);
    // }, 1200);
  }
};

// 提前查看答案
const viewAnswer = (item, index) => {
  console.log("item: ", item);
  console.log("index: ", index);
  if (item.attempt == 0) {
    gotoItem(index);
  } else {
    function parseChineseDate(chineseDateStr) {
      // 替换中文日期字符串中的年、月、日为标准格式
      const standardDateStr = chineseDateStr
        .replace("年", "-")
        .replace("月", "-")
        .replace("日", "");

      // 返回新格式的日期字符串
      return new Date(standardDateStr);
    }
    function getLatestTime(view_time, create_time) {
      // 检查 view_time 是否为 null
      if (view_time === null) {
        return create_time;
      }

      // 将时间字符串转换为 Date 对象
      const viewTimeDate = parseChineseDate(view_time);
      const createTimeDate = parseChineseDate(create_time);
      // 比较两个时间并返回更靠后的时间
      if (viewTimeDate > createTimeDate) {
        return view_time;
      } else {
        return create_time;
      }
    }
    const timeString = getLatestTime(item.view_time, item.create_time);

    // console.log("timeString: ", timeString);

    // 解析时间字符串为 Date 对象
    function parseTimeString(timeString) {
      const dateTimeParts = timeString.match(
        /(\d{4})年(\d{1,2})月(\d{1,2})日 (\d{1,2}):(\d{2})/
      );
      if (!dateTimeParts) {
        throw new Error("Invalid time format");
      }
      const [_, year, month, day, hour, minute] = dateTimeParts.map(Number);
      return new Date(year, month - 1, day, hour, minute);
    }
    // 计算时间差并返回分钟和秒
    function getTimeDifference(timeString) {
      const parsedTime = parseTimeString(timeString);
      const currentTime = new Date();
      const differenceInMillis = currentTime - parsedTime;
      const differenceInSeconds = Math.floor(differenceInMillis / 1000);
      const minutes = Math.floor(differenceInSeconds / 60);
      const seconds = differenceInSeconds % 60;
      return { minutes, seconds };
    }
    // 检查时间差是否超过20分钟并输出结果
    function checkTimeDifference(timeString) {
      const { minutes, seconds } = getTimeDifference(timeString);
      const totalDifferenceInSeconds = minutes * 60 + seconds;
      const differenceFrom20MinutesInSeconds =
        20 * 60 - totalDifferenceInSeconds;

      if (differenceFrom20MinutesInSeconds > 0) {
        const absMinutes = Math.floor(differenceFrom20MinutesInSeconds / 60);
        const absSeconds = differenceFrom20MinutesInSeconds % 60;
        return { minutes: absMinutes, seconds: absSeconds };
      } else {
        return null;
      }
    }

    // 调用函数并输出结果
    const timeGap = checkTimeDifference(timeString);
    // console.log("timeGap: ", timeGap);
    if (timeGap) {
      showDialog({
        title: "暂时不能查看",
        message: `需要等待${timeGap.minutes}分${timeGap.seconds}分后，才可以查看答案`,
        theme: "round-button",
      });
    } else {
      showAnimationShine();
      showConfirmDialog({
        title: "😈 恶魔之眼 😈",
        message: "每20分钟才能查看一次\n您的行为会被记录",
        confirmButtonText: "查看答案",
        cancelButtonText: "取消，不看了",
        cancelButtonColor: "red",
        confirmButtonColor: "gray",
        className: "custom-dark-dialog", // 添加自定义类名
      })
        .then(() => {
          showAnimationShine();
          showAnswerSheet.value = true;
          answerSheetList.value = item["answers"];
          async function updateView() {
            // 更新view + 1
            let params = new URLSearchParams();
            params.append("method", "updateView");
            params.append("nid", item["nid"]);
            return await axios.post("words/", params).then((ret) => {
              return ret.data;
            });
          }
          updateView().then((res) => {
            originalData.value = [];
            pageIndexOriginalData.value = 0;
            finishedOriginalData.value = false;
            loadingOriginalData.value = false; // 重新触发加载
            onLoadOriginalData(); // 手动调用onLoad以重新开始加载过程
            activeTabs.value = 0;
          });
        })
        .catch(() => {
          showAnimationShine();
        });
    }
  }
};

// 星星plus显示
const showRatePlus = computed(() => {
  return originalData.value.map((item) => item.rate > 3);
});

// 总进度环形circle
const currentRate = ref(0);
const nameCircle = ref("全部");
const textCircle = computed(() => currentRate.value.toFixed(0) + "%");
const gradientColor = ref({
  "0%": "#ff0000",
  "100%": "#ffff00",
});

const getGradientColor = (index) => {
  const colors = [
    { "0%": "#ff0000", "100%": "#ffff00" }, // 红到黄
    { "0%": "#ffff00", "100%": "#00ff00" }, // 黄到绿
    { "0%": "#00ff00", "100%": "#ff00ff" }, // 绿到粉
    { "0%": "#3fecff", "100%": "#6149f6" },
  ];
  // 循环使用颜色
  gradientColor.value = colors[index % colors.length];
  // return colors[index % colors.length];
};

const rateCircle = ref(0);
const rateCircleList = ref([]);

const starRate = ref(1); // 总星星数

const starRateNumber = ref(0);
const starRateNumberList = ref([]);
const completeNumber = ref(0);
const completeNumberList = ref([]);

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
      // console.log("res", res);
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

// 导航分类
const activeTabs = ref("0");
const tabsName = ref([]);

// 加载数据
const originalData = ref([]);
const showStars = ref(false);
const loadingOriginalData = ref(false);
const finishedOriginalData = ref(false);
const pageIndexOriginalData = ref(0);
const username = ref("");
const formattedRate = (rate) => {
  // 检查是否为整数
  if (Number.isInteger(rate)) {
    return rate - 3;
  } else {
    // 保留一位小数
    return (rate - 3).toFixed(1);
  }
};

// 分页加载
const onLoadOriginalData = async (title = "全部") => {
  // console.log("title: ", title);
  // console.log('finishedOriginalData.value: ', finishedOriginalData.value);
  // console.log('loadingOriginalData.value: ', loadingOriginalData.value);
  if (loadingOriginalData.value || finishedOriginalData.value) {
    return;
  }
  loadingOriginalData.value = true;
  isLoading.value = true;
  try {
    const params = new URLSearchParams();
    params.append("method", "getUserDataPage");
    params.append("alias", title);
    params.append("user", username.value);
    params.append("page", pageIndexOriginalData.value + 1); // 请求下一页的数据
    params.append("page_size", 20); // 每页数据大小

    const response = await axios.post("words/", params);
    const moreData = response.data.data;
    console.log("moreData: ", moreData);
    if (moreData.length) {
      moreData.sort(
        (a, b) => new Date(b.create_time) - new Date(a.create_time)
      );
      moreData.forEach((item) => {
        const answers = JSON.parse(item.answers);
        const synonyms = JSON.parse(item.synonyms);
        // 解析日期并格式化
        const date = new Date(item.create_time);
        const viewDate = new Date(item.view_time);
        const formatter = new Intl.DateTimeFormat("zh-CN", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "numeric",
          hour12: false,
        });
        const formattedCreateTime = formatter.format(date);
        const formattedViewTime = formatter.format(viewDate);
        const newItem = {
          ...item,
          answers: answers,
          synonyms: synonyms,
          create_time: formattedCreateTime,
          view_time: formattedViewTime,
        };
        originalData.value.push(newItem);
      });
      pageIndexOriginalData.value++;
    }
    finishedOriginalData.value = !response.data.has_more;
  } catch (error) {
    console.error("Failed to fetch data:", error);
  }
  loadingOriginalData.value = false;
  isLoading.value = false;

  if (missyouFlag.value) {
    showAnimationShineMissYou();
    missyouFlag.value = false;
  }
  return originalData.value;
};
// 点击tab
const onClickTab = ({ title }) => {
  // console.log('title: ', title);
  originalData.value = [];
  loadingOriginalData.value = false;
  finishedOriginalData.value = false;
  pageIndexOriginalData.value = 0;
  nameCircle.value = title;
  const listTabs = ["全部", ...tabsName.value];
  const indexClickTab = listTabs.lastIndexOf(nameCircle.value);

  rateCircle.value = 0;
  setTimeout(() => {
    rateCircle.value = rateCircleList.value[indexClickTab];
  }, 0);
  currentRate.value = rateCircle.value;

  // console.log("rateCircle: ", rateCircle.value);
  starRateNumber.value = starRateNumberList.value[indexClickTab];
  completeNumber.value = completeNumberList.value[indexClickTab];
  getGradientColor(indexClickTab);
  onLoadOriginalData(title);
};

// 模式选择
const checkedMode = ref("1");

// 获取rateCircle
async function getRateCircle() {
  let params = new URLSearchParams();
  params.append("method", "getRateCircle");
  params.append("username", username.value);
  params.append("listlAias", JSON.stringify(tabsName.value));
  return await axios.post("words/", params).then((ret) => {
    return ret.data;
  });
}
// 生气动画
const wolfBackRef = ref(null);

const startOutRef = ref(null);
const threeStarRef = ref(null);
const animationVisible = ref(false);

function showAnimationShine() {
  if (wolfBackRef.value.visible) {
    wolfBackRef.value.hide();
  } else {
    wolfBackRef.value.show();
  }
  animationVisible.value = !animationVisible.value;
}

function showAnimationShineThreeStar() {
  if (threeStarRef.value.visible) {
    threeStarRef.value.hide();
  } else {
    threeStarRef.value.show();
  }
  animationVisible.value = !animationVisible.value;
}

// miss动画
const missyouRef = ref(null);
const missyouFlag = ref(false);
const missDays = ref(2);
function showAnimationShineMissYou() {
  missyouRef.value.show();

  setTimeout(() => {
    missyouRef.value.hide();
  }, 8000);
}

const processedTitle = (title) => {
  return title.split(".")[0]; // 获取第一个句点（.）之前的部分
};
// swipe徽章
const flagSwipe = ref(1);
onMounted(async () => {
  // 弹出庆祝
  let flagRate = history.state?.flagRate;
  missyouFlag.value = history.state?.missyouflag;
  missDays.value = history.state?.missDays;
  await nextTick(); // 等待页面完全渲染
  // console.log("flagRate: ", flagRate);
  if (flagRate !== undefined) {
    if (flagRate > 2.8) {
      flagRate = 3;
    }
    if (flagRate === 3) {
      showAnimationShineThreeStar();
    }
  }

  // 加载数据
  originalData.value = [];
  let res = new Promise((resolve, reject) => {
    let res = JSON.parse(history.state.data);
    let aliases = new Set();
    res.sort((a, b) => a.nid - b.nid);
    for (let i = 0; i < res.length; i++) {
      aliases.add(res[i].alias);
    }
    tabsName.value = Array.from(aliases);
    username.value = res[0].username;
    resolve("ok");
  });
  res.then(() => {
    getRateCircle().then((res) => {
      rateCircleList.value = res.map((item) => item.rate * 100);
      // starRateNumberList.value = res.map((item) => item.starRateNumber);
      starRateNumberList.value = res.map((item) => {
        if (Number.isInteger(item.starRateNumber)) {
          return item.starRateNumber;
        } else {
          return parseFloat(item.starRateNumber.toFixed(1));
        }
      });
      completeNumberList.value = res.map((item) => item.completeNumber);

      rateCircle.value = rateCircleList.value[0];
      starRateNumber.value = starRateNumberList.value[0];
      completeNumber.value = completeNumberList.value[0];
    });

    return "ok";
  });
});
</script>

<template>
  <div class="container">
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
    <div class="custom-container">
      <div style="margin-left: 1rem; margin-top: 1rem">
        <!-- 共获得星星 -->
        <div style="display: flex">
          <div style="margin-top: 0.3rem">共获得</div>
          <van-rate
            v-model="starRate"
            color="#ffd21e"
            icon="like"
            :count="1"
            readonly
            allow-half
            size="28"
            style=""
          >
          </van-rate>
          <div style="margin-top: 0.3rem">
            &nbsp;&nbsp;✖️ {{ starRateNumber }}
          </div>
        </div>

        <!-- 共完成任务 -->
        <div style="display: flex; margin-top: 2rem">
          <div style="margin-top: 0.2rem">共完成</div>
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
          <div style="margin-top: 0.2rem">
            &nbsp;&nbsp;✖️ {{ completeNumber }}
          </div>
        </div>
      </div>

      <div style="margin-right: 2rem">
        <div style="margin-bottom: 0.5rem; text-align: center">
          {{ nameCircle }}：
        </div>
        <van-circle
          v-model:current-rate="currentRate"
          :rate="rateCircle"
          :speed="80"
          :text="textCircle"
          :color="gradientColor"
          size="90px"
          :stroke-width="60"
        />
      </div>
    </div>

    <van-tabs
      v-model:active="activeTabs"
      @click-tab="onClickTab"
      shrink
      swipeable
      sticky
    >
      <van-tab title="全部">
        <van-list
          v-model="loadingOriginalData"
          :finished="finishedOriginalData"
          finished-text="没有更多了"
          @load="onLoadOriginalData"
        >
          <div v-for="(item, index) in originalData" :key="index">
            <van-cell
              is-link
              center
              clickable
              @click="gotoItem(index)"
              class="custom-cell"
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
                <div
                  v-if="item.swipe == 0"
                  style="display: flex; align-items: flex-start; width: 160%"
                >
                  <div style="margin-bottom: 7px; font-weight: 700">
                    {{ processedTitle(item.title) }}
                  </div>
                  <van-badge
                    content="Game"
                    color="lightgray"
                    style="margin-left: -20px"
                  />
                </div>

                <div
                  v-else
                  style="display: flex; align-items: flex-start; width: 160%"
                >
                  <div style="margin-bottom: 7px; font-weight: 700">
                    {{ processedTitle(item.title) }}
                  </div>
                  <van-badge content="Game" style="margin-left: -20px" />
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

                <div v-if="item.view == 0">
                  <van-button
                    style="default;color:gray;border:none"
                    size="mini"
                    @click.stop="viewAnswer(item, index)"
                    class="button-container"
                  >
                    <span class="button-content">
                      <img
                        src="../assets/close_eye.png"
                        alt="Icon"
                        class="button-icon"
                      />
                    </span>
                  </van-button>
                </div>

                <div v-else>
                  <van-button
                    style="default;color:red;font-weight:700;border:none"
                    size="small"
                    @click.stop="viewAnswer(item, index)"
                    class="button-container"
                  >
                    <span class="button-content">
                      <img
                        src="../assets/eye.png"
                        alt="Icon"
                        class="button-icon"
                        style="margin-right: 0.1rem"
                      />
                      * {{ item.view }}
                    </span>
                  </van-button>
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
                    allow-half
                  />
                  <div
                    style="margin-top: 3%; margin-left: 0.2rem"
                    v-if="showRatePlus[index]"
                  >
                    + {{ formattedRate(item.rate) }}
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
        </van-list>
      </van-tab>

      <div v-for="(item, index) in tabsName" :key="index">
        <van-tab :title="item">
          <van-list
            v-model="loadingOriginalData"
            :finished="finishedOriginalData"
            finished-text="没有更多了"
            @load="onLoadOriginalData"
          >
            <div v-for="(item, index) in originalData" :key="index">
              <van-cell
                is-link
                center
                clickable
                @click="gotoItem(index)"
                style="
                  display: flex;
                  justify-content: space-between;
                  background-color: #fff; /* 设置背景颜色为白色或其他浅色 */
                  border-radius: 8px; /* 轻微圆角效果 */
                  box-shadow: 0 0 8px rgba(0, 0, 0, 0.2); /* 应用阴影效果 */
                  margin: 10px auto; /* 为了更好的视觉效果和空间感，添加外边距 */
                  padding: 15px 10px; /* 增加内边距，使内容与边框有一定距离 */
                  transition: box-shadow 0.3s ease; /* 平滑过渡效果 */
                  width: 100%;
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
                  <div
                  v-if="item.swipe == 0"
                  style="display: flex; align-items: flex-start; width: 160%"
                >
                  <div style="margin-bottom: 7px; font-weight: 700">
                    {{ processedTitle(item.title) }}
                  </div>
                  <van-badge
                    content="Game"
                    color="lightgray"
                    style="margin-left: -20px"
                  />
                </div>

                <div
                  v-else
                  style="display: flex; align-items: flex-start; width: 160%"
                >
                  <div style="margin-bottom: 7px; font-weight: 700">
                    {{ processedTitle(item.title) }}
                  </div>
                  <van-badge content="Game" style="margin-left: -20px" />
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

                  <div v-if="item.view == 0">
                    <van-button
                      style="default;color:gray;border:none"
                      size="mini"
                      @click.stop="viewAnswer(item, index)"
                      class="button-container"
                    >
                      <span class="button-content">
                        <img
                          src="../assets/close_eye.png"
                          alt="Icon"
                          class="button-icon"
                        />
                      </span>
                    </van-button>
                  </div>

                  <div v-else>
                    <van-button
                      style="default;color:red;font-weight:700;border:none"
                      size="small"
                      @click.stop="viewAnswer(item, index)"
                      class="button-container"
                    >
                      <span class="button-content">
                        <img
                          src="../assets/eye.png"
                          alt="Icon"
                          class="button-icon"
                          style="margin-right: 0.1rem"
                        />
                        * {{ item.view }}
                      </span>
                    </van-button>
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
                      allow-half
                    />
                    <div
                      style="margin-top: 3%; margin-left: 0.2rem"
                      v-if="showRatePlus[index]"
                    >
                      + {{ formattedRate(item.rate) }}
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
          </van-list>
        </van-tab>
      </div>
    </van-tabs>

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

    <!-- 模式选择 -->
    <van-dialog
      v-model:show="showChooseMode"
      title="模式选择"
      confirmButtonText="普通模式"
      cancelButtonText="游戏模式"
      cancelButtonColor="#ee0a24"
      show-cancel-button
      @confirm="handleRegularMode"
      @cancel="handleSwipeMode"
    >
      <template #title>
        <div>
          模式选择
          <van-icon
            name="cross"
            @click="showChooseMode = false"
            style="position: absolute; top: 10px; right: 10px"
          />
        </div>
      </template>
      <img
        src="../assets/choose.webp"
        style="max-width: 100%; max-height: 100%; height: auto; display: block"
      />
    </van-dialog>

    <!-- 庆祝三星 -->
    <div v-if="showStars" class="stars">
      <div class="star">🐻</div>
      <div class="star" style="animation-delay: 0.5s">🐻</div>
      <div class="star" style="animation-delay: 1s">🐻</div>
    </div>

    <angryWolf ref="wolfBackRef" />
    <missyou ref="missyouRef" :days="missDays" />
    <startOut ref="startOutRef" />
    <threeStar ref="threeStarRef" />
    <loading v-if="isLoading" />
  </div>
</template>




<style>
.container {
  width: 100%;
  margin: 0 auto;
  padding: 0;
}
/* @media (min-width: 431px)  and (max-width: 767px){
  .container {
    margin-top: 30%;
  }
} */
/* @media (min-width: 768px) and (orientation: lanscape) {
  .container {
    width: 60%;
    margin: 0 auto;
    padding: 0;
    }
} */

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
.button-container {
  position: relative;
  margin-top: 0.3rem;
}

.button-content {
  display: flex;
  align-items: center;
}

.button-icon {
  width: 16px;
  height: auto;
}

.custom-dark-dialog .van-dialog__message {
  color: red; /* 设置内容颜色 */
  font-weight: 700;
}
.custom-dark-dialog .van-dialog__header {
  background-color: white; /* 设置暗黑色背景 */
}

.custom-dark-dialog .van-dialog__footer {
  border-top-color: #444; /* 设置底部边框颜色为暗色 */
  background-color: gray; /* 设置暗黑色背景 */
}
.custom-container {
  display: flex;
  justify-content: space-between;
  background-color: #fff; /* 设置背景颜色为白色或其他浅色 */
  border-radius: 8px; /* 轻微圆角效果 */
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.2); /* 应用阴影效果 */
  margin: 10px auto; /* 为了更好的视觉效果和空间感，添加外边距，并居中对齐 */
  padding: 15px 10px; /* 增加内边距，使内容与边框有一定距离 */
  transition: box-shadow 0.3s ease; /* 平滑过渡效果 */
  width: 93.5%; /* 设置宽度为屏幕的94% */

  font-size: 13px;
}

.custom-cell {
  display: flex;
  justify-content: space-between;
  background-color: #fff; /* 设置背景颜色为白色或其他浅色 */
  border-radius: 8px; /* 轻微圆角效果 */
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.2); /* 应用阴影效果 */
  margin: 10px auto; /* 为了更好的视觉效果和空间感，添加外边距，并居中对齐 */
  padding: 15px 10px; /* 增加内边距，使内容与边框有一定距离 */
  transition: box-shadow 0.3s ease; /* 平滑过渡效果 */
  width: 95%; /* 设置宽度为屏幕的95% */
  /* max-width: 1200px; */
  font-size: 13px;
}

@media (max-width: 768px) {
  .custom-container {
    width: 92.5%;
  }
  .custom-cell {
    width: 95%;
  }
}

@media (max-width: 430px) {
  .custom-container {
    width: 90.5%;
  }
  .custom-cell {
    width: 95%;
  }
}

/* @media (min-width: 1200px) and (orientation: landscape){
  .custom-container {
    width: 95%;
  }
  .custom-cell {
    width: 95%;
  }
} */
</style>
