<script setup>
import {
  watch,
  onMounted,
  ref,
  getCurrentInstance,
  nextTick,
  computed,
} from "vue";
import { useRouter } from "vue-router";
import {
  showSuccessToast,
  showFailToast,
  showLoadingToast,
  showConfirmDialog,
  showToast,
} from "vant";
import moment from "moment";
import loading from "./loading.vue";
const router = useRouter();
const instance = getCurrentInstance();
const axios = instance.appContext.config.globalProperties.$ajax;

const originalData = ref([]);
const filterXlsmData = ref([]);

// 返回首页
const gobackHomepage = () => {
  localStorage.removeItem("viewerData");
  localStorage.removeItem("expirationDateViewer");
  router.push({
    path: "/viewersHomepage",
  });
};

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
        answerLogResult.value = res.filter((item) => item.type === "预习");
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
const searchLog = (item, index) => {
  return new Promise((resolve) => {
    // console.log(item);
    totalHelp.value = 0;
    isLateNight.value = false;
    answerUsername.value = item.username;
    answerAttempt.value = item.attempt;
    answerSwipe.value = item.swipe;
    answerLens.value = item.answers_len;
    answerRate.value = item.rate;
    answerTitle.value = item.title;
    async function getAccountLog() {
      let params = new URLSearchParams();
      params.append("method", "getAccountLog");
      params.append("account_data_id", item.nid);
      return await axios.post("words/", params).then((ret) => {
        return ret.data.answer_log;
      });
    }
    getAccountLog().then((res) => {
      if (res.length == 0) {
        showToast("没有查询到数据");
        answerLogList.value = [];
      } else {
        // showAccountLog.value = true;

        res.forEach((item) => {
          // const correctedLog = item.log.replace(/'/g, '"');
          let dataString = item.log.replace(/(\W)'|'(\W)/g, '$1"$2');
          dataString = dataString
            .replace(/([{,]\s*)'([^']+?)'(\s*[:])/g, '$1"$2"$3')
            .replace(/'/g, '"')
            .replace(/s" /g, "s' ")
            .replace(/"s /g, "'s ")
            .replace(/"t /g, "'t ")
            .replace(/"m /g, "'m ")
            .replace(/can"t/g, "can't")
            .replace(/mustn"t/g, "mustn't")
            .replace(/o"clock/g, "o'clock")
            .replace(/needn"t/g, "needn't")
            .replace(/o"clock/g, "o'clock")
            // .replace(/"are/g, "'are'")
            .replace(/won"t/g, "won't")
            .replace(/it"s/g, "it's")
            .replace(/we"re/gi, "we're'")
            .replace(/You"re/gi, "you're'")
            .replace(/they"re/gi, "they're'");

          dataString = dataString
            .replace(/\bFalse\b/g, "false")
            .replace(/\bTrue\b/g, "true");

          item.log = JSON.parse(dataString);
          // console.log("item: ", item);

          let trueCount;
          if (item.swipe == "复习") {
            trueCount = 0;
            for (let i = 0; i < item.log.length; i++) {
              const correctAnswer = item.log[i]["正确答案"];
              const correctArray = correctAnswer
                .split(/；|,/)
                .map((item) => item.trim())
                .sort();

              const userSelection = item.log[i]["用户选择"];
              const areEqual =
                correctArray.length === userSelection.length &&
                correctArray.every((item) => userSelection.includes(item));
              if (areEqual) {
                trueCount += 1;
              }
            }
          } else {
            trueCount = item.log.filter(
              (entry) => entry.flag === "true"
            ).length;
          }

          item.true_length = trueCount;
        });
        console.log("log:", res);
        // 计算场外支援总次数
        totalHelp.value = res.reduce((acc, log) => {
          return (
            acc +
            (log.numberprev || 0) +
            (log.numbershowanswer || 0) +
            (log.numbertransparent || 0)
          );
        }, 0);

        // console.log("totalHelp:", totalHelp.value);

        // 计算熬夜问题
        isLateNight.value = res.some((log) => {
          const date = new Date(log.create_time);
          const hours = date.getHours();
          const minutes = date.getMinutes();

          // 检查时间是否在晚上 11:30 到早上 6:00 之间
          return (hours === 23 && minutes >= 30) || hours === 0 || hours < 6;
        });
        // console.log("isLateNight:", isLateNight.value);

        answerLogList.value = res.filter((item) => item.swipe !== "复习");
        reviewLogList.value = res.filter((item) => item.swipe == "复习");
      }
      resolve();
    });
  });
};

// 日志详情
const showDetail = ref(false);
const detailName = ref("");
const detailDate = ref("");
const detailXlsmName = ref("");
const detailRate = ref("");
const detailMode = ref("");
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
  is_spell
) => {
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
const toggleDetail = (item, index) => {
  // const detail = answerLogList.value[index];
  // console.log('item: ', item);
  detailMode.value = item["swipe"];
  detailName.value = item["username"];
  detailDate.value = item["create_time"];
  detailXlsmName.value = item["title"];
  detailNid.value = item["nid"];

  numberprev.value = item["numberprev"];
  numbershowanswer.value = item["numbershowanswer"];
  numbertransparent.value = item["numbertransparent"];
  diamondConsume.value = item["diamondConsume"];

  detailRate.value = item["true_length"] + "/" + item["log"].length;
  detailList.value = item["log"];
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
  params.append("viewer_name", viewername.value);
  params.append("username", filterName.value);
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
const onClickTab = ({ title }) => {
  filterName.value = "";
  activeSidebar.value = 0;
  // console.log("title: ", title);
  originalData.value = [];
  loadingOriginalData.value = false;
  finishedOriginalData.value = false;
  pageIndexOriginalData.value = 0;
  sidesName.value = getNewSidesNames();
  // console.log("sidesName", sidesName.value);
};

// 点击具体项
const data_specific = ref("");
const gotoItem = async (index) => {
  data_specific.value = originalData.value[index];
  // console.log("data_specific:", data_specific.value);

  isLoading.value = true;
  await searchLog(data_specific.value, index);
  await searchAnswer(data_specific.value, index);
  await searchpurchase(data_specific.value, index);
  await nextTick(() => {
    showAccountLog.value = true;
    isLoading.value = false;
  });
};

// 周长细节
const showDailyDetail = ref(false);
const showDailyRange = ref(false);
const dateDaily = ref("");
const minDateDaily = ref(new Date(2025, 0, 1));
const formatDate = (date) =>
  `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
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
  listDailyAndReview.value = [
    ...res.data.logs_daily,
    ...res.data.logs_review,
  ].sort((a, b) => new Date(b.create_time) - new Date(a.create_time));
  toast1.close();
};

// 复习细节
const LastDaysReview = ref([]);

// 点击sidebar
const activeSidebar = ref(0);
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
  LastDaysDailyTask.value = res.data.logs_daily;
  LastDaysReview.value = res.data.logs_review;
  listDailyAndReview.value = [
    ...LastDaysDailyTask.value,
    ...LastDaysReview.value,
  ].sort((a, b) => new Date(b.create_time) - new Date(a.create_time));
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
  LastDaysDailyTask.value = res.data.logs_daily;
  LastDaysReview.value = res.data.logs_review;
  listDailyAndReview.value = [
    ...LastDaysDailyTask.value,
    ...LastDaysReview.value,
  ].sort((a, b) => new Date(b.create_time) - new Date(a.create_time));
  toast1.close();
}
const onChangeSidebar = async (index) => {
  showLastDaysDailyTask.value = sidesName.value[index].username !== "全部";
  getLastDaysDailyTask(sidesName.value[index]["username"]);
  let title;
  if (sidesName.value[index]["username"] == "全部") {
    filterName.value = "";
  } else {
    filterName.value = sidesName.value[index]["username"];
  }
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

  // 重新加载数据
  onLoadOriginalData(title);
};
watch(sidesName, () => {
  showLastDaysDailyTask.value = false;
});
// 地点选择
const showGridLocation = ref(false);
const checkedGridLocation = ref(false);
const locationitems = ref([
  { icon: "wap-home-o", text: "王串场" },
  { icon: "wap-home-o", text: "小树林" },
  { icon: "wap-home-o", text: "张鑫" },
  { icon: "wap-home-o", text: "上门" },
  { icon: "wap-home-o", text: "南楼" },
]);
function getNewSidesNames() {
  const filterTitle = tabsName.value[activeTabs.value - 1] || "全部";
  // console.log("filtergrade: ", filterTitle);
  // console.log("filterLocation: ", filterLocation.value);
  let filteredSidesName = [];
  if (filterTitle === "全部") {
    filteredSidesName = backupSides.value.filter((nameObj) => {
      return usersData.value.some((user) => {
        if (filterTitle && filterLocation.value !== "") {
          // 点击年级时，同时检查 grade_name 和 location_name
          return (
            user.username === nameObj.username &&
            user.location_name === filterLocation.value
          );
        } else if (filterTitle && filterLocation.value === "") {
          // 点击年级时，但是没有地点筛选
          return user.username === nameObj.username;
        } else {
          // 点击地点时，只检查 location_name
          return (
            user.username === nameObj.username &&
            user.location_name === filterLocation.value
          );
        }
      });
    });
  } else {
    filteredSidesName = backupSides.value.filter((nameObj) => {
      return usersData.value.some((user) => {
        if (filterTitle && filterLocation.value !== "") {
          // 点击年级时，同时检查 grade_name 和 location_name
          return (
            user.username === nameObj.username &&
            user.location_name === filterLocation.value &&
            user.grade_name === filterTitle
          );
        } else if (filterTitle && filterLocation.value === "") {
          // 点击年级时，但是没有地点筛选
          return (
            user.username === nameObj.username &&
            user.grade_name === filterTitle
          );
        } else {
          // 点击地点时，只检查 location_name
          return (
            user.username === nameObj.username &&
            user.location_name === filterLocation.value
          );
        }
      });
    });
  }

  filteredSidesName.unshift({ username: "全部", total_reviews: 0 });
  return filteredSidesName;
}

const selectedIndexLocation = ref("");
const filterLocation = ref("");
const toggleLocationSelection = (index) => {
  const listTabs = ["全部", ...tabsName.value];

  if (selectedIndexLocation.value === index) {
    // 取消地点选择
    selectedIndexLocation.value = null;
    filterLocation.value = "";
    sidesName.value = backupSides.value;
    const filterTab = listTabs[activeTabs.value];

    if (filterTab != "全部") {
      sidesName.value = usersData.value
        .filter((item) => item.grade_name === filterTab)
        .map((item) => {
          // 根据 username 在 sidesName.value 中找到对应的项
          return sidesName.value.find(
            (side) => side.username === item.username
          );
        });
      sidesName.value.unshift({ username: "全部", total_reviews: 0 });
    }
  } else {
    // 选择地点
    selectedIndexLocation.value = index;
    filterLocation.value =
      locationitems.value[selectedIndexLocation.value].text;

    sidesName.value = getNewSidesNames();
  }
  activeSidebar.value = 0;

  originalData.value = [];
  loadingOriginalData.value = false;
  finishedOriginalData.value = false;
  pageIndexOriginalData.value = 0;

  onLoadOriginalData(listTabs[activeTabs.value]);
};

// 排序页面
const valueSort = ref(0);
const originalItems = ref([]);
const optionSort = [
  { text: "默认排序", value: 0 },
  { text: "置顶排序", value: 1 },
];
const onclickOptionSort = (valueSort) => {
  if (valueSort === 0) {
    // 取消置顶
    originalData.value = [...originalItems.value];
  }

  if (valueSort == 1) {
    // 选中置顶
    originalItems.value = [...originalData.value];
    originalData.value = [...originalData.value].sort((a, b) => {
      // 判断a和b是否满足is_pinned为true且rate小于3
      const aPinnedAndLowRate = a.is_pinned && a.rate < 3;
      const bPinnedAndLowRate = b.is_pinned && b.rate < 3;

      if (aPinnedAndLowRate && !bPinnedAndLowRate) {
        return -1;
      } else if (!aPinnedAndLowRate && bPinnedAndLowRate) {
        return 1;
      } else {
        return 0;
      }
    });
  }
};
// 复习
const getSidesNameReviews = async (sidesName) => {
  const params = new URLSearchParams();
  params.append("method", "getSidesNameReviews");
  params.append("usernames", sidesName);
  const response = await axios.post("words/", params);
  return response.data.data;
};

const viewername = ref("");
const usersData = ref("");
onMounted(async () => {
  const data = JSON.parse(history.state.data);
  // console.log("data: ", data);
  viewername.value = data.viewer_data[0].viewer_name;
  if (viewername.value === "josephxie") showGridLocation.value = true;
  // console.log("viewername: ", viewername.value);
  tabsName.value = data.grade_names;
  // console.log("tabsName: ", tabsName.value);

  usersData.value = data.users;
  // console.log('usersData.value: ', usersData.value)
  let users = data.users.map((item) => item.username);
  users.unshift("全部");
  sidesName.value = await getSidesNameReviews(users);
  // console.log("sidesName: ", sidesName.value);

  backupSides.value = [...sidesName.value];
  // backupSides.value = [...sidesName.value];
});

// 刷新页面
const reloadPage = () => {
  location.reload();
};
</script>

<template>
  <div>
    <van-nav-bar
      title="答题列表"
      class="nav-bar-container"
      left-text="返回"
      right-text="刷新"
      @click-left="gobackHomepage()"
      @click-right="reloadPage()"
    >
    </van-nav-bar>

    <router-view />
    <van-tabbar route v-show="showGridLocation">
      <van-tabbar-item icon="friends-o" replace to="/xlsmList"
        >用户xlsm</van-tabbar-item
      >
      <van-tabbar-item icon="todo-list-o" replace to="/teacherComment"
        >试题</van-tabbar-item
      >
      <van-tabbar-item icon="list-switch" replace to="/logList"
        >日志</van-tabbar-item
      >
      <!-- <van-tabbar-item icon="records-o" replace to="/viewersHomepage"
        >监督</van-tabbar-item
      > -->
      <!-- 修改icon和字体为蓝色 -->
      <van-tabbar-item replace to="/viewersHomepage">
        <template #icon>
          <van-icon name="records-o" color="#1A89FA" />
        </template>
        <span style="color: #1a89fa">监督</span>
      </van-tabbar-item>
      <van-tabbar-item icon="vip-card-o" replace to="/textbookList"
        >单词本</van-tabbar-item
      >
      <van-tabbar-item icon="shopping-cart-o" replace to="/purchaseLog"
        >消费</van-tabbar-item
      >
    </van-tabbar>

    <!-- 数据列表 -->
    <!-- Grid -->
    <van-grid
      v-show="showGridLocation"
      direction="horizontal"
      clickable
      icon-size="10"
      :column-num="5"
    >
      <van-grid-item
        v-for="(item, index) in locationitems"
        :key="index"
        :icon="item.icon"
        :text="item.text"
        :class="{ selected: selectedIndexLocation === index }"
        @click="toggleLocationSelection(index)"
        class="custom-grid-item"
      />
    </van-grid>

    <!-- Dropdown -->
    <van-dropdown-menu>
      <van-dropdown-item
        v-model="valueSort"
        :options="optionSort"
        @change="onclickOptionSort(valueSort)"
      />
    </van-dropdown-menu>
    <van-tabs
      class="tabs-container"
      v-model:active="activeTabs"
      @click-tab="onClickTab"
      shrink
      swipeable
      sticky
    >
      <van-tab title="全部">
        <div class="sidebar-and-list-container">
          <van-sidebar
            v-model="activeSidebar"
            @change="onChangeSidebar"
            class="sidebar"
          >
            <van-sidebar-item
              style="font-size: smaller"
              v-for="(sidename, index_side) in sidesName"
              :key="index_side"
              :title="sidename.username"
              :badge="
                sidename.total_reviews > 0 ? sidename.total_reviews : null
              "
            >
            </van-sidebar-item>
            <div style="height: 45px"></div>
          </van-sidebar>
          <div class="list-container">
            <!-- 周长细节 -->
            <van-cell
              v-show="showLastDaysDailyTask"
              is-link
              center
              clickable
              class="custom-cell"
              @click="showDailyDetail = true"
            >
              <template #title>
                <div style="margin-bottom: 0.5rem; font-weight: 400">
                  最近十五天周长 {{ LastDaysDailyTask.length }} 次，复习
                  {{ LastDaysReview.length }} 次
                </div>
              </template>
            </van-cell>

            <van-list
              v-model="loadingOriginalData"
              :finished="finishedOriginalData"
              finished-text="没有更多了"
              @load="onLoadOriginalData"
            >
              <div v-for="(item, index) in originalData" :key="index">
                <div v-if="item.type !== 2 && item.type != 3">
                  <van-cell
                    is-link
                    center
                    clickable
                    @click="gotoItem(index)"
                    class="custom-cell"
                  >
                    <template #title>
                      <div v-if="item.attempt == '0'">
                        <div
                          style="
                            display: flex;
                            align-items: flex-start;
                            width: 160%;
                          "
                        >
                          <div
                            style="
                              margin-bottom: 7px;
                              font-weight: 700;
                              display: flex;
                              width: 120%;
                            "
                          >
                            <div>还没有背诵</div>
                            <div
                              style="
                                margin: 0.25rem 0 0 0.2rem;
                                font-size: 9px;
                                color: lightgray;
                              "
                            >
                              {{
                                item.create_time.replace(
                                  /(\d{4}年\d{1,2}月\d{1,2}日).*/,
                                  "$1"
                                )
                              }}布置
                            </div>
                          </div>
                        </div>
                      </div>
                      <div v-else>
                        <div
                          style="
                            display: flex;
                            align-items: flex-start;
                            width: 160%;
                          "
                        >
                          <div style="margin-bottom: 7px; font-weight: 700">
                            <div style="font-size: smaller; color: lightgray">
                              最后一次背诵时间：
                            </div>
                            <div
                              v-if="item.is_review_required == 1"
                              style="margin-top: 0.3rem; color: lightgray"
                            >
                              {{ item.create_time }}
                            </div>
                            <div v-else style="margin-top: 0.3rem">
                              {{ item.create_time }}
                            </div>
                          </div>
                        </div>
                      </div>
                    </template>

                    <template #value>
                      <div style="font-size: 12px">
                        <div style="margin-bottom: 0.5rem">
                          {{ item.username }}
                        </div>
                        <div style="display: flex; justify-content: flex-end">
                          共背诵
                          <div style="font-weight: 700; color: red">
                            {{ item.attempt }}
                          </div>
                          次
                        </div>

                        <div style="margin-top: 0.5rem">
                          {{ item.answers.length }}词
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
                          margin-bottom: 3px;
                          width: 140%;
                          font-size: 10px;
                        "
                      >
                        {{ processedTitle(item.title) }}
                      </div>
                    </template>

                    <template #right-icon>
                      <div
                        v-if="item.is_pinned && item.rate < 3"
                        style="display: flex; flex-direction: column"
                      >
                        <van-icon
                          name="link-o"
                          size="0.6rem"
                          style="
                            margin-bottom: 4.4rem;
                            margin-left: -0.8rem;
                            color: blue;
                          "
                        />
                      </div>
                    </template>
                  </van-cell>
                </div>

                <div v-if="item.type == 2 || item.type == 3">
                  <van-cell
                    is-link
                    center
                    clickable
                    @click="gotoItem(index)"
                    class="custom-cell"
                  >
                    <template #icon>
                      <img
                        v-if="
                          item.rate < 3 && (item.type == 0 || item.type == 1)
                        "
                        src="../assets/item_list.png"
                        style="width: 27px; height: auto; margin-right: 0.5rem"
                        alt="Item List"
                      />
                      <img
                        v-if="
                          item.rate >= 3 && (item.type == 0 || item.type == 1)
                        "
                        src="../assets/item_list_complete.png"
                        style="width: 27px; height: auto; margin-right: 0.5rem"
                        alt="Item List Complete"
                      />
                      <img
                        v-if="item.type == 3"
                        src="../assets/item_list_complete.png"
                        style="width: 27px; height: auto; margin-right: 0.5rem"
                        alt="Item List Complete"
                      />
                      <img
                        v-if="item.type == 2"
                        src="../assets/item_list.png"
                        style="width: 27px; height: auto; margin-right: 0.5rem"
                        alt="Item List"
                      />
                    </template>

                    <template #title>
                      <div v-if="item.attempt == '0'">
                        <div
                          style="
                            display: flex;
                            align-items: flex-start;
                            width: 160%;
                          "
                        >
                          <div
                            style="
                              margin-bottom: 7px;
                              font-weight: 700;
                              display: flex;
                              width: 120%;
                            "
                          >
                            <div>还没有背诵</div>
                            <div
                              style="
                                margin: 0.25rem 0 0 0.2rem;
                                font-size: 9px;
                                color: lightgray;
                              "
                            >
                              {{
                                item.create_time.replace(
                                  /(\d{4}年\d{1,2}月\d{1,2}日).*/,
                                  "$1"
                                )
                              }}布置
                            </div>
                          </div>
                        </div>
                      </div>
                      <div v-else>
                        <div
                          style="
                            display: flex;
                            align-items: flex-start;
                            width: 160%;
                          "
                        >
                          <div style="margin-bottom: 7px; font-weight: 700">
                            <div style="font-size: smaller; color: lightgray">
                              背诵时间：
                            </div>
                          </div>
                        </div>
                      </div>
                    </template>

                    <template #value>
                      <div style="font-size: 12px">
                        <div style="margin-bottom: 0.5rem">
                          {{ item.username }}
                        </div>
                        <div style="margin-top: 0rem">
                          {{ item.answers.length }}词
                        </div>
                      </div>
                    </template>

                    <template #label>
                      <van-rate
                        v-model="item.rate"
                        :size="50"
                        color="#ffd21e"
                        void-icon="chart-trending-o"
                        icon="chart-trending-o"
                        void-color="#eee"
                        :count="1"
                        readonly
                        allow-half
                      />
                      <div
                        style="
                          margin-left: 4px;
                          margin-top: 7px;
                          margin-bottom: 3px;
                          width: 140%;
                          font-size: 10px;
                        "
                      >
                        <div>{{ processedTitle(item.title) }}</div>
                      </div>
                    </template>
                  </van-cell>
                </div>
              </div>
            </van-list>
            <van-back-top />
          </div>
        </div>
      </van-tab>

      <div v-for="(item, index) in tabsName" :key="index">
        <van-tab :title="item">
          <div class="sidebar-and-list-container">
            <van-sidebar
              v-model="activeSidebar"
              @change="onChangeSidebar"
              class="sidebar"
            >
              <van-sidebar-item
                style="font-size: smaller"
                v-for="(sidename, index_side) in sidesName"
                :key="index_side"
                :title="sidename.username"
                :badge="
                  sidename.total_reviews > 0 ? sidename.total_reviews : null
                "
              />
              <div style="height: 45px"></div>
            </van-sidebar>
            <div class="list-container">
              <!-- 周长细节 -->
              <van-cell
                v-show="showLastDaysDailyTask"
                is-link
                center
                clickable
                class="custom-cell"
                @click="showDailyDetail = true"
              >
                <template #title>
                  <div style="margin-bottom: 0.5rem; font-weight: 400">
                    最近十五天周长 {{ LastDaysDailyTask.length }} 次，复习
                    {{ LastDaysReview.length }} 次
                  </div>
                </template>
              </van-cell>
              <van-list
                v-model="loadingOriginalData"
                :finished="finishedOriginalData"
                finished-text="没有更多了"
                @load="onLoadOriginalData(item)"
              >
                <div v-for="(item, index) in originalData" :key="index">
                  <div v-if="item.type !== 2 && item.type != 3">
                    <van-cell
                      is-link
                      center
                      clickable
                      @click="gotoItem(index)"
                      class="custom-cell"
                    >
                      <template #title>
                        <div v-if="item.attempt == '0'">
                          <div
                            style="
                              display: flex;
                              align-items: flex-start;
                              width: 160%;
                            "
                          >
                            <div
                              style="
                                margin-bottom: 7px;
                                font-weight: 700;
                                display: flex;
                                width: 120%;
                              "
                            >
                              <div>还没有背诵</div>
                              <div
                                style="
                                  margin: 0.25rem 0 0 0.2rem;
                                  font-size: 9px;
                                  color: lightgray;
                                "
                              >
                                {{
                                  item.create_time.replace(
                                    /(\d{4}年\d{1,2}月\d{1,2}日).*/,
                                    "$1"
                                  )
                                }}布置
                              </div>
                            </div>
                          </div>
                        </div>
                        <div v-else>
                          <div
                            style="
                              display: flex;
                              align-items: flex-start;
                              width: 160%;
                            "
                          >
                            <div style="margin-bottom: 7px; font-weight: 700">
                              <div style="font-size: smaller; color: lightgray">
                                最后一次背诵时间：
                              </div>
                              <div
                                v-if="item.is_review_required == 1"
                                style="margin-top: 0.3rem; color: lightgray"
                              >
                                {{ item.create_time }}
                              </div>
                              <div v-else style="margin-top: 0.3rem">
                                {{ item.create_time }}
                              </div>
                            </div>
                          </div>
                        </div>
                      </template>

                      <template #value>
                        <div style="font-size: 12px">
                          <div style="margin-bottom: 0.5rem">
                            {{ item.username }}
                          </div>
                          <div style="display: flex; justify-content: flex-end">
                            共背诵
                            <div style="font-weight: 700; color: red">
                              {{ item.attempt }}
                            </div>
                            次
                          </div>

                          <div style="margin-top: 0.5rem">
                            {{ item.answers.length }}词
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
                            margin-bottom: 3px;
                            width: 140%;
                            font-size: 10px;
                          "
                        >
                          <div>{{ processedTitle(item.title) }}</div>
                        </div>
                      </template>

                      <template #right-icon>
                        <div
                          v-if="item.is_pinned && item.rate < 3"
                          style="display: flex; flex-direction: column"
                        >
                          <van-icon
                            name="link-o"
                            size="0.6rem"
                            style="
                              margin-bottom: 4.3rem;
                              margin-left: -0.8rem;
                              color: blue;
                            "
                          />
                        </div>
                      </template>
                    </van-cell>
                  </div>

                  <div v-if="item.type == 2 || item.type == 3">
                    <van-cell
                      is-link
                      center
                      clickable
                      @click="gotoItem(index)"
                      class="custom-cell"
                    >
                      <template #icon>
                        <img
                          v-if="
                            item.rate < 3 && (item.type == 0 || item.type == 1)
                          "
                          src="../assets/item_list.png"
                          style="
                            width: 27px;
                            height: auto;
                            margin-right: 0.5rem;
                          "
                          alt="Item List"
                        />
                        <img
                          v-if="
                            item.rate >= 3 && (item.type == 0 || item.type == 1)
                          "
                          src="../assets/item_list_complete.png"
                          style="
                            width: 27px;
                            height: auto;
                            margin-right: 0.5rem;
                          "
                          alt="Item List Complete"
                        />
                        <img
                          v-if="item.type == 3"
                          src="../assets/item_list_complete.png"
                          style="
                            width: 27px;
                            height: auto;
                            margin-right: 0.5rem;
                          "
                          alt="Item List Complete"
                        />
                        <img
                          v-if="item.type == 2"
                          src="../assets/item_list.png"
                          style="
                            width: 27px;
                            height: auto;
                            margin-right: 0.5rem;
                          "
                          alt="Item List"
                        />
                      </template>

                      <template #title>
                        <div v-if="item.attempt == '0'">
                          <div
                            style="
                              display: flex;
                              align-items: flex-start;
                              width: 160%;
                            "
                          >
                            <div
                              style="
                                margin-bottom: 7px;
                                font-weight: 700;
                                display: flex;
                                width: 120%;
                              "
                            >
                              <div>还没有背诵</div>
                              <div
                                style="
                                  margin: 0.25rem 0 0 0.2rem;
                                  font-size: 9px;
                                  color: lightgray;
                                "
                              >
                                {{
                                  item.create_time.replace(
                                    /(\d{4}年\d{1,2}月\d{1,2}日).*/,
                                    "$1"
                                  )
                                }}布置
                              </div>
                            </div>
                          </div>
                        </div>
                        <div v-else>
                          <div
                            style="
                              display: flex;
                              align-items: flex-start;
                              width: 160%;
                            "
                          >
                            <div style="margin-bottom: 7px; font-weight: 700">
                              <div style="font-size: smaller; color: lightgray">
                                最后一次背诵时间：
                              </div>
                              <div style="margin-top: 0.3rem">
                                {{ item.create_time }}
                              </div>
                            </div>
                          </div>
                        </div>
                      </template>

                      <template #value>
                        <div style="font-size: 12px">
                          <div style="margin-bottom: 0.5rem">
                            {{ item.username }}
                          </div>
                          <div style="margin-top: 0rem">
                            {{ item.answers.length }}词
                          </div>
                        </div>
                      </template>

                      <template #label>
                        <van-rate
                          v-model="item.rate"
                          :size="50"
                          color="#ffd21e"
                          void-icon="chart-trending-o"
                          icon="chart-trending-o"
                          void-color="#eee"
                          :count="1"
                          readonly
                          allow-half
                        />
                        <div
                          style="
                            margin-left: 4px;
                            margin-top: 7px;
                            margin-bottom: 3px;
                            width: 140%;
                            font-size: 10px;
                          "
                        >
                          <div>{{ processedTitle(item.title) }}</div>
                        </div>
                      </template>
                    </van-cell>
                  </div>
                </div>
              </van-list>
              <van-back-top />
            </div>
          </div>
        </van-tab>
      </div>
    </van-tabs>

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
            周长复习日志
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
            <template #title>
              <div style="width: 120%">
                {{ formatDate_log(item.create_time) }}
              </div>
            </template>
            <template #value>
              <div v-if="item.swipe == '周长'" style="color: blue">
                {{ item.swipe }}
              </div>
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
              :label="`正确率：${item.true_length} / ${item.log.length}`"
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
                  <div style="">预习时间:</div>
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
                <div v-if="item.complement == 1" style="display: flex; justify-content: flex-start">
                  <van-tag type="primary" plain mark size="medium">
                    正确率{{ item.true_length }} / {{ item.log.length }}
                  </van-tag>
                  <div v-if="item.diamondConsume != null && item.diamondConsume != ''" style="margin-top: 0.2rem;">&nbsp;💎</div>
                </div>
                <div v-else style="display: flex; justify-content: flex-start">
                  正确率{{ item.true_length }} / {{ item.log.length }}
                  <div v-if="item.diamondConsume != null && item.diamondConsume != ''">&nbsp;💎</div>
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
                ID: {{ detailNid }}
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
            <div v-if="diamondConsume != null && diamondConsume != ''">💎 {{ diamondConsume }}</div>
          </div>
          <div v-if="diamondConsume != null && diamondConsume != '' && detailMode === '普通'" style="font-size: 13px;color: gray;margin: 5px 10px;">
            💎 {{ diamondConsume }}
          </div>
        </div>
        <div v-for="(item, index) in detailList" :key="index">
          <van-cell :label="`答案：${item.正确答案 || item.答案}`">
            <template #title>
              <div style="font-size: larger; font-weight: 700">
                {{ item.英文 }}
                <van-tag v-if="item.is_spell" type="danger" mark>拼</van-tag>
                <van-tag mark v-if="item.排除 === '手写'" type="warning">
                  写
                </van-tag>
              </div>
              <div
                style="margin-top: 0.5rem"
                :style="{
                  color: isCorrectAnswer(
                    item.用户选择,
                    item.答案,
                    item.正确答案,
                    item.is_spell
                  )
                    ? 'gray'
                    : 'red',
                }"
              >
                用户选择：{{ item.用户选择.join("/") }}
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
    <loading v-if="isLoading" />
  </div>
</template>




<style>
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
</style>
