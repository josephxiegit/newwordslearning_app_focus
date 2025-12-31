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
    default: false
  }
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
  valueGrade.value = item["grade__grade_name"];
  valueLocation.value = item["location__location_name"];
  userAccount.value = item["username"];
  valueFlowers.value = item["flowers"];
  selectedLocationIndex.value = [valueLocation.value];
  selectedGradeIndex.value = [valueGrade.value];

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
const valueFlowers = ref(0)
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
const valueType = ref("普通双模式");
const valueNoneOfAbove = ref(7);
const valuePinned = ref(1);
const valueSpellNumber = ref(0);
const showSelectSpellVocabulary = ref(false);
const synonymsSelected = ref([]);
const selectSpellVocabulary = ref([]);
const columnsType = [
  { text: "普通双模式", value: "普通双模式" },
  { text: "限制模式", value: "限制模式" },
  { text: "考试模式", value: "考试模式" },
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
const onConfirmType = ({ selectedValues }) => {
  showTypePicker.value = false;
  valueType.value = selectedValues[0];
};
const onConfirmPinned = ({ selectedValues }) => {
  showPinned.value = false;
  valuePinned.value = selectedValues[0];
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
</script>

<template>
  <div>
    <div class="nav-bar-container">
      <van-nav-bar
        title="词汇分配列表"
        right-text="分配"
        left-text="排序"
        @click-right="toggleMultiSelect()"
        @click-left="sortXlsm()"
      />
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

    <!-- 日期选择 -->
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
              :label="item2.password"
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
                  <!-- <div style="font-size: 13px;color: goldenrod;margin-top: 2px;">{{ item2.diamonds }}</div> -->
                </div>
              </template>
              <template #right-icon>
                <van-checkbox
                  :name="item2.username"
                  @click.stop="() => {}"
                />
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
              <van-switch v-model="checkedClearPinned" active-color="#ee0a24"/>
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
      :style="{ height: '90%' }"
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

        <!-- 周长 -->
        <van-field
          v-model="daily_times"
          label="周长"
          placeholder="请输入周长次数"
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
</style>
