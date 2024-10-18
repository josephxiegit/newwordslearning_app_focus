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
  showToast,
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
    } = item;

    const formattedCreateTime = formatDateString(create_time);
    const formattedViewTime = formatDateString(view_time);

    let lock_spell_format;
    if (lock_spell === null) {
      lock_spell_format = "未选词";
    } else {
      lock_spell_format = lock_spell;
    }

    const spell_words_length =
      !spell_words || spell_words.trim() === ""
        ? 0
        : JSON.parse(spell_words.replace(/'/g, '"')).length;

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
        valueGrade.value == "" &&
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
          .replace(/won"t/g, "won't");

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
    } = item;
    // let dataAnswers = answers.replace(/(\W)'|'(\W)/g, '$1"$2'); // 替换单引号为双引号
    // dataAnswers = dataAnswers.replace(
    //   /([{,]\s*)'([^']+?)'(\s*[:])/g,
    //   '$1"$2"$3'
    // );
    // console.log('dataAnswers: ', dataAnswers);
    // const parsedAnswers = JSON.parse(dataAnswers);
    // console.log("answers", answers);
    let dataAnswers = JSON.stringify(answers);
    // console.log("dataAnswers: ", dataAnswers);
    const parsedAnswers = eval("(" + dataAnswers + ")");

    // let dataSynonyms = synonyms.replace(/(\W)'|'(\W)/g, '$1"$2'); // 替换单引号为双引号
    // dataSynonyms = dataSynonyms.replace(
    //   /([{,]\s*)'([^']+?)'(\s*[:])/g,
    //   '$1"$2"$3'
    // );
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

// 多选修改分组
const cellValue = ref(true);
const valueNewGroup = ref("");
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
const valueNid = ref("");
const valueIsSpell = ref(3);
const editData = (index) => {
  itemEdit.value = filterXlsmData.value[index];
  console.log("itemEdit: ", itemEdit.value);

  showReviseData.value = true;
  valueAlias.value = itemEdit.value.alias;
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
    console.log("res: ", res);
    // selectSpellWords = JSON.parse(res[0].data_words);
    let dataString = res[0].data_words.replace(/(\W)'|'(\W)/g, '$1"$2');
    selectSpellWords = JSON.parse(
      dataString.replace(/([{,]\s*)'([^']+?)'(\s*[:])/g, '$1"$2"$3')
      .replace(/'/g, '"')
      .replace(/s" /g, "s' ")
      .replace(/"s /g, "'s ")
      .replace(/"t /g, "'t ")
      .replace(/can"t/g, "can't")
      .replace(/mustn"t/g, "mustn't")
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
        synonymsSelected.value.push(item.序号.toString());
      }
    });

    console.log("synonymsSelected: ", synonymsSelected.value);
  }

  showSelectSpellVocabulary.value = true;
  showReviseData.value = false;

  // getSpellVocabulary().then((res) => {
  //   if (res.length > 0) {
  //     let dataString = res[0].data_words.replace(/(\W)'|'(\W)/g, '$1"$2');
  //     spellExistVocabulary.value = JSON.parse(
  //       dataString.replace(/([{,]\s*)'([^']+?)'(\s*[:])/g, '$1"$2"$3')
  //     );
  //     lock_spell_status.value = res[0].lock_spell;
  //     console.log("spellExistVocabulary:", spellExistVocabulary.value);
  //     showSpellExist.value = true;
  //   } else {
  //     showFailToast("无数据");
  //   }
  // });
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
  params.append("is_spell_number", valueIsSpell.value);
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
  // console.log(synonymsSelected.value.length);
  // if (synonymsSelected.value.length == 0) {
  //   showSelectSpellVocabulary.value = false;
  //   return;
  // }
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
  return filterXlsmData.value.map((item) => item.rate > 3);
});

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
        :right-text="isMultiSelectMode ? '取消' : '多选'"
        :left-text="isMultiSelectMode ? '改分组' : '筛选'"
        @click-right="toggleMultiSelectMode()"
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
                  {{ item.true_length }} / {{ item.log.length }}
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
      :style="{ height: '70%' }"
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
          </div>
        </div>
        <div v-for="(item, index) in detailList" :key="index">
          <van-cell :label="`答案：${item.正确答案 || item.答案}`">
            <template #title>
              <div style="font-size: larger; font-weight: 700">
                {{ item.英文 }}
                <van-tag v-if="item.is_spell" type="danger" mark>拼</van-tag>
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
              <van-tag color="#ffe1e1" text-color="#ad0000" plain
                >{{ item.username }} ｜ 游戏{{ item.swipe }}次</van-tag
              >
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
          <template #value v-if="cellValue">
            <div style="display: flex; justify-content: space-between">
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
      </van-cell-group>
    </van-dialog>

    <!-- 修改数据 -->
    <van-popup
      v-model:show="showReviseData"
      position="bottom"
      :style="{ height: '95%' }"
      closeable
    >
      <van-cell-group inset style="">
        <div style="font-size: 18px; font-weight: 700; margin: 1rem">
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
            拼写库
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
</style>
