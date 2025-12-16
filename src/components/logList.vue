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
      } = item;
      const formattedCreateTime = formatDateString(create_time); // 使用新变量存储格式化后的日期

      // 替换所有的'变为".然后把s" 变为s' 。
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
        .replace(/let"s/gi, "let's")
        .replace(/it" hard/gi, "it' hard")
        .replace(/days"(?:,(?=[\u4e00-\u9fa5])|(?![,\]]))/gi, "days'");

      // 保布尔及类型等准JSON规则一致各解析逻辑:
      dataString = dataString
        .replace(/\bFalse\b/g, "false")
        .replace(/\bTrue\b/g, "true")
        .replace(/\bNone\b/g, "null");

      let parsedLog;
      try {
        parsedLog = JSON.parse(dataString);
      } catch (error) {
        console.error("JSON parsing error:", error);
        console.log("原始log数据:", log);
        // 如果JSON解析失败，直接使用原始log数据
        parsedLog = log;
      }

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

      const falseCount = parsedLog.reduce((count, logItem) => {
        return (
          count + (logItem.flag === "false" || logItem.flag === "half" ? 1 : 0)
        );
      }, 0);
      parsedLog.falseCount = falseCount;

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
    // console.log("res: ", res);
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

const toggleDetail = async (index) => {
  const detail = filteredFiles.value[index];
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
  showDetail.value = true;
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
  if (detailMode.value === '挑战' && checkedChallenge.value) {
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
        right-text="刷新"
        left-text="筛选"
        @click-right="reloadPage()"
        @click-left="showFliterBox = true"
      />
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

    <!-- 日志列表 -->
    <van-list
      v-model="loading"
      :finished="finished"
      finished-text="没有更多了"
      @load="onLoad"
      style="margin-bottom: 80px"
    >
      <van-swipe-cell
        v-for="(item, index) in filteredFiles"
        :key="index"
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
          is-link
          @click="toggleDetail(index)"
        >
          <template #label>
            <div class="label-line">{{ item.create_time.slice(2) }}</div>
            <div v-if="item.teacher_mark != ''">{{ item.teacher_mark }}</div>
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
            <div>
              <div style="color: black">
                <div
                  v-if="item.complement == 1"
                  style="display: flex; justify-content: flex-end"
                >
                  <van-tag type="primary" plain mark size="medium"
                    >{{ item.log.length - item.falseCount }} /
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
          </template>
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
          <div style="margin-top: 0.2rem; margin-left: 1rem;">
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

.selected-cell {
  background-color: #f0f8ff; /* 浅蓝色背景 */
  border-left: 3px solid #1989fa; /* 左侧蓝色边框 */
}
</style>
