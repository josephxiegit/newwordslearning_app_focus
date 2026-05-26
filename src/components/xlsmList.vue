<script setup>
import {
  watch,
  onMounted,
  ref,
  getCurrentInstance,
  onBeforeUpdate,
  computed,
  nextTick,
} from "vue";
import { useRouter } from "vue-router";
import {
  showSuccessToast,
  showFailToast,
  closeToast,
  showLoadingToast,
  showConfirmDialog,
  showDialog,
  Toast,
  showToast,
} from "vant";
const router = useRouter();
const instance = getCurrentInstance();
const axios = instance.appContext.config.globalProperties.$ajax;

// 定义props，控制是否显示router-view和tabbar
const props = defineProps({
  isEmbedded: {
    type: Boolean,
    default: false,
  },
});

const originalData = ref([]);
const filteredFiles = ref([]);
const studentData = ref([]);
const filterStudentData = ref([]);
const selectXlsm = ref("");
const selectXlsmDoc = ref("");

// 点击试题
function refreshUserList() {
  async function queryUserList() {
    let params = new URLSearchParams();
    params.append("method", "queryUserList");
    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }
  queryUserList()
    .then((ret) => {
      studentData.value = [...ret];
      filterStudentData.value = [...ret];
      console.log("filterStudentData", filterStudentData.value);
    })
    .then(() => {
      showStudent.value = true;
    });
}
const getUserList = (index) => {
  const itemPosition = selectedXlsmItems.value.indexOf(index);
  if (itemPosition > -1) {
    selectedXlsmItems.value.splice(itemPosition, 1);
  } else {
    selectedXlsmItems.value.push(index);
  }
  forceUpdateKey.value++;
  // console.log("selectedXlsmItems: ", selectedXlsmItems.value);
};

// 获得试题
async function queryData() {
  let params = new URLSearchParams();
  params.append("method", "queryXlsms");
  return await axios.post("words/", params).then((ret) => {
    return ret.data;
  });
}

function sortDataByfigures(filteredFiles) {
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

  const regex =
    /(.+?)(一|二|三|四|五|六|七|八|九|十|十一|十二|十三|十四|十五|十六|十七|十八|十九|二十|二十一|二十二|二十三|二十四|二十五|二十六|二十七|二十八|二十九|三十|三十一|三十二|三十三|三十四|三十五|三十六|三十七|三十八|三十九|四十|四十一|四十二|四十三|四十四|四十五|四十六|四十七|四十八|四十九|五十)([^一二三四五六七八九十]*)\.xlsm$/;

  const groups = {};
  const fileOrder = [];

  // Group files by base name + suffix while extracting Chinese numerals
  filteredFiles.forEach((fileObj) => {
    const { xlsm_name } = fileObj;
    const match = xlsm_name.match(regex);
    if (match) {
      const [_, base, chineseNum, suffix] = match;
      const key = base + suffix;
      const num = chineseNumMap[chineseNum];
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push({ ...fileObj, num }); // Keep full object with num for sorting
    }
    fileOrder.push(fileObj); // Maintain original order
  });

  // Sort groups based on Chinese numeral
  const sortedGroups = {};
  Object.keys(groups).forEach((key) => {
    sortedGroups[key] = groups[key]
      .sort((a, b) => a.num - b.num)
      .map((item) => item); // Preserve the full object
  });

  // Construct the sorted result by maintaining the original order and replacing with sorted entries
  const result = fileOrder.map((fileObj) => {
    const { xlsm_name } = fileObj;
    const match = xlsm_name.match(regex);
    if (match) {
      const [_, base, chineseNum, suffix] = match;
      const key = base + suffix;
      if (sortedGroups[key]) {
        return sortedGroups[key].shift(); // Replace with sorted object
      }
    }
    return fileObj; // If no match, return original object
  });

  return result;
}
function formatDate(isoString) {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}年${month}月${day}日`;
}
function getListData() {
  queryData().then((res) => {
    // console.log('res: ', res);

    filteredFiles.value = [...res];
    originalData.value = [...res]; // 使用扩展运算符进行深拷贝
    applySearchFilter();
    filteredFiles.value = sortDataByfigures(filteredFiles.value);

    // 增加flag_distribute
    const today = new Date();
    const currentDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    console.log("currentDay", currentDay);

    filteredFiles.value = filteredFiles.value.map((file) => {
      const fileDate = new Date(file.create_time);

      // 创建新的日期对象，只保留年月日，忽略时分秒
      const fileDateWithoutTime = new Date(
        fileDate.getFullYear(),
        fileDate.getMonth(),
        fileDate.getDate()
      );
      const currentDayWithoutTime = new Date(
        currentDay.getFullYear(),
        currentDay.getMonth(),
        currentDay.getDate()
      );

      if (file.is_distributed) {
        file.flag_distribute = 0;
      } else {
        if (fileDateWithoutTime > currentDayWithoutTime) {
          file.flag_distribute = 1; // 绿色
        } else {
          file.flag_distribute = 2; // 红色
        }
      }

      return file;
    });

    // console.log("filteredFiles", filteredFiles.value);
    return filteredFiles.value;
  });
}
function applySearchFilter() {
  if (valueSearchXlsm.value.trim().length != 0) {
    filteredFiles.value = filteredFiles.value.filter((item) =>
      item.xlsm_name.toLowerCase().includes(valueSearchXlsm.value.toLowerCase())
    );
  }
}

// 删除试题
const deleteXlsm = (item, index) => {
  console.log("item, index: ", item, index);
  async function DeleteXlsm() {
    let params = new URLSearchParams();
    params.append("method", "DeleteXlsm");
    params.append("item", item);
    return await axios
      .post("words/", params)
      .then((response) => {
        // 此处处理成功响应
        return response.data;
      })
      .catch((error) => {
        // 此处处理HTTP错误响应
        if (error.response) {
          // 请求已发出，服务器以状态码进行响应
          // 可以访问 error.response.status 和 error.response.data
          return error.response.data;
        } else if (error.request) {
          // 请求已发出，但没有收到响应
          return "No response from server";
        } else {
          // 在设置请求时发生了其他问题
          return error.message;
        }
      });
  }
  showConfirmDialog({
    title: "Delete",
    message: "是否确认删除?",
    theme: "round-button",
  }).then(() => {
    DeleteXlsm().then((ret) => {
      console.log("ret: ", ret);
      // 判断返回信息或状态码
      if (ret === "File not found") {
        showFailToast("未找到文件");
      } else if (ret === "ok") {
        showSuccessToast("文件删除成功");
      } else {
        showFailToast(ret); // 显示其他错误信息
      }
      refreshData();
    });
  });
};

// 弹出学生
const showStudent = ref(false);
const studentsSelected = ref([]);
function toggleStudent(index) {
  // console.log("index: ", index);
  const username = filterStudentData.value[index].username;
  const isSelected = studentsSelected.value.includes(username); // 检查当前学生是否已选中
  if (isSelected) {
    // 如果已选中，则移除
    studentsSelected.value = studentsSelected.value.filter(
      (user) => user !== username
    );
  } else {
    // 如果未选中，则添加
    studentsSelected.value.push(username);
  }
  // console.log("studentsSelected", studentsSelected.value);
}

// 筛选学生
const showFliterStudent = ref(false);
const valueSearchStudent = ref("");
const clearFilterStudent = () => {
  valueSearchStudent.value = "";
  valueGrade.value = "";
  valueLocation.value = "";
};
const filteredStudent = () => {
  if (!valueSearchStudent.value || !valueGrade.value || !valueLocation.value) {
    async function filterUsers() {
      // 查询学生
      let params = new URLSearchParams();
      params.append("method", "filterUsers");
      params.append("username", valueSearchStudent.value);
      params.append("grade", valueGrade.value);
      params.append("location", valueLocation.value);
      return await axios.post("words/", params).then((ret) => {
        return ret.data;
      });
    }
    filterUsers()
      .then((res) => {
        // console.log('res: ', res);
        filterStudentData.value = [...res];
        showFliterStudent.value = false;
      })
      .catch((err) => {});
  }

  // console.log(filterStudentData.value);
};
const unfilteredStudents = () => {
  clearFilterStudent();
  filteredStudent();
};

// 删除学生
// 删除项的函数
const deleteItem = (item, index) => {
  // console.log("删除项目：", item, "索引：", index);
  // originalData.value.splice(index, 1);

  async function DeleteUser() {
    let params = new URLSearchParams();
    params.append("method", "DeleteUser");
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
    // console.log(item["nid"]);
    let toast1 = showLoadingToast({
      message: "删除中...",
      forbidClick: true,
    });
    DeleteUser().then((ret) => {
      toast1.close();
      // refreshUserList();
      filteredStudent();
    });
  });
};
// 编辑提交日期
const showCalendar = ref(false);
const editXlsmNameCalendar = ref("");
const editDate = (xlsm_name, index) => {
  // console.log("xlsm_name", xlsm_name);
  // console.log("index", index);
  editXlsmNameCalendar.value = xlsm_name;
  showCalendar.value = true;
};
const isDistributed = (xlsm_name, index) => {
  const is_distributed = !filteredFiles.value[index].is_distributed;
  async function isDistributed() {
    let params = new URLSearchParams();
    params.append("method", "isDistributed");
    params.append("xlsm_name", xlsm_name);
    params.append("is_distributed", is_distributed);
    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }
  showConfirmDialog({
    title: "修改",
    message: is_distributed
      ? "是否确认修改为 已发放 吗"
      : "是否确认修改为 未发放 吗",
    theme: "round-button",
  }).then(() => {
    isDistributed().then((res) => {
      // console.log(res)
      refreshData();
    });
  });
};
const formatDate2 = (date) => {
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
};
const onConfirmCalendar = (value) => {
  showCalendar.value = false;
  const dateCalendar = formatDate2(value);
  async function editXlsmCalendar() {
    let params = new URLSearchParams();
    params.append("method", "editXlsmCalendar");
    params.append("date", dateCalendar);
    params.append("xlsm_name", editXlsmNameCalendar.value);
    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }
  editXlsmCalendar().then((res) => {
    // console.log(res)
    refreshData();
  });
};

// 学生显示已有viewers
const showStudentAccountData = ref(false);
const showReviseViewers = ref(false);
const studentAccountDataName = ref("");
const studentAccountData = ref([]);
const checkedRevisedViewers = ref([]);
const columnsReviseViewers = ref([]);
const checkboxRefsViewerRevised = ref([]);
const showViewers = (item, index) => {
  console.log("item: ", item);
  listening_number.value = item["listening_number"];
  writingwords_number.value = item["writingwords_number"];
  valueGrade.value = item["grade__grade_name"];
  valueLocation.value = item["location__location_name"];
  userAccount.value = item["username"];
  valueFlowers.value = item["flowers"];
  selectedLocationIndex.value = [valueLocation.value];
  selectedGradeIndex.value = [valueGrade.value];
  userBarkKey.value = item["bark_key"];
  userWxpusherUid.value = item["wxpusher_uid"];
  userNtfyTopic.value = item["ntfy_topic"];

  // 被动技能
  selectedPassiveMagicIndex.value = item["passive_magic"]
    ? ["true"]
    : ["false"];
  valuePassiveMagic.value = selectedPassiveMagicIndex.value[0];

  userPassword.value = item["password"];
  daily_times.value = item["daily_times"];

  // 在校状态
  valueStatus.value = item["status"].toString();
  selectedStatusIndex.value = [valueStatus.value.toString()];

  // console.log('index: ', index);
  const username = item["username"];
  console.log("username: ", username);

  async function getUserViewers() {
    let params = new URLSearchParams();
    params.append("method", "getUserViewers");
    params.append("username", username);
    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }
  async function queryViewers(username) {
    let params = new URLSearchParams();
    params.append("method", "queryViewers");
    params.append("viewer_name", "");

    // 直接返回请求结果
    const response = await axios.post("words/", params);
    return response.data;
  }

  // 调用 getUserViewers 并处理结果
  getUserViewers().then(async (res) => {
    // console.log("res: ", res);
    const viewerData = await queryViewers(username);
    // showViewerPicker.value = true;
    showReviseViewers.value = true;

    checkboxRefsViewerRevised.value = [];
    checkedRevisedViewers.value = [];
    columnsReviseViewers.value = [];
    columnsReviseViewers.value = viewerData.map((item) => item.viewer_name);

    checkedRevisedViewers.value = res["viewer_name_list"];
    checkedRevisedThemes.value = res["theme_name_list"];
    console.log("checkedRevisedViewers: ", checkedRevisedViewers.value);
    console.log("checkedRevisedThemes: ", checkedRevisedThemes.value);
    columnsReviseViewers.value.sort((a, b) => {
      if (
        checkedRevisedViewers.value.includes(a) &&
        !checkedRevisedViewers.value.includes(b)
      ) {
        return -1;
      }
      if (
        !checkedRevisedViewers.value.includes(a) &&
        checkedRevisedViewers.value.includes(b)
      ) {
        return 1;
      }
      return 0;
    });
    // console.log("columnsReviseViewers: ", columnsReviseViewers.value);
  });
};
const toggleViewerRevised = (index) => {
  checkboxRefsViewerRevised.value[index].toggle();
};

const viewersRevised = () => {
  showReviseViewers.value = false;
  const toast = showLoadingToast({
    message: "修改中...",
    forbidClick: true,
    duration: 0,
  });
  async function reviseUserViewers() {
    let params = new URLSearchParams();
    params.append("method", "reviseUserViewers");
    params.append("viewer_names", JSON.stringify(checkedRevisedViewers.value));
    params.append("theme_names", JSON.stringify(checkedRevisedThemes.value));
    params.append("username", userAccount.value);
    params.append("location", valueLocation.value);
    params.append("grade", valueGrade.value);
    params.append("password", userPassword.value);
    params.append("status", valueStatus.value);
    params.append("passive_magic", valuePassiveMagic.value);
    params.append("daily_times", daily_times.value);
    params.append("listening_number", listening_number.value);
    params.append("writingwords_number", writingwords_number.value);
    params.append("bark_key", userBarkKey.value);
    params.append("wxpusher_uid", userWxpusherUid.value);
    params.append("ntfy_topic", userNtfyTopic.value);
    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }
  reviseUserViewers()
    .then((res) => {
      return refreshUserList();
    })
    .then(() => {
      closeToast();
    });
};

// 学生显示已有theme
const columnsReviseThemes = ref(["喜羊羊与灰太狼", "熊出没"]);
const checkedRevisedThemes = ref([]);
const checkboxRefsThemeRevised = ref([]);
const toggleThemeRevised = (index) => {
  checkboxRefsThemeRevised.value[index].toggle();
  // console.log("checkedRevisedThemes: ", checkedRevisedThemes.value);
};

// 地点
const columnsLocation = ref([]);
async function queryLocations() {
  let params = new URLSearchParams();
  params.append("method", "queryLocations");
  return await axios.post("words/", params).then((ret) => {
    return ret.data;
  });
}
const showNewStudentAndQueryLocations = () => {
  showNewStudent.value = true;
};

// 在校状态
const valueStatus = ref("");
const selectedStatusIndex = ref("");
const showStatusPicker = ref(false);
const columnsStatus = [
  { text: "true", value: "true" },
  { text: "false", value: "false" },
];
const onConfirmStatus = ({ selectedValues }) => {
  showStatusPicker.value = false;
  valueStatus.value = selectedValues[0];
};

// 被动技能
const valuePassiveMagic = ref("");
const selectedPassiveMagicIndex = ref("");
const showPassiveMagicPicker = ref(false);
const columnsPassiveMagic = [
  { text: "true", value: "true" },
  { text: "false", value: "false" },
];
const onConfirmPassiveMagic = ({ selectedValues }) => {
  showPassiveMagicPicker.value = false;
  valuePassiveMagic.value = selectedValues[0];
};

// 增加新生
const showNewStudent = ref(false);
const showGradePicker = ref(false); //年级
const valueGrade = ref("");
const valueFlowers = ref(0);
const selectedGradeIndex = ref([]);
const columnsGrade = [
  { text: "七年级", value: "七年级" },
  { text: "八年级", value: "八年级" },
  { text: "九年级", value: "九年级" },
  { text: "高一", value: "高一" },
  { text: "高二", value: "高二" },
  { text: "高三", value: "高三" },
];
const onConfirmGrade = ({ selectedValues }) => {
  showGradePicker.value = false;

  valueGrade.value = selectedValues[0];
};

const showLocationPicker = ref(false); // 地点
const valueLocation = ref("");
const selectedLocationIndex = ref([]);
const onConfirmLocation = ({ selectedValues }) => {
  showLocationPicker.value = false;
  valueLocation.value = selectedValues[0];
};

const userAccount = ref("");
const userPassword = ref("123456");
const daily_times = ref(4);
const listening_number = ref(0);
const writingwords_number = ref(0);

function newStudent() {
  async function addStudent() {
    const toast = showLoadingToast({
      message: "加载中...",
      forbidClick: true,
    });
    let params = new URLSearchParams();
    params.append("username", userAccount.value);
    params.append("password", userPassword.value);
    params.append("grade", valueGrade.value);
    params.append("location", valueLocation.value);
    params.append("viewer_names", JSON.stringify(selectedViewers.value));
    params.append("method", "addStudent");
    params.append("bark_key", userBarkKey.value);
    params.append("wxpusher_uid", userWxpusherUid.value);
    params.append("ntfy_topic", userNtfyTopic.value);
    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }
  if (
    !userAccount.value ||
    !userPassword.value ||
    !valueGrade.value ||
    !valueLocation.value
  ) {
    showFailToast("信息不能有空缺");
    return;
  }
  addStudent()
    .then((res) => {
      console.log(res);
      // showNewStudent.value = false;
      refreshUserList();
      return "ok";
    })
    .catch((error) => {
      console.error("Error:", error.response.data);
      // showFailToast("用户名重复");
    });
}
function clearStudent() {
  userAccount.value = "";
  userPassword.value = "123456";
  valueGrade.value = "";
  valueLocation.value = "";
  valueViewer.value = "";
  valueNewViewer.value = "";
  columnsViewers.value = [];
  checkedViewers.value = [];
  errorMessage.value = "";
  userBarkKey.value = "";
  userWxpusherUid.value = "";
}

const showReviseCoins = ref(false);
const usernameCoins = ref("");
const userCoins = ref(0);
const userDiamonds = ref(0);
const indexReviseCoins = ref(null);
const reviseCoins = (index) => {
  indexReviseCoins.value = index;
  // console.log(filterStudentData.value[index]["nid"]);
  // console.log(filterStudentData.value[index]);
  showReviseCoins.value = true;
  userCoins.value = filterStudentData.value[index]["coins"];
  userDiamonds.value = filterStudentData.value[index]["diamonds"];
  usernameCoins.value = filterStudentData.value[index]["username"];
  valueFlowers.value = filterStudentData.value[index]["flowers"];
};

const confirmReviseCoins = () => {
  showConfirmDialog({
    title: "revise",
    message: "是否确认修改?",
    theme: "round-button",
  }).then(() => {
    async function reviseCoins(index) {
      let params = new URLSearchParams();
      params.append("method", "reviseCoins");
      params.append("nid", filterStudentData.value[index]["nid"]);
      params.append("coins", userCoins.value);
      params.append("diamonds", userDiamonds.value);
      params.append("flowers", valueFlowers.value);
      return await axios.post("words/", params).then((ret) => {
        return ret.data;
      });
    }
    reviseCoins(indexReviseCoins.value).then((ret) => {
      showReviseCoins.value = false;
      refreshUserList();
    });
  });
};

// 增加分组
const titlecatalogue = ref("日常任务");
const showCatalogue = ref(false);
const checkedListCatalogue = ref("");
const newCatalogue = ref("");
const listCatalogue = ref([]);
const toggleListCatalogue = (index) => {
  checkedListCatalogue.value = listCatalogue.value[index];
  titlecatalogue.value = checkedListCatalogue.value;
};
const confirmNewCatalogue = () => {
  if (newCatalogue.value != "") {
    titlecatalogue.value = newCatalogue.value;
    checkedListCatalogue.value = -1;
    showCatalogue.value = false;
  } else {
    showFailToast("不能为空");
  }
};
const clearNewCatalogue = () => {
  newCatalogue.value = "";
  checkedListCatalogue.value = listCatalogue.value[0];
};
const reviseCatalogue = () => {
  if (!studentsSelected.value || studentsSelected.value.length === 0) {
    showFailToast("没有选中学生");
    return;
  } else {
    // console.log(studentsSelected.value);
    listCatalogue.value = [];
    showCatalogue.value = true;
    async function queryUserCatalogue() {
      let params = new URLSearchParams();
      params.append("method", "queryUserCatalogue");
      params.append("students", JSON.stringify(studentsSelected.value));
      // const studentsSelected = ["liushanmei", "liuweixuan"];
      return await axios.post("words/", params).then((ret) => {
        return ret.data;
      });
    }
    queryUserCatalogue().then((res) => {
      console.log("res: ", res);
      listCatalogue.value = res;
      listCatalogue.value = listCatalogue.value.filter(
        (item) => item !== "日常任务"
      );
      listCatalogue.value.unshift("日常任务");
      checkedListCatalogue.value = listCatalogue.value[0];
    });
  }
};

// 增加新试题
const addNewStudentList = () => {
  showConfirmDialog({
    title: "Confirm",
    message: "是否确认添加试题?",
    theme: "round-button",
  }).then(() => {
    if (
      !studentsSelected.value ||
      studentsSelected.value.length === 0 ||
      !selectXlsm.value ||
      selectXlsm.value.length === 0
    ) {
      showFailToast("没有选中");
      return;
    } else {
      // console.log("merge_option", checkedMergeOption.value);
      // console.log(studentsSelected.value);
      // console.log("selectXlsm: ", selectXlsm.value);
      let none_of_above;
      if (valueNoneOfAbove.value == 6) {
        none_of_above = false;
      }
      if (valueNoneOfAbove.value == 7) {
        none_of_above = true;
      }
      async function updateStudentList() {
        let params = new URLSearchParams();
        params.append("studentList", JSON.stringify(studentsSelected.value));
        params.append("title", JSON.stringify(selectXlsm.value));
        params.append("catalogue", titlecatalogue.value);
        params.append("merge_option", checkedMergeOption.value);
        params.append("clear_pinned", checkedClearPinned.value);
        params.append("type", valueType.value);
        params.append("reversed_number", valueReversedNumber.value);
        params.append("none_of_above", none_of_above);
        params.append("is_spell_number", valueSpellNumber.value);
        params.append("lock_spell", lock_spell.value);
        params.append("pinned", valuePinned.value);
        params.append("listening_number", valueListeningNumber.value);
        params.append("writingwords_number", valueWritingwordsNumber.value);
        params.append("complete_status", valueCompleteStatus.value);
        params.append(
          "selectedVocabulary",
          JSON.stringify(selectedVocabulary.value)
        );

        params.append("method", "addStudentXlsm");
        return await axios.post("words/", params).then((ret) => {
          return ret.data;
        });
      }
      updateStudentList().then((ret) => {
        showStudent.value = false;
        studentsSelected.value = [];
        selectedVocabulary.value = [];
        selectVocabularyButtonText.value = "选词";
        checkboxRefs.value = [];
        selectedXlsmItems.value = [];
        selectXlsm.value = "";
      });
    }
  });
};

// 刷新页面
function refreshData() {
  let res = new Promise((resolve, reject) => {
    getListData();
    resolve("ok");
  });
}

// 搜索试题
const valueSearchXlsm = ref("");
const onSearchXlsm = (val) => {
  filteredFiles.value = originalData.value.filter((item) =>
    item.xlsm_name.toLowerCase().includes(val.toLowerCase())
  );
  console.log("filteredFiles.value: ", filteredFiles.value);
};
const onCancelSearchXlsm = () => {
  valueSearchXlsm.value = "";
  refreshData();
};

const sortXlsm = () => {
  const hasUndistributed = filteredFiles.value.some(
    (file) => !file.is_distributed
  );

  if (hasUndistributed) {
    filteredFiles.value.sort((a, b) => {
      // 将 is_distributed = false 的项放在最前面
      return a.is_distributed === b.is_distributed
        ? 0
        : a.is_distributed
        ? 1
        : -1;
    });
  }
};

// 查看缺失天数
const showPopupMissdays = ref(false);
const showMsgCalendar = ref(false);
const sortedUserList = ref([]);
const selectedUsers = ref([]);

const getUsersMissDays = () => {
  async function queryUserList() {
    let params = new URLSearchParams();
    params.append("method", "get_all_users_miss_days");
    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }

  let toast1 = showLoadingToast({
    message: "查询中...",
    forbidClick: true,
  });
  queryUserList().then((ret) => {
    toast1.close();
    if (ret.message === "success" && ret.data) {
      console.log("ret:", ret.data);
      const list = [];
      const userDict = ret.data;

      // 解析新的字典结构：[name, info]
      for (const [name, info] of Object.entries(userDict)) {
        const days = info.days;
        const canSend = info.can_send; // 获取后端的发送状态
        const pinnedCount = info.pinned_low_rate_count; // 【新增】获取待复习次数

        const numericDays = days === "无" ? -1 : parseInt(days);
        list.push({
          name: name,
          sortDays: numericDays,
          daysText: days === "无" ? "暂无记录" : `未打卡 ${days} 天`,
          canSend: canSend, // 保存到数组对象中
          pinned_low_rate_count: pinnedCount, // 【新增】塞进列表对象里，供模板读取
        });
      }

      // 按天数降序排序
      list.sort((a, b) => b.sortDays - a.sortDays);

      sortedUserList.value = list;
      selectedUsers.value = [];
      showPopupMissdays.value = true;
    }
  });
};

const toggleCheckbox = (name) => {
  const index = selectedUsers.value.indexOf(name);
  if (index > -1) {
    selectedUsers.value.splice(index, 1); // 已存在则移除
  } else {
    selectedUsers.value.push(name); // 不存在则添加
  }
};

const openCalendar = async () => {
  if (selectedUsers.value.length === 0) {
    showToast("请至少选择一个用户");
    return;
  }

  // 此时 selectedUsers.value 里面就是你勾选的人名数组
  console.log("准备发送给:", selectedUsers.value);
  showPopupMissdays.value = false; // 隐藏列表

  // studentsSelected.value = selectedUsers.value;
  // showPushDialog.value = true;

  userAccount.value = selectedUsers.value;
  openStudentCalendar();
};

const openMsgCalendar = () => {
  if (selectedUsers.value.length === 0) {
    showToast("请至少选择一个用户");
    return;
  }
  // showPopupMissdays.value = false;
};

// 其他按钮
const showOthers = ref(false);
const checkedMergeOption = ref(true);
const checkedClearPinned = ref(false);
const popupOthers = () => {
  showOthers.value = true;
};

// 模式选择
const showTypePicker = ref(false);
const showNoneOfAbove = ref(false);
const showPinned = ref(false);
const showCompleteStatus = ref(false);
const valueType = ref("普通双模式");
const valueNoneOfAbove = ref(7);
const valuePinned = ref(1);
const valueCompleteStatus = ref(0);
const valueSpellNumber = ref(0);
const showSelectSpellVocabulary = ref(false);
const synonymsSelected = ref([]);
const selectSpellVocabulary = ref([]);
const columnsType = [
  { text: "普通双模式", value: "普通双模式" },
  { text: "限制模式", value: "限制模式" },
  { text: "简单模式", value: "简单模式" },
  { text: "投票模式", value: "投票模式" },
];
const columnsNoneOfAbove = [
  { text: 6, value: 6 },
  { text: 7, value: 7 },
];
const columnsPinned = [
  { text: 0, value: 0 },
  { text: 1, value: 1 },
];
const columnsCompleteStatus = [
  { text: 0, value: 0 },
  { text: 1, value: 1 },
];
const onConfirmType = ({ selectedValues }) => {
  showTypePicker.value = false;
  valueType.value = selectedValues[0];
};
const onConfirmPinned = ({ selectedValues }) => {
  showCompleteStatus.value = false;
  valuePinned.value = selectedValues[0];
};
const onConfirmCompleteStatus = ({ selectedValues }) => {
  showCompleteStatus.value = false;
  valueCompleteStatus.value = selectedValues[0];
};
const onConfirmNoneOfAbove = ({ selectedValues }) => {
  showNoneOfAbove.value = false;
  valueNoneOfAbove.value = selectedValues[0];
};
const selectVocabulary = () => {
  if (selectXlsm.value.length != 1) {
    showToast("只有单个文件，才能选词");
    return;
  }
  // console.log(studentsSelected.value);
  console.log("selectXlsm:", selectXlsm.value);
  const xlsmNames = selectXlsm.value.map((item) => item.xlsm_name);
  async function getSpellVocabulary() {
    let params = new URLSearchParams();
    params.append("method", "getSpellVocabularyList");
    params.append("vocabulary_name", xlsmNames[0]);
    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }
  getSpellVocabulary().then((res) => {
    // console.log("res: ", res);
    let dataString = res.answer_list[0].replace(/(\W)'|'(\W)/g, '$1"$2');
    selectSpellVocabulary.value = JSON.parse(
      dataString.replace(/([{,]\s*)'([^']+?)'(\s*[:])/g, '$1"$2"$3')
    );
    selectSpellVocabulary.value = selectSpellVocabulary.value.map((item) => {
      return {
        ...item,
        序号: parseInt(item.序号).toString(), // 将浮点型字符串转为整数字符串
      };
    });
    console.log("selectSpellVocabulary:", selectSpellVocabulary.value);
    showSelectSpellVocabulary.value = true;
  });
};
// 选择单词
const checkboxRefs = ref([]);
const selectedVocabulary = ref([]);
const selectVocabularyButtonText = ref("选词");
const toggleCheckChinese = (index) => {
  const key = `${index}`;
  const checkboxRef = checkboxRefs.value[key];
  if (checkboxRef) {
    checkboxRef.toggle();
  }
  console.log(synonymsSelected.value);
};
function reviseTextAndGetSelectedVocabulary() {
  if (synonymsSelected.value.length == 0) {
    showSelectSpellVocabulary.value = false;
    selectVocabularyButtonText.value = "选词";
    return;
  }
  // console.log("synonymsSelected:", synonymsSelected.value);
  selectedVocabulary.value = synonymsSelected.value.map((selected) => {
    // console.log('selected: ', selected);
    // 找到序号对应的对象
    const item = selectSpellVocabulary.value.find(
      (vocab) => vocab.序号 === selected
    );
    // console.log("item:", item);
    // 返回只包含中文和英文的对象
    return { 中文: item.中文, 英文: item.英文 };
  });
  console.log("selectedVocabulary:", selectedVocabulary.value);
}

const lock_spell = ref(false);
const lockSelectVocabulary = () => {
  reviseTextAndGetSelectedVocabulary();
  selectVocabularyButtonText.value = "已锁";
  showSelectSpellVocabulary.value = false;
  lock_spell.value = true;
};
const confirmSelectVocabulary = () => {
  reviseTextAndGetSelectedVocabulary();

  selectVocabularyButtonText.value = "已选";
  showSelectSpellVocabulary.value = false;
  lock_spell.value = false;
};

// 调节反转数量
const valueReversedNumber = ref(1);
const valueListeningNumber = ref(-1);
const valueWritingwordsNumber = ref(-1);

onMounted(async () => {
  refreshData();
});

// 多选试题
const isMultiXlsmSelectMode = ref(true);
const selectedXlsmItems = ref([]);
const forceUpdateKey = ref(0);
const toggleMultiSelect = () => {
  // isMultiXlsmSelectMode.value = !isMultiXlsmSelectMode.value;
  // selectedXlsmItems.value = []; // 清空选中项
  // console.log("filteredFiles: ", filteredFiles.value);
  queryLocations().then((ret) => {
    columnsLocation.value = ret.map((item) => ({
      text: item.location_name,
      value: item.location_name,
    }));
    // console.log("columnsLocation", columnsLocation.value);
  });
  showStudent.value = true;
  selectXlsm.value = selectedXlsmItems.value.map(
    (index) => filteredFiles.value[index]
  );
  selectXlsmDoc.value = selectedXlsmItems.value.map((index) => {
    return filteredFiles.value[index];
  });
  // console.log("selectXlsm: ", selectXlsm.value);
  // console.log("selectXlsmDoc: ", selectXlsmDoc.value);
  // console.log("filteredFiles: ", filteredFiles.value);

  refreshUserList();
};

// 新增监督
const valueViewer = ref("");
const valueNewViewer = ref("");
const columnsViewers = ref([]);
const valueNewViewerPassword = ref("123456");
const showViewerPicker = ref(false);
const showViewerNew = ref(false);

const addViewer = () => {
  showViewerNew.value = true;
};

// 增加新监督
const newViewerConfirm = () => {
  const trimmedValueNewViewer = valueNewViewer.value.trim();
  const trimmedValueNewViewerPassword = valueNewViewerPassword.value.trim();
  if (trimmedValueNewViewer == "" || trimmedValueNewViewerPassword == "") {
    showToast("请输入姓名密码");
    return;
  }
  async function newViewerConfirm() {
    let params = new URLSearchParams();
    params.append("method", "newViewerConfirm");
    params.append("viewer_name", trimmedValueNewViewer);
    params.append("password", trimmedValueNewViewerPassword);
    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }
  newViewerConfirm().then((res) => {
    if (res == "Username already exists") {
      showFailToast("用户名存在");
      return;
    }
    console.log("res", res);
    showViewerNew.value = false;
  });
};

// 查询选择监督员
const showViewerColumns = () => {
  showViewerPicker.value = true;
  checkboxRefsViewer.value = [];
  checkedViewers.value = [];
  columnsViewers.value = [];

  const trimmedValueViewer = valueViewer.value
    ? valueViewer.value.trim()
    : valueViewer.value;
  async function queryViewers() {
    let params = new URLSearchParams();
    params.append("method", "queryViewers");
    params.append("viewer_name", trimmedValueViewer);
    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }
  queryViewers().then((res) => {
    console.log("res", res);
    columnsViewers.value = res.map((item) => item.viewer_name);
  });
};

const checkedViewers = ref([]);
const checkboxRefsViewer = ref([]);
const selectedViewers = ref([]);
const errorMessage = ref("");

const toggleViewer = (index) => {
  checkboxRefsViewer.value[index].toggle();
};
const viewersConfirm = () => {
  showViewerPicker.value = false;
  checkedViewers.value.forEach((viewer) => {
    if (!selectedViewers.value.includes(viewer)) {
      selectedViewers.value.push(viewer);
    }
  });
  // console.log('checkedViewers', checkedViewers.value);
  errorMessage.value = selectedViewers.value.join(",");
};

// 推送信息
const userBarkKey = ref("");
const userWxpusherUid = ref("");
const userNtfyTopic = ref("");
const showPushDialog = ref(false);
const pushContent = ref("");
const pushImage = ref("");
const quickMessages = ref([
  "⛽️马上上课了，赶紧背单词了",
  "🎉在背一组单词吧",
  "⚡️闪电要来了，快背单词躲闪电",
  "😠多久没背单词了，赶紧动手了",
]);

// ntfy生成
const getNtfyTopic = () => {
  userNtfyTopic.value = "joseph" + userAccount.value.trim();
};
// 推送级别
const pushLevel = ref("0");
const pushLevelTip = computed(() => {
  if (pushLevel.value === "2") return "⚡️ 将以紧急方式推送";
  if (pushLevel.value === "1") return "⏰ 将以时效方式推送";
  if (pushLevel.value === "3") return "🎉 将以赞美方式推送";
  return "普通推送";
});

// 定时相关
const isScheduled = ref(false);
const showDatePicker = ref(false);
const showHourPicker = ref(false);

// 日期
const today = new Date();
const minDate = today;
const maxDate = new Date(
  today.getFullYear(),
  today.getMonth() + 3,
  today.getDate()
);
const selectedDate = ref([
  String(today.getFullYear()),
  String(today.getMonth() + 1).padStart(2, "0"),
  String(today.getDate()).padStart(2, "0"),
]);
const scheduleDate = ref("");

// 小时
const selectedHour = ref([String(today.getHours()).padStart(2, "0")]);
const scheduleHourLabel = ref("");
const hourColumns = Array.from({ length: 24 }, (_, i) => ({
  text: `${String(i).padStart(2, "0")}:00`,
  value: String(i).padStart(2, "0"),
}));

const onDateConfirm = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  scheduleDate.value = `${y}-${m}-${d}`;
  showDatePicker.value = false;
};

const onHourConfirm = ({ selectedValues }) => {
  scheduleHourLabel.value = `${selectedValues[0]}:00`;
  showHourPicker.value = false;
};

const selectQuickMessage = (msg) => {
  pushContent.value = msg;
};

const pushTaskMap = ref({});
const pushMessage = async () => {
  if (!studentsSelected.value || studentsSelected.value.length === 0) {
    showFailToast("没有选中学生");
    return;
  }
  pushContent.value = ""; // 清空上次内容
  pushImage.value = "";
  showPushDialog.value = true;

  // 👇【新增逻辑】：拉取当前选中学生的已有任务分布
  try {
    let params = new URLSearchParams();
    params.append("method", "getBatchStudentTasks");
    // 把当前选中的学生数组传给后端
    params.append("students", JSON.stringify(studentsSelected.value));
    const ret = await axios.post("words/", params);
    if (ret.data.code === 200) {
      pushTaskMap.value = ret.data.data; // 后端返回 { '2026-05-15': [...], ... }
    }
  } catch (e) {
    console.error("拉取任务分布失败", e);
  }
};

const pushCalendarFormatter = (day) => {
  const y = day.date.getFullYear();
  const m = String(day.date.getMonth() + 1).padStart(2, "0");
  const d = String(day.date.getDate()).padStart(2, "0");
  const dateStr = `${y}-${m}-${d}`;

  if (pushTaskMap.value[dateStr] && pushTaskMap.value[dateStr].length > 0) {
    // 动态显示人数，比如 "2人有任务"
    const count = pushTaskMap.value[dateStr].length;
    day.bottomInfo = `${count}人有排期`;
  }
  return day;
};

const onCalendarSelect = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const dateStr = `${y}-${m}-${d}`;

  // 判断这一天是否有任务
  if (pushTaskMap.value[dateStr] && pushTaskMap.value[dateStr].length > 0) {
    // 把所有有任务的学生名字用逗号拼起来
    const names = pushTaskMap.value[dateStr].join("，");

    // 使用 Vant 的轻量级 Toast 弹出提示
    showToast({
      message: `📅 ${dateStr}\n已有任务的学生：\n${names}`,
      wordBreak: "break-word", // 名字太长时自动换行
      duration: 3000, // 停留 3 秒钟方便看清楚
    });
  }
};
const showTimePicker = ref(false);
const recurringTime = ref(""); // 输入框里显示的最终文本，如 "14:30"
const selectedRecurringTime = ref([]); // picker 绑定的当前选中值

const recurringTimeColumns = ref([]);
for (let i = 0; i < 24; i++) {
  const hour = i.toString().padStart(2, "0");
  // 按照每半小时一个跨度，你也可以自己改成每15分钟
  recurringTimeColumns.value.push({ text: `${hour}:00`, value: `${hour}:00` });
  recurringTimeColumns.value.push({ text: `${hour}:30`, value: `${hour}:30` });
}

const onRecurringTimeConfirm = (event) => {
  // Vant 4 的 picker 确认事件会返回 { selectedValues, selectedOptions } 等信息
  // 我们直接取选中项的值
  let timeStr = "";

  if (event.selectedValues && event.selectedValues.length > 0) {
    timeStr = event.selectedValues[0];
  } else if (typeof event === "string") {
    // 兼容 Vant 3 的直接返回值
    timeStr = event;
  } else if (event.value) {
    timeStr = event.value;
  }

  recurringTime.value = timeStr; // 赋值给输入框展示
  showTimePicker.value = false; // 关闭弹窗
};
const sendMode = ref("immediate"); // 'immediate', 'once', 'recurring'
const recurringDays = ref([]); // 例如: [1, 3, 5] 代表周一、周三、周五
const recurrenceEndDate = ref(""); // 例如: '2026-06-30'
const selectedEndDate = ref([]);
// --- 确认选择截止日期的回调 ---
const onEndDateConfirm = ({ selectedValues }) => {
  // selectedValues 比如 ['2026', '06', '30']，转成 '2026-06-30'
  recurrenceEndDate.value = selectedValues.join("-");
  showEndDatePicker.value = false;
};
const showEndDatePicker = ref(false);

// 日历发送
// --- 日历及单人任务管理相关的状态 ---
const showStudentCalendar = ref(false);
const showDayTasks = ref(false);
const showSingleTaskDialog = ref(false);
const showSingleTimePicker = ref(false);

const calendarMaxDate = ref(
  new Date(new Date().getFullYear(), new Date().getMonth() + 3, 0)
); // 日历往后看3个月
const studentTaskMap = ref({}); // 存储按日期分组的任务，格式: { '2026-04-25': [{...}, {...}] }
const selectedDateStr = ref("");
const dayTasks = ref([]);

const singleTaskContent = ref("");
const singleTaskTime = ref("");
const singleTaskLevel = ref("0");
const singleTaskImage = ref("");

// 日期格式化辅助函数
const formatDateStr = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// 1. 打开日历并拉取数据
const openStudentCalendar = async () => {
  showStudentCalendar.value = true;
  await fetchStudentTasks();
};

// 2. 从后端获取该学生的所有未执行排期
const fetchStudentTasks = async () => {
  try {
    let params = new URLSearchParams();
    params.append("method", "getStudentTasks");
    // 兼容数组和字符串
    const student = Array.isArray(userAccount.value)
      ? JSON.stringify(userAccount.value)
      : userAccount.value;
    params.append("student", student);

    const ret = await axios.post("words/", params);
    if (ret.data.code === 200) {
      console.log(ret.data);
      studentTaskMap.value = ret.data.data;
    }
  } catch (e) {
    showFailToast("获取排期失败");
  }
};

// 3. Vant 日历的格式化函数（有任务的日期加红点显示）
const calendarFormatter = (day) => {
  const dateStr = formatDateStr(day.date);
  if (
    studentTaskMap.value[dateStr] &&
    studentTaskMap.value[dateStr].length > 0
  ) {
    day.bottomInfo = "有任务";
    // 可以自定义颜色
    day.bottomInfoPosition = "bottom";
  }
  return day;
};

// 4. 点击日历中的某一天
const onSelectCalendarDate = (date) => {
  selectedDateStr.value = formatDateStr(date);
  // 获取当天的任务列表
  dayTasks.value = studentTaskMap.value[selectedDateStr.value] || [];
  showDayTasks.value = true;
};

// 5. 删除个人的某条任务记录
const deleteStudentTask = async (recordId) => {
  try {
    let params = new URLSearchParams();
    params.append("method", "deleteStudentTask");
    params.append("recordId", recordId);
    const ret = await axios.post("words/", params);
    if (ret.data.code === 200) {
      showToast("已删除");
      await fetchStudentTasks(); // 刷新全部数据
      // 刷新当日列表
      dayTasks.value = studentTaskMap.value[selectedDateStr.value] || [];
    }
  } catch (e) {
    showFailToast("删除失败");
  }
};

// 6. 准备新增当日任务
const openAddSingleTask = () => {
  singleTaskContent.value = "";
  singleTaskTime.value = "18:00"; // 默认时间
  singleTaskLevel.value = "0";
  showSingleTaskDialog.value = true;
};

// 时间选择确认
const onSingleTimeConfirm = (event) => {
  let timeStr = event.selectedValues
    ? event.selectedValues[0]
    : event.value || event;
  singleTaskTime.value = timeStr;
  showSingleTimePicker.value = false;
};

// 7. 提交新增的个人任务
const submitSingleTask = async () => {
  if (!singleTaskContent.value.trim()) return showFailToast("内容不能为空");

  try {
    let params = new URLSearchParams();
    params.append("method", "addStudentTask");
    // 兼容数组和字符串
    const student = Array.isArray(userAccount.value)
      ? JSON.stringify(userAccount.value)
      : userAccount.value;
    params.append("student", student);
    params.append("content", singleTaskContent.value);
    params.append("pushLevel", singleTaskLevel.value);
    params.append(
      "scheduleTime",
      `${selectedDateStr.value} ${singleTaskTime.value}`
    );
    if (singleTaskImage.value.trim()) {
      params.append("imageUrl", singleTaskImage.value.trim());
    }

    const ret = await axios.post("words/", params);
    if (ret.data.code === 200) {
      showToast("新增成功");
      await fetchStudentTasks();
      dayTasks.value = studentTaskMap.value[selectedDateStr.value] || [];
    }
  } catch (e) {
    showFailToast("新增失败");
  }
};

// 确认发送
const confirmPush = async () => {
  if (!pushContent.value.trim()) {
    showFailToast("请输入推送内容");
    return;
  }

  // 校验参数
  if (
    sendMode.value === "once" &&
    (!scheduleDate.value || !scheduleHourLabel.value)
  ) {
    showFailToast("请选择单次发送时间");
    return;
  }
  if (sendMode.value === "recurring") {
    if (recurringDays.value.length === 0) {
      showFailToast("请选择每周重复的日子");
      return;
    }
    if (!recurringTime.value || !recurrenceEndDate.value) {
      showFailToast("请完整选择循环时间和截止日期");
      return;
    }
  }

  try {
    let toast1 = showLoadingToast({
      message: "推送中...",
      forbidClick: true,
    });
    let params = new URLSearchParams();
    params.append("method", "pushMessage");
    params.append("students", JSON.stringify(studentsSelected.value));
    params.append("content", pushContent.value);
    params.append("pushLevel", pushLevel.value);
    params.append("sendMode", sendMode.value);
    if (pushImage.value.trim()) {
      params.append("imageUrl", pushImage.value.trim());
    }

    // 根据模式传参
    if (sendMode.value === "once") {
      params.append(
        "scheduleTime",
        `${scheduleDate.value} ${scheduleHourLabel.value}`
      );
    } else if (sendMode.value === "recurring") {
      params.append("recurringDays", JSON.stringify(recurringDays.value));
      params.append("recurringTime", recurringTime.value);
      params.append("recurrenceEndDate", recurrenceEndDate.value);
    }

    const ret = await axios.post("words/", params);
    toast1.close();
    showToast(ret.data.msg || "任务布置成功");
    showPushDialog.value = false;
  } catch (e) {
    showFailToast("推送失败");
  }
};
</script>

<template>
  <div>
    <div class="nav-bar-container">
      <van-nav-bar
        title="词汇分配列表"
        right-text="分配"
        @click-right="toggleMultiSelect()"
      >
        <template #left>
          <div class="nav-left-buttons">
            <span class="nav-text-btn" @click="sortXlsm()">排序</span>
            <span class="nav-text-btn new-btn" @click="getUsersMissDays()"
              >查看天数</span
            >
          </div>
        </template>
      </van-nav-bar>
    </div>

    <!-- 只在正常访问时显示router-view和tabbar -->
    <template v-if="!isEmbedded">
      <router-view />
      <van-tabbar route>
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
        <van-tabbar-item icon="envelop-o" replace to="/notificationLog"
          >通知</van-tabbar-item
        >
      </van-tabbar>
    </template>

    <!-- 搜索试题 -->
    <form action="/">
      <van-search
        v-model="valueSearchXlsm"
        show-action
        placeholder="请输入搜索关键词"
        @search="onSearchXlsm"
        @cancel="onCancelSearchXlsm"
      />
    </form>

    <!-- missdays多选 -->
    <van-popup
      v-model:show="showPopupMissdays"
      position="bottom"
      :style="{ height: '90%', display: 'flex', flexDirection: 'column' }"
    >
      <div class="popup-header">
        <span class="title">选择发送信息的用户</span>
        <van-button type="primary" size="small" @click="openCalendar"
          >去发信息</van-button
        >
      </div>

      <div class="list-container">
        <van-checkbox-group v-model="selectedUsers">
          <van-cell-group>
            <van-cell
              v-for="user in sortedUserList"
              :key="user.name"
              :title="user.name"
              :value="user.daysText"
              clickable
              @click="toggleCheckbox(user.name)"
            >
              <template #title>
                <!-- 增加一个包裹的 div，使用 flex 布局，并强制垂直居中和不换行 -->
                <div
                  style="
                    display: flex;
                    align-items: center;
                    white-space: nowrap;
                  "
                >
                  <span class="user-name">{{ user.name }}</span>

                  <!-- 保持原有的可发送标签，加一点左边距防贴贴 -->
                  <span
                    v-if="user.canSend"
                    class="send-tag"
                    style="margin-left: 5px"
                    >(可发送)</span
                  >

                  <!-- 新增：显示置顶且未达标的次数，关键是加上 white-space: nowrap; -->
                  <span
                    v-if="user.pinned_low_rate_count > 0"
                    class="pinned-tag"
                    style="
                      margin-left: 5px;
                      color: #ee0a24;
                      font-size: 12px;
                      white-space: nowrap;
                    "
                  >
                    (待复习: {{ user.pinned_low_rate_count }})
                  </span>
                </div>
              </template>

              <template #right-icon>
                <van-checkbox :name="user.name" @click.stop />
              </template>
            </van-cell>
          </van-cell-group>
        </van-checkbox-group>
      </div>
    </van-popup>

    <van-calendar
      v-model:show="showCalendar"
      :confirm-text="editXlsmNameCalendar"
      @confirm="onConfirmCalendar"
    />

    <!-- 试题列表 -->
    <van-cell-group :key="forceUpdateKey" style="margin-bottom: 80px">
      <van-swipe-cell
        v-for="(item, index) in filteredFiles"
        :key="index"
        stop-propagation
      >
        <template v-slot:right>
          <van-button
            square
            type="danger"
            text="删除"
            @click="deleteXlsm(item.xlsm_name, index)"
          />
        </template>
        <template v-slot:left>
          <div
            style="display: flex; gap: 0px; height: 100%; padding-right: 0px"
          >
            <van-button
              square
              type="success"
              text="日期"
              @click="editDate(item.xlsm_name, index)"
            />
            <van-button
              square
              color="#7232dd"
              :text="item.is_distributed ? '已发' : '未发'"
              @click="isDistributed(item.xlsm_name, index)"
            />
          </div>
        </template>
        <van-cell
          :title="item.xlsm_name"
          :label="formatDate(item.create_time)"
          is-link
          clickable
          @click="getUserList(index)"
          :class="{
            'selected-cell2': selectedXlsmItems.includes(index),
            'gray-background2': item.flag_distribute === 0,
            'red-background2': item.flag_distribute === 2,
            'green-background2': item.flag_distribute === 1,
          }"
        >
          <template #right-icon>
            <van-checkbox
              :model-value="selectedXlsmItems.includes(index)"
              @change="() => getUserList(index)"
            />
          </template>
        </van-cell>
      </van-swipe-cell>
    </van-cell-group>

    <!-- 弹出学生 -->
    <van-popup
      v-model:show="showStudent"
      position="bottom"
      :style="{ height: '90%' }"
      closeable
    >
      <div style="">
        <div style="display: flex; justify-content: space-between">
          <div style="display: flex">
            <div
              style="
                font-size: 20px;
                font-weight: 700;
                margin: 1rem 1rem 0.2rem 1rem;
              "
            >
              用户列表
            </div>
            <div
              style="
                font-size: 13px;
                font-weight: 700;
                margin: 1.5rem 0 0 0.2rem;
                color: gray;
              "
            >
              分组：{{ titlecatalogue }}
            </div>
          </div>
          <div style="margin-right: 3rem; margin-top: 1rem">
            <van-button type="warning" size="small" @click="pushMessage"
              >推送</van-button
            >
            <van-button type="primary" size="small" @click="popupOthers"
              >其他</van-button
            >
          </div>
        </div>
        <div
          style="
            display: flex;
            margin: 0.5rem 1rem 0.2rem 1rem;
            font-size: 13px;
            color: gray;
            flex-wrap: wrap;
          "
        >
          <div>{{ valueType }}</div>
          <div style="margin-left: 1.5rem">
            拼接选项: {{ checkedMergeOption }}
          </div>
          <div style="margin-left: 1.2rem">
            中译英: {{ valueReversedNumber }}
          </div>
          <div style="margin-left: 1.2rem">选项数: {{ valueNoneOfAbove }}</div>

          <div
            v-if="selectVocabularyButtonText == '已锁'"
            style="margin-left: 0rem"
          >
            拼写数: {{ valueSpellNumber }} / 已锁 {{ synonymsSelected.length }}
          </div>
          <div v-else style="display: flex; flex-wrap: wrap">
            <div style="width: 100%; margin-left: 0rem">
              拼写数: {{ valueSpellNumber }} / 已选
              {{ synonymsSelected.length }}
            </div>
          </div>
          <div style="margin-left: 1.2rem">
            地狱闪电 : {{ valueCompleteStatus }}
          </div>
        </div>

        <div
          style="
            font-size: 12px;
            margin-left: 2ch;
            color: gray;
            margin-top: 0rem;
            margin-bottom: 0.5rem;
            display: flex;
            flex-wrap: wrap;
            justify-content: flex-start;
          "
        >
          <div
            v-for="(item, index) in selectXlsm"
            :key="index"
            style="font-size: 12px; color: gray; width: 50%; margin-top: 0.2rem"
          >
            {{ item.xlsm_name }}
          </div>
        </div>
      </div>

      <!-- 增加新生 -->
      <div style="display: flex; justify-content: space-between">
        <div>
          <van-button
            @click="showFliterStudent = true"
            type="danger"
            size="small"
            style="margin-left: 1rem; margin-bottom: 0.6rem"
            >筛选学生</van-button
          >
          <van-button
            @click="unfilteredStudents"
            type="success"
            size="small"
            style="margin-left: 0.1rem; margin-bottom: 0.6rem"
            >清除筛选</van-button
          >
        </div>
        <div>
          <van-button
            @click="reviseCatalogue"
            color="#7232dd"
            size="small"
            style="margin-right: 0.1rem; margin-bottom: 0.4rem"
            >修改分组</van-button
          >
          <van-button
            @click="addNewStudentList"
            type="warning"
            size="small"
            style="margin-right: 0.1rem; margin-bottom: 0.4rem"
            >增加试题</van-button
          >
          <van-button
            @click="showNewStudentAndQueryLocations()"
            type="primary"
            size="small"
            style="margin-right: 1rem; margin-bottom: 0.6rem"
            >添加学生</van-button
          >
        </div>
      </div>

      <!-- 修改分组catalogue -->
      <van-popup
        v-model:show="showCatalogue"
        position="bottom"
        :style="{ height: '60%' }"
        closeable
      >
        <van-cell-group inset style="">
          <div style="font-size: 18px; font-weight: 700; margin: 1rem">
            确认分组
          </div>
        </van-cell-group>

        <van-radio-group v-model="checkedListCatalogue">
          <van-field
            v-model="newCatalogue"
            name="新分组"
            label="新分组"
            placeholder="输入新组名"
          >
            <template #label>
              <div style="margin-left: 1rem">新分组</div>
            </template>
            <template #button>
              <van-button
                size="small"
                type="primary"
                @click="confirmNewCatalogue"
                square
                >确认</van-button
              >
              <van-button
                size="small"
                type="warning"
                @click="clearNewCatalogue"
                square
                >清除</van-button
              >
            </template>
          </van-field>
          <van-cell-group
            inset
            v-for="(item, index) in listCatalogue"
            :key="index"
          >
            <van-cell
              :title="item"
              clickable
              @click="toggleListCatalogue(index)"
            >
              <template #right-icon>
                <van-radio :name="item" />
              </template>
            </van-cell>
          </van-cell-group>
        </van-radio-group>
      </van-popup>

      <!-- 筛选新生 -->
      <van-popup
        v-model:show="showFliterStudent"
        position="bottom"
        :style="{ height: '60%' }"
        closeable
      >
        <van-cell-group inset style="">
          <div style="font-size: 18px; font-weight: 700; margin: 1rem">
            筛选学生
          </div>
          <!-- 关键词筛选 -->
          <van-field
            v-model="valueSearchStudent"
            label="学生"
            placeholder="请输入学生姓名"
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
          <van-button
            @click="filteredStudent()"
            type="success"
            block
            style="margin-top: 1rem"
            >筛选学生</van-button
          >
          <van-button
            @click="clearFilterStudent()"
            type="primary"
            block
            style="margin-top: 0.2rem"
            >清除筛选</van-button
          >
        </van-cell-group>
      </van-popup>

      <!-- 添加新生 -->
      <van-popup
        v-model:show="showNewStudent"
        position="bottom"
        :style="{ height: '70%' }"
        closeable
      >
        <van-cell-group inset style="">
          <div style="font-size: 18px; font-weight: 700; margin: 1rem">
            新加学生
          </div>
          <van-field
            v-model="userAccount"
            label="用户"
            placeholder="请输入用户名"
          />
          <!-- 密码 -->
          <van-field
            v-model="userPassword"
            label="密码"
            placeholder="请输入密码"
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
          <!-- 管理监督 -->
          <van-field
            v-model="valueViewer"
            label="监督"
            placeholder="录入查询"
            :error-message="errorMessage"
          >
            <template #right-icon>
              <van-button
                type="warning"
                size="small"
                @click="addViewer"
                style="margin-left: 8px"
              >
                新增
              </van-button>
              <van-button
                type="success"
                size="small"
                @click="showViewerColumns"
                style="margin-left: 3px"
              >
                查询
              </van-button>
            </template>
          </van-field>
          <!-- 查询监督 -->
          <van-popup
            v-model:show="showViewerPicker"
            round
            position="bottom"
            :style="{ height: '60%' }"
            closeable
          >
            <van-checkbox-group v-model="checkedViewers">
              <div style="font-size: 18px; font-weight: 700; margin: 1rem">
                确认监督
              </div>
              <van-cell-group inset>
                <van-cell
                  v-for="(item, index) in columnsViewers"
                  clickable
                  :key="item"
                  :title="`${item}`"
                  @click="toggleViewer(index)"
                >
                  <template #right-icon>
                    <van-checkbox
                      :name="item"
                      :ref="(el) => (checkboxRefsViewer[index] = el)"
                      @click.stop
                    />
                  </template>
                </van-cell>
              </van-cell-group>
            </van-checkbox-group>
            <van-button
              type="success"
              block
              @click="viewersConfirm"
              style="margin-top: 1rem"
            >
              确定
            </van-button>
          </van-popup>
          <!-- 新增监督 -->
          <van-popup
            v-model:show="showViewerNew"
            round
            position="bottom"
            :style="{ height: '45%' }"
            closeable
          >
            <van-cell-group inset style="">
              <div style="font-size: 18px; font-weight: 700; margin: 1rem">
                新加监督
              </div>
              <van-field
                v-model="valueNewViewer"
                label="帐号"
                placeholder="录入新监督"
              />
              <van-field
                v-model="valueNewViewerPassword"
                label="密码"
                placeholder="录入密码"
              />
            </van-cell-group>
            <van-button
              type="success"
              block
              @click="newViewerConfirm"
              style="margin-top: 1rem"
            >
              新增监督
            </van-button>
          </van-popup>
          <!-- 推送信息 -->
          <van-field
            v-model="userBarkKey"
            label="Bark_Key"
            placeholder="请输入ios bark key"
          />
          <van-field
            v-model="userWxpusherUid"
            label="Wx_uid"
            placeholder="请输入android wxpusher uid"
          />
          <van-field
            v-model="userNtfyTopic"
            label="ntfy_topic"
            placeholder="请输入ntfy topic"
          >
            <template #button>
              <van-button size="small" type="primary" @click="getNtfyTopic">
                生成
              </van-button>
            </template>
          </van-field>
        </van-cell-group>
        <!-- 按钮 -->
        <div style="padding: auto">
          <van-button
            @click="newStudent()"
            type="success"
            block
            style="margin-top: 0.2rem"
            >添加学生</van-button
          >

          <van-button
            @click="clearStudent()"
            type="primary"
            block
            style="margin-top: 0.2rem"
            >清除内容</van-button
          >
        </div>
      </van-popup>

      <!-- 学生显示已有数据展示 -->
      <van-popup
        v-model:show="showStudentAccountData"
        position="bottom"
        :style="{ height: '60%' }"
        closeable
      >
        <div style="font-size: 18px; font-weight: 700; margin: 1rem">
          {{ studentAccountDataName }}
        </div>
        <van-cell-group style="margin-bottom: 80px">
          <div v-for="(item, index) in studentAccountData" :key="index">
            <van-cell
              :title="item.title"
              :value="`${item.rate} / ${item.attempt}`"
              :label="item.create_time"
            >
            </van-cell>
          </div>
        </van-cell-group>
      </van-popup>

      <!-- 学生列表 -->
      <van-checkbox-group v-model="studentsSelected">
        <van-cell-group>
          <van-swipe-cell
            v-for="(item2, index2) in filterStudentData"
            :key="index2"
            stop-propagation
          >
            <template #right>
              <van-button
                square
                type="danger"
                text="删除"
                @click="deleteItem(item2, index2)"
              />
            </template>
            <template #left>
              <van-button
                square
                type="success"
                text="编辑"
                @click="showViewers(item2, index2)"
              />
            </template>
            <van-cell
              :value="`${item2.location__location_name}: ${item2.grade__grade_name}`"
              is-link
              clickable
              @click="toggleStudent(index2)"
            >
              <template #title>
                <div style="display: flex; justify-content: space-between">
                  <van-tag color="#7232dd" plain>{{ item2.username }}</van-tag>
                  <van-button
                    style="width: 120%"
                    round
                    plain
                    color="goldenrod"
                    :text="`${item2.coins}/${item2.diamonds}/${item2.flowers}`"
                    @click.stop="reviseCoins(index2)"
                  />
                </div>
              </template>

              <template #label>
                {{ item2.password }} <span v-if="item2.earning_half">💔</span>
              </template>

              <template #right-icon>
                <van-checkbox :name="item2.username" @click.stop="() => {}" />
              </template>
            </van-cell>
          </van-swipe-cell>
        </van-cell-group>
      </van-checkbox-group>

      <van-popup
        v-model:show="showReviseCoins"
        position="bottom"
        :style="{ height: '50%' }"
        closeable
        round
      >
        <van-cell-group inset style="">
          <div style="font-size: 18px; font-weight: 700; margin: 1rem">
            {{ usernameCoins }} 修改金币
          </div>
          <van-field
            v-model="userCoins"
            label="金币"
            placeholder="请输入金币数"
          />
          <van-field
            v-model="userDiamonds"
            label="钻石"
            placeholder="请输入钻石"
          />
          <van-field
            v-model="valueFlowers"
            label="小花 🌸"
            placeholder="请输入小花"
          />
          <div style="margin-top: 1rem">
            <van-button
              block
              square
              type="success"
              text="确认"
              @click="confirmReviseCoins()"
            />
          </div>
        </van-cell-group>
      </van-popup>
    </van-popup>

    <!-- 弹出选择 -->
    <van-popup
      v-model:show="showOthers"
      position="bottom"
      :style="{ height: '60%' }"
      closeable
    >
      <div
        style="font-size: 20px; font-weight: 700; margin: 1rem 1rem 0.2rem 1rem"
      >
        分配选项
      </div>
      <van-field name="switch" label="拼接选项">
        <template #input>
          <div style="display: flex; align-items: center">
            <van-switch v-model="checkedMergeOption" />
            <div style="display: flex; align-items: center; margin-left: 30px">
              <span style="margin-right: 16px">清除置顶</span>
              <van-switch v-model="checkedClearPinned" active-color="#ee0a24" />
            </div>
          </div>
        </template>
      </van-field>
      <!-- 模式选择 -->
      <van-field
        v-model="valueType"
        is-link
        readonly
        label="模式"
        placeholder="选择模式"
        @click="showTypePicker = true"
      />
      <van-popup v-model:show="showTypePicker" round position="bottom">
        <van-picker
          :columns="columnsType"
          @cancel="showTypePicker = false"
          @confirm="onConfirmType"
        />
      </van-popup>
      <van-field
        v-model="valueReversedNumber"
        type="digit"
        label="中译英数量"
      />
      <van-field
        v-model="valueListeningNumber"
        type="number"
        label="听力数量"
      />
      <van-field
        v-model="valueWritingwordsNumber"
        type="number"
        label="默写数量"
      />
      <van-field
        v-model="valueNoneOfAbove"
        is-link
        readonly
        label="选项数量"
        placeholder="选项数量"
        @click="showNoneOfAbove = true"
      />
      <van-field
        v-model="valuePinned"
        is-link
        readonly
        label="是否置顶"
        @click="showPinned = true"
      />
      <van-field
        v-model="valueCompleteStatus"
        is-link
        readonly
        label="地狱闪电"
        @click="showCompleteStatus = true"
      />
      <van-field v-model="valueSpellNumber" type="digit" label="拼写数量">
        <template #right-icon>
          <van-button
            type="warning"
            size="small"
            @click="selectVocabulary"
            style="margin-left: 8px"
          >
            {{ selectVocabularyButtonText }}
          </van-button>
        </template>
      </van-field>
      <van-popup v-model:show="showNoneOfAbove" round position="bottom">
        <van-picker
          :columns="columnsNoneOfAbove"
          @cancel="showNoneOfAbove = false"
          @confirm="onConfirmNoneOfAbove"
        />
      </van-popup>
      <van-popup v-model:show="showPinned" round position="bottom">
        <van-picker
          :columns="columnsPinned"
          @cancel="showPinned = false"
          @confirm="onConfirmPinned"
        />
      </van-popup>
      <van-popup v-model:show="showCompleteStatus" round position="bottom">
        <van-picker
          :columns="columnsCompleteStatus"
          @cancel="showCompleteStatus = false"
          @confirm="onConfirmCompleteStatus"
        />
      </van-popup>
      <div style="margin-top: 1rem">
        <van-button
          square
          block
          type="success"
          text="确定"
          @click="showOthers = false"
        />
      </div>
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
          <div style="display: flex; flex-wrap: wrap; gap: 10px">
            <div
              v-for="(student, index_student) in studentsSelected"
              :key="index_student"
              style="
                padding: 3px;
                border: 1px solid #ccc;
                border-radius: 4px;
                margin-bottom: 5px;
              "
            >
              {{ student }}
            </div>
          </div>
          {{ selectXlsm[0].xlsm_name }} | {{ synonymsSelected.length }}词
        </div>
      </van-cell-group>

      <van-checkbox-group
        class="checkbox-container"
        v-model="synonymsSelected"
        ref="checkboxRefs"
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
                  :ref="(el) => (checkboxRefs[`${index}`] = el)"
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
        style="margin-top: 1rem; margin-bottom: 0.2rem"
        @click="confirmSelectVocabulary"
        >确认选择</van-button
      >
      <van-button
        type="warning"
        block
        style="margin-top: 0rem; margin-bottom: 2rem"
        @click="lockSelectVocabulary"
        >锁定拼写</van-button
      >
    </van-popup>

    <van-popup
      v-model:show="showReviseViewers"
      round
      position="bottom"
      :style="{ height: '100%' }"
      closeable
    >
      <van-checkbox-group v-model="checkedRevisedViewers">
        <div style="font-size: 18px; font-weight: 700; margin: 1rem">
          编辑学生
        </div>
        <div
          style="
            margin-left: 1rem;
            color: red;
            margin-bottom: 1rem;
            font-weight: 700;
            font-size: larger;
          "
        >
          {{ userAccount }}
        </div>
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
            v-model="selectedLocationIndex"
            @cancel="showLocationPicker = false"
            @confirm="onConfirmLocation"
          />
        </van-popup>

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
            v-model="selectedGradeIndex"
            @cancel="showGradePicker = false"
            @confirm="onConfirmGrade"
          />
        </van-popup>

        <!-- 密码 -->
        <van-field
          v-model="userPassword"
          label="密码"
          placeholder="请输入密码"
        />

        <!-- 推送信息 -->
        <van-field
          v-model="userBarkKey"
          label="Bark_Key"
          placeholder="请输入ios bark key"
        />
        <van-field
          v-model="userWxpusherUid"
          label="Wx_uid"
          placeholder="请输入android wxpusher uid"
        />
        <van-field
          v-model="userNtfyTopic"
          label="ntfy_topic"
          placeholder="请输入ntfy topic"
        >
          <template #button>
            <van-button size="small" type="primary" @click="getNtfyTopic">
              生成
            </van-button>
          </template>
        </van-field>
        <!-- 周长 -->
        <van-field
          v-model="daily_times"
          label="周长"
          placeholder="请输入周长次数"
        />
        <!-- 听力 -->
        <van-field
          v-model="listening_number"
          label="听力"
          placeholder="请输入听力数量"
        />
        <!-- 默写 -->
        <van-field
          v-model="writingwords_number"
          label="默写"
          placeholder="请输入默写数量"
        />

        <!-- 在校状态 -->
        <van-field
          v-model="valueStatus"
          is-link
          readonly
          label="在校"
          placeholder="选择状态"
          @click="showStatusPicker = true"
        />
        <van-popup v-model:show="showStatusPicker" round position="bottom">
          <van-picker
            :columns="columnsStatus"
            v-model="selectedStatusIndex"
            @cancel="showStatusPicker = false"
            @confirm="onConfirmStatus"
          />
        </van-popup>

        <!-- 被动技能 -->
        <van-field
          v-model="valuePassiveMagic"
          is-link
          readonly
          label="被动技能"
          placeholder="选择状态"
          @click="showPassiveMagicPicker = true"
        />
        <van-popup
          v-model:show="showPassiveMagicPicker"
          round
          position="bottom"
        >
          <van-picker
            :columns="columnsPassiveMagic"
            v-model="selectedPassiveMagicIndex"
            @cancel="showPassiveMagicPicker = false"
            @confirm="onConfirmPassiveMagic"
          />
        </van-popup>

        <van-cell-group inset style="margin-bottom: 1rem">
          <van-cell
            title="📅 个人推送排期日历"
            is-link
            value="查看/管理"
            @click="openStudentCalendar"
          />
        </van-cell-group>

        <!-- 监管 -->
        <van-cell-group inset>
          <div style="margin: 1rem 0 0 0.1rem">监管查看</div>
          <van-cell
            v-for="(item, index) in columnsReviseViewers"
            clickable
            :key="item"
            :title="`${item}`"
            @click="toggleViewerRevised(index)"
          >
            <template #right-icon>
              <van-checkbox
                :name="item"
                :ref="(el) => (checkboxRefsViewerRevised[index] = el)"
                @click.stop
              />
            </template>
          </van-cell>
        </van-cell-group>
      </van-checkbox-group>

      <!-- 主题查看 -->
      <van-checkbox-group v-model="checkedRevisedThemes">
        <van-cell-group inset>
          <div style="margin: 1rem 0 0 0.1rem">主题查看</div>
          <van-cell
            v-for="(item, index) in columnsReviseThemes"
            clickable
            :key="item"
            :title="`${item}`"
            @click="item !== '喜羊羊与灰太狼' && toggleThemeRevised(index)"
          >
            <template #right-icon>
              <van-checkbox
                :name="item"
                :ref="(el) => (checkboxRefsThemeRevised[index] = el)"
                :disabled="item === '喜羊羊与灰太狼'"
                @click.stop
              />
            </template>
          </van-cell>
        </van-cell-group>
      </van-checkbox-group>

      <van-button
        type="warning"
        block
        @click="viewersRevised"
        style="margin-top: 1rem"
      >
        确定
      </van-button>
    </van-popup>

    <!-- 推送排期 -->
    <van-popup
      v-model:show="showStudentCalendar"
      position="bottom"
      round
      style="height: 85%; display: flex; flex-direction: column"
    >
      <!-- 姓名单独放在日历上方 -->
      <div
        style="
          text-align: center;
          padding: 12px 16px 0;
          font-size: 12px;
          color: #969799;
          flex-shrink: 0;
        "
      >
        {{ Array.isArray(userAccount) ? userAccount.join("，") : userAccount }}
      </div>

      <van-calendar
        title="推送排期"
        :poppable="false"
        :show-confirm="false"
        :formatter="calendarFormatter"
        @select="onSelectCalendarDate"
        :min-date="minDate"
        :max-date="calendarMaxDate"
        style="flex: 1"
      />
    </van-popup>

    <van-popup
      v-model:show="showDayTasks"
      position="bottom"
      round
      style="height: 60%; display: flex; flex-direction: column"
    >
      <div
        style="
          padding: 16px;
          text-align: center;
          font-weight: bold;
          font-size: 18px;
          flex-shrink: 0;
        "
      >
        {{ selectedDateStr }} 推送任务
      </div>

      <!-- 中间列表区域可滚动 -->
      <div style="flex: 1; overflow-y: auto">
        <van-cell-group v-if="dayTasks.length > 0">
          <van-swipe-cell v-for="task in dayTasks" :key="task.record_id">
            <van-cell
              :title="task.time + ' - ' + task.content"
              :label="`${task.username ? task.username + ' · ' : ''}级别: ${
                task.level === '2'
                  ? '紧急'
                  : task.level === '1'
                  ? '时效'
                  : task.level === '3'
                  ? '赞美'
                  : '普通'
              }`"
            />
            <template #right>
              <van-button
                square
                type="danger"
                text="删除"
                style="height: 100%"
                @click="deleteStudentTask(task.record_id)"
              />
            </template>
          </van-swipe-cell>
        </van-cell-group>
        <van-empty v-else description="当日无未发送的推送任务" />
      </div>

      <!-- 底部按钮固定 -->
      <div style="padding: 16px; flex-shrink: 0">
        <van-button block type="primary" @click="openAddSingleTask"
          >新增当日推送</van-button
        >
      </div>
    </van-popup>

    <van-dialog
      v-model:show="showSingleTaskDialog"
      title="新增当日推送"
      show-cancel-button
      @confirm="submitSingleTask"
    >
      <div class="dialog-content" style="padding: 16px 16px 0 16px">
        <div
          class="quick-btns"
          style="margin-bottom: 12px; display: flex; flex-wrap: wrap; gap: 8px"
        >
          <van-button
            v-for="(item, index) in quickMessages"
            :key="index"
            size="small"
            plain
            type="primary"
            @click="singleTaskContent = item"
          >
            {{ item }}
          </van-button>
        </div>

        <van-field
          v-model="singleTaskContent"
          type="textarea"
          placeholder="请输入推送内容..."
          rows="3"
          autosize
          show-word-limit
          maxlength="200"
          style="
            border: 1px solid #ebedf0;
            border-radius: 6px;
            padding: 8px;
            margin-bottom: 12px;
          "
        />

        <van-field
          v-model="singleTaskImage"
          placeholder="选填: 输入图片URL (http/https开头)"
          clearable
          style="
            border: 1px solid #ebedf0;
            border-radius: 6px;
            padding: 8px;
            margin-bottom: 12px;
          "
        >
          <template #label>
             <span style="color: #323233;">附带图片1</span>
          </template>
        </van-field>

        <van-field
          v-model="singleTaskTime"
          is-link
          readonly
          label="发送时间"
          placeholder="选择时间"
          @click="showSingleTimePicker = true"
          style="padding-left: 0; padding-right: 0"
        />

        <div
          class="schedule-section"
          style="margin-top: 12px; margin-bottom: 8px"
        >
          <div class="schedule-header" style="margin-bottom: 10px">
            <span class="schedule-label" style="font-size: 14px; color: #323233"
              >推送级别</span
            >
          </div>
          <van-radio-group
            v-model="singleTaskLevel"
            direction="horizontal"
            class="push-level-group"
          >
            <van-radio name="0" style="margin-bottom: 8px; margin-right: 12px"
              >普通</van-radio
            >
            <van-radio name="1" style="margin-bottom: 8px; margin-right: 12px"
              >时效</van-radio
            >
            <van-radio
              name="2"
              icon-color="#ee0a24"
              style="margin-bottom: 8px; margin-right: 12px"
            >
              <span :style="singleTaskLevel === '2' ? 'color:#ee0a24' : ''"
                >紧急</span
              >
            </van-radio>
            <van-radio name="3" style="margin-bottom: 8px">赞美</van-radio>
          </van-radio-group>
        </div>
      </div>
    </van-dialog>

    <van-popup v-model:show="showSingleTimePicker" position="bottom" round>
      <van-picker
        :columns="recurringTimeColumns"
        @confirm="onSingleTimeConfirm"
        @cancel="showSingleTimePicker = false"
      />
    </van-popup>
    
    <!-- 推送信息 -->
    <van-dialog
      v-model:show="showPushDialog"
      title="发送信息"
      :show-confirm-button="false"
      class="push-dialog"
    >
      <div class="dialog-content">
        <p class="dialog-desc">发送给：{{ studentsSelected?.join("，") }}</p>

        <!-- 快捷按钮 -->
        <div class="quick-btns">
          <van-button
            v-for="(item, index) in quickMessages"
            :key="index"
            size="small"
            plain
            type="primary"
            @click="selectQuickMessage(item)"
          >
            {{ item }}
          </van-button>
        </div>

        <!-- 输入框 -->
        <van-field
          v-model="pushContent"
          type="textarea"
          placeholder="请输入推送内容..."
          rows="4"
          autosize
          show-word-limit
          maxlength="200"
          class="push-input"
        />

        <van-field
          v-model="pushImage"
          label="附带图片"
          placeholder="选填: 输入图片URL"
          clearable
          class="push-image-input"
        />

        <!-- 定时发送 -->
        <div class="schedule-section">
          <div class="schedule-header">
            <span class="schedule-label">发送模式</span>
          </div>
          <van-radio-group v-model="sendMode" direction="horizontal">
            <van-radio name="immediate">立即发送</van-radio>
            <van-radio name="once">单次定时</van-radio>
            <van-radio name="recurring">每周循环</van-radio>
          </van-radio-group>

          <transition name="fade">
            <div v-if="sendMode === 'once'" class="schedule-pickers">
              <van-field
                v-model="scheduleDate"
                label="日期"
                placeholder="选择日期"
                readonly
                is-link
                @click="showDatePicker = true"
              />
              <van-field
                v-model="scheduleHourLabel"
                label="时间"
                placeholder="选择时间"
                readonly
                is-link
                @click="showHourPicker = true"
              />
            </div>
          </transition>

          <transition name="fade">
            <div v-if="sendMode === 'recurring'" class="schedule-pickers">
              <van-field label="重复周期">
                <template #input>
                  <van-checkbox-group
                    v-model="recurringDays"
                    direction="horizontal"
                  >
                    <van-checkbox :name="1" shape="square">周一</van-checkbox>
                    <van-checkbox :name="2" shape="square">周二</van-checkbox>
                    <van-checkbox :name="3" shape="square">周三</van-checkbox>
                    <van-checkbox :name="4" shape="square">周四</van-checkbox>
                    <van-checkbox :name="5" shape="square">周五</van-checkbox>
                    <van-checkbox :name="6" shape="square">周六</van-checkbox>
                    <van-checkbox :name="7" shape="square">周日</van-checkbox>
                  </van-checkbox-group>
                </template>
              </van-field>

              <van-field
                v-model="recurringTime"
                label="发送时间"
                placeholder="选择每天发送时间"
                readonly
                is-link
                @click="showTimePicker = true"
              />
              <van-field
                v-model="recurrenceEndDate"
                label="循环截止至"
                placeholder="选择截止日期"
                readonly
                is-link
                @click="showEndDatePicker = true"
              />
            </div>
          </transition>
        </div>

        <!-- 推送级别 -->
        <div class="schedule-section">
          <div class="schedule-header">
            <span class="schedule-label">推送级别</span>
          </div>
          <van-radio-group
            v-model="pushLevel"
            direction="horizontal"
            class="push-level-group"
          >
            <van-radio name="0">普通推送</van-radio>
            <van-radio name="1">时效推送</van-radio>
            <van-radio name="2" icon-color="#ee0a24">
              <span :style="pushLevel === '2' ? 'color:#ee0a24' : ''"
                >紧急推送</span
              >
            </van-radio>
            <van-radio name="3">赞美推送</van-radio>
          </van-radio-group>
          <p
            class="schedule-tip"
            :style="
              pushLevel === '2'
                ? 'color:#ee0a24'
                : pushLevel === '1'
                ? 'color:#ff976a'
                : ''
            "
          >
            {{ pushLevelTip }}
          </p>
        </div>

        <!-- 日期选择弹出层 -->
        <van-calendar
          v-model:show="showDatePicker"
          title="选择发送日期"
          :min-date="minDate"
          :max-date="maxDate"
          :formatter="pushCalendarFormatter"
          @select="onCalendarSelect"
          @confirm="onDateConfirm"
        />

        <!-- 小时选择弹出层 -->
        <van-popup v-model:show="showHourPicker" position="bottom" round>
          <van-picker
            v-model="selectedHour"
            title="选择小时"
            :columns="hourColumns"
            @confirm="onHourConfirm"
            @cancel="showHourPicker = false"
          />
        </van-popup>

        <!-- 每周循环弹出层 -->
        <van-popup v-model:show="showTimePicker" position="bottom" round>
          <van-picker
            v-model="selectedRecurringTime"
            title="选择每天发送时间"
            :columns="recurringTimeColumns"
            @confirm="onRecurringTimeConfirm"
            @cancel="showTimePicker = false"
          />
        </van-popup>

        <van-popup v-model:show="showEndDatePicker" position="bottom" round>
          <van-date-picker
            v-model="selectedEndDate"
            title="选择循环截止日期"
            :min-date="minDate"
            @confirm="onEndDateConfirm"
            @cancel="showEndDatePicker = false"
          />
        </van-popup>

        <!-- 操作按钮 -->
        <div class="dialog-actions">
          <van-button block plain @click="showPushDialog = false"
            >取消</van-button
          >
          <van-button block type="primary" @click="confirmPush"
            >确认发送</van-button
          >
        </div>
      </div>
    </van-dialog>
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
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #ebedf0;
}
.van-checkbox {
  margin-left: 0px;
}

.nav-left-buttons {
  display: flex;
  align-items: center;
  gap: 16px; /* 两个按钮之间的间距，可根据需要调整 */
}

.nav-text-btn {
  color: #1989fa; /* Vant 默认的蓝色，你可以换成你的主题色 */
  font-size: 14px;
  cursor: pointer;
}

.nav-text-btn:active {
  opacity: 0.7; /* 增加点击时的反馈感 */
}

.selected-cell2 {
  background-color: #faf0ff;
}

.gray-background2 {
  background-color: white;
}

.red-background2 {
  background-color: rgba(255, 200, 200, 0.5);
  background-image: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 2px,
    rgba(128, 0, 128, 0.1) 5px,
    rgba(128, 0, 128, 0.1) 10px
  );
}

.green-background2 {
  background-color: rgba(200, 255, 200, 0.5);
  background-image: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 2px,
    rgba(128, 0, 128, 0.1) 5px,
    rgba(128, 0, 128, 0.1) 10px
  );
}

/* 推送信息 */
.dialog-content {
  padding: 12px 3px 16px;
  max-height: 70vh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch; /* iOS 惯性滚动 */
}

.dialog-desc {
  font-size: 13px;
  color: #646566;
  margin-bottom: 10px;
  word-break: break-all;
}

.quick-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.push-input {
  border: 1px solid #ebedf0;
  border-radius: 8px;
  margin-bottom: 16px;
}

.dialog-actions {
  display: flex;
  gap: 10px;
}

.schedule-section {
  padding: 8px 0 4px;
  border-top: 1px solid #f5f5f5;
  margin-top: 4px;
}

.schedule-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0 8px;
}

.schedule-label {
  font-size: 14px;
  color: #323233;
}

.schedule-tip {
  font-size: 12px;
  color: #969799;
  margin: 6px 0 0;
  padding-left: 2px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
.push-level-group {
  padding: 4px 0 6px;
  gap: 12px;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #eee;
  background-color: #fff;
}

.popup-header .title {
  font-size: 16px;
  font-weight: bold;
}

.list-container {
  flex: 1;
  overflow-y: auto; /* 列表过长时允许滚动 */
  padding-bottom: 20px;
}

/* 突出显示天数比较多的情况(可选) */
:deep(.van-cell__value) {
  color: #ee0a24;
}
</style>
