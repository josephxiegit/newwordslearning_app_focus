<script setup>
import {
  watch,
  onMounted,
  ref,
  getCurrentInstance,
  nextTick,
  computed,
  onBeforeUnmount,
} from "vue";
import { useRouter } from "vue-router";
import {
  showSuccessToast,
  showFailToast,
  showLoadingToast,
  showConfirmDialog,
  showToast,
  showDialog,
  Dialog,
} from "vant";
import moment from "moment";
import loading from "./loading.vue";
import WinningCalendar from "./WinningCalendar.vue";
import TeacherComment from "./teacherComment.vue"; // 保持与实际文件名一致
import logList from "./logList.vue";
import xlsmList from "./xlsmList.vue";
import WeeklyMultiUserChart from "./WeeklyMultiUserChart.vue";

const router = useRouter();
const instance = getCurrentInstance();
const axios = instance.appContext.config.globalProperties.$ajax;

const originalData = ref([]);
const filterXlsmData = ref([]);

// 查看答案log
const answerLogResult = ref([]);
const reviewLogResult = ref([]);
const showAnswerLog = ref(false);
const flagTimesPreviews = ref(false);
const answerUsername = ref("");
const answerAttempt = ref("");
const answerSwipe = ref("");
const answerLens = ref("");
const answerRate = ref("");
const answerTitle = ref("");
const totalDuration = ref(0);
const searchAnswer = (item, index) => {
  return new Promise((resolve) => {
    // console.log(item, index);
    answerUsername.value = item.username;
    reviewLogResult.value = [];
    answerAttempt.value = item.attempt;
    answerSwipe.value = item.swipe;
    answerLens.value = item.answers_len;
    answerRate.value = item.rate;
    answerTitle.value = item.title;
    async function getAnswerLog() {
      let params = new URLSearchParams();
      params.append("method", "getAnswerLog");
      params.append("account_data_id", item.nid);
      return await axios.post("words/", params).then((ret) => {
        return ret.data.answer_log;
      });
    }
    getAnswerLog().then((res) => {
      // console.log("AnswerLog", res);
      if (res.length == 0) {
        answerLogResult.value = [];
      } else {
        // answerLogResult.value = res.filter((item) => item.type === "预习");
        answerLogResult.value = res.filter(
          (item) => item.type?.includes("预习") || item.type?.includes("滑动")
        );
        console.log("answerLogResult: ", answerLogResult.value);
        reviewLogResult.value = res.filter((item) => item.type == "检查");
        // console.log("reviewLogResult: ", reviewLogResult.value);
        let totalSeconds = 0;
        answerLogResult.value.forEach((item) => {
          const durationParts = item.duration.match(/(\d+)分(\d+)秒/);
          if (durationParts) {
            const minutes = parseInt(durationParts[1], 10) || 0;
            const seconds = parseInt(durationParts[2], 10) || 0;
            totalSeconds += minutes * 60 + seconds;
          }
          totalDuration.value = totalSeconds;
          // console.log("totalSeconds: ", totalSeconds);
        });

        // 计算退出预习次数
        const grouped = {};
        answerLogResult.value.forEach((record) => {
          const time = moment(record.create_time, "YYYY年MM月DD日HH时mm分ss秒");
          const halfHourIndex = Math.floor(
            time.hour() * 2 + time.minute() / 30
          );
          if (!grouped[halfHourIndex]) {
            grouped[halfHourIndex] = 0;
          }
          grouped[halfHourIndex]++;
        });
        // console.log("grouped", grouped);
        flagTimesPreviews.value = Object.values(grouped).some(
          (value) => value > 5
        );
      }
      resolve();
    });
  });
};
const purchaseDetail = ref({});
const searchpurchase = (item, index) => {
  return new Promise((resolve) => {
    // console.log(item, index);
    purchaseDetail.value = {};
    async function searchpurchase() {
      let params = new URLSearchParams();
      params.append("method", "filterPurchaseLog");
      params.append("account_data_id", item.nid);
      return await axios.post("words/", params).then((ret) => {
        return ret.data;
      });
    }
    searchpurchase().then((res) => {
      if (res != []) {
        res.forEach((item) => {
          const { type } = item;
          if (type === "星星") {
            if (purchaseDetail.value[type]) {
              purchaseDetail.value[type]++;
            } else {
              purchaseDetail.value[type] = 1;
            }
          }
        });
      }
      // console.log("purchaseLog", purchaseDetail.value);
      resolve();
    });
  });
};
// 查询日志
const showAccountLog = ref(false);
const answerLogList = ref([]);
const reviewLogList = ref([]);
const totalHelp = ref(0);
const isLateNight = ref(false);
function formatDate_log(isoString) {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}年${month}月${day}日${hours}时${minutes}分`;
}

// 日志详情
const showDetail = ref(false);
const detailName = ref("");
const detailDate = ref("");
const detailXlsmName = ref("");
const detailRate = ref("");
const detailMode = ref("");
const detailTeacherMmark = ref("");
const detailNid = ref("");
const detailList = ref([]);
const numberprev = ref(0);
const numbershowanswer = ref(0);
const numbertransparent = ref(0);
const diamondConsume = ref("");
// 延迟库
const showUncertain = ref(false);
const uncertainResult = ref("");
const loadingUncertain = ref(false);
const showUncertainResult = () => {
  showUncertain.value = true;
};
const isCorrectAnswer = (
  userChoices,
  answerString,
  correctAnswer,
  is_spell,
  排除,
  英文
) => {
  if (排除 === "手写") {
    // const userChoicesString = userChoices.join("");
    // return userChoicesString === 英文;
    const cleanString = (str) =>
      (str || "").toLowerCase().replace(/[^a-z]/g, "");
    const userChoicesString = cleanString(userChoices.join(""));
    const target = cleanString(英文);
    return userChoicesString === target;
  }
  if (is_spell) {
    const userChoicesString = userChoices.join("");
    const correctAnswerString = correctAnswer.replace(/\s+/g, "");
    return userChoicesString === correctAnswerString;
  } else {
    const answers = answerString.split("；").sort(); // Split answer string into an array and sort
    // if(correctAnswer === "启动；创办；开始") {
    //   console.log('userChoices: ', userChoices);
    //   console.log('answerString: ', answerString);
    //   console.log('correctAnswer: ', correctAnswer);
    //   console.log('is_spell: ', is_spell);
    // }
    // if(correctAnswer === "解决问题") {
    //   console.log('userChoices: ', userChoices);
    //   console.log('answerString: ', answerString);
    //   console.log('correctAnswer: ', correctAnswer);
    //   console.log('is_spell: ', is_spell);
    // }
    // if (answerString === "以上都不对") {
    //   return userChoices.length === 1 && userChoices[0] === answerString;
    // }
    const sortedUserChoices = [...userChoices].sort(); // Copy userChoices array and sort
    // if(correctAnswer === "启动；创办；开始") {
    //   console.log('answers: ', answers);
    //   console.log('sortedUserChoices: ', sortedUserChoices);
    // }

    if (sortedUserChoices.length !== answers.length) {
      return false; // If lengths are not equal, return false
    }

    return sortedUserChoices.every(
      (choice, index) => choice === answers[index]
    );
  }
};

async function getUncertain(nid) {
  loadingUncertain.value = true;
  let params = new URLSearchParams();
  params.append("method", "getUncertain");
  params.append("nid", nid);
  return await axios.post("words/", params).then((ret) => {
    // loadingUncertain.value = false;
    const res = JSON.parse(ret.data["uncertain_vocabulary"]);
    return res;
  });
}

const detailChallenge = ref(false);
const toggleDetail = async (item, index) => {
  // const detail = answerLogList.value[index];
  console.log("item: ", item);
  detailMode.value = item["swipe"];
  detailNid.value = item["nid"];
  detailList.value = item["log"];
  detailTeacherMmark.value = item["teacher_mark"];

  if (detailMode.value == "挑战") {
    const params = new URLSearchParams();
    params.append("method", "getAccountApplyChallenge");
    params.append("log_nid", detailNid.value);

    const response = await axios.post("words/", params);
    console.log("response.data", response.data);
    detailChallenge.value = response.data.apply_challenge;

    // console.log("teacher_mark", response.data.teacher_mark);

    // 创建一个映射，用于快速查找哪些英文单词的 teacher_mark 为 true
    const teacherMarkedWords = new Set();

    if (response.data.teacher_mark.length > 0) {
      const challengeData = JSON.parse(response.data.teacher_mark);
      challengeData.forEach((item) => {
        if (item.teacherMark === true && item.英文) {
          teacherMarkedWords.add(item.英文);
        }
      });
    }

    console.log("teacherMarkedWords: ", teacherMarkedWords);
    // 更新 detailList 中每个项目的 teacher_mark 状态
    detailList.value.forEach((item) => {
      if (teacherMarkedWords.has(item.英文)) {
        item.teacherMark = true;
      } else {
        item.teacherMark = false;
      }
    });
    console.log("detailList.value: ", detailList.value);
  }
  detailName.value = item["username"];
  detailDate.value = item["create_time"];
  detailXlsmName.value = item["title"];

  numberprev.value = item["numberprev"];
  numbershowanswer.value = item["numbershowanswer"];
  numbertransparent.value = item["numbertransparent"];
  diamondConsume.value = item["diamondConsume"];

  detailRate.value = item["true_length"] + "/" + item["log"].length;

  showDetail.value = true;

  getUncertain(item["nid"]).then((res) => {
    loadingUncertain.value = false;
    if (res) {
      uncertainResult.value = res;
    }
  });
};

// 编辑数据
const itemEdit = ref("");

const showSelectSpellVocabulary = ref(false);
const selectSpellVocabulary = ref([]);

const checkboxRefs2 = ref({});
const synonymsSelected = ref([]);
const toggleCheckChinese = (index) => {
  const key = `${index}`;
  const checkboxRef = checkboxRefs2.value[key];
  if (checkboxRef) {
    checkboxRef.toggle();
  }
  // console.log(synonymsSelected.value);
};

async function createSpellVocabulary(lock_spell, selectedVocabulary) {
  let params = new URLSearchParams();
  params.append("method", "createSpellVocabulary");
  params.append("username", itemEdit.value.username);
  params.append("account_data_id", itemEdit.value.nid);
  params.append("selectedVocabulary", JSON.stringify(selectedVocabulary));
  params.append("lock_spell", lock_spell);
  params.append("is_spell_number", synonymsSelected.value.length);
  return await axios.post("words/", params).then((ret) => {
    return ret.data;
  });
}

const confirmSelectVocabulary = () => {
  const selectedVocabulary = synonymsSelected.value.map((selected) => {
    // 找到序号对应的对象
    const item = selectSpellVocabulary.value.find(
      (vocab) => vocab.序号 === parseInt(selected)
    );
    // 返回只包含中文和英文的对象
    return { 中文: item.中文, 英文: item.英文 };
  });

  createSpellVocabulary(false, selectedVocabulary).then((res) => {
    // console.log(res);
    showSelectSpellVocabulary.value = false;
    if (
      valueSearchStudent.value == "" &&
      valueSearchXlsm.value == "" &&
      valueSearchGroup.value == "" &&
      valueGrade.value == "" &&
      valueLocation.value == "" &&
      valueSearchGroup.value == "" &&
      valueGrade.value == "" &&
      dateCalendar.value == ""
    ) {
      reloadPage();
    } else {
      showSuccessToast("处于筛选状态");
      filterData();
    }
  });
};

const lockSelectVocabulary = () => {
  if (synonymsSelected.value.length == 0) {
    showSelectSpellVocabulary.value = false;
    return;
  }
  const selectedVocabulary = synonymsSelected.value.map((selected) => {
    // 找到序号对应的对象
    const item = selectSpellVocabulary.value.find(
      (vocab) => vocab.序号 === parseInt(selected)
    );
    // 返回只包含中文和英文的对象
    return { 中文: item.中文, 英文: item.英文 };
  });
  createSpellVocabulary(true, selectedVocabulary).then((res) => {
    // console.log(res);
    showSelectSpellVocabulary.value = false;
    if (
      valueSearchStudent.value == "" &&
      valueSearchXlsm.value == "" &&
      valueSearchGroup.value == "" &&
      valueGrade.value == "" &&
      valueLocation.value == "" &&
      valueSearchGroup.value == "" &&
      valueGrade.value == "" &&
      dateCalendar.value == ""
    ) {
      reloadPage();
    } else {
      showSuccessToast("处于筛选状态");
      filterData();
    }
  });
};

// 筛选rate plus
const showRatePlus = computed(() => {
  return originalData.value.map((item) => item.rate > 3);
});
const processedTitle = (title) => {
  return title.split(".")[0]; // 获取第一个句点（.）之前的部分
};
// 加载数据
const activeTabs = ref("0");
const tabsName = ref([]);
const sidesName = ref([]);
const showStars = ref(false);
const loadingOriginalData = ref(false);
const finishedOriginalData = ref(false);
const pageIndexOriginalData = ref(0);
const isLoading = ref(false);

// 分页加载
const onLoadOriginalData = async (title = "全部") => {
  // console.log("filtergrade: ", title);
  // console.log("filterLocation: ", filterLocation.value);
  if (loadingOriginalData.value || finishedOriginalData.value) {
    return;
  }
  loadingOriginalData.value = true;
  isLoading.value = true;
  const params = new URLSearchParams();
  params.append("method", "getViewerAccountDataPage");
  params.append("grade", title);
  params.append("location", filterLocation.value);
  params.append("viewer_name", viewUsername.value);
  params.append("username", "josephxie");
  params.append("page", pageIndexOriginalData.value + 1); // 请求下一页的数据
  params.append("page_size", 20); // 每页数据大小
  const response = await axios.post("words/", params);
  let moreData = response.data.data;
  // console.log("filterName: ", filterName.value);
  console.log("moreData: ", moreData);
  // console.log("----------------------------------");
  if (moreData.length) {
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
    originalItems.value = [...originalData.value];
    valueSort.value = 0;
    pageIndexOriginalData.value++;
  }
  finishedOriginalData.value = !response.data.has_more;
  loadingOriginalData.value = false;
  isLoading.value = false;
};

// 点击tab年级
const filterGrade = ref("");
const onClickTab = ({ index }) => {
  if (activeTabs.value === index) {
    activeTabs.value = null;
    filterGrade.value = "";
  } else {
    activeTabs.value = index;
    filterGrade.value = tabsName.value[index];
  }
};

// 点击具体项
const data_specific = ref("");

// 多选学生按钮
const multiSelectSidebar = ref(false);
const showChartMultitMode = ref(true);
const selectedSidebarItems = ref([]);
const multiUserChartDataList = ref([]);
const monthColumnWidth = ref("250px");
const chartCanvases = ref([]);

const selectAllItems = () => {
  if (sidesName.value && sidesName.value.length > 0) {
    selectedSidebarItems.value = sidesName.value.map((_, index) => index);
  }
};

watch(
  showChartMultitMode,
  (newVal) => {
    // 只有在切换到曲线图模式 (newVal 为 true) 且有数据时才需要绘制
    if (newVal && multiUserChartDataList.value.length > 0) {
      // 使用 nextTick 确保 Vue 已经完成了 DOM 的更新（即 canvas 元素已挂载）
      nextTick(() => {
        // 确保 chartCanvases 数组已经填充完毕
        if (chartCanvases.value.length > 0) {
          chartCanvases.value.forEach((canvas, index) => {
            // 确保 canvas 元素是 HTMLCanvasElement 实例
            if (canvas && canvas.getContext) {
              drawMultiUserChart(canvas, index);
            } else {
              console.warn(
                `Canvas element at index ${index} is not ready or null.`
              );
            }
          });

          chartCanvases.value = [];
        } else {
          console.log(
            "Chart canvases array is empty after nextTick. Retrying drawing logic."
          );
        }
      });
    }
  },
  { immediate: true }
);

const toggleAllChartMode = () => {
  showMomentScatter.value = false;
  showChartMultitMode.value = !showChartMultitMode.value;
  // 强制重新渲染，刷新日历布局
  nextTick(() => {
    // 触发窗口 resize 事件，让布局重新计算
    window.dispatchEvent(new Event("resize"));

    // 如果需要重新绘制图表
    if (showChartMultitMode.value) {
      nextTick(() => {
        drawMultiUserCharts();
      });
    }
  });
};

const generateMultiUserMonthDays = (userData, year, month) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  // 将周一设为一周的第一天（与单用户模式保持一致）
  let firstDayOfWeek = firstDay.getDay();
  firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  startDate.setDate(startDate.getDate() - firstDayOfWeek);

  const days = [];
  const today = new Date();
  const weekTotals = {};

  // 第一遍：收集所有天数的数据
  for (let i = 0; i < 42; i++) {
    // 直接基于年月日创建日期对象，避免时区问题
    const currentDate = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate() + i
    );

    const dateString = formatDate(currentDate);
    const isCurrentMonth =
      currentDate.getMonth() === month && currentDate.getFullYear() === year;
    const isEmpty = !isCurrentMonth;
    const recordCount = userData.dailyData[dateString] || 0;
    const hasFlower = recordCount > 0;
    const isToday = currentDate.toDateString() === today.toDateString();
    const weekNumber = Math.floor(i / 7); // 计算周数（0-5）

    days.push({
      day: currentDate.getDate(),
      dateString: dateString, // 添加dateString属性
      username: userData.username, // 添加username属性，用于显示当前用户
      isEmpty,
      isToday,
      hasFlower,
      recordCount,
      weekCompleteState: 0,
      weekNumber, // 记录周数，用于后续计算
    });

    // 计算每周的合计值
    if (!isEmpty) {
      if (!weekTotals[weekNumber]) {
        weekTotals[weekNumber] = 0;
      }
      weekTotals[weekNumber] += recordCount;
    }
  }

  // 第二遍：根据每周合计值设置weekCompleteState
  for (let i = 0; i < days.length; i++) {
    const day = days[i];
    if (!day.isEmpty) {
      const weekTotal = weekTotals[day.weekNumber] || 0;
      if (weekTotal > 0) {
        if (weekTotal >= 6) {
          day.weekCompleteState = 2; // 深黄色
        } else {
          day.weekCompleteState = 1; // 浅黄色
        }
      } else {
        day.weekCompleteState = 0; // 没有数据，不设置颜色
      }
    }
  }

  return days;
};

// 计算多用户四周八周平均
const calculateFourWeekAvg = (userData) => {
  const today = new Date("2025-12-03"); // 使用您给定的今天日期进行精确计算
  let totalCount = 0; // 累计 28 天的总次数
  const numWeeks = 4; // 总周数

  for (let i = 3; i >= 0; i--) {
    const weekStart = new Date(today);
    let dayOfWeek = today.getDay(); // 2 (Tue)

    // 距离周一要减去的天数：(dayOfWeek + 6) % 7
    let daysToSubtractForCurrentMonday = (dayOfWeek + 6) % 7; // (2 + 6) % 7 = 1

    // 2. 找到当前周的星期一
    const currentMonday = new Date(today);
    currentMonday.setDate(today.getDate() - daysToSubtractForCurrentMonday);

    // 3. 找到四個周期前那个周的星期一 (i=3 时最远)
    const startOfWeek = new Date(currentMonday);
    startOfWeek.setDate(currentMonday.getDate() - i * 7);

    // 循环一周 (7天)
    for (let j = 0; j < 7; j++) {
      const currentDate = new Date(startOfWeek);
      currentDate.setDate(startOfWeek.getDate() + j);

      const dateString = formatDate(currentDate);
      // 累加所有 28 天的总和
      totalCount += userData.dailyData[dateString] || 0;
    }
  }

  return totalCount / numWeeks;
};

const calculateEightWeekAvg = (userData) => {
  const today = new Date();
  let totalCount = 0;
  const numWeeks = 8;
  let dayOfWeek = today.getDay();

  const daysToSubtractForCurrentMonday = (dayOfWeek + 6) % 7;
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() - daysToSubtractForCurrentMonday);

  // 2. 循环 8 次，计算从今天所在周开始，向前 7 个完整周的数据
  // i 从 7 (最远的周) 循环到 0 (当前的周)
  for (let i = numWeeks - 1; i >= 0; i--) {
    // 找到当前循环周的星期一
    const startOfWeek = new Date(currentMonday);
    startOfWeek.setDate(currentMonday.getDate() - i * 7);

    // 3. 循环一周 (7天)，累加数据
    for (let j = 0; j < 7; j++) {
      const currentDate = new Date(startOfWeek);
      currentDate.setDate(startOfWeek.getDate() + j);

      const dateString = formatDate(currentDate);

      // 累加所有 56 天的总和
      totalCount += userData.dailyData[dateString] || 0;
    }
  }

  // 4. 返回周平均值 (总次数 / 8 周)
  return totalCount / numWeeks;
};

// 退出多用户模式
const exitMultiUserMode = () => {
  multiUserChartDataList.value = [];
  selectedSidebarItems.value = [];
};

// 绘制多用户图表
const drawMultiUserChart = (canvas, index) => {
  if (!canvas) {
    console.warn(`Canvas ${index} not found`);
    return;
  }

  const userData = multiUserChartDataList.value[index];
  if (!userData) return;

  const container = canvas.parentElement;

  if (!container) {
    console.warn(`Container for canvas ${index} not found`);
    return;
  }

  const dpr = window.devicePixelRatio || 1;
  const rect = container.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = rect.width + "px";
  canvas.style.height = rect.height + "px";

  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, rect.width, rect.height);

  // 计算最近4周数据
  const today = new Date();
  const weeks = [];

  for (let i = 3; i >= 0; i--) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - i * 7 - today.getDay() + 1);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const weekData = {
      label: `${weekStart.getMonth() + 1}.${weekStart.getDate()}-${
        weekEnd.getMonth() + 1
      }.${weekEnd.getDate()}`,
      count: 0,
    };

    for (let j = 0; j < 7; j++) {
      const currentDate = new Date(weekStart);
      currentDate.setDate(weekStart.getDate() + j);
      const dateString = formatDate(currentDate);
      weekData.count += userData.dailyData[dateString] || 0;
    }

    weeks.push(weekData);
  }

  // 设置样式
  const padding = { top: 30, right: 20, bottom: 65, left: 50 };
  const chartWidth = rect.width - padding.left - padding.right;
  const chartHeight = rect.height - padding.top - padding.bottom;
  const maxCount = Math.max(...weeks.map((d) => d.count), 10);

  // 绘制渐变背景
  const bgGradient = ctx.createLinearGradient(
    0,
    padding.top,
    0,
    rect.height - padding.bottom
  );
  bgGradient.addColorStop(0, "rgba(25, 137, 250, 0.05)");
  bgGradient.addColorStop(1, "rgba(25, 137, 250, 0.01)");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(padding.left, padding.top, chartWidth, chartHeight);

  // 绘制Y轴网格线和刻度
  ctx.strokeStyle = "rgba(0, 0, 0, 0.08)";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#999";
  ctx.font =
    '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial';
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  for (let i = 0; i <= 5; i++) {
    const y = padding.top + (chartHeight / 5) * i;
    const value = Math.round(maxCount - (maxCount / 5) * i);

    // 网格线
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(rect.width - padding.right, y);
    ctx.stroke();

    // Y轴刻度
    ctx.fillText(value.toString(), padding.left - 10, y);
  }

  // 绘制X轴
  ctx.strokeStyle = "rgba(0, 0, 0, 0.15)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding.left, rect.height - padding.bottom);
  ctx.lineTo(rect.width - padding.right, rect.height - padding.bottom);
  ctx.stroke();

  // 取最近4周数据
  const recentData = weeks.slice(-4);
  const barWidth = (chartWidth / recentData.length) * 0.7;
  const barSpacing = chartWidth / recentData.length;

  // 绘制柱状图
  recentData.forEach((d, i) => {
    const barHeight = (d.count / maxCount) * chartHeight;
    const x = padding.left + barSpacing * i + (barSpacing - barWidth) / 2;
    const y = rect.height - padding.bottom - barHeight;

    // 绘制柱子渐变
    const barGradient = ctx.createLinearGradient(
      x,
      y,
      x,
      rect.height - padding.bottom
    );
    barGradient.addColorStop(0, "rgba(59, 130, 246, 0.9)");
    barGradient.addColorStop(1, "rgba(59, 130, 246, 0.7)");

    ctx.fillStyle = barGradient;
    ctx.strokeStyle = "rgb(59, 130, 246)";
    ctx.lineWidth = 2;

    // 绘制圆角矩形柱子
    ctx.beginPath();
    const radius = 6;
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + barWidth - radius, y);
    ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
    ctx.lineTo(x + barWidth, rect.height - padding.bottom);
    ctx.lineTo(x, rect.height - padding.bottom);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 绘制柱子内的数据标签
    ctx.font =
      'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial';
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(d.count.toString(), x + barWidth / 2, y + 10);

    // X轴日期标签（45度倾斜）
    ctx.save();
    ctx.translate(x + barWidth / 2, rect.height - padding.bottom + 20);
    ctx.rotate(-Math.PI / 6);
    ctx.font =
      '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial';
    ctx.fillStyle = "#666";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(d.label, 0, 0);
    ctx.restore();
  });

  // 计算四周平均值
  const fourWeekAvgValue =
    recentData.reduce((acc, item) => acc + item.count, 0) / recentData.length;

  // 绘制四周平均线
  if (fourWeekAvgValue > 0) {
    const avgY =
      rect.height -
      padding.bottom -
      (fourWeekAvgValue / maxCount) * chartHeight;

    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding.left, avgY);
    ctx.lineTo(rect.width - padding.right, avgY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 绘制Y轴标题"背诵次数"（垂直显示）
  ctx.save();
  ctx.translate(15, rect.height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.font =
    'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial';
  ctx.fillStyle = "#666";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("背诵次数", 0, 0);
  ctx.restore();
};

const toggleSidebarMultiSelectMode = async () => {
  multiSelectSidebar.value = !multiSelectSidebar.value;

  if (!multiSelectSidebar.value) {
    if (selectedSidebarItems.value.length > 0) {
      multiUserChartDataList.value = [];

      for (const index of selectedSidebarItems.value) {
        const username = sidesName.value[index].username;

        try {
          // 请求该用户的数据
          let params = new URLSearchParams();
          params.append("method", "getUserWinningStreak");
          params.append("username", username);

          const response = await axios.post("words/", params);

          if (response.data.status === "success") {
            // 处理每日数据
            const dailyData = {};
            response.data.daily_data.forEach((record) => {
              const date = record.date.split(" ")[0];
              dailyData[date] = record.record_count || 0;
            });

            // 将用户数据存入数组
            multiUserChartDataList.value.push({
              username: username,
              winningStreak: response.data.winning_streak * 7,
              dailyData: dailyData,
              completeWeeks: response.data.data.map((record) => ({
                monday: record.week_monday.split(" ")[0],
                state: record.complete_state,
              })),
              hasEnoughToday: response.data.has_enough_today,
            });
          }
        } catch (error) {
          console.error(`获取 ${username} 数据失败:`, error);
          showToast(`获取 ${username} 数据失败`);
        }
      }

      console.log("多用户图表数据:", multiUserChartDataList.value);

      // ❗ 重点新增：数据加载完成后，如果当前是曲线图模式，手动触发绘制
      if (showChartMultitMode.value) {
        // 必须使用 nextTick 来等待 DOM 渲染完成
        nextTick(() => {
          chartCanvases.value.forEach((canvas, index) => {
            if (canvas && canvas.getContext) {
              drawMultiUserChart(canvas, index);
            }
          });
          // 清空 Refs 数组
          chartCanvases.value = [];
        });
      }
    }
    selectedSidebarItems.value = [];
  }
};

const toggleSidebarSelect = (index) => {
  if (selectedSidebarItems.value.includes(index)) {
    selectedSidebarItems.value = selectedSidebarItems.value.filter(
      (i) => i !== index
    );
  } else {
    selectedSidebarItems.value.push(index);
  }
};

const unSelectedSidebarItems = () => {
  selectedSidebarItems.value = [];
  multiSelectSidebar.value = false;
};

// 切换时刻散点图
const showMomentScatter = ref(false);
const popUpMomentScatter = () => {
  showMomentScatter.value = true;
};

// 周长细节
const showDailyDetail = ref(false);
const showDailyRange = ref(false);
const dateDaily = ref("");
const minDateDaily = ref(new Date(2025, 0, 1));
// const formatDate = (date) =>
//   `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;

// 图表相关响应式数据
const dailyCalendarData = ref({});
const currentSelectedUser = ref("");

// 全屏模式
const isChartFullscreen = ref(false);
const toggleFullscreen = () => {
  isChartFullscreen.value = !isChartFullscreen.value;
  if (isChartFullscreen.value && multiSelectSidebar.value) {
    unSelectedSidebarItems();
  }
  if(showMomentScatter.value) {
    nextTick(() => {
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 500);
    });
  }
};

// 图表数据
// 本月日历，连胜
const monthDays = ref([]);
const weekdayNames = ["一", "二", "三", "四", "五", "六", "日"];
const currentMonth = ref("");
const currentYear = ref(new Date().getFullYear());
const currentMonthIndex = ref(new Date().getMonth()); // 0-11
const completeWeekStates = ref({});
const has_enough_today = ref(false);
const showChartMode = ref(true);

const realCurrentYear = new Date().getFullYear();
const realCurrentMonth = new Date().getMonth(); // 0-11
const showWinningCalendar = ref(false);
const daysWinningStreak = ref(0);
const completeWeeks = ref([]);
const viewUsername = ref("");
const showMonthColumn = ref(true);

const activeSidebarIndex = ref(null);

const toggleMonthColumn = () => {
  showMonthColumn.value = !showMonthColumn.value;
  // 如果显示第三列且有选中用户，刷新曲线图数据
  if (showMonthColumn.value && viewUsername.value) {
    nextTick(() => {
      setTimeout(async () => {
        await generateMonthDays(
          currentYear.value,
          currentMonthIndex.value && activeSidebarIndex.value !== null
        );
        if (showChartMode.value) {
          drawChart();
        }
      }, 350);
    });
  }
};

const toggleChartMode = () => {
  showChartMode.value = !showChartMode.value;
  monthColumnWidth.value = showChartMode.value ? "250px" : "330px";

  // 需要延迟更长时间等待CSS过渡完成
  nextTick(() => {
    setTimeout(() => {
      if (showChartMode.value && chartCanvas.value) {
        drawChart();
      }
    }, 350); // 与CSS过渡时间(0.3s)保持一致，多留50ms
  });
};

// 新增：计算最近四周的数据
// 获取最近4周的数据
const getLastFourWeeksData = computed(() => {
  const today = new Date();
  const weeks = [];

  for (let i = 3; i >= 0; i--) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - i * 7 - today.getDay() + 1);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const weekData = {
      label: `${weekStart.getMonth() + 1}.${weekStart.getDate()}-${
        weekEnd.getMonth() + 1
      }.${weekEnd.getDate()}`,
      count: 0,
    };

    // 统计这一周的背诵次数
    for (let j = 0; j < 7; j++) {
      const currentDate = new Date(weekStart);
      currentDate.setDate(weekStart.getDate() + j);
      const dateString = formatDate(currentDate);
      weekData.count += dailyCalendarData.value[dateString] || 0;
    }

    weeks.push(weekData);
  }

  return weeks;
});

// 获取最近8周的数据，用于计算八周平均值
const getLastEightWeeksData = computed(() => {
  const today = new Date();
  const weeks = [];

  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - i * 7 - today.getDay() + 1);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const weekData = {
      label: `${weekStart.getMonth() + 1}.${weekStart.getDate()}-${
        weekEnd.getMonth() + 1
      }.${weekEnd.getDate()}`,
      count: 0,
    };

    // 统计这一周的背诵次数
    for (let j = 0; j < 7; j++) {
      const currentDate = new Date(weekStart);
      currentDate.setDate(weekStart.getDate() + j);
      const dateString = formatDate(currentDate);
      weekData.count += dailyCalendarData.value[dateString] || 0;
    }

    weeks.push(weekData);
  }

  return weeks;
});

// 生成本月日历数据
const generateMonthDays = async (year, month) => {
  // 设置月份标题
  currentMonth.value = `${year}年${month + 1}月`;

  // 获取该月第一天和最后一天
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // 获取第一天是星期几（0=周日，需要转换成周一为第一天）
  let firstDayOfWeek = firstDay.getDay();
  firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // 转换为周一=0

  // 获取本月天数
  const daysInMonth = lastDay.getDate();

  // 获取数据 - 传入年月参数
  let params = new URLSearchParams();
  params.append("method", "getUserWinningStreak");
  params.append("username", viewUsername.value);
  params.append("year", year.toString());
  params.append("month", (month + 1).toString());

  const response = await axios.post("words/", params);

  if (response.data.status === "success") {
    // 处理返回的数据
    completeWeeks.value = response.data.data.map((record) => ({
      monday: record.week_monday.split(" ")[0],
      state: record.complete_state,
    }));

    daysWinningStreak.value = response.data.winning_streak * 7;

    // 构建周完成状态映射
    completeWeekStates.value = {};
    response.data.data.forEach((record) => {
      const monday = record.week_monday.split(" ")[0];
      completeWeekStates.value[monday] = record.complete_state || 0;
    });

    has_enough_today.value = response.data.has_enough_today;

    // 构建每日数据映射
    dailyCalendarData.value = {};
    response.data.daily_data.forEach((record) => {
      const date = record.date.split(" ")[0];
      dailyCalendarData.value[date] = record.record_count || 0;
    });

    console.log("dailyCalendarData", dailyCalendarData.value);

    // 生成日历数组
    monthDays.value = [];

    // 添加空白格子（月初前的空白）
    for (let i = 0; i < firstDayOfWeek; i++) {
      monthDays.value.push({
        isEmpty: true,
      });
    }

    // 获取今天的日期（用于判断是否是今天）
    const today = new Date();
    const todayString = formatDate(today);

    // 添加本月的所有日期
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      const dateString = formatDate(currentDate);
      const mondayString = getMondayOfWeek(currentDate);

      // 获取该日期所在周的完成状态
      const weekCompleteState = completeWeekStates.value[mondayString] || 0;

      // 获取该日期的背诵次数
      const recordCount = dailyCalendarData.value[dateString] || 0;

      // 判断是否是今天（只有在查询当前月份时才标记今天）
      const isCurrentMonth =
        year === today.getFullYear() && month === today.getMonth();
      const isToday = isCurrentMonth && todayString === dateString;

      monthDays.value.push({
        date: currentDate.toISOString(),
        day: day,
        dateString: dateString,
        isToday: isToday,
        hasFlower: recordCount > 0,
        recordCount: recordCount,
        weekCompleteState: weekCompleteState,
        isEmpty: false,
      });
    }
  }
};

// 检查是否可以切换到目标月份
const canChangeMonth = (targetYear, targetMonth) => {
  // 计算目标月份与当前真实月份的差距（以月为单位）
  const targetDate = new Date(targetYear, targetMonth, 1);
  const currentDate = new Date(realCurrentYear, realCurrentMonth, 1);

  // 计算月份差
  const monthDiff =
    (targetYear - realCurrentYear) * 12 + (targetMonth - realCurrentMonth);

  // console.log(
  //   `目标: ${targetYear}年${targetMonth + 1}月, 当前: ${realCurrentYear}年${
  //     realCurrentMonth + 1
  //   }月, 差距: ${monthDiff}个月`
  // );

  // 不能查看未来月份
  if (monthDiff > 0) {
    showToast({
      message: "不能查看未来月份",
      duration: 2000,
      icon: "warning-o",
    });
    return false;
  }

  // 最多只能查看前3个月
  if (monthDiff < -3) {
    showToast({
      message: "最多只能查看前3个月的数据",
      duration: 2000,
      icon: "warning-o",
    });
    return false;
  }

  return true;
};

const changeMonth = (offset) => {
  // 计算目标年月
  let targetYear = currentYear.value;
  let targetMonth = currentMonthIndex.value + offset;

  // 处理跨年
  if (targetMonth > 11) {
    targetMonth = 0;
    targetYear += 1;
  } else if (targetMonth < 0) {
    targetMonth = 11;
    targetYear -= 1;
  }

  // 检查是否可以切换
  if (!canChangeMonth(targetYear, targetMonth)) {
    return; // 不允许切换，直接返回
  }

  // 更新当前显示的年月
  currentYear.value = targetYear;
  currentMonthIndex.value = targetMonth;

  // 重新生成日历
  generateMonthDays(currentYear.value, currentMonthIndex.value);
};

const changeMonthMulti = (offset) => {
  // 计算目标年月
  let targetYear = currentYear.value;
  let targetMonth = currentMonthIndex.value + offset;

  // 处理跨年
  if (targetMonth > 11) {
    targetMonth = 0;
    targetYear += 1;
  } else if (targetMonth < 0) {
    targetMonth = 11;
    targetYear -= 1;
  }

  // 检查是否可以切换
  if (!canChangeMonth(targetYear, targetMonth)) {
    return; // 不允许切换，直接返回
  }

  // 更新当前显示的年月
  currentYear.value = targetYear;
  currentMonthIndex.value = targetMonth;
  // 更新月份显示
  currentMonth.value = `${targetYear}年${targetMonth + 1}月`;
  console.log("multiUserChartDataList", multiUserChartDataList.value);
};

// 计算是否可以点击上/下月按钮（用于按钮禁用状态）

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getMondayOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return formatDate(monday);
};

// 点击日期
const selectDate = (day) => {
  // 如果有username属性（多用户模式），则显示用户名
  const username = day.username || viewUsername.value;
  if (day.recordCount > 0) {
    showToast({
      message: `${username} ${day.dateString} 背诵 ${day.recordCount} 次`,
      duration: 2000,
    });
  } else {
    showToast({
      message: `${username} ${day.dateString} 暂无背诵数据`,
      duration: 2000,
    });
  }
};

// 新增：绘制曲线图
const chartCanvas = ref(null);
const fourWeekAvg = ref(0);
const eightWeekAvg = ref(0);

const drawChart = () => {
  if (!chartCanvas.value) return;

  const canvas = chartCanvas.value;
  const container = canvas.parentElement;

  // 强制重新计算容器尺寸
  const dpr = window.devicePixelRatio || 1;
  const rect = container.getBoundingClientRect();

  // 重新设置canvas尺寸（这会清空之前的内容）
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = rect.width + "px";
  canvas.style.height = rect.height + "px";

  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  const data = getLastFourWeeksData.value;

  // 计算四周和八周平均数
  // 取最近4周数据计算四周平均
  const recentFourWeeks = data.slice(-4);
  if (recentFourWeeks.length > 0) {
    fourWeekAvg.value =
      recentFourWeeks.reduce((acc, item) => acc + item.count, 0) /
      recentFourWeeks.length;
  }

  // 取最近8周数据计算八周平均
  const recentEightWeeks = getLastEightWeeksData.value;
  if (recentEightWeeks.length > 0) {
    eightWeekAvg.value =
      recentEightWeeks.reduce((acc, item) => acc + item.count, 0) /
      recentEightWeeks.length;
  }

  // 清空画布
  ctx.clearRect(0, 0, rect.width, rect.height);

  // 设置样式
  const padding = { top: 30, right: 20, bottom: 65, left: 50 };
  const chartWidth = rect.width - padding.left - padding.right;
  const chartHeight = rect.height - padding.top - padding.bottom;
  const maxCount = Math.max(
    ...data.map((d) => d.count),
    fourWeekAvg.value + 5,
    10
  );

  // 绘制渐变背景
  const bgGradient = ctx.createLinearGradient(
    0,
    padding.top,
    0,
    rect.height - padding.bottom
  );
  bgGradient.addColorStop(0, "rgba(25, 137, 250, 0.05)");
  bgGradient.addColorStop(1, "rgba(25, 137, 250, 0.01)");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(padding.left, padding.top, chartWidth, chartHeight);

  // 绘制Y轴网格线和刻度
  ctx.strokeStyle = "rgba(0, 0, 0, 0.08)";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#999";
  ctx.font =
    '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial';
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  for (let i = 0; i <= 5; i++) {
    const y = padding.top + (chartHeight / 5) * i;
    const value = Math.round(maxCount - (maxCount / 5) * i);

    // 网格线
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(rect.width - padding.right, y);
    ctx.stroke();

    // Y轴刻度
    ctx.fillText(value.toString(), padding.left - 10, y);
  }

  // 绘制X轴
  ctx.strokeStyle = "rgba(0, 0, 0, 0.15)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding.left, rect.height - padding.bottom);
  ctx.lineTo(rect.width - padding.right, rect.height - padding.bottom);
  ctx.stroke();

  // 取最近4周数据
  const recentData = data.slice(-4);
  const barWidth = (chartWidth / recentData.length) * 0.7;
  const barSpacing = chartWidth / recentData.length;

  // 绘制柱状图
  recentData.forEach((d, i) => {
    const barHeight = (d.count / maxCount) * chartHeight;
    const x = padding.left + barSpacing * i + (barSpacing - barWidth) / 2;
    const y = rect.height - padding.bottom - barHeight;

    // 绘制柱子渐变
    const barGradient = ctx.createLinearGradient(
      x,
      y,
      x,
      rect.height - padding.bottom
    );
    barGradient.addColorStop(0, "rgba(59, 130, 246, 0.9)");
    barGradient.addColorStop(1, "rgba(59, 130, 246, 0.7)");

    ctx.fillStyle = barGradient;
    ctx.strokeStyle = "rgb(59, 130, 246)";
    ctx.lineWidth = 2;

    // 绘制圆角矩形柱子
    ctx.beginPath();
    const radius = 6;
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + barWidth - radius, y);
    ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
    ctx.lineTo(x + barWidth, rect.height - padding.bottom);
    ctx.lineTo(x, rect.height - padding.bottom);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 绘制柱子内的数据标签
    ctx.font =
      'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial';
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(d.count.toString(), x + barWidth / 2, y + 10);

    // X轴日期标签（45度倾斜）
    ctx.save();
    ctx.translate(x + barWidth / 2, rect.height - padding.bottom + 20);
    ctx.rotate(-Math.PI / 6);
    ctx.font =
      '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial';
    ctx.fillStyle = "#666";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(d.label, 0, 0);
    ctx.restore();
  });

  // 绘制四周平均线
  if (fourWeekAvg.value > 0) {
    const avgY =
      rect.height -
      padding.bottom -
      (fourWeekAvg.value / maxCount) * chartHeight;

    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding.left, avgY);
    ctx.lineTo(rect.width - padding.right, avgY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 绘制Y轴标题"背诵次数"（垂直显示）
  ctx.save();
  ctx.translate(15, rect.height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.restore();
};

watch(showChartMode, (newVal) => {
  if (newVal) {
    nextTick(() => {
      drawChart();
    });
  }
});

// 新增：监听数据变化重绘
watch(
  dailyCalendarData,
  () => {
    if (showChartMode.value) {
      nextTick(() => {
        drawChart();
      });
    }
  },
  { deep: true }
);

const handleDateClick = (dayData) => {
  // 点击日期回调
  const count = dayData.recordCount;
  if (count > 0) {
    showToast({
      message: `${dayData.dateString} 背诵 ${count} 次`,
      zIndex: 9999,
    });
  } else {
    showToast({
      message: `${dayData.dateString} 暂无背诵数据`,
      zIndex: 9999,
    });
  }
};

// 组件卸载时清理事件监听
onBeforeUnmount(() => {});

const onConfirmDailyRange = async (values) => {
  let toast1 = showLoadingToast({
    message: "查询中...",
    forbidClick: true,
  });

  const [start, end] = values;
  showDailyRange.value = false;
  dateDaily.value = `${formatDate(start)} - ${formatDate(end)}`;

  LastDaysDailyTask.value = [];
  LastDaysReview.value = [];
  listDailyAndReview.value = [];

  let params = new URLSearchParams();
  params.append("method", "getLastDaysDailyTask");
  params.append("user", dailyUser.value);
  params.append("dateRange", dateDaily.value);

  let res = await axios.post("words/", params);
  console.log("res: ", res.data);

  // 合并 logs_daily 到 logs_review
  if (res.data.logs_daily && res.data.logs_daily.length > 0) {
    // 将 logs_daily 的内容合并到 logs_review
    const mergedReview = [
      ...(res.data.logs_review || []),
      ...res.data.logs_daily,
    ];

    // 按时间排序合并后的数据
    LastDaysReview.value = mergedReview.sort(
      (a, b) => new Date(b.create_time) - new Date(a.create_time)
    );

    // 清空 logs_daily
    LastDaysDailyTask.value = [];

    console.log(
      `已将 ${res.data.logs_daily.length} 项从 logs_daily 合并到 logs_review`
    );
  } else {
    // 如果没有 logs_daily 数据，直接使用 logs_review
    LastDaysReview.value = res.data.logs_review || [];
    LastDaysDailyTask.value = [];
  }

  // 创建完整的排序列表（现在只包含 LastDaysReview 的内容，因为 LastDaysDailyTask 已清空）
  listDailyAndReview.value = [...LastDaysReview.value];

  toast1.close();
};
// 复习细节
const LastDaysReview = ref([]);

// 点击sidebar
const activeSidebar = ref(null);
const dailyUser = ref("");
const filterName = ref("");
const backupSides = ref([]);
const LastDaysDailyTask = ref([]);
const listDailyAndReview = ref([]);
const showLastDaysDailyTask = ref(false);

async function getLastDaysDailyTask(username) {
  dailyUser.value = username;

  let params = new URLSearchParams();
  params.append("method", "getLastDaysDailyTask");
  params.append("user", username);

  let res = await axios.post("words/", params);
  console.log("res: ", res.data);

  // 合并 logs_swipe 到 logs_review
  if (res.data.logs_swipe && res.data.logs_swipe.length > 0) {
    // 将 logs_swipe 的内容合并到 logs_review
    const mergedReview = [
      ...(res.data.logs_review || []),
      ...res.data.logs_swipe,
    ];

    // 按时间排序合并后的数据
    LastDaysReview.value = mergedReview.sort(
      (a, b) => new Date(b.create_time) - new Date(a.create_time)
    );

    // 清空 logs_swipe
    LastDaysDailyTask.value = [];

    console.log(
      `已将 ${res.data.logs_swipe.length} 项从 logs_swipe 合并到 logs_review`
    );
  } else {
    // 如果没有 logs_swipe 数据，直接使用 logs_review
    LastDaysReview.value = res.data.logs_review || [];
    LastDaysDailyTask.value = [];
  }

  // 创建完整的排序列表（现在只包含 LastDaysReview 的内容，因为 LastDaysDailyTask 已清空）
  listDailyAndReview.value = [...LastDaysReview.value];
}

async function refreshtLastDaysDailyTask() {
  let toast1 = showLoadingToast({
    message: "查询中...",
    forbidClick: true,
  });

  LastDaysDailyTask.value = [];
  LastDaysReview.value = [];
  listDailyAndReview.value = [];
  dateDaily.value = "";

  let params = new URLSearchParams();
  params.append("method", "getLastDaysDailyTask");
  params.append("user", dailyUser.value);

  let res = await axios.post("words/", params);
  console.log("res: ", res);

  // 合并 logs_daily 到 logs_review
  if (res.data.logs_daily && res.data.logs_daily.length > 0) {
    // 将 logs_daily 的内容合并到 logs_review
    const mergedReview = [
      ...(res.data.logs_review || []),
      ...res.data.logs_daily,
    ];

    // 按时间排序合并后的数据
    LastDaysReview.value = mergedReview.sort(
      (a, b) => new Date(b.create_time) - new Date(a.create_time)
    );

    // 清空 logs_daily
    LastDaysDailyTask.value = [];

    console.log(
      `已将 ${res.data.logs_daily.length} 项从 logs_daily 合并到 logs_review`
    );
  } else {
    // 如果没有 logs_daily 数据，直接使用 logs_review
    LastDaysReview.value = res.data.logs_review || [];
    LastDaysDailyTask.value = [];
  }

  // 创建完整的排序列表（现在只包含 LastDaysReview 的内容，因为 LastDaysDailyTask 已清空）
  listDailyAndReview.value = [...LastDaysReview.value];

  toast1.close();
}

const onChangeSidebar = async (index) => {
  activeSidebarIndex.value = index;
  showLastDaysDailyTask.value = sidesName.value[index].username !== "全部";
  const username = sidesName.value[index]["username"];
  viewUsername.value = username;
  getLastDaysDailyTask(username);

  // 设置当前选中用户
  currentSelectedUser.value = username;

  let title;
  if (username == "全部") {
    filterName.value = "";
    filterStudentForComment.value = "";
  } else {
    filterName.value = username;
    filterStudentForComment.value = username;
  }

  // 筛选logList组件中的学生
  const selectedStudent = sidesName.value[index]["username"];

  let newtabsName;
  if (!tabsName.value.includes("全部")) {
    newtabsName = [...tabsName.value];
    newtabsName.unshift("全部");
  } else {
    newtabsName = [...tabsName.value];
  }
  // console.log('newtabsNamee: ', newtabsName)
  title = newtabsName[activeTabs.value];

  // console.log('activeTabs.value: ', activeTabs.value);
  originalData.value = [];
  finishedOriginalData.value = false;
  pageIndexOriginalData.value = 0;

  // handleUserClick(selectedStudent);
  // 重新加载数据
  onLoadOriginalData(title);
  if (showMonthColumn.value) {
    viewUsername.value = username;
    await generateMonthDays(currentYear.value, currentMonthIndex.value);
  }
};
watch(sidesName, () => {
  showLastDaysDailyTask.value = false;
});
// 地点选择
const showGridLocation = ref(false);
const locationitems = ref([
  { icon: "wap-home-o", text: "王串场" },
  { icon: "wap-home-o", text: "小树林" },
  // { icon: "wap-home-o", text: "张鑫" },
  { icon: "wap-home-o", text: "上门" },
  { icon: "wap-home-o", text: "南楼" },
]);

const selectedIndexLocation = ref(null);
const filterLocation = ref("");
const showPasswordPopup = ref(false);
const toggleLocationSelection = (index) => {
  // 只处理选中状态的切换，不进行立即筛选
  if (selectedIndexLocation.value === index) {
    // 取消地点选择
    selectedIndexLocation.value = null;
    filterLocation.value = "";
  } else {
    // 选择地点（单选功能）
    selectedIndexLocation.value = index;
    filterLocation.value = locationitems.value[index].text;
  }
  // 移除所有筛选和数据加载逻辑，等待用户点击应用筛选按钮
};

// 定义筛选参数的响应式变量，用于传递给teacherComment组件
const filterGradeForComment = ref("");
const filterLocationForComment = ref("");
const filterStudentForComment = ref("");

// 筛选按钮点击事件处理
const onFilterClick = () => {
  // 直接使用filterGrade和filterLocation的值进行筛选
  const grade = filterGrade.value;
  const location = filterLocation.value;

  // 如果grade和location都为空，显示全部内容
  if (!grade && !location) {
    // 移除"全部"项，只显示真实的用户数据
    sidesName.value = backupSides.value.filter(
      (item) => item.username !== "全部"
    );
  } else {
    // 根据已选择的地点和年级进行筛选
    sidesName.value = backupSides.value.filter((item) => {
      // 跳过"全部"项
      if (item.username === "全部") return false;

      // 检查是否有匹配的用户数据
      return usersData.value.some((user) => {
        // 用户名必须匹配
        if (user.username !== item.username) return false;

        // 如果有年级筛选条件，检查年级是否匹配
        if (grade && user.grade_name !== grade) return false;

        // 如果有地点筛选条件，检查地点是否匹配
        if (location && user.location_name !== location) return false;

        // 所有筛选条件都满足

        return true;
      });
    });
  }
};

// 分配词汇按钮
const showAssignWordsTasks = ref(false);
const assignWordsTasks = async () => {
  showAssignWordsTasks.value = true;
};

// 反选按钮
const unselectWordsTasks = async () => {
  filterGrade.value = "";
  filterLocation.value = "";
  selectedIndexLocation.value = null; // 取消地点选择
  activeTabs.value = null; // 取消年级选择
  activeSidebar.value = null; // 取消sidebar选择
  activeSidebarIndex.value = null; // 取消sidebar选择
  sidesName.value = backupSides.value; // 恢复所有用户数据
  filterName.value = ""; // 清空筛选名称
  filterStudentForComment.value = ""; // 清空评论筛选学生

  // 重置数据
  originalData.value = [];
  finishedOriginalData.value = false;
  pageIndexOriginalData.value = 0;
};

// 复习
const getSidesNameReviews = async (sidesName) => {
  const params = new URLSearchParams();
  params.append("method", "getSidesNameReviews");
  params.append("usernames", sidesName);
  const response = await axios.post("words/", params);
  return response.data.data;
};

const onCalendarClose = () => {
  // 关闭日历回调
};

const usersData = ref("");
const teacherPassword = ref("");
const TARGET_PASSWORD = "ss654321";
const PASSWORD_KEY = "teacherPassword";

const verifyPassword = async () => {
  const passwordInput = teacherPassword.value;
  if (passwordInput == TARGET_PASSWORD) {
    localStorage.setItem(PASSWORD_KEY, TARGET_PASSWORD);
    showPasswordPopup.value = false;
    return;
  } else {
    showFailToast({ message: "密码错误" });
  }
};
onMounted(async () => {
  const storedPassword = localStorage.getItem(PASSWORD_KEY);
  console.log("storedPassword: ", storedPassword);
  if (storedPassword !== TARGET_PASSWORD) {
    showPasswordPopup.value = true;
    return;
  }

  // 初始化月份显示
  currentMonth.value = `${currentYear.value}年${currentMonthIndex.value + 1}月`;

  async function submitAccountData() {
    let params = new URLSearchParams();

    params.append("method", "getViewerData");

    params.append("viewer", "josephxie");

    params.append("password", 123456);

    return await axios.post("words/", params).then((ret) => {
      console.log(ret.data);

      return ret.data;
    });
  }

  // 先获取基础数据

  const data = await submitAccountData();

  console.log("data: ", data);

  viewUsername.value = data.viewer_data[0].viewer_name;

  // console.log("viewUsername.value: ", viewUsername.value);

  if (viewUsername.value === "josephxie") showGridLocation.value = true;

  tabsName.value = data.grade_names;

  usersData.value = data.users;

  console.log("usersData.value: ", usersData.value);
  let users = data.users.map((item) => item.username);
  sidesName.value = await getSidesNameReviews(users);
  backupSides.value = [...sidesName.value];
});
</script>

<template>
  <div style="height: 100vh; overflow: hidden">
    <van-nav-bar title="背诵看板" class="nav-bar-container"> </van-nav-bar>

    <!-- 横屏布局 -->
    <div
      class="horizontal-layout-container"
      :class="{ 'fullscreen-active': isChartFullscreen }"
    >
      <!-- 左侧面板 -->
      <div class="left-panel">
        <!-- 左侧上方tabs按钮 -->
        <div class="tabs-buttons-container">
          <div
            v-for="(location, index) in locationitems"
            :key="index"
            class="tab-button location-tab"
            :class="{ active: selectedIndexLocation === index }"
            @click="toggleLocationSelection(index)"
          >
            {{ location.text }}
          </div>

          <!-- 添加换行元素 -->
          <div class="line-break"></div>

          <div
            v-for="(tab, index_tab) in tabsName"
            :key="index_tab"
            class="tab-button"
            :class="{ active: activeTabs === index_tab }"
            @click="onClickTab({ index: index_tab, name: tab.name })"
          >
            {{ tab }}
          </div>
        </div>

        <!-- 筛选按钮 -->
        <div class="filter-button-container">
          <button class="filter-button" @click="onFilterClick">
            <span>{{
              filterGrade || filterLocation
                ? filterGrade && filterLocation
                  ? `${filterLocation},${filterGrade}`
                  : filterGrade || filterLocation
                : "全部"
            }}</span>
          </button>
          <button class="assign-button" @click="assignWordsTasks">分配</button>
          <button class="unselect-button" @click="unselectWordsTasks">
            反选
          </button>
        </div>

        <!-- 左侧下方sidebar姓名多选 -->
        <div class="sidebar-container">
          <!-- 多选按钮 -->
          <div
            style="
              padding-bottom: 10px;
              border-bottom: 1px solid #e9ecef;
              display: flex;
              gap: 10px;
              align-items: center;
            "
          >
            <van-button
              size="small"
              type="primary"
              plain
              @click="unSelectedSidebarItems"
            >
              取消
            </van-button>

            <div style="display: flex; gap: 10px; margin-left: auto">
              <van-button
                v-if="multiSelectSidebar"
                size="small"
                type="success"
                plain
                @click="selectAllItems"
              >
                全选
              </van-button>

              <van-button
                size="small"
                :type="multiSelectSidebar ? 'danger' : 'primary'"
                plain
                @click="toggleSidebarMultiSelectMode"
              >
                {{ multiSelectSidebar ? "完成" : "多选" }}
              </van-button>
            </div>
          </div>

          <div
            v-for="(sidename, index_side) in sidesName"
            :key="index_side"
            class="sidebar-item"
            :class="{
              active: activeSidebarIndex === index_side && !multiSelectSidebar,
              'sidebar-item-selected':
                selectedSidebarItems.includes(index_side) && multiSelectSidebar,
            }"
            @click="
              multiSelectSidebar
                ? toggleSidebarSelect(index_side)
                : onChangeSidebar(index_side)
            "
          >
            <div
              style="
                display: flex;
                align-items: center;
                gap: 8px;
                flex: 1;
                min-width: 0;
              "
            >
              <van-checkbox
                v-if="multiSelectSidebar"
                :checked="selectedSidebarItems.includes(index_side)"
                @click.stop
              />
              <span class="sidebar-text">{{ sidename.username }}</span>
            </div>
            <span v-if="sidename.total_reviews > 0" class="sidebar-badge">{{
              sidename.total_reviews
            }}</span>
          </div>
        </div>
      </div>

      <!-- 右侧内容区域 -->
      <div class="content-container">
        <!-- 单用户模式 -->
        <template v-if="multiUserChartDataList.length === 0">
          <div class="column">
            <TeacherComment
              rateSize="13"
              popupWidth="30%"
              popupHeight="100%"
              popupPosition="right"
              :filter-grade="filterGradeForComment"
              :filter-location="filterLocationForComment"
              :filter-student="filterStudentForComment"
              :show-tabbar="false"
            />
          </div>
          <div class="column">
            <logList
              popupWidth="30%"
              popupHeight="100%"
              popupPosition="left"
              :filter-student="filterName"
              :show-tabbar="false"
            />
          </div>
          <!-- 柱状容器 -->
          <div
            class="month-column"
            :class="{ 'month-column-hidden': !showMonthColumn }"
            v-show="showMonthColumn"
          >
            <div class="month-calendar">
              <!-- 月份标题 + 切换按钮 -->
              <div class="month-header">
                <!-- 隐藏按钮 -->
                <van-button
                  size="mini"
                  type="primary"
                  plain
                  @click="toggleMonthColumn"
                  style="margin-left: 0"
                >
                  <div style="font-size: 12px">隐藏</div>
                </van-button>
                <span class="month-title" v-if="!showChartMode">{{
                  currentMonth
                }}</span>
                <van-button
                  v-if="!showChartMode"
                  icon="arrow-left"
                  size="small"
                  plain
                  @click="changeMonth(-1)"
                />
                <!-- <span class="month-title" v-if="!showChartMode">{{
                  currentMonth
                }}</span> -->
                <span class="month-title" v-else style="margin-left: 1rem"
                  >趋势图</span
                >
                <van-button
                  v-if="!showChartMode"
                  icon="arrow"
                  size="small"
                  plain
                  @click="changeMonth(1)"
                />
                <van-button
                  size="small"
                  type="primary"
                  plain
                  @click="toggleChartMode"
                  style="margin-left: auto"
                >
                  {{ showChartMode ? "变日历" : "变曲线" }}
                </van-button>
              </div>
              <div style="text-align: center">
                <span>{{ viewUsername }}</span>
              </div>
              <!-- 日历视图 -->
              <div v-if="!showChartMode">
                <!-- 星期标题 -->
                <div class="weekday-header">
                  <div
                    class="weekday-cell"
                    v-for="day in weekdayNames"
                    :key="day"
                  >
                    {{ day }}
                  </div>
                </div>

                <!-- 日期网格 -->
                <div class="days-grid">
                  <div
                    v-for="(day, index) in monthDays"
                    :key="index"
                    class="calendar-day"
                    :class="{
                      empty: day.isEmpty,
                      today: day.isToday,
                      'has-flower': day.hasFlower,
                      'week-complete-1': day.weekCompleteState === 1,
                      'week-complete-2': day.weekCompleteState === 2,
                    }"
                    @click="!day.isEmpty && selectDate(day)"
                  >
                    <template v-if="!day.isEmpty">
                      <div class="date-text">{{ day.day }}</div>
                      <div v-if="day.isToday" class="today-dot"></div>
                      <div v-if="day.hasFlower" class="week-flower-indicator">
                        {{ day.recordCount === 1 ? "🔺" : "🌸" }}
                      </div>
                    </template>
                  </div>
                </div>
              </div>

              <!-- 曲线图视图 -->
              <div v-else>
                <div class="chart-container">
                  <canvas ref="chartCanvas" width="350" height="180"></canvas>
                </div>

                <!-- 平均数标注 - 横线形式（放在图表下方） -->
                <div
                  style="
                    padding: 12px;
                    background-color: #f3f4f6;
                    border-radius: 8px;
                    margin-top: 1rem;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                  "
                >
                  <!-- 根据数值大小动态排序 -->
                  <template v-if="fourWeekAvg >= eightWeekAvg">
                    <!-- 近四周平均（数值较大，排在上面） -->
                    <div style="display: flex; align-items: center; gap: 8px">
                      <span
                        style="
                          font-size: 13px;
                          color: #6b7280;
                          white-space: nowrap;
                        "
                      >
                        近四周平均
                      </span>
                      <div
                        style="
                          flex: 1;
                          height: 3px;
                          background: linear-gradient(
                            to right,
                            #ef4444,
                            #ef4444 70%,
                            transparent
                          );
                          border-radius: 2px;
                        "
                      ></div>
                      <span
                        style="
                          font-size: 15px;
                          font-weight: 600;
                          color: #ef4444;
                        "
                      >
                        {{ fourWeekAvg ? fourWeekAvg.toFixed(1) : "0" }}
                      </span>
                    </div>

                    <!-- 近八周平均 -->
                    <div style="display: flex; align-items: center; gap: 8px">
                      <span
                        style="
                          font-size: 13px;
                          color: #6b7280;
                          white-space: nowrap;
                        "
                      >
                        近八周平均
                      </span>
                      <div
                        style="
                          flex: 1;
                          height: 3px;
                          background: linear-gradient(
                            to right,
                            #10b981,
                            #10b981 70%,
                            transparent
                          );
                          border-radius: 2px;
                        "
                      ></div>
                      <span
                        style="
                          font-size: 15px;
                          font-weight: 600;
                          color: #10b981;
                        "
                      >
                        {{ eightWeekAvg ? eightWeekAvg.toFixed(1) : "0" }}
                      </span>
                    </div>
                  </template>

                  <template v-else>
                    <!-- 近八周平均（数值较大，排在上面） -->
                    <div style="display: flex; align-items: center; gap: 8px">
                      <span
                        style="
                          font-size: 13px;
                          color: #6b7280;
                          white-space: nowrap;
                        "
                      >
                        近八周平均
                      </span>
                      <div
                        style="
                          flex: 1;
                          height: 3px;
                          background: linear-gradient(
                            to right,
                            #10b981,
                            #10b981 70%,
                            transparent
                          );
                          border-radius: 2px;
                        "
                      ></div>
                      <span
                        style="
                          font-size: 15px;
                          font-weight: 600;
                          color: #10b981;
                        "
                      >
                        {{ eightWeekAvg ? eightWeekAvg.toFixed(1) : "0" }}
                      </span>
                    </div>

                    <!-- 近四周平均 -->
                    <div style="display: flex; align-items: center; gap: 8px">
                      <span
                        style="
                          font-size: 13px;
                          color: #6b7280;
                          white-space: nowrap;
                        "
                      >
                        近四周平均
                      </span>
                      <div
                        style="
                          flex: 1;
                          height: 3px;
                          background: linear-gradient(
                            to right,
                            #ef4444,
                            #ef4444 70%,
                            transparent
                          );
                          border-radius: 2px;
                        "
                      ></div>
                      <span
                        style="
                          font-size: 15px;
                          font-weight: 600;
                          color: #ef4444;
                        "
                      >
                        {{ fourWeekAvg ? fourWeekAvg.toFixed(1) : "0" }}
                      </span>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- 多用户模式 -->
        <template v-else>
          <!-- 多用户按钮组 -->
          <div
            style="
              padding: 15px 0;
              display: flex;
              flex-direction: column;
              align-items: flex-start;
              gap: 10px;
            "
          >
            <van-button
              type="success"
              @click="exitMultiUserMode"
              style="padding: 15px 10px; height: auto"
              plain
            >
              返回
            </van-button>

            <van-button
              type="primary"
              @click="toggleFullscreen"
              style="padding: 15px 10px; height: auto"
              plain
            >
              {{ isChartFullscreen ? "恢复" : "全屏" }}
            </van-button>
            <van-button
              v-if="multiUserChartDataList.length > 0"
              type="warning"
              @click="toggleAllChartMode"
              style="padding: 15px 10px; height: auto"
              plain
            >
              {{ showChartMultitMode ? "日历" : "曲线" }}
            </van-button>
            <van-button
              type="danger"
              @click="popUpMomentScatter"
              style="padding: 15px 10px; height: auto"
              plain
            >
              对比
            </van-button>
          </div>
          <!-- 柱状图和日期网络 -->
          <div
            v-if="!showMomentScatter"
            style="
              flex: 1;
              display: flex;
              flex-direction: column;
              align-items: flex-start;
              width: 100%;
            "
          >
            <div
              style="
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                width: 100%;
              "
            >
              <div
                class="month-button-navigation"
                v-show="!showChartMultitMode"
              >
                <button class="nav-button" @click="changeMonthMulti(-1)">
                  ← 上一个月
                </button>

                <div class="current-month-title">
                  {{ currentMonth }}
                </div>

                <button class="nav-button" @click="changeMonthMulti(1)">
                  下一个月 →
                </button>
              </div>

              <div
                class="multi-user-charts-container"
                style="max-height: 80vh; overflow-y: auto; width: 100%"
                :class="{ 'calendar-mode-layout': !showChartMultitMode }"
              >
                <div
                  v-for="(userData, index) in multiUserChartDataList"
                  :key="index"
                  class="month-calendar-multi-2"
                >
                  <div class="month-header">
                    <span class="month-title">{{ userData.username }}</span>
                  </div>

                  <div v-if="!showChartMultitMode">
                    <div class="weekday-header">
                      <div
                        class="weekday-cell"
                        v-for="day in weekdayNames"
                        :key="day"
                      >
                        {{ day }}
                      </div>
                    </div>

                    <!-- 多用户日期网格 -->
                    <div class="days-grid">
                      <div
                        v-for="(day, dayIndex) in generateMultiUserMonthDays(
                          userData,
                          currentYear,
                          currentMonthIndex
                        )"
                        :key="dayIndex"
                        class="calendar-day"
                        :class="{
                          empty: day.isEmpty,
                          today: day.isToday,
                          'has-flower': day.hasFlower,
                          'week-complete-1': day.weekCompleteState === 1,
                          'week-complete-2': day.weekCompleteState === 2,
                        }"
                        @click="!day.isEmpty && selectDate(day)"
                      >
                        <template v-if="!day.isEmpty">
                          <div class="date-text">{{ day.day }}</div>
                          <div v-if="day.isToday" class="today-dot"></div>
                          <div
                            v-if="day.hasFlower"
                            class="week-flower-indicator"
                          >
                            {{ day.recordCount === 1 ? "🔺" : "🌸" }}
                          </div>
                        </template>
                      </div>
                    </div>
                  </div>

                  <!-- 多用户曲线图视图 -->
                  <div v-else class="month-calendar-multi">
                    <canvas
                      :key="`chart-${index}`"
                      width="350"
                      height="150"
                      :ref="
                        (el) => {
                          if (el) chartCanvases[index] = el;
                        }
                      "
                      style="width: 100%; height: 200px"
                      class="multi-user-canvas"
                      :data-index="index"
                    ></canvas>

                    <!-- 多用户平均数标注 -->
                    <div
                      style="
                        padding: 12px;
                        background-color: #f3f4f6;
                        border-radius: 8px;
                        margin-top: 1rem;
                        display: flex;
                        flex-direction: column;
                        gap: 12px;
                      "
                    >
                      <div style="display: flex; align-items: center; gap: 8px">
                        <span
                          style="
                            font-size: 13px;
                            color: #6b7280;
                            white-space: nowrap;
                          "
                        >
                          近四周平均
                        </span>
                        <div
                          style="
                            flex: 1;
                            height: 3px;
                            background: linear-gradient(
                              to right,
                              #ef4444,
                              #ef4444 70%,
                              transparent
                            );
                            border-radius: 2px;
                          "
                        ></div>
                        <span
                          style="
                            font-size: 15px;
                            font-weight: 600;
                            color: #ef4444;
                          "
                        >
                          {{ calculateFourWeekAvg(userData).toFixed(1) }}
                        </span>
                        <span
                          style="
                            font-size: 13px;
                            color: #6b7280;
                            white-space: nowrap;
                          "
                        >
                          近八周平均
                        </span>
                        <div
                          style="
                            flex: 1;
                            height: 3px;
                            background: linear-gradient(
                              to right,
                              #10b981,
                              #10b981 70%,
                              transparent
                            );
                            border-radius: 2px;
                          "
                        ></div>
                        <span
                          style="
                            font-size: 15px;
                            font-weight: 600;
                            color: #10b981;
                          "
                        >
                          {{ calculateEightWeekAvg(userData).toFixed(1) }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 多用户时刻散点图 -->
          <WeeklyMultiUserChart
            v-else
            :multiUserChartDataList="multiUserChartDataList"
            @close="showMomentScatter = false"
            ref="weeklyChartRef"
          />
        </template>
      </div>
    </div>

    <!-- 隐藏时的小按钮 - 固定在右侧 -->
    <van-button
      v-if="!showMonthColumn"
      size="small"
      type="primary"
      icon="bar-chart-o"
      @click="toggleMonthColumn"
      class="expand-button"
    />

    <!-- 周长日志 -->
    <van-popup
      v-model:show="showDailyDetail"
      position="bottom"
      :style="{ height: '70%' }"
      closeable
      :lock-scroll="false"
    >
      <van-cell-group inset>
        <div
          style="
            margin-left: 0.5rem;
            font-weight: 700;
            margin-right: 2rem;
            display: flex;
          "
        >
          <div style="font-size: 20px; color: black; margin-top: 1rem">
            复习日志
          </div>
          <div
            v-if="dateDaily == ''"
            style="font-size: 12px; color: gray; margin-top: 1.65rem"
            @click="refreshtLastDaysDailyTask()"
          >
            &nbsp;&nbsp;&nbsp;近十五天
            <van-icon
              name="replay"
              v-show="!loadingUncertain"
              style="margin-left: -0.08rem"
            />
          </div>
          <div
            v-if="dateDaily !== ''"
            style="
              font-size: 12px;
              color: lightgray;
              margin-top: 1.65rem;
              text-decoration: line-through;
            "
            @click="refreshtLastDaysDailyTask()"
          >
            &nbsp;&nbsp;&nbsp;近十五天
            <van-icon
              name="replay"
              v-show="!loadingUncertain"
              style="margin-left: -0.08rem"
            />
          </div>
        </div>
        <van-cell
          title="选择日期区间"
          :value="dateDaily"
          @click="showDailyRange = true"
          style="margin: 0.5rem 0 0.5rem 0"
          is-link
        />
        <van-calendar
          allow-same-day
          :min-date="minDateDaily"
          v-model:show="showDailyRange"
          type="range"
          @confirm="onConfirmDailyRange"
        />
        <div v-for="(item, index) in listDailyAndReview" :key="index">
          <van-cell :label="processedTitle(item.title)">
            <template #label>
              <div class="label-line">
                {{ processedTitle(item.title) }}&nbsp;&nbsp;&nbsp;{{
                  item.teacher_mark
                }}
              </div>
            </template>
            <template #title>
              <div style="width: 120%">
                {{ formatDate_log(item.create_time) }}
              </div>
            </template>
            <template #value>
              <div v-if="item.swipe == '滑动'" style="color: red">滑动</div>
              <div v-if="item.swipe == '复习'" style="color: red">
                {{ item.swipe }}
              </div>
            </template>
          </van-cell>
        </div>
      </van-cell-group>
    </van-popup>

    <!-- log日志 -->
    <van-popup
      v-model:show="showAccountLog"
      position="bottom"
      :style="{ height: '100%' }"
      closeable
      :lock-scroll="false"
    >
      <van-cell-group inset>
        <div style="margin-left: 0.5rem; font-weight: 700; margin-right: 2rem">
          <p style="font-size: 20px; color: black; margin-top: 1rem">Log日志</p>
        </div>

        <div
          style="
            font-size: 14px;
            color: gray;
            margin-left: 0.5rem;
            margin-top: -1rem;
          "
        >
          <div>{{ data_specific.title }} | {{ data_specific.username }}</div>
          <div style="margin-top: 0rem">
            单词:{{ data_specific.answers.length }} | 背诵:
            {{ data_specific.attempt }} 次
          </div>
        </div>

        <!-- 购买星星记录 -->
        <div v-if="Object.keys(purchaseDetail).length > 0">
          <div
            style="
              margin: 1rem 0 1rem 1rem;
              display: flex;
              flex-wrap: wrap;
              gap: 1rem;
            "
          >
            <div
              v-for="(count, type) in purchaseDetail"
              :key="type"
              style="color: red; font-weight: 700"
            >
              <span>本次背诵购买了{{ type }}{{ count }}次</span>
            </div>
          </div>
          <van-divider />
        </div>

        <!-- 复习记录 -->
        <div v-if="reviewLogList.length > 0">
          <div
            style="font-weight: 700; margin: 1rem 0 0.5rem 1rem; color: green"
          >
            复习次数记录:
          </div>
          <div v-for="(item, index) in reviewLogList" :key="index">
            <van-cell
              :label="`正确率：${item.true_length} / ${item.log.length}  &nbsp;&nbsp;&nbsp; ${item.teacher_mark}`"
              is-link
              @click="toggleDetail(item, index)"
            >
              <template #title>
                <div style="font-size: smaller; font-weight: 700">
                  <div>背诵时间:</div>
                  <div style="margin-top: 0.3rem">
                    {{ formatDate_log(item.create_time) }}
                  </div>
                </div>
              </template>
              <template #value>
                <div style="margin-top: 0rem; font-size: smaller">
                  <div>{{ item.swipe }}</div>
                </div>
              </template>
            </van-cell>
          </div>
          <van-divider />
        </div>

        <!-- 预习记录 -->
        <div
          v-if="answerLogResult.length == 0"
          style="font-size: x-large; margin: 1rem 0 0.5rem 1rem"
        >
          无预习记录
        </div>
        <div v-else>
          <div
            style="font-weight: 700; margin: 1rem 0 0.5rem 1rem; color: green"
          >
            <div v-if="totalDuration < 30" style="color: red">
              预习时间严重不足
            </div>
            <div
              v-if="totalDuration >= 30 && totalDuration < 60"
              style="color: darkred"
            >
              预习时间稍有欠缺
            </div>
            <div v-if="totalDuration >= 60">预习时间达标</div>
            <div
              v-if="flagTimesPreviews"
              style="margin-top: 0.5rem; color: red"
            >
              预习过程不专心，退出软件频繁
            </div>
          </div>
          <div v-for="(item, index) in answerLogResult" :key="index">
            <van-cell>
              <template #title>
                <div
                  style="
                    font-size: smaller;
                    font-weight: 700;
                    margin-left: 0rem;
                  "
                >
                  <div v-if="item.type == '预习pro'" style="">预习时间Pro:</div>
                  <div v-else style="">预习时间: 『{{ item.type }}』</div>
                  <div style="margin-top: 0.3rem; width: 140%">
                    {{ item.create_time }}
                  </div>
                </div>
              </template>
              <template #value>
                <div
                  style="
                    margin-top: 0.2rem;
                    margin-right: 0.5rem;
                    font-size: smaller;
                  "
                >
                  时长: {{ item.duration }}
                </div>
              </template>
            </van-cell>
          </div>
        </div>

        <!-- log日志 -->
        <div
          v-if="answerLogList.length == 0"
          style="font-size: x-large; margin-left: 1rem; margin-top: 0.5rem"
        >
          无背诵记录
        </div>
        <div v-else>
          <!-- 背诵次数检查 -->
          <div
            style="font-weight: 700; margin: 1rem 0 0.5rem 1rem; color: green"
          >
            <div v-if="data_specific.rate < 3" style="color: red">
              尚未完成3颗星
            </div>
            <div v-else>
              <div v-if="answerLogList.length > 9" style="color: red">
                次数过多，改善背诵习惯并联系老师降低难度
              </div>
              <div
                v-if="answerLogList.length > 5 && answerLogList.length <= 8"
                style="color: red"
              >
                背诵错误次数稍多，有优化空间
              </div>
              <div v-if="answerLogList.length <= 5">背诵次数完美</div>
            </div>
          </div>
          <!-- 道具使用 -->
          <div
            v-if="totalHelp / answerLogList.length >= 4"
            style="color: red; font-weight: 700; margin: 0 0 0 1rem"
          >
            道具运用过多，背诵心态急躁
          </div>
          <!-- 熬夜 -->
          <div
            v-if="isLateNight"
            style="color: red; font-weight: 700; margin: 0 0 0 1rem"
          >
            有熬夜情况，提高白天效率
          </div>
          <!-- 背诵log -->
          <div v-for="(item, index) in answerLogList" :key="index">
            <van-cell is-link @click="toggleDetail(item, index)">
              <template #label>
                <div
                  v-if="item.complement == 1"
                  style="display: flex; justify-content: flex-start"
                >
                  <van-tag type="primary" plain mark size="medium">
                    正确率{{ item.true_length }} /
                    {{ item.log.length }} &nbsp;&nbsp;&nbsp;
                    {{ item.teacher_mark }}
                  </van-tag>
                  <div
                    v-if="
                      item.diamondConsume != null && item.diamondConsume != ''
                    "
                    style="margin-top: 0.2rem"
                  >
                    &nbsp;💎
                  </div>
                </div>
                <div v-else style="display: flex; justify-content: flex-start">
                  正确率{{ item.true_length }} /
                  {{ item.log.length }} &nbsp;&nbsp;&nbsp;
                  {{ item.teacher_mark }}
                  <div
                    v-if="
                      item.diamondConsume != null && item.diamondConsume != ''
                    "
                  >
                    &nbsp;💎
                  </div>
                </div>
              </template>
              <template #title>
                <div style="font-size: smaller; font-weight: 700">
                  <div>背诵时间:</div>
                  <div style="margin-top: 0.3rem">
                    {{ formatDate_log(item.create_time) }}
                  </div>
                </div>
              </template>
              <template #value>
                <div style="margin-top: 0.2rem; font-size: smaller">
                  <div v-if="item.swipe === '游戏'">
                    <div>
                      计时模式:
                      <div style="margin-top: 0.1rem">
                        回溯{{ item.numberprev }}次
                      </div>
                      <div style="margin-top: 0.1rem">
                        点金{{ item.numbershowanswer }}次
                      </div>
                      <div style="margin-top: 0.1rem">
                        定时{{ item.numbertransparent }}次
                      </div>
                    </div>
                  </div>
                  <div v-else>{{ item.swipe }}</div>
                </div>
              </template>
            </van-cell>
          </div>
          <!-- 检查记录 -->
          <div
            v-if="reviewLogResult.length == 0"
            style="font-size: x-large; margin: 1rem 0 1rem 1rem"
          >
            无复习记录
          </div>
          <div v-else>
            <div
              style="font-weight: 700; margin: 1rem 0 0.5rem 1rem; color: green"
            >
              <div
                v-if="reviewLogResult.length < answerLogList.length - 3"
                style="color: red"
              >
                复习时间不足
              </div>
              <div>复习时间尚可</div>
            </div>
            <div v-for="(item, index) in reviewLogResult" :key="index">
              <van-cell>
                <template #title>
                  <div
                    style="
                      font-size: smaller;
                      font-weight: 700;
                      margin-left: 0rem;
                    "
                  >
                    <div style="">复习时间:</div>
                    <div style="margin-top: 0.3rem; width: 140%">
                      {{ item.create_time }}
                    </div>
                  </div>
                </template>
                <template #value>
                  <div
                    style="
                      margin-top: 0.2rem;
                      margin-right: 0.5rem;
                      font-size: smaller;
                    "
                  >
                    时长: {{ item.duration }}
                  </div>
                </template>
              </van-cell>
            </div>
          </div>
        </div>
      </van-cell-group>
    </van-popup>

    <!-- 日志详情 -->
    <van-popup
      v-model:show="showDetail"
      position="bottom"
      :style="{ height: '90%' }"
      closeable
      :lock-scroll="false"
    >
      <van-cell-group inset>
        <div>
          <div style="display: flex; justify-content: space-between">
            <div style="font-size: 18px; font-weight: 700; margin: 1rem">
              {{ detailName }} | {{ detailMode }}
              <div style="font-size: 10px; color: gray; margin-bottom: -0.5rem">
                ID: {{ detailNid }}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{
                  detailTeacherMmark
                }}
              </div>
            </div>

            <div
              style="
                margin-right: 2.5rem;
                margin-top: 1.2rem;
                font-size: 12px;
                color: gray;
              "
            >
              {{ formatDate_log(detailDate) }}
            </div>
          </div>
          <div
            style="
              display: flex;
              justify-content: space-between;
              font-size: 13px;
            "
          >
            <div
              style="
                margin-left: 1rem;
                color: blue;
                font-weight: 600;
                display: flex;
              "
            >
              {{ detailRate }}
              <div style="display: flex; margin-top: -0.1rem">
                <span
                  style="margin-left: 1rem; color: blueviolet"
                  @click="showUncertainResult"
                  >迟疑库 {{ uncertainResult.length }}</span
                >
                <div style="display: flex; margin-top: 0.1rem">
                  <van-icon name="replay" v-show="!loadingUncertain" />
                  <van-loading
                    size="14"
                    v-show="loadingUncertain"
                    style="margin-left: 0.3rem"
                  />
                </div>
              </div>
            </div>

            <div style="margin-right: 0rem; color: gray">
              {{ detailXlsmName }}
            </div>
          </div>
          <div
            v-if="detailMode === '游戏'"
            style="
              display: flex;
              justify-content: space-between;
              font-size: 13px;
              color: gray;
              margin: 5px 0 0px 0;
            "
          >
            <div style="margin-left: 1rem">回溯:{{ numberprev }}</div>
            <div>答案:{{ numbershowanswer }}</div>
            <div>透视:{{ numbertransparent }}</div>
            <div v-if="diamondConsume != null && diamondConsume != ''">
              💎 {{ diamondConsume }}
            </div>
          </div>
          <div
            v-if="
              diamondConsume != null &&
              diamondConsume != '' &&
              detailMode === '普通'
            "
            style="font-size: 13px; color: gray; margin: 5px 10px"
          >
            💎 {{ diamondConsume }}
          </div>
        </div>
        <div v-for="(item, index) in detailList" :key="index">
          <van-cell
            :label="
              item.排除 === '手写'
                ? `答案：${item.英文}`
                : item.is_spell
                ? `答案：${item.正确答案}`
                : `答案：${item.答案}`
            "
          >
            <template #title>
              <div style="font-size: larger; font-weight: 700">
                {{ item.排除 === "手写" ? item.答案 : item.英文 }}
                <van-tag v-if="item.is_spell" type="danger" mark>拼</van-tag>
                <van-tag mark v-if="item.排除 === '手写'" type="warning">
                  写
                </van-tag>
                <img
                  v-if="item.teacherMark"
                  src="../assets/getPassive.gif"
                  style="
                    width: 20px;
                    height: auto;
                    margin-left: 0.5rem;
                    margin-right: 0.5rem;
                  "
                />
              </div>
              <div
                style="margin-top: 0.5rem"
                :style="{
                  color: isCorrectAnswer(
                    item.用户选择,
                    item.答案,
                    item.正确答案,
                    item.is_spell,
                    item.排除,
                    item.英文
                  )
                    ? 'gray'
                    : 'red',
                }"
              >
                {{ item.排除 === "手写" ? "用户手写" : "用户选择" }}：
                {{ item.用户选择.join("/") }}
              </div>
            </template>
          </van-cell>
        </div>
      </van-cell-group>
    </van-popup>

    <!-- 延迟库 -->
    <van-popup
      v-model:show="showUncertain"
      position="bottom"
      :style="{ height: '70%' }"
      closeable
      :lock-scroll="false"
    >
      <van-cell-group inset>
        <div style="margin-left: 0.5rem; font-weight: 700; margin-right: 2rem">
          <p style="font-size: 20px; color: black; margin-top: 1.5rem">
            迟疑库
          </p>
        </div>
        <div
          style="
            font-size: 14px;
            color: gray;
            margin-left: 0.5rem;
            margin-top: -1rem;
          "
        >
          <div>
            {{ uncertainResult.length }} /
            {{ detailList.length }} &nbsp;&nbsp;&nbsp; 点金:{{
              numbershowanswer
            }}
            | 回溯:{{ numberprev }} ｜ 透视:{{ numbertransparent }}
          </div>
          <div>{{ detailName }} | {{ detailXlsmName }}</div>
        </div>
        <div v-for="(item, index) in uncertainResult" :key="index">
          <van-cell
            :value="item.type"
            :label="
              item.正确答案 === '无'
                ? `答案：${item.答案}`
                : `答案：${item.正确答案}`
            "
          >
            <template #title>
              <div style="font-size: larger; font-weight: 700">
                {{ item.英文 }}
              </div>
            </template>
          </van-cell>
        </div>
      </van-cell-group>
    </van-popup>

    <!-- 选择拼写的单词 -->
    <van-popup
      v-model:show="showSelectSpellVocabulary"
      position="bottom"
      :style="{ height: '90%' }"
      closeable
    >
      <van-cell-group inset style="position: sticky; top: 0; z-index: 10">
        <div
          style="
            font-size: 16px;
            font-weight: 700;
            margin-top: 1rem;
            margin-bottom: 1rem;
          "
        >
          {{ itemEdit.username }} | {{ itemEdit.title }} |
          {{ synonymsSelected.length }}词
        </div>
      </van-cell-group>

      <van-checkbox-group
        class="checkbox-container"
        v-model="synonymsSelected"
        ref="checkboxRefs2"
      >
        <van-cell-group>
          <div
            class="custom-cell-group"
            v-for="(item, index) in selectSpellVocabulary"
            :key="index"
          >
            <van-cell
              clickable
              @click="toggleCheckChinese(index)"
              :value="item.中文"
            >
              <template #title>
                <div
                  style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                  "
                >
                  <div>{{ item.序号 + ". " + item.英文 }}</div>
                </div>
              </template>
              <template #right-icon>
                <van-checkbox
                  :name="`${index + 1}`"
                  :ref="(el) => (checkboxRefs2[`${index}`] = el)"
                  @click.stop.prevent="toggleCheckChinese(index)"
                />
              </template>
            </van-cell>
          </div>
        </van-cell-group>
      </van-checkbox-group>
      <van-button
        type="danger"
        block
        style="margin-top: 1rem; margin-bottom: 0rem"
        @click="confirmSelectVocabulary"
        >确认选择</van-button
      >
      <van-button
        type="warning"
        block
        style="margin-top: 0.2rem; margin-bottom: 0rem"
        @click="lockSelectVocabulary"
        >锁定拼写</van-button
      >
      <van-button
        type="primary"
        block
        style="margin-top: 0.2rem; margin-bottom: 2rem"
        @click="showSelectSpellVocabulary = false"
        >关闭</van-button
      >
    </van-popup>

    <!-- 分配词汇任务 -->
    <van-popup
      v-model:show="showAssignWordsTasks"
      position="left"
      :style="{ width: '30%', height: '100%' }"
    >
      <xlsmList v-if="showAssignWordsTasks" :is-embedded="true" />
    </van-popup>

    <!-- 连胜日历 -->
    <WinningCalendar
      v-model:visible="showWinningCalendar"
      :winning-streak="daysWinningStreak"
      :complete-weeks-data="completeWeeks"
      :daily-data="dailyCalendarData"
      :username="viewUsername"
      subtitle="每周三次背诵可完成一周任务，6次完成金色"
      :months-to-show="3"
      @date-click="handleDateClick"
      @close="onCalendarClose"
    />

    <!-- 输入密码 -->
    <van-popup
      v-model:show="showPasswordPopup"
      position="center"
      round
      :overlay-style="{ background: 'rgba(0, 0, 0, 1)' }"
      :close-on-click-overlay="false"
      :style="{ height: '30%', width: '30%' }"
    >
      <div
        style="
          display: flex;
          justify-content: center;
          padding-top: 1rem;
          padding-bottom: 2rem;
        "
      >
        <span style="font-size: 24px; font-weight: 700"> 身份验证 </span>
      </div>
      <van-field
        style="margin-bottom: 1rem; width: 80%"
        v-model="teacherPassword"
        name="password"
        label="密码"
        placeholder="请输入密码"
        type="password"
      />
      <div style="display: flex; justify-content: center; width: 100%">
        <van-button
          type="success"
          block
          style="margin-top: 1rem; width: 80%"
          @click="verifyPassword"
          >确认</van-button
        >
      </div>
    </van-popup>

    <loading v-if="isLoading" />
  </div>
</template>

<style scoped>
.nav-bar-container {
  position: sticky;
  top: 0;
  z-index: 100;
}
.van-cell {
  display: flex;
  align-items: center; /* 这会使所有子元素垂直居中 */
  justify-content: space-between; /* 这是为了在左侧和右侧保持间距，可根据需要调整 */
  border-bottom: 1px solid #ebedf0;
}
.van-checkbox {
  margin-left: 16px;
}
/* 调整SwipeCell组件内按钮的样式 */
.van-swipe-cell .van-button {
  height: 100%; /* 设置按钮高度为100%，以填满单元格 */
  display: flex;
  align-items: center; /* 确保文本垂直居中 */
  justify-content: center; /* 文本水平居中 */
}

/* 你可以添加更多的CSS来定制按钮和单元格的外观，例如： */
.van-swipe-cell .van-cell {
  min-height: 60px; /* 或者根据需要调整单元格的最小高度 */
  /* 更多样式 */
}

/* 根据需要调整单元格内部内容的样式 */
.van-cell__title,
.van-cell__label,
.van-cell__value {
  /* 添加你的样式，例如： */
  line-height: 1; /* 调整行高，确保内容适合新的单元格高度 */
}

.nav-bar-container {
  position: sticky;
  top: 0;
  z-index: 100;
}

.sidebar-and-list-container {
  display: flex;
  width: 100%;
  height: calc(100vh - 50px); /* 确保整体容器高度足够，减去 tab 标题的高度 */
  overflow: hidden; /* 防止滚动条出现在这个容器 */
}

.sidebar {
  width: 10%; /* 设置 Sidebar 的宽度，可以根据需求调整 */
  min-width: 70px; /* 设置最小宽度 */
  height: 100%; /* 使 Sidebar 高度充满 */
  border-right: 1px solid #ebebeb; /* 添加分隔线 */
  overflow: auto; /* Sidebar 自身需要滚动时可以滚动 */
}

.list-container {
  flex-grow: 1; /* 让 List 部分占据剩余空间 */
  height: 100%; /* 确保 List 也占据父容器的整个高度 */
  overflow: auto; /* 允许 List 滚动，以触发加载更多 */
  padding: 5px; /* 给 List 一些边距 */
}

.selected {
  background-color: #1e90ff; /* 自定义深蓝色 */
  color: #1e90ff; /* 可选：改变文字颜色 */
}

.van-dropdown-menu {
  --van-dropdown-menu-title-font-size: 12px;
  --van-dropdown-menu-height: 30px;
  --van-dropdown-menu-shadow: 0 0 0 0;
  width: 20%;
  margin-bottom: -0.5rem;
  margin-top: 0.1rem;
  margin-left: 0rem;
}
/* 横屏布局样式 */
.horizontal-layout-container {
  height: 100vh; /* 关键：限制整个布局高度为视口高度 */
  display: flex; /* 左右布局 */
  overflow: hidden; /* 防止整个页面出现滚动条 */
  flex-wrap: nowrap;
}

/* 左侧面板 */
.left-panel {
  width: 320px;
  height: 92%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid #ebebeb;
  background-color: #ffffff;
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.08);
  border-radius: 0 8px 8px 0;
  transition: width 0.3s, opacity 0.3s;
  flex-shrink: 0;
}

/* 左侧上方tabs按钮容器 */
.tabs-buttons-container {
  padding: 18px;
  border-bottom: 1px solid #ebebeb;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.line-break {
  flex-basis: 100%;
  height: 0;
  content: "";
  margin-bottom: 5px;
}

.tabs-buttons-container::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, #e0e0e0, transparent);
}

.tab-button {
  box-sizing: border-box;
  padding: 8px 16px; /* 降低高度，从12px改为8px */
  border-radius: 8px;
  background-color: #f8f9fa;
  color: #495057;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  font-weight: 500;
  border: 1px solid transparent;
  font-size: 14px;
  /* 添加flex布局确保内容垂直居中 */
  display: flex;
  align-items: center;
  justify-content: center;
  /* 默认tab保持3个一排 */
  flex: 0 0 calc(33.333% - 10px);
}

/* location tab 特殊样式 - 一排4个 */
.tab-button.location-tab {
  flex: 0 0 calc(25% - 10px);
  font-size: clamp(10px, 2vw, 12px); /* 自适应字体大小 */
  white-space: nowrap; /* 禁止文字换行 */
  overflow: hidden; /* 隐藏溢出的内容 */
  text-overflow: ellipsis; /* 溢出时显示省略号 */
  min-width: 0; /* 允许元素宽度缩小到内容大小 */
  word-break: keep-all; /* 保持单词不被截断 */
}

.tab-button:hover {
  background-color: #e9ecef;
  border-color: #1989fa;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(25, 137, 250, 0.15);
}

.tab-button.active {
  background: linear-gradient(135deg, #1989fa 0%, #1677ff 100%);
  color: white;
  border: 2px solid #1989fa;
  box-shadow: 0 2px 8px rgba(25, 137, 250, 0.25);
  transform: translateY(-1px);
}

/* location tab 选中样式 - 蓝色渐变背景和白色文字，确保可读性 */
.tab-button.location-tab.active {
  background: linear-gradient(135deg, #1989fa 0%, #1677ff 100%);
  color: white;
  border: 2px solid #1989fa;
  box-shadow: 0 2px 8px rgba(25, 137, 250, 0.25);
}

/* 筛选按钮样式 */
.filter-button-container {
  padding: 16px;
  display: flex;
  justify-content: center;
  border-bottom: 1px solid #e9ecef;
}

.filter-button {
  width: 100%;
  padding: 12px 24px;
  background: white;
  color: #1989fa;
  border: 2px solid #1989fa;
  border-radius: 8px;
  font-size: clamp(
    12px,
    2vw,
    10px
  ); /* 自适应字体大小，最小值12px，最大值16px */
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap; /* 防止文字换行 */
  min-width: 0; /* 允许按钮宽度自适应内容 */
  word-break: keep-all; /* 保持单词不被截断 */
}

.filter-button:hover {
  background: linear-gradient(135deg, #1677ff 0%, #1989fa 100%);
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(25, 137, 250, 0.3);
}

.filter-button:active {
  background: linear-gradient(135deg, #1677ff 0%, #1989fa 100%);
  color: white;
  transform: translateY(0);
}

.assign-button {
  width: 100%;
  padding: 12px 24px;
  background: white;
  color: #faba19;
  border: 2px solid #faba19;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.assign-button:hover {
  background: linear-gradient(135deg, #faba19 0%, #faba19 100%);
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(25, 137, 250, 0.3);
}

.assign-button:active {
  background: linear-gradient(135deg, #faba19 0%, #faba19 100%);
  color: white;
  transform: translateY(0);
}

.unselect-button {
  width: 100%;
  padding: 12px 24px;
  background: white;
  color: #28a745;
  border: 2px solid #28a745;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.unselect-button:hover {
  background: linear-gradient(135deg, #28a745 0%, #28a745 100%);
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
}

.unselect-button:active {
  background: linear-gradient(135deg, #28a745 0%, #28a745 100%);
  color: white;
  transform: translateY(0);
}

.tab-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: linear-gradient(135deg, #ee0a24 0%, #d90a20 100%);
  color: white;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 12px;
  min-width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  font-weight: 600;
}

/* 左侧下方sidebar容器 */
.sidebar-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  /* max-height: calc(100vh - 300px); */
}

.sidebar-title {
  font-size: 12px;
  color: #8c8c8c;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
  font-weight: 600;
  padding: 0 4px;
}

.sidebar-item {
  padding: 13px 16px;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  border: 1px solid #f0f0f0;
  position: relative;
  overflow: hidden;
}

.sidebar-item::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background-color: transparent;
  transition: background-color 0.3s ease;
}

.sidebar-item:hover {
  background-color: #f0f7ff;
  border-color: #1989fa;
  transform: translateX(3px);
  box-shadow: 0 3px 10px rgba(25, 137, 250, 0.15);
}

.sidebar-item:hover::before {
  background-color: #1989fa;
}

.sidebar-item.active {
  background: linear-gradient(135deg, #1989fa 0%, #1677ff 100%);
  color: white;
  border-color: #1989fa;
  box-shadow: 0 4px 16px rgba(25, 137, 250, 0.3);
  transform: translateX(3px);
  pointer-events: auto;
}

.sidebar-item.active::before {
  background-color: #ffffff;
  width: 4px;
}

.sidebar-text {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 1;
}

.sidebar-badge {
  background: linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%);
  color: white;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 12px;
  min-width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  font-weight: 600;
  flex-shrink: 0;
}

/* 右侧内容区域 */
.content-container {
  flex: 1;
  height: 100%;
  overflow-y: auto;
  padding: 10px;
  background-color: #ffffff;
  border-radius: 8px;
  margin: 10px 10px 10px 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  display: flex;
  gap: 5px;
  min-width: 0;
  flex-grow: 1;
  width: auto;
}

/* 全屏模式 */
.horizontal-layout-container.fullscreen-active .left-panel {
  /* 将宽度设为 0，并隐藏 */
  width: 0;
  opacity: 0;
  /* 确保内容不可点击或溢出 */
  overflow: hidden;
}

/* 5. 确保右侧容器在左侧隐藏后占据所有空间 (通过 flex-grow 已经实现) */
.horizontal-layout-container.fullscreen-active .content-container {
  flex-grow: 1;
  width: 100%;
}

.column {
  flex: 1 1 0;
  height: 100%;
  overflow: auto;
  padding: 10px;
  box-sizing: border-box;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #fafafa;
  min-width: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.column:first-of-type {
  flex: 1 1 0;
  min-width: 340px;
  /* 其他样式... */
}

.column:last-of-type {
  flex: 1 1 0;
  min-width: 0;
  /* 其他样式... */
}
.month-column {
  flex: 0 0 v-bind(monthColumnWidth);
  min-width: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 1;
  transform: translateX(0);
}

.month-column-hidden {
  flex: 0 0 0;
  opacity: 0;
  transform: translateX(20px);
  overflow: hidden;
  pointer-events: none;
}

/* 左边两列在月份列隐藏时平分屏幕 */
.content-container:has(.month-column-hidden) .column {
  flex: 1 1 0;
}

/* 展开按钮 - 固定在右侧 */
.expand-button {
  position: fixed;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 50;
  animation: slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateY(-50%) translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateY(-50%) translateX(0);
  }
}

@keyframes slideOutRight {
  from {
    opacity: 1;
    transform: translateY(-50%) translateX(0);
  }
  to {
    opacity: 0;
    transform: translateY(-50%) translateX(20px);
  }
}

/* 滚动条样式优化 */
.sidebar-container::-webkit-scrollbar,
.content-container::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.sidebar-container::-webkit-scrollbar-track,
.content-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.sidebar-container::-webkit-scrollbar-thumb,
.content-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
  transition: background-color 0.3s ease;
}

.sidebar-container::-webkit-scrollbar-thumb:hover,
.content-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 自定义单元格样式优化 */
.custom-cell {
  border-radius: 8px;
  margin-bottom: 8px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.custom-cell:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

/* 加载动画优化 */
.van-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 0;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .left-panel {
    width: 320px;
  }

  .sidebar-text {
    max-width: 140px;
  }
}

@media (max-width: 768px) {
  .horizontal-layout-container {
    flex-direction: column;
    height: auto;
  }

  .left-panel {
    width: 100%;
    height: auto;
    border-radius: 0;
  }

  .content-container {
    margin: 0;
    border-radius: 0;
  }
}

/* 本月日历容器 */
.month-calendar {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 1rem;
  padding: 0.1rem;
}

/* 月份标题 */
.month-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.8rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #eee;
  gap: 0.5rem;
}

.month-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  flex: 1;
  text-align: center;
}

/* 切换按钮样式 */
.month-header .van-button {
  min-width: 32px;
  height: 28px;
  padding: 0 8px;
}

.month-header .van-button--mini {
  font-size: 16px;
}

.month-header .van-button:hover {
  opacity: 0.8;
}

.month-header .van-button:active {
  transform: scale(0.95);
}

/* 星期标题行 */
.weekday-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  margin-bottom: 8px;
}

.weekday-cell {
  text-align: center;
  font-size: 16px;
  color: #969799;
  padding: 2px 0;
  padding-right: 18px;
}

/* 日期网格 */
.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
}

/* 日期单元格 */
.calendar-day {
  /* aspect-ratio: 1; */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
  min-height: 45px; /* 从 36px 增加到 45px，并确保 padding/margin 足够 */
  padding: 5px 0; /* 增加垂直 padding，撑开高度 */
}

.calendar-day.empty {
  cursor: default;
  pointer-events: none;
}

.calendar-day:not(.empty):hover {
  background: #f7f8fa;
  transform: scale(1.05);
}

.date-text {
  font-size: 16px;
  color: #323233;
  font-weight: 500;
  position: relative;
  z-index: 1;
}

/* 今天的标记 */
.calendar-day.today {
  border: 2px solid #1989fa;
}

.today-dot {
  width: 4px;
  height: 4px;
  background-color: #1989fa;
  border-radius: 50%;
  position: absolute;
  bottom: 4px;
}

/* 花朵指示器 */
.week-flower-indicator {
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 8px;
  line-height: 1;
}

/* .calendar-day.has-flower {
  background-color: rgba(255, 192, 203, 0.15);
} */

/* 周完成状态背景 - 浅黄色 */
.calendar-day.week-complete-1::before {
  content: "";
  position: absolute;
  inset: 2px;
  background: linear-gradient(135deg, #fff9cc 0%, #ffe680 100%);
  border-radius: 4px;
  z-index: 0;
}

.calendar-day.week-complete-1 .date-text {
  color: #a67c00;
}

/* 周完成状态背景 - 金色 */
.calendar-day.week-complete-2::before {
  content: "";
  position: absolute;
  inset: 2px;
  background: linear-gradient(135deg, #ffd700 0%, #ffa500 100%);
  border-radius: 4px;
  z-index: 0;
}

.calendar-day.week-complete-2 .date-text {
  color: #8b4513;
  font-weight: 600;
}

.calendar-day.week-complete-1 .today-dot,
.calendar-day.week-complete-2 .today-dot {
  background: #8b4513;
}

/* 响应式调整 */
@media screen and (max-width: 1200px) {
  .calendar-day {
    min-height: 32px;
  }

  .date-text {
    font-size: 12px;
  }

  .week-flower-indicator {
    font-size: 7px;
  }
}

/* 曲线图容器 */
.chart-container {
  width: 100%;
  height: 280px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding-left: -1rem;
  padding-right: -1rem;
  position: relative;
}

.chart-container canvas {
  width: 100%;
  height: 80%;
  display: block;
}

/* 学生多选按钮 */
.sidebar-item-selected {
  background: linear-gradient(135deg, #ffa500 0%, #ff8c00 100%);
  color: white;
  border-color: #ffa500;
  box-shadow: 0 4px 16px rgba(255, 165, 0, 0.3);
}

.sidebar-item-selected .sidebar-badge {
  background: rgba(255, 255, 255, 0.3);
}
.multi-user-charts-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(265px, 1fr));
  row-gap: 20px;
  column-gap: 10px;
  padding: 10px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  overflow-x: hidden;
  transition: grid-template-columns 0.3s ease;
}
.multi-user-charts-container.calendar-mode-layout {
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  grid-auto-rows: min-content;
}

.month-calendar-multi .days-grid {
  width: 100%;
  box-sizing: border-box;
}

.multi-user-charts-container .month-calendar {
  margin: 0;
}

.month-calendar-multi {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 1rem;
  padding: 0.1rem;
  height: 360px;
}
.month-calendar-multi-2 {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 1rem;
  padding: 0.1rem;
  height: 470px;
}

/* 多人模式按钮 */
.month-button-navigation {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 10px;
}
.current-month-title {
  font-size: 16px;
  font-weight: bold;
  color: #323233;
  margin-left: 10px;
}
</style>
