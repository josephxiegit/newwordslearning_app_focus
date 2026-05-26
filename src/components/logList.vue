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
import { useRouter, useRoute } from "vue-router";
import {
  showSuccessToast,
  showFailToast,
  showLoadingToast,
  showConfirmDialog,
  showDialog,
  Toast,
  showToast,
} from "vant";
const router = useRouter();
const route = useRoute();
const instance = getCurrentInstance();
const axios = instance.appContext.config.globalProperties.$ajax;

const originalData = ref([]);
const filteredFiles = ref([]);
const showDiamondConsume = ref(false);
const props = defineProps({
  popupWidth: {
    type: String,
    default: "100%",
  },
  popupHeight: {
    type: String,
    default: "100%",
  },
  popupPosition: {
    type: String,
    default: "bottom",
  },
  filterStudent: {
    type: String,
    default: "",
  },
  showTabbar: {
    type: Boolean,
    default: true,
  },
});

// 获得日志
async function queryData() {
  let params = new URLSearchParams();
  params.append("method", "queryLog");
  return await axios.post("words/", params).then((ret) => {
    return ret.data;
  });
}

function formatDateString(dateString) {
  const date = new Date(dateString);

  const year = date.getFullYear();
  const month = date.getMonth() + 1; // getMonth() 返回的月份是从0开始的
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();

  return `${year}年${month.toString().padStart(2, "0")}月${day
    .toString()
    .padStart(2, "0")}日${hours}时${minutes}分`;
}

function processData(res) {
  return res
    .map((item) => {
      const {
        title,
        username,
        log,
        create_time,
        nid,
        swipe,
        numberprev,
        numbershowanswer,
        numbertransparent,
        alias,
        complement,
        diamondConsume,
        teacher_mark,
        complete_status,
        earning_half,
      } = item;
      const formattedCreateTime = formatDateString(create_time); // 使用新变量存储格式化后的日期

      // 替换所有的'变为".然后把s" 变为s' 。
      let parsedLog;
      let falseCount;
      let dataString = log
        .replace(/([{,]\s*)'([^']+?)'(\s*[:])/g, '$1"$2"$3')
        .replace(/'/g, '"')
        .replace(/s" /g, "s' ")
        .replace(/"s /g, "'s ")
        .replace(/"t /g, "'t ")
        .replace(/"m /g, "'m ")
        .replace(/can"t/g, "can't")
        .replace(/couldn"t/g, "could't")
        .replace(/mustn"t/g, "mustn't")
        .replace(/must"t/g, "mustn't")
        .replace(/nustn"t/g, "nustn't")
        .replace(/needn"t/g, "needn't")
        .replace(/need"t/g, "need't")
        .replace(/o"clock/g, "o'clock")
        .replace(/won"t/g, "won't")
        .replace(/it"s/g, "it's")
        .replace(/we"re/gi, "we're'")
        .replace(/You"re/gi, "you're'")
        .replace(/You"ve/gi, "you've'")
        .replace(/they"re/gi, "they're'")
        .replace(/doesn"t/gi, "doesn't")
        .replace(/don"t/gi, "don't")
        .replace(/I"ll/gi, "I'll")
        .replace(/you"ll/gi, "you'll")
        .replace(/you"d/gi, "you'd")
        .replace(/one"s/gi, "one's")
        .replace(/let"s/gi, "let's")
        .replace(/who"s/gi, "who's")
        .replace(/weren"t/gi, "weren't")
        .replace(/daren"t/gi, "daren't")
        .replace(/it" hard/gi, "it' hard")
        .replace(/days"(?:,(?=[\u4e00-\u9fa5])|(?![,\]]))/gi, "days'");

      // 保布尔及类型等准JSON规则一致各解析逻辑:
      dataString = dataString
        .replace(/\bFalse\b/g, "false")
        .replace(/\bTrue\b/g, "true")
        .replace(/\bNone\b/g, "null");

      // try {
      parsedLog = JSON.parse(dataString);
      // }
      // catch (error) {
      //   console.error("JSON parsing error:", error);
      //   console.log("原始log数据:", log);
      //   parsedLog = log;
      // }

      // ================= [新增代码开始] 统计听力盲猜的词汇数量 =================
      let listening_number = 0;
      if (Array.isArray(parsedLog)) {
        listening_number = parsedLog.filter(logItem => logItem.听力 === true).length;
      }
      let writingwords_number = 0;
      if (Array.isArray(parsedLog)) {
        writingwords_number = parsedLog.filter(logItem => logItem.默写 === true).length;
      }
      // ================= [新增代码结束] =================

      if (swipe !== "投票") {
        const hasFlagField = parsedLog.every((logItem) => "flag" in logItem);
        // console.log('parsedLog: ', parsedLog);
        if (!hasFlagField) {
          parsedLog.forEach((logItem) => {
            const correctAnswer = logItem.答案;
            const userSelection = logItem.用户选择;

            // 将字符串转换为数组并去除空格
            const correctAnswerList = correctAnswer
              .split("；")
              .map((answer) => answer.trim());

            // 排序两个列表
            correctAnswerList.sort();
            userSelection.sort();

            // 比较两个列表并设置 flag
            if (logItem.排除 === "手写") {
              const correctAnswer_2 = logItem.英文;
              const cleanString = (str) =>
                (str || "").toLowerCase().replace(/[^a-z]/g, "");
              const userInput = cleanString(userSelection.join(","));
              const target = cleanString(correctAnswer_2);
              if (userInput && target && userInput === target) {
                return true;
              } else {
                return false;
              }
            } else {
              logItem.flag =
                correctAnswerList.length === userSelection.length &&
                correctAnswerList.join(",") === userSelection.join(",")
                  ? "true"
                  : "false";
            }
          });
        }

        falseCount = parsedLog.reduce((count, logItem) => {
          return (
            count +
            (logItem.flag === "false" || logItem.flag === "half" ? 1 : 0)
          );
        }, 0);
        parsedLog.falseCount = falseCount;
      }

      return {
        title,
        username,
        log: parsedLog,
        create_time: formattedCreateTime,
        falseCount,
        nid,
        swipe,
        numberprev,
        numbershowanswer,
        numbertransparent,
        alias,
        complement,
        diamondConsume,
        teacher_mark,
        complete_status,
        earning_half,
        listening_number,
        writingwords_number,
      };
    })
    .filter((item) => item !== null); // 过滤掉任何因错误而生成的 null 项
}
function getListData() {
  filteredFiles.value = [];
  pageIndex.value = 0;
  finished.value = false;
  loading.value = false;
  onLoad();
}

// 下拉菜单按钮
const valueDropdown1 = ref(0);
const optionDropdown1 = [
  { text: "功能按钮", value: 0 },
  { text: "多选", value: 1 },
];
const navRightText = computed(() => (isMultiMode.value ? "确认" : "刷新"));

const isMultiMode = computed(() => valueDropdown1.value === 1);
const selectedKeys = ref(new Set());

const userLogCountMap = computed(() => {
  const map = new Map();

  selectedItemsRef.value.forEach((item) => {
    const u = item?.username;
    const len = Array.isArray(item?.log) ? item.log.length : 0;
    if (!u) return;

    map.set(u, (map.get(u) || 0) + len);
  });

  return map;
});

const filteredItems = computed(() =>
  selectedItemsRef.value.filter((item) =>
    selectedUsers.value.has(item?.username)
  )
);

const filteredSelectedItemsCount = computed(() => filteredItems.value.length);

function getItemKey(item) {
  return (
    item.id ??
    `${item.create_time || ""}__${item.username || ""}__${item.title || ""}`
  );
}

function isSelected(item) {
  return selectedKeys.value.has(getItemKey(item));
}

function toggleSelect(item) {
  const key = getItemKey(item);
  if (selectedKeys.value.has(key)) {
    selectedKeys.value.delete(key);
  } else {
    selectedKeys.value.add(key);
  }
  // 触发响应式（Set 需要重新赋值一次更稳）
  selectedKeys.value = new Set(selectedKeys.value);
}
function onNavRightClick() {
  if (isMultiMode.value) {
    confirmMultiSelect();
  } else {
    reloadPage();
  }
}
function confirmMultiSelect() {
  if (selectedKeys.value.size === 0) {
    showToast("请先选择日志");
    return;
  }

  // 从当前列表中筛出被选中的完整 item
  const selectedItems = filteredFiles.value.filter((item) =>
    selectedKeys.value.has(getItemKey(item))
  );

  console.log("选中的完整数据：", selectedItems);

  // 如果你想逐条看
  selectedItems.forEach((item, idx) => {
    console.log(`第 ${idx + 1} 条：`, item);
  });

  // 汇总数据
  const wordMap = new Map();
  selectedItems.forEach((item) => {
    const username = item.username;

    if (Array.isArray(item.log)) {
      item.log.forEach((word) => {
        if (!wordMap.has(word)) {
          wordMap.set(word, {
            count: 0,
            users: new Set(),
          });
        }

        const record = wordMap.get(word);
        record.count += 1;
        record.users.add(username);
      });
    }
  });

  // 转成可打印的数组，并加自增序号
  let index = 1;
  const summaryList = [];

  wordMap.forEach((value, word) => {
    summaryList.push({
      序号: index++,
      单词: word,
      出现次数: value.count,
      用户名: [...value.users].join("、"),
    });
  });
  // 按出现次数从大到小排序
  summaryList.sort((a, b) => b.出现次数 - a.出现次数);

  // 排序后重新生成序号
  summaryList.forEach((item, idx) => {
    item.序号 = idx + 1;
  });

  selectedItemsRef.value = selectedItems; // 保存数据源（用于弹窗内二次筛选）
  selectedUsers.value = new Set(
    selectedItems.map((x) => x.username).filter(Boolean)
  ); // 默认全选所有用户名
  selectedUsers.value = new Set(selectedUsers.value); // 稳一下响应式

  // 打印结果（推荐 table，最好看）
  console.table(summaryList);
  summaryListRef.value = summaryList;
  tsvText.value = toTSV(summaryList);
  selectedItemsCount.value = selectedItems.length;
  showSummaryPopup.value = true;

  // 示例：退出多选模式
  valueDropdown1.value = 0;
}

function onCellClick(item, index) {
  if (isMultiMode.value) {
    toggleSelect(item);
    return;
  }
  // 正常模式才触发你原来的逻辑
  toggleDetail(index);
}

// 投票复制汇总
// 1) Popup 相关状态
const showSummaryPopup = ref(false); // 控制弹窗显示
const summaryListRef = ref([]); // 弹窗里用于“预览表格”的数据（用户名截断）
const tsvText = ref(""); // 弹窗里用于“复制到Excel”的完整 TSV
const tsvTextarea = ref(null); // template 里 <textarea ref="tsvTextarea" ... />
const selectedItemsRef = ref([]); // 保存 confirmMultiSelect 得到的 selectedItems（完整 item）

// 选中日志中涉及到的所有用户名（完整、不重复）
const allUsernames = computed(() => {
  const set = new Set();
  selectedItemsRef.value.forEach((item) => {
    if (item?.username) set.add(item.username);
  });
  return Array.from(set);
});
const allUsernamesText = computed(() => allUsernames.value.join("、"));
const selectedUsers = ref(new Set());
function isUserSelected(u) {
  return selectedUsers.value.has(u);
}

function toggleUser(u) {
  if (selectedUsers.value.has(u)) selectedUsers.value.delete(u);
  else selectedUsers.value.add(u);

  selectedUsers.value = new Set(selectedUsers.value); // 触发响应式
  refreshSummaryByUsers(); // 切换后立刻刷新汇总
}

// 便捷：全选 / 全不选
function selectAllUsers() {
  selectedUsers.value = new Set(allUsernames.value);
  refreshSummaryByUsers();
}
function clearAllUsers() {
  selectedUsers.value = new Set();
  refreshSummaryByUsers();
}
function buildSummaryListFromItems(items) {
  const wordMap = new Map();

  items.forEach((item) => {
    const username = item?.username;
    if (!Array.isArray(item?.log)) return;

    item.log.forEach((w) => {
      const word = String(w ?? "").trim();
      if (!word) return;

      if (!wordMap.has(word)) {
        wordMap.set(word, { count: 0, users: new Set() });
      }
      const record = wordMap.get(word);
      record.count += 1;
      if (username) record.users.add(username);
    });
  });

  const summaryList = [];
  wordMap.forEach((value, word) => {
    summaryList.push({
      单词: word,
      出现次数: value.count,
      用户名: [...value.users].join("、"),
    });
  });

  summaryList.sort((a, b) => b.出现次数 - a.出现次数);
  summaryList.forEach((row, idx) => (row.序号 = idx + 1));

  return summaryList;
}
function refreshSummaryByUsers() {
  // 1) 如果一个用户名都没选中，就展示空汇总（你也可以选择展示全部）
  if (selectedUsers.value.size === 0) {
    summaryListRef.value = [];
    tsvText.value = toTSV([]);
    return;
  }

  // 2) 过滤 selectedItemsRef
  const filteredItems = selectedItemsRef.value.filter((item) =>
    selectedUsers.value.has(item?.username)
  );

  // 3) 重新生成汇总
  const summaryList = buildSummaryListFromItems(filteredItems);

  // 4) 更新弹窗展示 + 复制内容 + 合计（你顶部的 totalWords/totalCount 已经是 computed）
  summaryListRef.value = summaryList;
  tsvText.value = toTSV(summaryList);
}

// 2) 合计信息（顶部显示）
const selectedItemsCount = ref(0); // 选中日志条数（你 confirmMultiSelect 里已赋值）
const totalWords = computed(() => summaryListRef.value.length);
const totalCount = computed(() =>
  summaryListRef.value.reduce((sum, r) => sum + (Number(r?.出现次数) || 0), 0)
);

// 3) TSV 生成：Excel 直接粘贴自动分列
function toTSV(summaryList, withHeader = false) {
  const lines = [];

  if (withHeader) {
    const headers = ["序号", "单词", "出现次数", "用户名"];
    lines.push(headers.join("\t"));
  }

  summaryList.forEach((row) => {
    lines.push(
      [
        row?.序号 ?? "",
        row?.单词 ?? "",
        row?.出现次数 ?? "",
        row?.用户名 ?? "",
      ].join("\t")
    );
  });

  return lines.join("\n");
}

// 4) 用户名预览：窄屏只显示部分，但复制仍是完整用户名
function makeUsersPreview(fullUsersString, maxShow = 2) {
  if (!fullUsersString) return "";
  const arr = fullUsersString
    .split("、")
    .map((s) => s.trim())
    .filter(Boolean);

  if (arr.length <= maxShow) return arr.join("、");
  return `${arr.slice(0, maxShow).join("、")}…（共${arr.length}人）`;
}

// 5) 弹窗预览表格用的数据：增加 “用户名预览” 字段
const previewRows = computed(() =>
  summaryListRef.value.map((r) => ({
    ...r,
    用户名预览: makeUsersPreview(r?.用户名, 2), // 这里 2 表示最多显示 2 个用户名
  }))
);

// 6) 一键复制：始终复制完整 TSV（tsvText）
async function copySummaryToClipboard() {
  const text = tsvText.value || "";
  if (!text.trim()) {
    showToast("没有可复制的数据");
    return;
  }

  // 优先 Clipboard API
  try {
    await navigator.clipboard.writeText(text);
    showToast("已复制（完整），可直接粘贴到 Excel");
    return;
  } catch (e) {
    // fallback：选中隐藏 textarea
    try {
      const el = tsvTextarea.value;
      if (!el) throw new Error("no textarea");
      el.focus();
      el.select();
      document.execCommand("copy");
      showToast("已复制（完整），可直接粘贴到 Excel");
    } catch (err) {
      showToast("复制失败：请手动复制");
    }
  }
}

// 筛选日志
const showFliterBox = ref(false);
const valueSearchStudent = ref("");
const valueSearchLog = ref("");
const valueAliasLog = ref("");
const loading = ref(false);
const finished = ref(false);
const pageIndex = ref(0);

// 监听filterStudent属性变化，自动更新筛选条件
watch(
  () => props.filterStudent,
  (newValue) => {
    if (newValue !== valueSearchStudent.value) {
      valueSearchStudent.value = newValue;
      // 触发筛选操作
      if (
        newValue ||
        valueSearchLog.value ||
        valueAliasLog.value ||
        valueVariety.value
      ) {
        getListData();
      }
    }
  }
);

// 筛选类型
const valueVariety = ref("");
const showVarietyPicker = ref(false);
const columnsVarieties = [
  { text: "普通", value: "普通" },
  { text: "游戏", value: "游戏" },
  { text: "滑动", value: "滑动" },
  { text: "复习", value: "复习" },
  { text: "回顾", value: "回顾" },
];
const onConfirmVariety = ({ selectedValues }) => {
  showVarietyPicker.value = false;
  valueVariety.value = selectedValues[0];
};
const onLoad = async () => {
  if (loading.value || finished.value) {
    return;
  }
  const params = new URLSearchParams();
  params.append("method", "filterLog");
  // params.append("alias", title);
  params.append("filterStudent", valueSearchStudent.value);
  params.append("filterXlsm", valueSearchLog.value);
  params.append("variety", valueVariety.value);
  params.append("alias", valueAliasLog.value);
  params.append("page", pageIndex.value + 1); // 请求下一页的数据
  params.append("page_size", 20); // 每页数据大小

  const response = await axios.post("words/", params);
  let moreData = response.data.data;
  moreData = processData(moreData);
  filteredFiles.value.push(...moreData);
  console.log("moreData: ", moreData);
  pageIndex.value++;
  finished.value = !response.data.has_more;

  loading.value = false;
  return filteredFiles.value;
};

const clearFilterData = () => {
  valueSearchStudent.value = "";
  valueSearchLog.value = "";
  valueAliasLog.value = "";
  valueVariety.value = "";
};
async function filterData() {
  let params = new URLSearchParams();
  params.append("method", "filterLog");
  params.append("filterStudent", valueSearchStudent.value);
  params.append("filterXlsm", valueSearchLog.value);
  params.append("alias", valueAliasLog.value);
  params.append("variety", valueVariety.value);
  return await axios.post("words/", params).then((ret) => {
    return ret.data;
  });
}
const filteredStudent = () => {
  if (
    valueSearchStudent.value == "" &&
    valueSearchLog.value == "" &&
    valueAliasLog.value == "" &&
    valueVariety.value == ""
  ) {
    return;
  }
  filterData().then((res) => {
    console.log("res: ", res);
    let data = processData(res.data);
    filteredFiles.value = [...data];
    showFliterBox.value = false;
  });
};
const generateTitle = (item) => {
  const titleFirstPart = item.title.split(".")[0]; // 只保留第一部分
  // if (Array.isArray(item.alias)) {
  //   const strAlias = item.alias
  //     .map((item) => item.title.replace(/\.xlsm$/, ""))
  //     .join("\n"); // 使用换行符
  //   return `${titleFirstPart} | \n${strAlias}`; // 在字符串中加入换行符
  // }

  if (item.swipe === "游戏") {
    return `${titleFirstPart} | ${item.swipe} ${item.numberprev}${item.numbershowanswer}${item.numbertransparent}`;
  }
  return `${titleFirstPart} | ${item.swipe}`;
};
// 日志详情
const showDetail = ref(false);
const showVote = ref(false);
const detailChallenge = ref(false);
const detailName = ref("");
const detailAlias = ref("");
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
const detailPopup = ref("");

// 延迟库
async function getUncertain(nid) {
  loadingUncertain.value = true;
  let params = new URLSearchParams();
  params.append("method", "getUncertain");
  params.append("nid", nid);
  return await axios.post("words/", params).then((ret) => {
    loadingUncertain.value = false;
    const res = JSON.parse(ret.data["uncertain_vocabulary"]);
    return res;
  });
}
const getUncertainVocabulary = () => {
  getUncertain(detailNid.value).then((res) => {
    console.log("res: ", res);
    res.sort((a, b) => {
      const importantTypes = ["点金", "透视", "回溯"];

      const aHasImportantType = importantTypes.some((type) =>
        a.type.includes(type)
      );
      const bHasImportantType = importantTypes.some((type) =>
        b.type.includes(type)
      );

      // 如果 a 有重要类型而 b 没有，a 排在前面
      if (aHasImportantType && !bHasImportantType) {
        return -1;
      }
      // 如果 b 有重要类型而 a 没有，b 排在前面
      if (bHasImportantType && !aHasImportantType) {
        return 1;
      }
      // 如果两者都有或都没有重要类型，则保持原顺序
      return 0;
    });
    uncertainResult.value = res;
  });
};


// 回顾详情
const showDetailPopup = ref(false);
const currentDetail = ref(null);
const openDetail = (detail) => {
  currentDetail.value = detail;
  showDetailPopup.value = true;
};

const toggleDetail = async (index) => {
  const detail = filteredFiles.value[index];
  console.log("detail: ", detail);
  console.log("title: ", detail["title"]);
  if(detail["title"] == "回顾词汇"){
    openDetail(detail);
    return
  }
  detailPopup.value = detail;
  detailMode.value = detail["swipe"];
  detailName.value = detail["username"];
  detailAlias.value = detail["alias"];

  detailDate.value = detail["create_time"];
  detailXlsmName.value = detail["title"];
  detailNid.value = detail["nid"];

  numberprev.value = detail["numberprev"];
  numbershowanswer.value = detail["numbershowanswer"];
  numbertransparent.value = detail["numbertransparent"];
  diamondConsume.value = detail["diamondConsume"];

  detailRate.value =
    detail["log"].length - detail["falseCount"] + "/" + detail["log"].length;
  detailList.value = detail["log"];
  if (detailMode.value == "投票") {
    showVote.value = true;
  } else {
    showDetail.value = true;
  }

  if (detailMode.value == "挑战") {
    const params = new URLSearchParams();
    params.append("method", "getAccountApplyChallenge");
    params.append("log_nid", detailNid.value);

    const response = await axios.post("words/", params);
    console.log("response.data", response.data);
    detailChallenge.value = response.data.apply_challenge;
    checkedChallenge.value = !detailChallenge.value;

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

    // 更新 detailList 中每个项目的 teacher_mark 状态
    detailList.value.forEach((item) => {
      if (teacherMarkedWords.has(item.英文)) {
        item.teacherMark = true;
      } else {
        item.teacherMark = false;
      }
    });
  } else {
    getUncertain(detail["nid"]).then((res) => {
      if (res) {
        uncertainResult.value = res;
      }
    });
  }
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
    const sortedUserChoices = [...userChoices].sort(); // Copy userChoices array and sort

    if (sortedUserChoices.length !== answers.length) {
      return false; // If lengths are not equal, return false
    }

    return sortedUserChoices.every(
      (choice, index) => choice === answers[index]
    );
  }
};

// 删除日志
const deleteItem = (item, index) => {
  // console.log("index: ", index);
  // console.log("item: ", item);
  showDetail.value = false;
  async function deleteLog() {
    // 查询学生
    let params = new URLSearchParams();
    params.append("method", "deleteLog");
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
    deleteLog()
      .then((res) => {
        console.log("res: ", res);
        showSuccessToast("删除成功");
        getListData();
        filteredStudent();
      })
      .catch((err) => {
        console.log("err: ", err);
        showFailToast("数据未找到");
      });
  });
};

// 查看答案日志
const showAnswerLog = ref(false);
const answerLogResult = ref([]);
const answerUsername = ref("");
const answerAttempt = ref("");
const answerSwipe = ref("");
const answerRate = ref("");
const answerTitle = ref("");
const answerTureRate = ref("");
const searchAnswer = (item, index) => {
  console.log(item);
  answerUsername.value = item.username;
  answerAttempt.value = item.attempt;
  answerSwipe.value = item.swipe;

  answerRate.value = item.rate;
  answerTitle.value = item.alias;
  const lenData = item.log.length;
  const trueCount = item.log.filter((item) => item.flag === "true").length;
  answerTureRate.value = trueCount + " / " + lenData;
  async function getAnswerLog() {
    let params = new URLSearchParams();
    params.append("method", "getAnswerLogBylog");
    params.append("account_log_id", item.nid);
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
      answerLogResult.value = res;
    }
  });
};
// 延迟库
const showUncertain = ref(false);
const uncertainResult = ref("");
const loadingUncertain = ref(false);
const showUncertainResult = () => {
  showUncertain.value = true;
};

// 挑战模式
const checkboxRefs3 = ref({});
const checkboxStates = ref({});
const checkedChallenge = ref(true);
const changeSwitchChallenge = () => {
  if (checkedChallenge.value) {
    // 打开点击自动上传
    showToast("点击就上传");
  } else {
    // 只能使用刷新按钮上传
    showToast("按钮才会上传");
  }
};
const toggleCheckChallenge = (index) => {
  if (detailChallenge.value) return;
  // 切换选中状态
  checkboxStates.value[index] = !checkboxStates.value[index];
  if (detailList.value[index]) {
    if (checkboxStates.value[index]) {
      detailList.value[index].teacherMark = true;
    } else {
      delete detailList.value[index].teacherMark;
    }
  }
  console.log("checkedChallenge", checkedChallenge.value);
  if (detailMode.value === "挑战" && checkedChallenge.value) {
    refreshDataChallenge();
  }
};
const refreshDataChallenge = async () => {
  try {
    const response = await axios.post(
      "words/",
      {
        method: "refreshTeacherChallenge",
        nid: detailNid.value,
        teacher_mark: JSON.stringify(detailList.value),
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.log("response: ", response);

    if (response.data.success) {
      showSuccessToast("教师标记更新成功");
    } else {
      showFailToast("更新失败：" + (response.data.message || "未知错误"));
    }
  } catch (error) {
    console.error("提交教师标记失败:", error);
    showFailToast("提交失败，请检查网络连接");
  }
};

onMounted(async () => {});

// 刷新页面
const reloadPage = () => {
  let res = new Promise((resolve, reject) => {
    clearFilterData();
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
        title="账户日志"
        :right-text="navRightText"
        left-text="筛选"
        @click-right="onNavRightClick"
        @click-left="showFliterBox = true"
      />
    </div>
    <div class="dropdown-container">
      <van-dropdown-menu>
        <van-dropdown-item
          v-model="valueDropdown1"
          :options="optionDropdown1"
        />
      </van-dropdown-menu>
    </div>

    <router-view />
    <van-tabbar v-if="showTabbar" route>
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

    <!-- 筛选数据 -->
    <van-popup
      v-model:show="showFliterBox"
      :position="popupPosition"
      :style="{ height: popupHeight, width: popupWidth }"
      closeable
      :lock-scroll="false"
    >
      <van-cell-group inset style="">
        <div style="font-size: 18px; font-weight: 700; margin: 1rem">
          筛选日志
        </div>
        <!-- 关键词筛选 -->
        <van-field
          v-model="valueSearchStudent"
          label="学生"
          placeholder="请输入学生姓名"
        />
        <!-- 试题 -->
        <van-field
          v-model="valueSearchLog"
          label="试题"
          placeholder="请输入试题"
        />
        <van-field
          v-model="valueAliasLog"
          label="分组"
          placeholder="请输入分组"
        />
        <!-- 类型 -->
        <van-field
          v-model="valueVariety"
          is-link
          readonly
          label="类型"
          placeholder="选择类型"
          @click="showVarietyPicker = true"
        />
        <van-popup v-model:show="showVarietyPicker" round position="bottom">
          <van-picker
            :columns="columnsVarieties"
            @cancel="showVarietyPicker = false"
            @confirm="onConfirmVariety"
          />
        </van-popup>
        <van-button
          @click="filteredStudent()"
          type="danger"
          block
          style="margin-top: 1rem"
          >筛选日志</van-button
        >
        <van-button
          @click="clearFilterData()"
          type="success"
          block
          style="margin-top: 0.2rem"
          >清除筛选</van-button
        >
      </van-cell-group>
    </van-popup>

    <!-- 复制汇总投票 -->
    <van-popup
      v-model:show="showSummaryPopup"
      :position="popupPosition"
      round
      :style="{ height: popupHeight, width: popupWidth }"
      closeable
    >
      <!-- 顶部栏：标题 + 合计 + 按钮（置顶） -->
      <div class="summary-header">
        <div class="summary-title">单词汇总</div>

        <div class="summary-stats">
          <span>选中日志：{{ filteredSelectedItemsCount }}</span>
          <span>汇总单词：{{ totalWords }}</span>
          <span>总出现：{{ totalCount }}</span>
          <div class="summary-users">
            <div class="summary-users-title">
              <van-button
                size="mini"
                type="primary"
                plain
                @click="selectAllUsers"
                >全选</van-button
              >
              <van-button
                size="mini"
                type="default"
                plain
                @click="clearAllUsers"
                >清空</van-button
              >
            </div>

            <div class="summary-users-buttons">
              <van-tag
                v-for="u in allUsernames"
                :key="u"
                :type="isUserSelected(u) ? 'primary' : 'default'"
                :plain="!isUserSelected(u)"
                round
                @click="toggleUser(u)"
              >
                {{ u }}
                <span style="margin-left: 4px; opacity: 0.7">
                  ({{ userLogCountMap.get(u) || 0 }})
                </span>
              </van-tag>
            </div>
          </div>
        </div>

        <div class="summary-actions">
          <van-button
            size="small"
            type="primary"
            @click="copySummaryToClipboard"
          >
            复制（完整）
          </van-button>
          <van-button
            size="small"
            type="default"
            @click="showSummaryPopup = false"
          >
            关闭
          </van-button>
        </div>
      </div>

      <!-- 表头（置顶） -->
      <div class="summary-table-head">
        <div class="c1">序号</div>
        <div class="c2">单词</div>
        <div class="c3">次数</div>
        <div class="c4">用户名（预览）</div>
      </div>

      <!-- 表体：可滚动 -->
      <div class="summary-table-body">
        <div class="summary-row" v-for="row in previewRows" :key="row.序号">
          <div class="c1">{{ row.序号 }}</div>
          <div class="c2">{{ row.单词 }}</div>
          <div class="c3">{{ row.出现次数 }}</div>
          <div class="c4">{{ row.用户名预览 }}</div>
        </div>
      </div>

      <!-- 隐藏：用于复制的完整 TSV（不展示，但复制用它） -->
      <textarea
        ref="tsvTextarea"
        class="summary-hidden-ta"
        :value="tsvText"
        readonly
      />
    </van-popup>

    <!-- 日志列表 -->
    <van-list
      v-model="loading"
      :finished="finished"
      finished-text="没有更多了"
      @load="onLoad"
      style="margin-bottom: 80px; padding-top: 0px"
    >
      <van-swipe-cell
        v-for="(item, index) in filteredFiles"
        :key="getItemKey(item)"
        :disabled="isMultiMode"
        stop-propagation
      >
        <template #right>
          <van-button
            square
            type="danger"
            text="删除"
            @click="deleteItem(item, index)"
          />
        </template>
        <template #left>
          <van-button
            square
            type="primary"
            text="答案"
            @click="searchAnswer(item, index)"
          />
        </template>
        <van-cell
          :title="generateTitle(item)"
          :is-link="!isMultiMode"
          :clickable="!isMultiMode"
          @click.stop="onCellClick(item, index)"
        >
          <template #label>
            <div class="label-line">{{ item.create_time.slice(2) }}</div>
            <div v-if="item.teacher_mark != ''" style="display: flex">
              {{ item.teacher_mark }}
              <div v-if="item.complete_status">⚡️</div>
              <div v-if="item.earning_half">💔</div>
            </div>
          </template>
          <template #title>
            <div v-if="item.title == '多组复习'">
              <div
                v-for="(item_alias, index_alias) in item.alias"
                :key="index_alias"
              >
                <div style="font-size: smaller; margin-top: 0.2rem">
                  {{ item_alias["title"].replace(/\.xlsm$/, "") }}
                </div>
              </div>
            </div>
            <div v-else>{{ generateTitle(item) }}</div>
          </template>
          <template #value>
            <div
              style="display: flex; align-items: center; justify-content: right"
            >
              <div>
                <div style="color: black">
                  <div
                    v-if="item.complement == 1"
                    style="display: flex; justify-content: flex-end"
                  >
                    <van-tag type="primary" plain mark size="medium">
                      {{ item.log.length - item.falseCount }} /
                      {{ item.log.length }}
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
                  <div
                    v-if="item.complement == 0 && item.swipe == '投票'"
                    style="display: flex; justify-content: flex-end"
                  >
                    {{ item.log.length }}
                  </div>
                  <div v-else style="display: flex; justify-content: flex-end">
                    {{ item.log.length - item.falseCount }} /
                    {{ item.log.length }}
                    <div
                      v-if="
                        item.diamondConsume != null &&
                        item.diamondConsume != '' &&
                        item.swipe != '滑动'
                      "
                    >
                      &nbsp;💎
                    </div>
                  </div>
                </div>
                <div style="color: red">{{ item.username }}</div>
              </div>
              <van-checkbox
                v-if="isMultiMode"
                :model-value="isSelected(item)"
                @click.stop="toggleSelect(item)"
              />
            </div>
          </template>
          <!-- <template #icon>
            <van-checkbox
              v-if="isMultiMode"
              :model-value="isSelected(item)"
              @click.stop="toggleSelect(item)"
            />
          </template> -->
        </van-cell>
      </van-swipe-cell>
    </van-list>

    <!-- 答案日志 -->
    <van-popup
      v-model:show="showAnswerLog"
      :position="popupPosition"
      :style="{ height: popupHeight, width: popupWidth }"
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
          <div>{{ answerUsername }} ｜ {{ answerTureRate }}</div>
          <div style="margin-top: 0.3rem">
            {{ answerSwipe }}
          </div>
        </div>
        <div v-for="(item, index) in answerLogResult" :key="index">
          <van-cell :value="item.duration" :label="item.create_time">
            <template #title>
              <div style="font-size: larger; font-weight: 700">
                {{ item.type }}
              </div>
            </template>
            <template #value>
              <div style="margin-top: 0.2rem; font-size: smaller">
                <div>{{ item.duration }}</div>
              </div>
            </template>
          </van-cell>
        </div>
      </van-cell-group>
    </van-popup>

    <!-- 日志详情 -->
    <van-popup
      v-model:show="showDetail"
      :position="popupPosition"
      :style="{ height: popupHeight, width: popupWidth }"
      closeable
      :lock-scroll="false"
    >
      <van-cell-group inset>
        <div>
          <div style="display: flex; justify-content: space-between">
            <div style="font-size: 18px; font-weight: 700; margin: 1rem">
              {{ detailName }} | {{ detailMode }}
            </div>
            <div
              style="
                margin-right: 2.5rem;
                margin-top: 1.2rem;
                font-size: 12px;
                color: gray;
              "
            >
              {{ detailDate }}
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
              <div style="margin-top: 0.1rem">{{ detailRate }}</div>

              <div
                v-if="detailMode !== '挑战'"
                style="display: flex; margin-top: -0.1rem"
              >
                <span
                  style="
                    margin-left: 1rem;
                    color: blueviolet;
                    margin-top: 0.1rem;
                  "
                  @click="showUncertainResult"
                  >迟疑库 {{ uncertainResult.length }}</span
                >
                <div style="display: flex; margin-top: 0.1rem">
                  <van-icon
                    style="margin-top: 0.1rem"
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
              <div v-else>
                <div
                  style="display: flex; margin-top: 0.1rem; margin-left: 2rem"
                >
                  <div @click="refreshDataChallenge" style="font-size: 12px">
                    上传标记
                  </div>
                  <van-icon
                    style="margin-top: 0.1rem"
                    name="replay"
                    color="#8B0000"
                    v-show="!loadingUncertain"
                    @click="refreshDataChallenge()"
                  />
                  <van-loading
                    size="14"
                    v-show="loadingUncertain"
                    style="margin-left: 0.3rem"
                  />
                  <van-switch
                    style="margin-left: 1rem"
                    v-model="checkedChallenge"
                    size="15px"
                    @change="changeSwitchChallenge()"
                  />
                </div>
              </div>
            </div>

            <div style="margin-top: 0.1rem; color: gray">
              {{ detailXlsmName.slice(0, -5) }}
            </div>
          </div>
          <div style="margin-top: 0.2rem; margin-left: 1rem">
            <van-button
              square
              type="primary"
              text="删除"
              size="small"
              @click="deleteItem(detailPopup, index)"
            />
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
              💎{{ diamondConsume }}
            </div>
          </div>
          <div
            v-if="
              diamondConsume != null &&
              diamondConsume != '' &&
              detailMode === '普通'
            "
            style="font-size: 13px; color: gray; margin: 5px 15px"
          >
            💎 {{ diamondConsume }}
          </div>
        </div>
        <div v-for="(item, index) in detailList" :key="index">
          <van-cell
            :class="{
              'selected-cell': checkboxStates[index] && !detailChallenge,
              'disabled-cell': detailChallenge,
            }"
            @click="!detailChallenge ? toggleCheckChallenge(index) : null"
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
                <van-tag v-if="item.听力" type="warning" mark>听</van-tag>
                <van-tag v-if="item.默写" type="danger" mark>默</van-tag>
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

            <!-- 挑战模式下显示多选框 -->
            <template
              #right-icon
              v-if="detailMode === '挑战' && !detailChallenge"
            >
              <van-checkbox
                :name="`${index + 1}`"
                v-model="checkboxStates[index]"
                :ref="(el) => (checkboxRefs3[`${index}`] = el)"
                :disabled="detailChallenge"
                @click.stop.prevent="toggleCheckChallenge(index)"
              />
            </template>
          </van-cell>
        </div>
      </van-cell-group>
    </van-popup>

    <!-- 回顾详情 -->
    <van-popup
      v-model:show="showDetailPopup"
      position="bottom"
      round
      closeable
      :style="{ height: '90%', display: 'flex', flexDirection: 'column' }"
    >
      <div v-if="currentDetail" class="popup-container">
        <div class="popup-header">
          <h2 class="popup-title">{{ currentDetail.title }}</h2>
          <div class="popup-info">
            <span>🧑‍🎓 学生：{{ currentDetail.username }}</span>
            <span>🕒 时间：{{ currentDetail.create_time }}</span>
          </div>
        </div>

        <div class="popup-list-wrap">
          <div
            v-for="(item, index) in currentDetail.log"
            :key="index"
            class="log-card"
            :class="{ 'highlight-red': item.flag === false }"
          >
            <div class="word-main">
              <span class="word-en">{{ item.英文 }}</span>
              <span class="word-cn">{{ item.中文 }}</span>
            </div>
            <div class="word-stats">
              <span class="times-badge">次数: {{ item.次数 }}</span>
            </div>
          </div>
        </div>
      </div>
    </van-popup>

    <!-- 投票详情 -->
    <van-popup
      v-model:show="showVote"
      :position="popupPosition"
      :style="{ height: popupHeight, width: popupWidth }"
      closeable
      :lock-scroll="false"
    >
      <van-cell-group inset>
        <div>
          <div style="display: flex; justify-content: space-between">
            <div style="font-size: 18px; font-weight: 700; margin: 1rem">
              用户名：{{ detailName }}
            </div>

            <div
              style="
                margin-right: 2.5rem;
                margin-top: 1.2rem;
                font-size: 12px;
                color: gray;
              "
            >
              {{ detailDate }}
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
              <div style="margin-top: 0rem">选择{{ detailList.length }}个</div>
            </div>

            <div style="margin-top: 0.1rem; color: gray">
              {{ detailMode }} ｜
              {{ detailXlsmName.slice(0, -5) }}
            </div>
          </div>
          <div style="margin-top: 0.2rem; margin-left: 1rem">
            <van-button
              square
              type="primary"
              text="删除"
              size="small"
              @click="deleteItem(detailPopup, index)"
            />
          </div>
        </div>
        <div v-for="(item, index) in detailList" :key="index">
          <van-cell>
            <template #title>
              {{ item }}
            </template>
          </van-cell>
        </div>
      </van-cell-group>
    </van-popup>

    <!-- 延迟库 -->
    <van-popup
      v-model:show="showUncertain"
      :position="popupPosition"
      :style="{ height: popupHeight, width: popupWidth }"
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
  </div>
</template>




<style>
.nav-bar-container {
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10000;
  background: #fff;
}
.dropdown-container {
  position: sticky;
  top: 40px;
  left: 0;
  right: 0;
  z-index: 999;
  background: #fff;
  padding-bottom: 10px;
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

.selected-cell {
  background-color: #f0f8ff; /* 浅蓝色背景 */
  border-left: 3px solid #1989fa; /* 左侧蓝色边框 */
}

/* 投票 */
.summary-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #fff;
  padding: 12px 12px 8px;
  border-bottom: 1px solid #eee;
}

.summary-title {
  font-size: 16px;
  font-weight: 700;
}

.summary-stats {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  font-size: 12px;
  color: #666;
}

.summary-actions {
  margin-top: 10px;
  display: flex;
  gap: 10px;
}

.summary-table-head {
  position: sticky;
  top: 94px; /* 头部高度大概值；如果你头部更高/更矮，调整这里 */
  z-index: 9;
  background: #fff;
  display: flex;
  padding: 8px 12px;
  border-bottom: 1px solid #eee;
  font-size: 12px;
  font-weight: 700;
}

.summary-table-body {
  height: calc(
    78vh - 94px - 36px
  ); /* 78vh - header(约94) - 表头(约36)，可按实际微调 */
  overflow: auto;
  padding: 0 12px 12px;
}

.summary-row {
  display: flex;
  padding: 8px 0;
  border-bottom: 1px dashed #f0f0f0;
  font-size: 12px;
}

/* 列宽：窄屏友好 */
.c1 {
  width: 44px;
  flex: 0 0 44px;
}
.c2 {
  width: 110px;
  flex: 0 0 110px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.c3 {
  width: 50px;
  flex: 0 0 50px;
  text-align: right;
  padding-right: 6px;
}
.c4 {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #333;
}

.summary-hidden-ta {
  position: fixed;
  left: -9999px;
  top: -9999px;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.summary-users {
  display: block; /* 单独一行 */
  margin-top: 4px;
  font-size: 12px;
  color: #555;
  word-break: break-all; /* 防止超长 */
}

.summary-users-title {
  margin-bottom: 10px;
  margin-top: -6px;
}

/* 回顾详情 */
.popup-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #f7f8fa; /* 浅灰色背景让卡片更立体 */
}

/* 顶部信息区 */
.popup-header {
  padding: 24px 20px 16px;
  background-color: #fff;
  flex-shrink: 0;
  border-bottom: 1px solid #ebedf0;
}

.popup-title {
  font-size: 18px;
  font-weight: 600;
  color: #323233;
  margin: 0 0 12px 0;
  text-align: center;
}

.popup-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: #969799;
}

/* 列表滚动区 */
.popup-list-wrap {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 单个词汇卡片 */
.log-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.2s;
}

/* 左侧中英文 */
.word-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.word-en {
  font-size: 16px;
  font-weight: bold;
  color: #323233;
}

.word-cn {
  font-size: 13px;
  color: #646566;
}

/* 右侧次数标签 */
.times-badge {
  background-color: #f2f3f5;
  color: #969799;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

/* 🔥 核心要求：flag 为 false 的加红 */
.highlight-red .word-en,
.highlight-red .word-cn {
  color: #ee0a24 !important; /* Vant 的标准红色 */
}

.highlight-red .times-badge {
  background-color: #fef0f0;
  color: #ee0a24;
}
</style>
