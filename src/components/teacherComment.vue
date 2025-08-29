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
import {
  showSuccessToast,
  showFailToast,
  showLoadingToast,
  showConfirmDialog,
  showDialog,
  showToast,
  Dialog,
} from "vant";
const router = useRouter();
const instance = getCurrentInstance();
const axios = instance.appContext.config.globalProperties.$ajax;

const originalData = ref([]);
const filterXlsmData = ref([]);

// 跳转明细
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

function processDatetime(res) {
  return res.map((item) => {
    const {
      alias,
      answers,
      attempt,
      complete_status,
      create_time,
      nid,
      rate,
      synoyms,
      title,
      username,
      view,
      view_time,
      swipe,
      coins,
      type,
      merge_option,
      reversd_number,
      none_of_above,
      is_spell_number,
      spell_words,
      lock_spell,
      is_pinned,
      is_review_required,
      review_time,
      apply_challenge,
    } = item;

    const formattedCreateTime = formatDateString(create_time);
    const formattedViewTime = formatDateString(view_time);
    const formattedReviewTime = formatDateString(review_time);

    let lock_spell_format;
    if (lock_spell === null) {
      lock_spell_format = "未选词";
    } else {
      lock_spell_format = lock_spell;
    }

    let spell_words_length;
    try {
      spell_words_length =
        !spell_words || spell_words.trim() === ""
          ? 0
          : JSON.parse(spell_words.replace(/'/g, '"')).length;
    } catch (e) {}

    // 将answers从JSON数据转换为数组，并计算其长度
    let answersArray = [];
    let answersLen = 0;
    // console.log("answers", answers);
    if (answers) {
      try {
        answersArray = JSON.parse(answers);
        answersLen = Array.isArray(answersArray) ? answersArray.length : 0;
      } catch (e) {
        answersLen = Array.isArray(answers) ? answers.length : 0;
      }
    }
    const noneOfAboveValue = none_of_above ? 1 : 0;
    return {
      alias,
      answers,
      answers_len: answersLen,
      attempt,
      complete_status,
      create_time: formattedCreateTime,
      nid,
      rate,
      synoyms,
      title,
      username,
      view,
      view_time: formattedViewTime,
      swipe,
      coins,
      type,
      merge_option,
      reversd_number,
      none_of_above: noneOfAboveValue,
      is_spell_number,
      spell_words,
      lock_spell: lock_spell_format,
      spell_words_length: spell_words_length,
      is_pinned,
      is_review_required,
      review_time: formattedReviewTime,
      apply_challenge,
    };
  });
}

async function queryData() {
  let params = new URLSearchParams();
  params.append("method", "queryTeacherComment");
  return await axios.post("words/", params).then((ret) => {
    return ret.data;
  });
}

function getListData() {
  queryData().then((res) => {
    console.log("res: ", res);
    res = processDatetime(res);
    originalData.value = [...res];
    filterXlsmData.value = [...res];
    console.log("filterXlsmData: ", filterXlsmData.value);

    // filterData();
  });
}

// 左右滑按钮
// 删除项的函数
const deleteItem = (item, index) => {
  // console.log("编辑项目：", item, "索引：", index);
  // originalData.value.splice(index, 1);

  async function DeleteUserData() {
    let params = new URLSearchParams();
    params.append("method", "DeleteUserData");
    params.append("nid", item["nid"]);
    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }
  showConfirmDialog({
    title: "Delete",
    message: "是否确认删除?",
    theme: "round-button",
  }).then(() => {
    DeleteUserData().then((ret) => {
      console.log("valueSearchStudent", valueSearchStudent.value);
      if (
        valueSearchStudent.value == "" &&
        valueSearchXlsm.value == "" &&
        valueSearchGroup.value == "" &&
        valueGrade.value == "" &&
        valueLocation.value == "" &&
        valueSearchGroup.value == "" &&
        dateCalendar.value == ""
      ) {
        reloadPage();
      } else {
        showSuccessToast("处于筛选状态");
        filterData();
      }
    });
  });
};

// 查看答案log
const answerLogResult = ref([]);
const showAnswerLog = ref(false);
const answerUsername = ref("");
const answerAttempt = ref("");
const answerSwipe = ref("");
const answerLens = ref("");
const answerRate = ref("");
const answerTitle = ref("");
const searchAnswer = (item, index) => {
  // console.log(item, index);
  answerUsername.value = item.username;
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
    console.log(res);
    if (res.length == 0) {
      showToast("没有查询到数据");
    } else {
      showAnswerLog.value = true;
      // function parseDate(dateString) {
      //   const formattedDate = dateString
      //     .replace("年", "-")
      //     .replace("月", "-")
      //     .replace("日", "T")
      //     .replace("时", ":")
      //     .replace("分", ":")
      //     .replace("秒", "");

      //   return new Date(formattedDate);
      // }

      // const sortedData = res.sort(
      //   (a, b) => parseDate(a.create_time) - parseDate(b.create_time)
      // );
      // console.log('sortedData:', sortedData);
      // answerLogResult.value = sortedData;
      answerLogResult.value = res;
    }
  });
};
const getTypeColor = (type) => {
  if (type === "预习") {
    return "green";
  } else if (type === "迟疑") {
    return "orange";
  } else if (type === "检查") {
    return "red";
  }
  return "black"; // 默认颜色
};

// 查询日志
const showAccountLog = ref(false);
const answerLogList = ref([]);
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
  // console.log(item);
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
    } else {
      showAccountLog.value = true;

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
          .replace(/needn"t/g, "needn't")
          .replace(/o"clock/g, "o'clock")
          .replace(/won"t/g, "won't")
          .replace(/it"s/g, "it's")
          .replace(/we"re/gi, "we're'")
          .replace(/You"re/gi, "you're'")
          .replace(/they"re/gi, "they're'")
          .replace(/doesn"t/gi, "doesn't")
          .replace(/don"t/gi, "don't")
          .replace(/I"ll/gi, "I'll")
          .replace(/you"ll/gi, "you'll")
          .replace(/one"s/gi, "one's")
          .replace(/let"s/gi, "let's");

        dataString = dataString
          .replace(/\bFalse\b/g, "false")
          .replace(/\bTrue\b/g, "true");

        item.log = JSON.parse(dataString);

        const trueCount = item.log.filter(
          (entry) => entry.flag === "true"
        ).length;

        item.true_length = trueCount;
      });
      console.log(res);
      answerLogList.value = res;
    }
  });
};

// 预览学生端
const viewOriginalData = ref([]);
const loadingOriginalData = ref(false);
const finishedOriginalData = ref(false);
const pageIndexOriginalData = ref(0);
const showViewStudents = ref(false);
const showEditViewStudent = ref(false);
const detailEditViewStudent = ref("");
const isPinnedEditViewStudent = ref("");
const aliasEditViewStudent = ref("");

const viewUsername = ref("");
const viewUserCoins = ref(0);
const activeTabs = ref("0");
const tabsName = ref([]);
const nameCircle = ref("全部");
const rateCircle = ref(0);
const currentRate = ref(0);
const rateCircleList = ref([]);
const starRateNumber = ref(0);
const starRateNumberList = ref([]);
const completeNumber = ref(0);
const completeNumberList = ref([]);
const gradientColor = ref({
  "0%": "#ff0000",
  "100%": "#ffff00",
});
const showAnswerSheet = ref(false);
const answerSheetList = ref([]);

const viewStudentsList = async (item, index) => {
  let toast1 = showLoadingToast({
    message: "生成中...",
    forbidClick: true,
  });
  // console.log("item: ", item);

  viewUsername.value = item["username"];
  viewUserCoins.value = item["coins"];
  viewOriginalData.value = [];

  const params = new URLSearchParams();
  params.append("method", "getUserData");
  params.append("superuser", "josephxie123");
  params.append("user", viewUsername.value);

  const response = await axios.post("words/", params);
  toast1.close();
  const data = response.data;

  tabsName.value = data.unique_aliases;
  showViewStudents.value = true;
  onClickTab("全部");
};
const onLoadOriginalData = async (title = "全部") => {
  if (loadingOriginalData.value || finishedOriginalData.value) {
    return;
  }
  loadingOriginalData.value = true;
  let toast1 = showLoadingToast({
    message: "请求中...",
    forbidClick: true,
  });
  try {
    const params = new URLSearchParams();
    params.append("method", "getUserDataPage");
    params.append("alias", title);
    params.append("user", viewUsername.value);
    params.append("page", pageIndexOriginalData.value + 1); // 请求下一页的数据
    params.append("page_size", 20); // 每页数据大小

    const response = await axios.post("words/", params);
    let moreData = response.data.data;
    // moreData.forEach(item => {
    //       console.log(item.title);
    //   });

    moreData = moreData.map((item) => {
      const progress = Math.min(
        Math.floor((viewUserCoins.value / 2000) * 100),
        100
      );
      return { ...item, progressPercentage: progress };
    });

    if (moreData.length) {
      function sortDataByfigures(moreData) {
        // 汉字数字映射
        const chineseNumMap = {
          一: 1,
          二: 2,
          三: 3,
          四: 4,
          五: 5,
          六: 6,
          七: 7,
          八: 8,
          九: 9,
          十: 10,
          十一: 11,
          十二: 12,
          十三: 13,
          十四: 14,
          十五: 15,
          十六: 16,
          十七: 17,
          十八: 18,
          十九: 19,
          二十: 20,
          二十一: 21,
          二十二: 22,
          二十三: 23,
          二十四: 24,
          二十五: 25,
          二十六: 26,
          二十七: 27,
          二十八: 28,
          二十九: 29,
          三十: 30,
          三十一: 31,
          三十二: 32,
          三十三: 33,
          三十四: 34,
          三十五: 35,
          三十六: 36,
          三十七: 37,
          三十八: 38,
          三十九: 39,
          四十: 40,
          四十一: 41,
          四十二: 42,
          四十三: 43,
          四十四: 44,
          四十五: 45,
          四十六: 46,
          四十七: 47,
          四十八: 48,
          四十九: 49,
          五十: 50,
        };
        // 提取标题中的固定部分和数字部分
        moreData = moreData.map((item) => {
          const match = item.title.match(
            /(.+?)(一|二|三|四|五|六|七|八|九|十|十一|十二|十三|十四|十五|十六|十七|十八|十九|二十|二十一|二十二|二十三|二十四|二十五|二十六|二十七|二十八|二十九|三十|三十一|三十二|三十三|三十四|三十五|三十六|三十七|三十八|三十九|四十|四十一|四十二|四十三|四十四|四十五|四十六|四十七|四十八|四十九|五十)(\.\w+)$/
          );
          if (match) {
            return {
              ...item,
              title_base: match[1], // 提取标题中的固定部分
              title_num: chineseNumMap[match[2]], // 提取汉字数字部分并转换为阿拉伯数字
              title_ext: match[3], // 提取扩展名部分
            };
          } else {
            return {
              ...item,
              title_base: item.title,
              title_num: 0,
              title_ext: "",
            };
          }
        });
        // 将 is_pinned 为 true 且 rate < 3 的项放到最前面
        const pinnedItems = moreData.filter(
          (item) => item.is_pinned && item.rate < 3
        );
        const otherItems = moreData.filter(
          (item) => !(item.is_pinned && item.rate < 3)
        );

        // 根据标题的固定部分分组
        const groups = otherItems.reduce((acc, item) => {
          const base = item.title_base;
          if (!acc[base]) {
            acc[base] = [];
          }
          acc[base].push(item);
          return acc;
        }, {});

        // 对每个分组进行排序，并且对整个分组也按照 create_time 进行排序
        const sortedGroups = Object.values(groups)
          .map((group) => {
            group.sort((a, b) => a.title_num - b.title_num); // 组内按 title_num 升序
            return group;
          })
          .sort(
            (a, b) => new Date(b[0].create_time) - new Date(a[0].create_time)
          ); // 组间按 create_time 降序

        // 将分组后的数据合并回数组
        const result = [...pinnedItems, ...sortedGroups.flat()];

        return result;
      }

      moreData.sort(
        (a, b) => new Date(b.create_time) - new Date(a.create_time)
      );
      // console.log("moreData1: ", moreData);

      const result = sortDataByfigures(moreData);
      console.log("moreDat2: ", result);

      result.forEach((item) => {
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
        viewOriginalData.value.push(newItem);
      });
      pageIndexOriginalData.value++;
    }
    finishedOriginalData.value = !response.data.has_more;
  } catch (error) {
    console.error("Failed to fetch data:", error);
  }
  loadingOriginalData.value = false;
  toast1.close();

  return originalData.value;
};
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
const processedTitle = (title) => {
  return title.split(".")[0]; // 获取第一个句点（.）之前的部分
};
const onClickTab = ({ title }) => {
  // console.log('title: ', title);
  viewOriginalData.value = [];
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
const viewAnswer = (item, index) => {};
const editPinned = (item, index) => {
  console.log(item);
  showEditViewStudent.value = true;
  detailEditViewStudent.value = item;
  isPinnedEditViewStudent.value = detailEditViewStudent.value.is_pinned
    ? "1"
    : "0";
  aliasEditViewStudent.value = detailEditViewStudent.value.alias;
};
const confirmEditViewStudent = () => {
  showConfirmDialog({
    title: "修改数据",
    message: "是否确认修改?",
    theme: "round-button",
  }).then(async () => {
    let toast1 = showLoadingToast({
      message: "修改中...",
      forbidClick: true,
    });
    const params = new URLSearchParams();
    params.append("method", "reviseViewStudent");
    params.append("is_pinned", isPinnedEditViewStudent.value);
    params.append("alias", aliasEditViewStudent.value);
    params.append("nid", detailEditViewStudent.value.nid);
    const response = await axios.post("words/", params);
    toast1.close();
    console.log("response: ", response.data);
    if (response.data == "修改成功") {
      showEditViewStudent.value = false;
      loadingOriginalData.value = false;
      finishedOriginalData.value = false;
      let toast1 = showLoadingToast({
        message: "刷新中...",
        forbidClick: true,
      });

      viewUsername.value = detailEditViewStudent.value["username"];
      viewOriginalData.value = [];

      const params = new URLSearchParams();
      params.append("method", "getUserData");
      params.append("superuser", "josephxie123");
      params.append("user", viewUsername.value);

      const response = await axios.post("words/", params);
      toast1.close();
      const data = response.data;

      tabsName.value = data.unique_aliases;
      showViewStudents.value = true;
      onClickTab("全部");
    } else if (response.data == "输入有误") {
      showFailToast("输入有误");
    }
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
  is_spell,
  排除,
  英文
) => {
  if (排除 === "手写") {
    // const userChoicesString = userChoices.join("");
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
  // console.log('item: ', item);
  detailMode.value = item["swipe"];
  detailNid.value = item["nid"];
  detailList.value = item["log"];
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

    console.log('teacherMarkedWords: ', teacherMarkedWords);
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

// 筛选
const formattedRate = (rate) => {
  // 检查是否为整数
  if (Number.isInteger(rate)) {
    return rate - 3;
  } else {
    // 保留一位小数
    return (rate - 3).toFixed(1);
  }
};
const showFliterBox = ref(false);
const valueSearchStudent = ref("");
const valueSearchXlsm = ref("");
const valueSearchGroup = ref("");
const columnsGrade = [
  //年级
  { text: "七年级", value: "七年级" },
  { text: "八年级", value: "八年级" },
  { text: "九年级", value: "九年级" },
  { text: "高一", value: "高一" },
  { text: "高二", value: "高二" },
  { text: "高三", value: "高三" },
];
const showGradePicker = ref(false);
const valueGrade = ref("");
const onConfirmGrade = ({ selectedValues }) => {
  showGradePicker.value = false;
  valueGrade.value = selectedValues[0];
};

const showLocationPicker = ref(false); // 地点
const columnsLocation = ref([]);
async function queryLocations() {
  let params = new URLSearchParams();
  params.append("method", "queryLocations");
  return await axios.post("words/", params).then((ret) => {
    return ret.data;
  });
}
const valueLocation = ref("");
const onConfirmLocation = ({ selectedValues }) => {
  showLocationPicker.value = false;
  valueLocation.value = selectedValues[0];
};

const showCalendar = ref(false); // 日期
const dateCalendar = ref("");
const formatDate = (date) =>
  `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
const onConfirmCalendar = (values) => {
  const [start, end] = values;
  showCalendar.value = false;
  dateCalendar.value = `${formatDate(start)} - ${formatDate(end)}`;
};

const clearFilterData = () => {
  valueSearchStudent.value = "";
  valueSearchXlsm.value = "";
  valueSearchGroup.value = "";
  valueLocation.value = "";
  valueGrade.value = "";
};
const showFilter = () => {
  showFliterBox.value = true;
  queryLocations().then((ret) => {
    columnsLocation.value = ret.map((item) => ({
      text: item.location_name,
      value: item.location_name,
    }));
    // console.log("columnsLocation", columnsLocation.value);
  });
};
function processData(res) {
  return res.map((item) => {
    const {
      title,
      username,
      answers,
      synonyms,
      create_time,
      rate,
      attempt,
      nid,
      alias,
      view,
      view_time,
      swipe,
      coins,
      merge_option,
      type,
      reversd_number,
      none_of_above,
      is_spell_number,
      lock_spell,
      spell_words,
      is_pinned,
      is_review_required,
      review_time,
      apply_challenge,
    } = item;
    let dataAnswers = JSON.stringify(answers);
    // console.log("dataAnswers: ", dataAnswers);
    const parsedAnswers = eval("(" + dataAnswers + ")");
    let dataSynonyms = JSON.stringify(synonyms);
    const parsedSynonyms = eval("(" + dataSynonyms + ")");
    // const parsedSynonyms = JSON.parse(dataSynonyms);

    let lock_spell_format;
    if (lock_spell === null) {
      lock_spell_format = "未选词";
    } else {
      lock_spell_format = lock_spell;
    }

    const noneOfAboveValue = none_of_above ? 1 : 0;
    return {
      title,
      username,
      answers: parsedAnswers,
      synonyms: parsedSynonyms,
      create_time,
      rate,
      attempt,
      nid,
      alias,
      view,
      view_time,
      swipe,
      coins,
      merge_option,
      type,
      reversd_number,
      none_of_above: noneOfAboveValue,
      is_spell_number,
      lock_spell: lock_spell_format,
      spell_words,
      is_pinned,
      is_review_required,
      review_time,
      apply_challenge,
    };
  });
}
const filterData = () => {
  if (
    valueSearchStudent.value == "" &&
    valueSearchXlsm.value == "" &&
    valueSearchGroup.value == "" &&
    valueLocation.value == "" &&
    valueGrade.value == "" &&
    dateCalendar.value == ""
  ) {
    return;
  }

  async function filterData() {
    let params = new URLSearchParams();
    params.append("method", "filterTeacherComment");
    params.append("filterStudent", valueSearchStudent.value);
    params.append("filterXlsm", valueSearchXlsm.value);
    params.append("filterGroup", valueSearchGroup.value);
    params.append("filterLocation", valueLocation.value);
    params.append("filterGrade", valueGrade.value);
    params.append("filterDate", dateCalendar.value);
    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }
  filterData()
    .then((res) => {
      const newFilteredFiles = [];
      res.forEach((item) => {
        newFilteredFiles.push({
          nid: item.pk,
          ...item.fields,
          lock_spell: item.lock_spell,
          spell_words: item.spell_words,
        });
      });
      // console.log("res: ", newFilteredFiles);
      let data = processData(newFilteredFiles);
      data = processDatetime(data);
      filterXlsmData.value = [...data];
      // filterXlsmData2.value = [...data];
    })
    .then(() => {
      sortByXlsm();
    });
};

const sortByXlsm = () => {
  filterXlsmData.value.sort((a, b) => {
    if (a.username < b.username) return -1;
    if (a.username > b.username) return 1;

    const dateA = new Date(
      a.create_time.replace(/[年月日时分]/g, "-").slice(0, -1)
    );
    const dateB = new Date(
      b.create_time.replace(/[年月日时分]/g, "-").slice(0, -1)
    );

    return dateA - dateB;
  });
  console.log("filterXlsmData: ", filterXlsmData.value);
};

const filteredStudent = () => {
  filterData();
  // showFliterBox.value = false;
};

const updateReview = () => {
  async function updateReview() {
    let params = new URLSearchParams();
    params.append("method", "updateReview");
    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }
  showConfirmDialog({
    title: "确认更新",
    message: "是否确认更新review？",
    theme: "round-button",
  })
    .then(() => {
      updateReview().then((res) => {
        console.log(res);
        let message = "";
        for (const [username, count] of Object.entries(res)) {
          message += `${username}: ${count}个\n`;
        }
        showToast({
          duration: 0,
          closeOnClick: true,
          closeOnClickOverlay: true,
          message: message,
        });
      });
    })
    .catch(() => {
      // on cancel
    });
};

const updateDaily = () => {
  async function updateDaily() {
    let params = new URLSearchParams();
    params.append("method", "updateDaily");
    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }
  showConfirmDialog({
    title: "确认更新",
    message: "是否确认更新Daily周长？",
  })
    .then(() => {
      updateDaily().then((res) => {
        console.log(res);
        let message = "";
        for (const [username, count] of Object.entries(res)) {
          message += `${username}`;
        }
        showToast({
          duration: 0,
          closeOnClick: true,
          closeOnClickOverlay: true,
          message: message,
        });
      });
    })
    .catch(() => {
      // on cancel
    });
};
// 多选修改分组
const cellValue = ref(true);
const valueNewGroup = ref("");
const valueNewIspinned = ref("");
const valueReview = ref("");
const showReviseGroup = ref(false);
const isMultiSelectMode = ref(false);
const selectedItems = ref([]);
const toggleMultiSelectMode = () => {
  cellValue.value = !cellValue.value;
  isMultiSelectMode.value = !isMultiSelectMode.value;
  if (!isMultiSelectMode.value) {
    // 清除所有选择
    selectedItems.value = [];
  }
};
const selectItem = (index) => {
  // 选中删除checkbox
  const selectedIndex = selectedItems.value.indexOf(index);
  if (selectedIndex !== -1) {
    selectedItems.value.splice(selectedIndex, 1);
  } else {
    selectedItems.value.push(index);
  }
};
const popReviseGroup = () => {
  showReviseGroup.value = true;
};
const reviseGroup = () => {
  const selectedNids = selectedItems.value.map(
    (index) => filterXlsmData.value[index].nid
  );
  // console.log("selectedNids: ", selectedNids);
  async function reviseGroups() {
    let params = new URLSearchParams();
    params.append("method", "reviseGroups");
    params.append("nids", JSON.stringify(selectedNids));
    params.append("groupName", valueNewGroup.value);
    params.append("ispinned", valueNewIspinned.value);
    params.append("valueReview", valueReview.value);
    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }
  reviseGroups().then((res) => {
    // console.log('res: ', res);
    selectedItems.value = [];
    if (res["message"] == "修改完成") {
      filterData();
      showSuccessToast("修改成功");
    }
    return;
  });
};

// 全选功能
const isAllSelected = computed(() => {
  return (
    filterXlsmData.value.length > 0 &&
    selectedItems.value.length === filterXlsmData.value.length
  );
});

const selectAll = () => {
  if (selectedItems.value.length === filterXlsmData.value.length) {
    // 如果已经全选，则取消全选
    selectedItems.value = [];
  } else {
    // 全选所有项目
    selectedItems.value = filterXlsmData.value.map((_, index) => index);
  }
};

const confirmDeleteInDialog = () => {
  if (selectedItems.value.length === 0) {
    showFailToast("请先选择要删除的项目");
    return;
  }

  // 关闭修改分组对话框
  showReviseGroup.value = false;

  // 批量删除函数
  async function DeleteMultipleUserData() {
    let params = new URLSearchParams();
    params.append("method", "DeleteMultiUserData");

    // 获取所有选中项目的nid
    const selectedNids = selectedItems.value.map(
      (index) => filterXlsmData.value[index].nid
    );

    // 如果需要批量删除，可能需要传递数组或者循环删除
    // 方案1：如果后端支持批量删除
    params.append("nids", JSON.stringify(selectedNids));

    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }

  // 显示确认对话框
  showConfirmDialog({
    title: "Delete",
    message: `是否确认删除选中的 ${selectedItems.value.length} 个项目?`,
    theme: "round-button",
  }).then(() => {
    DeleteMultipleUserData().then((ret) => {
      console.log("删除结果:", ret);

      // 清空选择
      selectedItems.value = [];

      // 检查是否处于筛选状态
      if (
        valueSearchStudent.value == "" &&
        valueSearchXlsm.value == "" &&
        valueSearchGroup.value == "" &&
        valueGrade.value == "" &&
        valueLocation.value == "" &&
        valueSearchGroup.value == "" &&
        dateCalendar.value == ""
      ) {
        reloadPage();
      } else {
        showSuccessToast("处于筛选状态");
        filterData();
      }
    });
  });
};

// 编辑数据
const showReviseData = ref(false);
const itemEdit = ref("");
const valueAlias = ref("");
const valueTitle = ref("");
const valueStar = ref(0);
const valueAttempt = ref(0);
const valueType = ref(0);
const valueView = ref(0);
const valueSwipe = ref(0);
const valueMerge = ref(1);
const valueReversed = ref(0);
const valueNoneOfAbove = ref(0);
const valueCoins = ref(2000);
const valueContents = ref("");
const valueIsPinned = ref("");
const valueNid = ref("");
const valueIsSpell = ref(3);
const valueIsReviewRequired = ref(0);
const valueChallenge = ref(0);
const valueReviewTime = ref("");
const editData = (index) => {
  itemEdit.value = filterXlsmData.value[index];
  console.log("itemEdit: ", itemEdit.value);

  showReviseData.value = true;
  valueIsPinned.value = itemEdit.value.is_pinned ? 1 : 0;
  valueAlias.value = itemEdit.value.alias;
  valueIsReviewRequired.value = itemEdit.value.is_review_required;
  valueReviewTime.value = itemEdit.value.review_time;
  valueTitle.value = itemEdit.value.title;
  valueStar.value = itemEdit.value.rate;
  valueSwipe.value = itemEdit.value.swipe;
  valueAttempt.value = itemEdit.value.attempt;
  valueCoins.value = itemEdit.value.coins;
  valueView.value = itemEdit.value.view;
  valueType.value = itemEdit.value.type;
  valueNoneOfAbove.value = itemEdit.value.none_of_above;
  valueIsSpell.value = itemEdit.value.is_spell_number;
  valueReversed.value = itemEdit.value.reversd_number;
  valueMerge.value = itemEdit.value.merge_option ? 1 : 0;
  if (typeof itemEdit.value.synonyms === "string") {
    let dataAnswers = itemEdit.value.synonyms.replace(/(\W)'|'(\W)/g, '$1"$2'); // 替换单引号为双引号
    dataAnswers = dataAnswers
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
      .replace(/won"t/g, "won't")
      .replace(/\bFalse\b/g, "false")
      .replace(/\bTrue\b/g, "true");
    valueContents.value = JSON.parse(dataAnswers);
  } else {
    valueContents.value = itemEdit.value.synonyms;
  }

  valueNid.value = itemEdit.value.nid;
};
const deleteSpellVocabulary = () => {
  async function deleteSpell() {
    let params = new URLSearchParams();
    params.append("method", "deleteSpell");
    params.append("username", itemEdit.value.username);
    params.append("account_data_id", valueNid.value);
    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }
  showConfirmDialog({
    title: "Delete",
    message: "是否确认清除拼写库吗?",
    theme: "round-button",
  }).then(() => {
    deleteSpell().then((res) => {
      showToast("删除完成");
    });
  });
};
const showSpellExist = ref(false);
const spellExistVocabulary = ref([]);
const lock_spell_status = ref("");
const showSpellVocabulary = async () => {
  synonymsSelected.value = [];
  // 先执行
  const res = await getSpellVocabulary();

  // 三执行
  let dataString;
  if (Array.isArray(itemEdit.value.answers)) {
    dataString = JSON.stringify(itemEdit.value.answers);
  } else if (typeof itemEdit.value.answers === "string") {
    dataString = itemEdit.value.answers;
  }
  selectSpellVocabulary.value = eval("(" + dataString + ")");
  console.log("selectSpellVocabulary: ", selectSpellVocabulary.value);

  // 二执行
  let selectSpellWords;
  if (res.length) {
    // selectSpellWords = JSON.parse(res[0].data_words);
    let dataString = res[0].data_words.replace(/(\W)'|'(\W)/g, '$1"$2');
    selectSpellWords = JSON.parse(
      dataString
        .replace(/([{,]\s*)'([^']+?)'(\s*[:])/g, '$1"$2"$3')
        .replace(/'/g, '"')
        .replace(/s" /g, "s' ")
        .replace(/"s /g, "'s ")
        .replace(/"t /g, "'t ")
        .replace(/can"t/g, "can't")
        .replace(/mustn"t/g, "mustn't")
        .replace(/o"clock/g, "o'clock")
        .replace(/won"t/g, "won't")
        .replace(/\bFalse\b/g, "false")
        .replace(/\bTrue\b/g, "true")
    );
    console.log("selectSpellWords: ", selectSpellWords);
    // 四执行
    const selectSpellWordsSet = new Set(
      selectSpellWords.map((item) => item.英文)
    );

    selectSpellVocabulary.value.forEach((item) => {
      if (selectSpellWordsSet.has(item.英文)) {
        synonymsSelected.value.push(parseInt(item.序号).toString());
      }
    });

    // console.log("synonymsSelected: ", synonymsSelected.value);
  }

  showSelectSpellVocabulary.value = true;
  showReviseData.value = false;
};

const showSelectSpellVocabulary = ref(false);
const selectSpellVocabulary = ref([]);
async function reviseUserData() {
  let params = new URLSearchParams();
  params.append("method", "reviseUserData");
  params.append("title", valueTitle.value);
  params.append("nid", valueNid.value);
  params.append("alias", valueAlias.value);
  params.append("attempt", valueAttempt.value);
  params.append("view", valueView.value);
  params.append("rate", valueStar.value);
  params.append("swipe", valueSwipe.value);
  params.append("type", valueType.value);
  params.append("merge_option", valueMerge.value);
  params.append("reversd_number", valueReversed.value);
  params.append("none_of_above", valueNoneOfAbove.value);
  params.append("is_pinned", valueIsPinned.value);
  params.append("is_review_required", valueIsReviewRequired.value);
  params.append("is_spell_number", valueIsSpell.value);
  params.append("apply_challenge", valueChallenge.value);
  return await axios.post("words/", params).then((ret) => {
    return ret.data;
  });
}
async function getSpellVocabulary() {
  let params = new URLSearchParams();
  params.append("method", "getSpellVocabulary");
  params.append("username", itemEdit.value.username);
  params.append("account_data_id", itemEdit.value.nid);
  return await axios.post("words/", params).then((ret) => {
    return ret.data.spell_vocabulary_records;
  });
}
async function handleDataProcess() {
  // 等待 getSpellVocabulary 执行完成
  const res = await getSpellVocabulary();
  if (res.length == 0) {
    synonymsSelected.value = [];
    let dataString;
    if (Array.isArray(itemEdit.value.answers)) {
      dataString = JSON.stringify(itemEdit.value.answers);
    } else if (typeof itemEdit.value.answers === "string") {
      dataString = itemEdit.value.answers;
    }
    // dataString = dataString.replace(/(\W)'|'(\W)/g, '$1"$2');
    // selectSpellVocabulary.value = JSON.parse(
    //   dataString.replace(/([{,]\s*)'([^']+?)'(\s*[:])/g, '$1"$2"$3')
    // );
    // let dataStringJson = JSON.stringify(dataString)
    selectSpellVocabulary.value = eval("(" + dataString + ")");
    console.log("selectSpellVocabulary: ", selectSpellVocabulary.value);

    showSelectSpellVocabulary.value = true;
    showReviseData.value = false;
  }

  // 等待 reviseUserData 执行完成
  const ret = await reviseUserData();
  if (valueSearchStudent.value == "" && valueSearchXlsm.value == "") {
    reloadPage();
  } else {
    showSuccessToast("处于筛选状态");
    filterData();
  }
  showReviseData.value = false;
}

const reviseButton = () => {
  showConfirmDialog({
    title: "修改数据",
    message: "是否确认修改?",
    theme: "round-button",
  }).then(() => {
    // 修改拼写内容
    if (valueIsSpell.value > 0) {
      handleDataProcess();
    }
    reviseUserData().then((ret) => {
      if (valueSearchStudent.value == "" && valueSearchXlsm.value == "") {
        reloadPage();
      } else {
        showSuccessToast("处于筛选状态");
        filterData();
      }
      showReviseData.value = false;
    });
  });
};
const checkboxRefs2 = ref({});
const synonymsSelected = ref([]);
const toggleCheckChinese = (index) => {
  // console.log('index: ', index);
  const key = `${index}`;
  const checkboxRef = checkboxRefs2.value[key];
  if (checkboxRef) {
    checkboxRef.toggle();
  }
  console.log(synonymsSelected.value);
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
  // console.log("synonymsSelected", synonymsSelected.value);
  // console.log("selectSpellVocabulary", selectSpellVocabulary.value);
  // if (synonymsSelected.value.length == 0) {
  //   showSelectSpellVocabulary.value = false;
  //   return;
  // }
  const selectedVocabulary = synonymsSelected.value.map((selected) => {
    // 找到序号对应的对象
    const item = selectSpellVocabulary.value.find(
      (vocab) => parseInt(vocab.序号, 10) === parseInt(selected)
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
  // console.log('synonymsSelected: ', synonymsSelected.value);
  // console.log('selectSpellVocabulary: ', selectSpellVocabulary.value);
  const selectedVocabulary = synonymsSelected.value.map((selected) => {
    console.log("selected: ", selected);
    // 找到序号对应的对象
    const item = selectSpellVocabulary.value.find(
      (vocab) => parseInt(vocab.序号) === parseInt(selected)
    );
    console.log("item: ", item);
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
  return filterXlsmData.value.map((item) => item.rate > 3);
});

// 挑战模式
const showChallenge = ref(false);
const synonymsSelected2 = ref([]);
const selectChallengeVocabulary = ref([]);
const checkboxRefs3 = ref({});
const challengeItem = ref("");
const toggleCheckChallenge = (index) => {
  const key = `${index}`;
  const checkboxRef = checkboxRefs3.value[key];
  if (checkboxRef) {
    checkboxRef.toggle();
  }
  console.log(synonymsSelected.value);
};


onMounted(async () => {
  let res = new Promise((resolve, reject) => {
    getListData();
    resolve("ok");
  });
  res.then(() => {});
});

// 刷新页面
const reloadPage = () => {
  let res = new Promise((resolve, reject) => {
    getListData();
    resolve("ok");
  });
  res.then(() => {
    showSuccessToast("刷新成功");
  });
};
</script>

<template>
  <div>
    <div class="nav-bar-container">
      <van-nav-bar
        title="学生答题统计"
        :right-text="
          isMultiSelectMode ? (isAllSelected ? '取消全选' : '全选') : '多选'
        "
        :left-text="isMultiSelectMode ? '改分组' : '筛选'"
        @click-right="isMultiSelectMode ? selectAll() : toggleMultiSelectMode()"
        @click-left="isMultiSelectMode ? popReviseGroup() : showFilter()"
      />
    </div>

    <router-view />
    <van-tabbar route>
      <!-- <van-tabbar-item icon="home-o" replace to="/teacher"
        >首页</van-tabbar-item
      > -->
      <van-tabbar-item icon="friends-o" replace to="/xlsmList"
        >用户xlsm</van-tabbar-item
      >
      <van-tabbar-item icon="todo-list-o" replace to="/teacherComment"
        >试题</van-tabbar-item
      >
      <van-tabbar-item icon="list-switch" replace to="/logList"
        >日志</van-tabbar-item
      >
      <van-tabbar-item icon="records-o" replace to="/viewersHomepage"
        >监督</van-tabbar-item
      >
      <van-tabbar-item icon="vip-card-o" replace to="/textbookList"
        >单词本</van-tabbar-item
      >
      <van-tabbar-item icon="shopping-cart-o" replace to="/purchaseLog"
        >消费</van-tabbar-item
      >
    </van-tabbar>

    <!-- 答案日志 -->
    <van-popup
      v-model:show="showAnswerLog"
      position="bottom"
      :style="{ height: '80%' }"
      closeable
      :lock-scroll="false"
    >
      <van-cell-group inset>
        <div style="margin-left: 0.5rem; font-weight: 700; margin-right: 2rem">
          <p style="font-size: 20px; color: black; margin-top: 1rem">
            答案日志
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
          <div>{{ answerTitle }} | {{ answerUsername }}</div>
          <div style="margin-top: 0rem">
            单词 :{{ answerLens }} | 尝试 :{{ answerAttempt }}
          </div>
        </div>
        <div v-for="(item, index) in answerLogResult" :key="index">
          <van-cell :value="item.duration" :label="item.create_time">
            <template #title>
              <div
                :style="{
                  fontSize: 'larger',
                  fontWeight: 700,
                  color: getTypeColor(item.type),
                }"
              >
                {{ item.type }} &nbsp;&nbsp;&nbsp; {{ item.account_log__nid }}
              </div>
            </template>
            <template #value>
              <div style="margin-top: 0.2rem; font-size: smaller">
                <div>{{ item.duration }}</div>
                <div style="margin-top: 0.3rem">{{ item.true_rate }}</div>
              </div>
            </template>
          </van-cell>
        </div>
      </van-cell-group>
    </van-popup>

    <!-- log日志 -->
    <van-popup
      v-model:show="showAccountLog"
      position="top"
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
          <div>{{ answerTitle }} | {{ answerUsername }}</div>
          <div style="margin-top: 0rem">
            单词:{{ answerLens }} | 尝试 : {{ answerAttempt }}
          </div>
        </div>
        <div v-for="(item, index) in answerLogList" :key="index">
          <van-cell
            :label="formatDate_log(item.create_time)"
            is-link
            @click="toggleDetail(item, index)"
          >
            <template #title>
              <div style="font-size: larger; font-weight: 700">
                ID: {{ item.nid }}
              </div>
            </template>
            <template #value>
              <div style="margin-top: 0.2rem; font-size: smaller">
                <div v-if="item.swipe === '游戏'">
                  <div>
                    {{ item.swipe }} {{ item.numberprev
                    }}{{ item.numbershowanswer }}{{ item.numbertransparent }}
                  </div>
                </div>
                <div v-else>{{ item.swipe }}</div>

                <div style="margin-top: 0.3rem">
                  <div
                    v-if="item.complement == 1"
                    style="display: flex; justify-content: flex-end"
                  >
                    <van-tag type="primary" plain mark size="medium">
                      {{ item.true_length }} / {{ item.log.length }}
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
                  <div v-else style="display: flex; justify-content: flex-end">
                    {{ item.true_length }} / {{ item.log.length }}
                    <div
                      v-if="
                        item.diamondConsume != null && item.diamondConsume != ''
                      "
                    >
                      &nbsp;💎
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </van-cell>
        </div>
      </van-cell-group>
    </van-popup>

    <!-- 筛选数据 -->
    <van-popup
      v-model:show="showFliterBox"
      position="bottom"
      :style="{ height: '80%' }"
      closeable
      :lock-scroll="false"
    >
      <van-cell-group inset style="">
        <div style="font-size: 18px; font-weight: 700; margin: 1rem">
          筛选试题
        </div>
        <!-- 关键词筛选 -->
        <van-field
          v-model="valueSearchStudent"
          label="学生"
          placeholder="请输入学生姓名"
        />
        <!-- 分组 -->
        <van-field
          v-model="valueSearchGroup"
          label="分组"
          placeholder="请输入组名"
        />
        <!-- 年级 -->
        <van-field
          v-model="valueGrade"
          is-link
          readonly
          label="年级"
          placeholder="选择年级"
          @click="showGradePicker = true"
        />
        <van-popup v-model:show="showGradePicker" round position="bottom">
          <van-picker
            :columns="columnsGrade"
            @cancel="showGradePicker = false"
            @confirm="onConfirmGrade"
          />
        </van-popup>

        <!-- 地点 -->
        <van-field
          v-model="valueLocation"
          is-link
          readonly
          label="地点"
          placeholder="选择地点"
          @click="showLocationPicker = true"
        />
        <van-popup v-model:show="showLocationPicker" round position="bottom">
          <van-picker
            :columns="columnsLocation"
            @cancel="showLocationPicker = false"
            @confirm="onConfirmLocation"
          />
        </van-popup>
        <!-- 试题 -->
        <van-field
          v-model="valueSearchXlsm"
          label="试题"
          placeholder="请输入试题"
        />
        <!-- 日期 -->
        <van-field
          v-model="dateCalendar"
          label="日期"
          placeholder="选择日期区间"
          @click="showCalendar = true"
          readonly
        />
        <van-calendar
          v-model:show="showCalendar"
          type="range"
          @confirm="onConfirmCalendar"
          allow-same-day
          :min-date="new Date(2024, 4, 1)"
          :max-date="new Date(2030, 11, 31)"
        />
        <van-button
          @click="filteredStudent()"
          type="success"
          block
          style="margin-top: 1rem"
          >筛选试题</van-button
        >
        <van-button
          @click="clearFilterData()"
          type="primary"
          block
          style="margin-top: 0.2rem"
          >清除筛选</van-button
        >

        <van-button
          @click="updateReview()"
          type="danger"
          block
          style="margin-top: 0.2rem"
          >更新复习</van-button
        >

        <!-- <van-button
          @click="updateDaily()"
          type="warning"
          block
          style="margin-top: 0.2rem"
          >更新周长</van-button
        > -->
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
                  <van-icon
                    name="replay"
                    v-show="!loadingUncertain"
                    @click="getUncertainVocabulary()"
                  />
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
            v-if="diamondConsume != null && diamondConsume != ''"
            style="font-size: 13px; color: gray; margin: 5px 15px"
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

    <!-- 数据列表 -->
    <van-cell-group v-model="selectedItems" style="margin-bottom: 80px">
      <van-swipe-cell
        v-for="(item, index) in filterXlsmData"
        :key="index"
        stop-propagation
      >
        <van-cell
          :label="item.title"
          style="padding-top: 0.5rem; padding-bottom: 0.5rem"
          @click="isMultiSelectMode ? selectItem(index) : editData(index)"
        >
          <template #title>
            <div style="display: flex; flex-direction: column">
              <div v-if="item.is_review_required == 1">
                <van-tag color="white" text-color="lightgray" plain
                  >{{ item.username }} ｜ 游戏{{ item.swipe }}次<van-icon
                    color="blue"
                    style="font-weight: 700"
                    v-if="item.is_pinned && item.rate < 3"
                    name="link-o"
                  />
                </van-tag>
              </div>
              <div v-else>
                <van-tag color="#ffe1e1" text-color="#ad0000" plain
                  >{{ item.username }} ｜ 游戏{{ item.swipe }}次<van-icon
                    color="blue"
                    style="font-weight: 700"
                    v-if="item.is_pinned && item.rate < 3"
                    name="link-o"
                  />
                </van-tag>
              </div>
              <van-tag
                v-if="item.lock_spell == true"
                type="primary"
                style="
                  margin: 0.2rem 0 0.1rem 0;
                  width: 95%;
                  border: none;
                  background-color: transparent;
                  color: #000080;
                "
                >拼写: {{ item.is_spell_number }} / 已锁
                {{ item.spell_words_length }}</van-tag
              >
              <van-tag
                v-else-if="item.lock_spell == '未选词'"
                type="primary"
                style="
                  margin: 0.2rem 0 0.1rem 0;
                  width: 95%;
                  border: none;
                  background-color: transparent;
                  color: peru;
                "
                >拼写: {{ item.is_spell_number }} / 未选词</van-tag
              >
              <van-tag
                v-else
                type="primary"
                style="
                  margin: 0.2rem 0 0.1rem 0;
                  width: 95%;
                  border: none;
                  background-color: transparent;
                  color: lightcoral;
                "
                >拼写: {{ item.is_spell_number }} / 未锁
                {{ item.spell_words_length }}</van-tag
              >
            </div>
          </template>
          <template #label>
            <div style="margin-top: 0.2rem">{{ item.title }}</div>
            <div style="margin-top: 0.2rem">
              {{ item.alias }} {{ item.answers_len }}词
            </div>
            <div style="margin-top: 0.3rem">{{ item.create_time }}</div>
          </template>
          <template #value>
            <div
              v-if="cellValue"
              style="display: flex; justify-content: space-between"
            >
              <div v-if="item.type == 0 || item.type == 1 || item.type == null">
                <div style="display: flex">
                  <van-rate
                    v-model="item.rate"
                    :size="18"
                    icon="like"
                    void-icon="like-o"
                    :count="3"
                    readonly
                    allow-half
                  />
                  <div
                    style="
                      margin-top: 4%;
                      font-size: 12px;
                      margin-left: 0rem;
                      width: 32px;
                    "
                  >
                    <span v-if="showRatePlus[index]">
                      +{{ formattedRate(item.rate) }}
                    </span>
                    <span v-else style="visibility: hidden"> +0 </span>
                  </div>
                </div>
              </div>
              <div v-if="item.type == 2 || item.type == 3">
                <van-rate
                  v-model="item.rate"
                  :size="60"
                  color="#ffd21e"
                  void-icon="chart-trending-o"
                  icon="chart-trending-o"
                  void-color="#eee"
                  :count="1"
                  readonly
                  allow-half
                />
                {{ (item.rate * 100).toFixed(1) }}%
              </div>

              <div
                style="
                  font-size: 15px;
                  color: black;
                  font-weight: 700;
                  margin-right: 20px;
                "
              >
                {{ item.attempt }}次
              </div>

              <div v-if="item.view == null">
                <div style="margin-left: -2rem">0次</div>
              </div>
              <div v-else>
                <div style="margin-left: -2rem">{{ item.view }}次</div>
              </div>
            </div>
            <div v-else style="margin-right: 2rem; display: flex">
              <div style="font-weight: 700; color: red">{{ item.rate }}</div>
              &nbsp;&nbsp;/&nbsp;&nbsp;{{ item.attempt }}
            </div>
          </template>

          <template #right-icon>
            <van-checkbox
              v-if="isMultiSelectMode"
              :checked="selectedItems.includes(index)"
              @click.stop="selectItem(index)"
            />
          </template>
        </van-cell>
        <template #right>
          <van-button
            square
            type="danger"
            text="删除"
            @click="deleteItem(item, index)"
          />
        </template>
        <template #left>
          <div
            style="display: flex; gap: 0px; height: 100%; padding-right: 0px"
          >
            <van-button
              square
              type="primary"
              text="答案"
              @click="searchAnswer(item, index)"
              style="margin-right: rem"
              block
            />
            <van-button
              square
              type="success"
              text="日志"
              @click="searchLog(item, index)"
              style="margin-left: 0rem"
              block
            />
            <van-button
              square
              type="warning"
              text="预览"
              @click="viewStudentsList(item, index)"
              style="margin-left: 0rem"
              block
            />
          </div>
        </template>
      </van-swipe-cell>
    </van-cell-group>

    <!-- 改分组 -->
    <van-dialog
      v-model:show="showReviseGroup"
      title="修改分组"
      @confirm="reviseGroup"
      show-cancel-button
    >
      <van-cell-group inset>
        <van-field
          v-model="valueNewGroup"
          label="组名"
          placeholder="请输入新组名"
        />
        <van-field
          v-model="valueNewIspinned"
          label="置顶"
          placeholder="请输入0或1"
        />
        <van-field
          v-model="valueReview"
          label="复习"
          placeholder="请输入0或1"
        />
      </van-cell-group>
      <!-- 删除按钮 -->
      <div style="padding: 16px">
        <van-button
          type="danger"
          block
          @click="confirmDeleteInDialog"
          :disabled="selectedItems.length === 0"
        >
          删除选中的 {{ selectedItems.length }} 个项目
        </van-button>
      </div>
    </van-dialog>

    <!-- 修改数据 -->
    <van-popup
      v-model:show="showReviseData"
      position="bottom"
      :style="{ height: '100%' }"
      closeable
    >
      <van-cell-group inset style="">
        <div
          style="
            font-size: 18px;
            font-weight: 700;
            margin: 1rem 1rem 0.2rem 1rem;
          "
        >
          {{ itemEdit.username }}
        </div>
        <van-field v-model="valueAlias" label="分组" placeholder="请输入组名" />
        <van-field
          v-model="valueTitle"
          label="标题"
          placeholder="请输入试题名称"
        />
        <van-field
          v-model="valueStar"
          label="星星"
          placeholder="请输入星星数"
        />
        <van-field
          v-model="valueAttempt"
          label="尝试"
          placeholder="请输入尝试次数"
        />
        <van-field
          v-model="valueView"
          label="查看"
          placeholder="请输入查看答案次数"
        />
        <van-field
          v-model="valueSwipe"
          label="游戏"
          placeholder="请输入游戏次数"
        />
        <van-field
          v-model="valueMerge"
          label="拼接选项"
          placeholder="请输入拼接选项"
        />
        <div style="color: gray; font-size: 12px; margin: 0.5rem 0 0 1rem">
          拼接选项：1｜ 不拼接模式：0
        </div>
        <van-field
          v-model="valueType"
          label="类型"
          placeholder="请输入题目类型"
        />
        <div style="color: gray; font-size: 12px; margin: 0.5rem 0 0 1rem">
          普通双模式：0｜ 限制模式：1｜ 考试模式：2｜ 考试完成模式：3
        </div>
        <van-field
          v-model="valueCoins"
          label="金币"
          placeholder="请输入已获得金币"
        />
        <div style="color: gray; font-size: 12px; margin: 0.5rem 0 0 1rem">
          {{ itemEdit.view_time }}
        </div>
        <van-field
          v-model="valueReversed"
          label="中译英"
          placeholder="请输入中译英数量"
        />
        <van-field
          v-model="valueNoneOfAbove"
          label="7个选项"
          placeholder="请输入选项数"
        />
        <div style="color: gray; font-size: 12px; margin: 0.5rem 0 0 1rem">
          正常选项数：0｜以上都不对：1
        </div>
        <van-field
          v-model="valueIsPinned"
          label="置顶"
          placeholder="请输入0或1"
        />
        <van-field
          v-model="valueIsReviewRequired"
          label="复习"
          placeholder="-1(不复习)0(等待复习)1(开始复习)其他"
        />
        <div style="color: gray; font-size: 12px; margin: 0.5rem 0 0 1rem">
          复习时间: {{ valueReviewTime }}
        </div>
        <van-field
          v-model="valueChallenge"
          label="挑战"
          placeholder="0(停止挑战)1(开启挑战)2(挑战成功)"
        />
        <div style="color: gray; font-size: 12px; margin: 0.5rem 0 0 1rem">
          0（停止挑战）｜1（开启挑战）｜2（挑战成功）
        </div>
        <van-field
          v-model="valueIsSpell"
          label="拼写"
          placeholder="请输入拼写最大数"
        >
          <template #right-icon>
            <van-button
              type="success"
              size="small"
              @click="showSpellVocabulary"
              style="margin-left: 8px"
            >
              显示
            </van-button>
            <van-button
              type="warning"
              size="small"
              @click="deleteSpellVocabulary"
              style="margin-left: 8px"
            >
              删除
            </van-button>
          </template>
        </van-field>
        <div style="color: gray; font-size: 12px; margin: 0.5rem 0 0 1rem">
          关闭拼写：0｜最多拼写数：1 - N
        </div>
        <van-button
          @click="reviseButton()"
          type="danger"
          block
          style="margin-top: 1rem"
          >修改试题</van-button
        >
        <van-button
          @click="searchAnswer(itemEdit, index)"
          type="primary"
          block
          style="margin-top: 0.1rem"
          >答案</van-button
        >
        <van-button
          @click="searchLog(itemEdit, index)"
          type="success"
          block
          style="margin-top: 0.1rem"
          >日志</van-button
        >
      </van-cell-group>
      <van-grid style="margin: 0.5rem 1rem 0.5rem 1rem">
        <van-grid-item
          v-for="(item, index) in valueContents"
          :key="index"
          :text="item.英文"
        />
      </van-grid>
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

    <!-- 挑战模式 -->
    <van-popup
      v-model:show="showChallenge"
      position="bottom"
      :style="{ height: '95%' }"
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
          挑战
          {{ challengeItem.username }} | {{ challengeItem.title }} |
          {{ selectChallengeVocabulary.length }}词
        </div>
      </van-cell-group>

      <van-checkbox-group
        class="checkbox-container"
        v-model="synonymsSelected2"
        ref="checkboxRefs2"
      >
        <van-cell-group>
          <div
            class="custom-cell-group"
            v-for="(item, index) in selectChallengeVocabulary"
            :key="index"
          >
            <van-cell
              clickable
              @click="toggleCheckChallenge(index)"
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
                  :ref="(el) => (checkboxRefs3[`${index}`] = el)"
                  @click.stop.prevent="toggleCheckChallenge(index)"
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
        @click="confirmChallengeVocabulary"
        >确认选择</van-button
      >
      <van-button
        type="primary"
        block
        style="margin-top: 0.2rem; margin-bottom: 2rem"
        @click="showChallenge = false"
        >关闭</van-button
      >
    </van-popup>

    <!-- 显示已有拼写 -->
    <van-popup
      v-model:show="showSpellExist"
      position="bottom"
      :style="{ height: '60%' }"
      closeable
      :lock-scroll="false"
    >
      <van-cell-group inset>
        <div
          style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin: 1rem 0rem 0 0.5rem;
          "
        >
          <div style="font-size: 20px; color: black; font-weight: 700">
            拼写库1
          </div>
          <div style="margin: 0.4rem 4rem 0 0; color: gray; font-size: smaller">
            锁定拼写: {{ lock_spell_status }}
          </div>
        </div>
        <div v-for="(item, index) in spellExistVocabulary" :key="index">
          <van-cell :title="item.英文" :value="item.正确答案"> </van-cell>
        </div>
      </van-cell-group>
    </van-popup>

    <!-- 学生预览 -->
    <van-popup
      closeable
      v-model:show="showViewStudents"
      position="bottom"
      :style="{ height: '90%' }"
      :overlay-style="{ backgroundColor: 'rgba(0, 0, 0, 1)' }"
    >
      <div style="display: flex; align-items: center">
        <div style="font-size: 18px; font-weight: 700; margin: 1rem">
          学生预览
        </div>
        <div style="font-size: 12px; color: red; margin-top: 0.4rem">
          {{ viewUsername }}
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
            <div v-for="(item, index) in viewOriginalData" :key="index">
              <div v-if="item.type !== 2 && item.type != 3">
                <van-cell
                  is-link
                  center
                  clickable
                  @click="editPinned(item, index)"
                  :class="{ 'pin-background': item.is_pinned && item.rate < 3 }"
                  class="custom-cell"
                >
                  <template #icon>
                    <div v-if="item.alias.includes('庆典')">
                      <img
                        v-if="item.rate < 3"
                        src="../assets/Boonie Bears/item_list.png"
                        style="width: 27px; height: auto; margin-right: 0.5rem"
                        alt="Item List Complete"
                      />
                      <img
                        v-else
                        src="../assets/item_list_complete.png"
                        style="width: 27px; height: auto; margin-right: 0.5rem"
                        class="image-middle"
                        alt="Item List Complete"
                      />
                    </div>
                    <div v-else>
                      <div v-if="item.is_review_required == 1">
                        <img
                          src="../assets/item_list_complete_reviewed.png"
                          style="
                            width: 27px;
                            height: auto;
                            margin-right: 0.5rem;
                          "
                          class="image-middle"
                          alt="Item List"
                        />
                      </div>
                      <div v-else>
                        <img
                          v-if="item.rate < 3"
                          src="../assets/item_list.png"
                          style="
                            width: 27px;
                            height: auto;
                            margin-right: 0.5rem;
                          "
                          class="image-middle"
                          alt="Item List"
                        />
                        <img
                          v-else
                          src="../assets/item_list_complete.png"
                          style="
                            width: 27px;
                            height: auto;
                            margin-right: 0.5rem;
                          "
                          class="image-middle"
                          alt="Item List Complete"
                        />
                      </div>
                    </div>
                  </template>

                  <template #title>
                    <div
                      v-if="item.swipe == 0"
                      style="
                        display: flex;
                        align-items: flex-start;
                        width: 160%;
                      "
                    >
                      <img
                        v-show="item.alias.includes('庆典')"
                        src="../assets/Boonie Bears/edge.png"
                        style="
                          width: 25px;
                          height: auto;
                          margin-top: -0.2rem;
                          margin-left: -2.2rem;
                          margin-right: 0.7rem;
                        "
                      />

                      <div style="margin-bottom: 7px; font-weight: 700">
                        <div>{{ processedTitle(item.title) }}</div>
                      </div>
                      <van-badge
                        content="Game"
                        color="lightgray"
                        style="margin-left: -20px"
                      />
                    </div>

                    <div
                      v-else
                      style="
                        display: flex;
                        align-items: flex-start;
                        width: 160%;
                      "
                    >
                      <img
                        v-show="item.alias.includes('庆典')"
                        src="../assets/Boonie Bears/edge.png"
                        style="
                          width: 25px;
                          height: auto;
                          margin-top: -0.2rem;
                          margin-left: -2.2rem;
                          margin-right: 0.7rem;
                        "
                      />
                      <div
                        v-if="item.is_review_required == 1"
                        style="
                          margin-bottom: 7px;
                          font-weight: 700;
                          color: lightgray;
                        "
                      >
                        {{ processedTitle(item.title) }}
                      </div>
                      <div v-else style="margin-bottom: 7px; font-weight: 700">
                        {{ processedTitle(item.title) }}
                      </div>
                      <van-badge
                        v-if="item.is_review_required == 1"
                        color="#D8A7B1"
                        content="Game"
                        style="margin-left: -20px"
                      />
                      <van-badge
                        v-else
                        content="Game"
                        style="margin-left: -20px"
                      />
                    </div>
                  </template>

                  <template #value>
                    <div
                      v-if="item.is_review_required == 1"
                      style="font-size: 12px; color: lightgray"
                    >
                      <div style="display: flex; justify-content: flex-end">
                        尝试了
                        <div style="font-weight: 700; color: bisque">
                          {{ item.attempt }}
                        </div>
                        次
                      </div>

                      <div style="margin-top: 0.5rem">
                        {{ item.answers.length }}词
                      </div>
                    </div>

                    <div v-else style="font-size: 12px">
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

                    <div v-if="item.view == 0">
                      <van-button
                        style="color: gray; border: none"
                        size="mini"
                        @click.stop="viewAnswer(item, index)"
                        class="button-container2"
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
                        style="color: red; font-weight: 700; border: none"
                        size="small"
                        @click.stop="viewAnswer(item, index)"
                        class="button-container2"
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
                        v-if="item.is_review_required == 1"
                        v-model="item.rate"
                        :size="20"
                        color="#DBC8AF"
                        void-icon="like"
                        icon="like"
                        void-color="#eee"
                        :count="3"
                        readonly
                        allow-half
                      />
                      <van-rate
                        v-else
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
                        style="
                          margin-top: 3%;
                          margin-left: 0.2rem;
                          color: lightgray;
                        "
                        v-if="
                          showRatePlus[index] && item.is_review_required == 1
                        "
                      >
                        + {{ formattedRate(item.rate) }}
                      </div>
                      <div
                        style="margin-top: 3%; margin-left: 0.2rem"
                        v-if="
                          showRatePlus[index] && !item.is_review_required == 1
                        "
                      >
                        + {{ formattedRate(item.rate) }}
                      </div>
                    </div>

                    <div
                      v-if="item.is_review_required == 1"
                      style="
                        margin-left: 4px;
                        margin-top: 7px;
                        width: 120%;
                        font-size: 12px;
                        color: lightgray;
                      "
                    >
                      {{ item.create_time }}
                    </div>
                    <div
                      v-else
                      style="
                        margin-left: 4px;
                        margin-top: 7px;
                        width: 120%;
                        font-size: 12px;
                      "
                    >
                      {{ item.create_time }}
                    </div>
                    <div style="margin-top: 1rem">
                      <div v-if="item.is_review_required == 1">
                        <van-progress
                          color="lightblue"
                          :percentage="item.progressPercentage"
                          stroke-width="2"
                          :show-pivot="true"
                          :inactive="item.progressPercentage === 100"
                        />
                      </div>
                      <div v-else>
                        <van-progress
                          v-if="item.alias.includes('庆典')"
                          color="#F4C244"
                          :percentage="item.progressPercentage"
                          stroke-width="2"
                          :show-pivot="true"
                          :inactive="item.progressPercentage === 100"
                        />
                        <van-progress
                          v-else
                          :percentage="item.progressPercentage"
                          stroke-width="2"
                          :show-pivot="true"
                          :inactive="item.progressPercentage === 100"
                        />
                      </div>
                    </div>
                  </template>

                  <template #right-icon>
                    <van-checkbox
                      v-if="isMultiSelectMode & (item.rate >= 3)"
                      :checked="selectedItems.includes(index)"
                      @click.stop="selectItem(index)"
                    />
                    <div v-else>
                      <div
                        v-if="item.is_pinned"
                        style="display: flex; flex-direction: column"
                      >
                        <van-icon name="link-o" style="margin-bottom: 1.7rem" />
                        <van-icon name="arrow" style="margin-bottom: 1.95rem" />
                      </div>
                      <div v-else>
                        <van-icon name="arrow" style="margin-bottom: 1rem" />
                      </div>
                    </div>
                  </template>
                </van-cell>
              </div>
              <div v-if="item.type == 2 || item.type == 3">
                <van-cell
                  is-link
                  center
                  clickable
                  @click=""
                  class="custom-cell"
                >
                  <template #icon>
                    <img
                      v-if="item.rate < 3 && (item.type == 0 || item.type == 1)"
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
                    <div
                      v-if="item.swipe == 0"
                      style="
                        display: flex;
                        align-items: flex-start;
                        width: 160%;
                      "
                    >
                      <div style="margin-bottom: 7px; font-weight: 700">
                        {{ processedTitle(item.title) }}
                      </div>
                    </div>

                    <div
                      v-else
                      style="
                        display: flex;
                        align-items: flex-start;
                        width: 160%;
                      "
                    >
                      <div style="margin-bottom: 0px; font-weight: 700">
                        {{ processedTitle(item.title) }}
                      </div>
                    </div>
                  </template>

                  <template #value>
                    <div style="font-size: 12px">
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
                        width: 140%;
                        font-size: 12px;
                      "
                    >
                      <div>{{ item.create_time }}</div>
                    </div>
                  </template>
                </van-cell>
              </div>
            </div>
          </van-list>
        </van-tab>

        <div v-for="(item, index) in tabsName" :key="index">
          <van-tab :title="item">
            <van-list
              v-model="loadingOriginalData"
              :finished="finishedOriginalData"
              finished-text="没有更多了"
              @load="onLoadOriginalData(item)"
            >
              <div v-if="item && item.includes('庆典')">
                <van-cell
                  center
                  is-link
                  clickable
                  value="限时任务"
                  class="custom-cell"
                >
                  <template #icon>
                    <img
                      src="../assets/Boonie Bears/ad.png"
                      style="
                        width: 100px;
                        height: auto;
                        margin-right: 0.5rem;
                        margin-bottom: 0.5rem;
                      "
                      alt="Item List"
                    />
                  </template>
                  <template #title>
                    <div
                      style="
                        margin-bottom: 2.9rem;
                        font-weight: 700;
                        color: #f4c241;
                        width: 135%;
                      "
                    >
                      限定技能-不灭意志
                    </div>
                  </template>
                  <template #label>
                    <div style="width: 135%; font-size: smaller">
                      期末考试前完成本组试题
                    </div>
                    <div
                      style="width: 80%; margin-top: 0.2rem; font-size: smaller"
                    >
                      免费获得
                    </div>
                  </template>
                </van-cell>
              </div>

              <div v-for="(item, index) in viewOriginalData" :key="index">
                <div v-if="item.type !== 2 && item.type != 3">
                  <van-cell
                    is-link
                    center
                    clickable
                    @click="
                      isMultiSelectMode ? selectItem(index) : gotoItem(index)
                    "
                    class="custom-cell"
                  >
                    <template #icon>
                      <div v-if="item.alias.includes('庆典')">
                        <img
                          v-if="item.rate < 3"
                          src="../assets/Boonie Bears/item_list.png"
                          style="
                            width: 27px;
                            height: auto;
                            margin-right: 0.5rem;
                          "
                          alt="Item List Complete"
                        />
                        <img
                          v-else
                          src="../assets/item_list_complete.png"
                          style="
                            width: 27px;
                            height: auto;
                            margin-right: 0.5rem;
                          "
                          class="image-middle"
                          alt="Item List Complete"
                        />
                      </div>
                      <div v-else>
                        <div v-if="item.is_review_required == 1">
                          <img
                            src="../assets/item_list_complete_reviewed.png"
                            style="
                              width: 27px;
                              height: auto;
                              margin-right: 0.5rem;
                            "
                            class="image-middle"
                            alt="Item List"
                          />
                        </div>
                        <div v-else>
                          <img
                            v-if="
                              item.rate < 3 &&
                              (item.type == 0 || item.type == 1)
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
                              item.rate >= 3 &&
                              (item.type == 0 || item.type == 1)
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
                        </div>
                      </div>
                    </template>

                    <template #title>
                      <div
                        v-if="item.swipe == 0"
                        style="
                          display: flex;
                          align-items: flex-start;
                          width: 160%;
                        "
                      >
                        <img
                          v-show="item.alias.includes('庆典')"
                          src="../assets/Boonie Bears/edge.png"
                          style="
                            width: 25px;
                            height: auto;
                            margin-top: -0.2rem;
                            margin-left: -2.2rem;
                            margin-right: 0.7rem;
                          "
                        />
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
                        style="
                          display: flex;
                          align-items: flex-start;
                          width: 160%;
                        "
                      >
                        <img
                          v-show="item.alias.includes('庆典')"
                          src="../assets/Boonie Bears/edge.png"
                          style="
                            width: 25px;
                            height: auto;
                            margin-top: -0.2rem;
                            margin-left: -2.2rem;
                            margin-right: 0.7rem;
                          "
                        />
                        <div
                          v-if="item.is_review_required == 1"
                          style="
                            margin-bottom: 7px;
                            font-weight: 700;
                            color: lightgray;
                          "
                        >
                          {{ processedTitle(item.title) }}
                        </div>
                        <div
                          v-else
                          style="margin-bottom: 7px; font-weight: 700"
                        >
                          {{ processedTitle(item.title) }}
                        </div>
                        <van-badge
                          v-if="item.is_review_required == 1"
                          color="#D8A7B1"
                          content="Game"
                          style="margin-left: -20px"
                        />
                        <van-badge
                          v-else
                          content="Game"
                          style="margin-left: -20px"
                        />
                      </div>
                    </template>

                    <template #value>
                      <div
                        v-if="item.is_review_required == 1"
                        style="font-size: 12px; color: lightgray"
                      >
                        <div style="display: flex; justify-content: flex-end">
                          尝试了
                          <div style="font-weight: 700; color: bisque">
                            {{ item.attempt }}
                          </div>
                          次
                        </div>

                        <div style="margin-top: 0.5rem">
                          {{ item.answers.length }}词
                        </div>
                      </div>
                      <div v-else style="font-size: 12px">
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

                      <div v-if="item.view == 0">
                        <van-button
                          style="color: gray; border: none"
                          size="mini"
                          @click.stop="viewAnswer(item, index)"
                          class="button-container2"
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
                          style="color: red; font-weight: 700; border: none"
                          size="small"
                          @click.stop="viewAnswer(item, index)"
                          class="button-container2"
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
                          v-if="item.is_review_required == 1"
                          v-model="item.rate"
                          :size="20"
                          color="#DBC8AF"
                          void-icon="like"
                          icon="like"
                          void-color="#eee"
                          :count="3"
                          readonly
                          allow-half
                        />
                        <van-rate
                          v-else
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
                          style="
                            margin-top: 3%;
                            margin-left: 0.2rem;
                            color: lightgray;
                          "
                          v-if="
                            showRatePlus[index] && item.is_review_required == 1
                          "
                        >
                          + {{ formattedRate(item.rate) }}
                        </div>
                        <div
                          style="margin-top: 3%; margin-left: 0.2rem"
                          v-if="
                            showRatePlus[index] && !item.is_review_required == 1
                          "
                        >
                          + {{ formattedRate(item.rate) }}
                        </div>
                      </div>
                      <div
                        v-if="item.is_review_required == 1"
                        style="
                          margin-left: 4px;
                          margin-top: 7px;
                          width: 140%;
                          font-size: 12px;
                          color: lightgray;
                        "
                      >
                        <div>{{ item.create_time }}</div>
                      </div>
                      <div
                        v-else
                        style="
                          margin-left: 4px;
                          margin-top: 7px;
                          width: 140%;
                          font-size: 12px;
                        "
                      >
                        <div>{{ item.create_time }}</div>
                      </div>
                      <div style="margin-top: 1rem">
                        <div v-if="item.is_review_required == 1">
                          <van-progress
                            color="lightblue"
                            :percentage="item.progressPercentage"
                            stroke-width="2"
                            :show-pivot="true"
                            :inactive="item.progressPercentage === 100"
                          />
                        </div>
                        <div v-else>
                          <van-progress
                            v-if="item.alias.includes('庆典')"
                            color="#F4C244"
                            :percentage="item.progressPercentage"
                            stroke-width="2"
                            :show-pivot="true"
                            :inactive="item.progressPercentage === 100"
                          />
                          <van-progress
                            v-else
                            :percentage="item.progressPercentage"
                            stroke-width="2"
                            :show-pivot="true"
                            :inactive="item.progressPercentage === 100"
                          />
                        </div>
                      </div>
                    </template>

                    <template #right-icon>
                      <van-checkbox
                        v-if="isMultiSelectMode & (item.rate >= 3)"
                        :checked="selectedItems.includes(index)"
                        @click.stop="selectItem(index)"
                      />
                      <div v-else>
                        <van-icon name="arrow" style="margin-bottom: 1rem" />
                      </div>
                    </template>
                  </van-cell>
                </div>

                <div v-if="item.type == 2 || item.type == 3">
                  <van-cell
                    is-link
                    center
                    clickable
                    @click=""
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
                      <div
                        v-if="item.swipe == 0"
                        style="
                          display: flex;
                          align-items: flex-start;
                          width: 160%;
                        "
                      >
                        <div style="margin-bottom: 7px; font-weight: 700">
                          {{ processedTitle(item.title) }}
                        </div>
                      </div>

                      <div
                        v-else
                        style="
                          display: flex;
                          align-items: flex-start;
                          width: 160%;
                        "
                      >
                        <div style="margin-bottom: 0px; font-weight: 700">
                          {{ processedTitle(item.title) }}
                        </div>
                      </div>
                    </template>

                    <template #value>
                      <div style="font-size: 12px">
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
                          width: 140%;
                          font-size: 12px;
                        "
                      >
                        <div>{{ item.create_time }}</div>
                      </div>
                    </template>
                  </van-cell>
                </div>
              </div>
            </van-list>
          </van-tab>
        </div>
      </van-tabs>
    </van-popup>

    <!-- 学生预览编辑 -->
    <van-popup
      closeable
      v-model:show="showEditViewStudent"
      position="bottom"
      :style="{ height: '40%' }"
    >
      <div style="display: flex; align-items: center">
        <div style="font-size: 20px; font-weight: 700; margin: 1rem">
          编辑预览
        </div>
        <div style="font-size: 12px">{{ detailEditViewStudent.username }}</div>
      </div>

      <van-cell-group inset style="">
        <div style="font-size: 18px; font-weight: 700; margin: 1rem">
          {{ processedTitle(detailEditViewStudent.title) }}
        </div>
        <van-field
          v-model="isPinnedEditViewStudent"
          label="置顶"
          placeholder="输入0或1"
        />
        <van-field
          v-model="aliasEditViewStudent"
          label="分组"
          placeholder="输入分组名称"
        />
        <van-button
          @click="confirmEditViewStudent()"
          type="success"
          block
          style="margin-top: 1rem"
          >确定修改</van-button
        >
      </van-cell-group>
    </van-popup>

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
            <van-cell
              :title="`${index + 1}. ${item.英文}`"
              :value="item.中文"
              @click="speakWord(item.英文, item.正确答案)"
            >
              {{ item.中文 }}
              <img
                src="../assets/speaker.png"
                style="width: 12px; height: auto"
              />
            </van-cell>
          </div>
        </van-cell-group>
      </van-cell-group>
    </van-popup>
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

.grid-item-text {
  font-size: 16px; /* Default font size */
  line-height: 1.2; /* Adjust line height as needed */
  overflow: hidden; /* Hide overflow */
  white-space: nowrap; /* Prevent text wrapping */
  text-overflow: ellipsis; /* Show ellipsis for overflow text */
}

.grid-item-text {
  /* Media query to reduce font size for items that exceed one line */
  font-size: 12px; /* Adjust this size as needed */
}
</style>
