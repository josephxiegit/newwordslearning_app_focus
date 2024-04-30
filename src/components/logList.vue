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
  showLoadingToast,
  showConfirmDialog,
  showDialog,
  Toast,
  showToast,
} from "vant";
const router = useRouter();
const instance = getCurrentInstance();
const axios = instance.appContext.config.globalProperties.$ajax;

const originalData = ref([]);
const filteredFiles = ref([]);

// 获得日志
async function queryData() {
  let params = new URLSearchParams();
  params.append("method", "queryLog");
  return await axios.post("words/", params).then((ret) => {
    return ret.data;
  });
}
function processData(res) {
  return res.map((item) => {
    // try {
      const { title, username, log, create_time, nid } = item; // 使用解构赋值提取所需字段
      let dataString = log.replace(/(\W)'|'(\W)/g, '$1"$2'); // 替换单引号为双引号
      dataString = dataString.replace(
        /([{,]\s*)'([^']+?)'(\s*[:])/g,
        '$1"$2"$3'
      );
      // console.log('dataString: ', dataString);

      const parsedLog = JSON.parse(dataString); // 解析 log 字段

      // 计算每个 log 项中 flag 为 "false" 或 "half" 的个数
      const falseCount = parsedLog.reduce((count, logItem) => {
        return (
          count + (logItem.flag === "false" || logItem.flag === "half" ? 1 : 0)
        );
      }, 0);

      // 将 falseCount 添加到 log 数组中
      parsedLog.falseCount = falseCount;

      return { title, username, log: parsedLog, create_time, falseCount, nid }; // 返回新对象并包括 falseCount
  });
}

function getListData() {
  queryData().then((res) => {
    console.log(res);
    let data = processData(res);

    filteredFiles.value = [...data];
    originalData.value = [...data]; // 使用扩展运算符进行深拷贝
    console.log("originalData: ", originalData.value);

    // applySearchFilter();
    return filteredFiles.value;
  });
}

// 刷新页面
function refreshData() {
  let res = new Promise((resolve, reject) => {
    if (valueSearchStudent.value == "" && valueSearchLog.value == "") {
      getListData();
    } else {
      filteredStudent();
    }

    resolve("ok");
  });
}

// 筛选日志
const showFliterBox = ref(false);
const valueSearchStudent = ref("");
const valueSearchLog = ref("");
const clearFilterData = () => {
  valueSearchStudent.value = "";
  valueSearchLog.value = "";
};
const filteredStudent = () => {
  if (valueSearchStudent.value == "" && valueSearchLog.value == "") {
    return;
  }
  async function filterData() {
    let params = new URLSearchParams();
    params.append("method", "filterLog");
    params.append("filterStudent", valueSearchStudent.value);
    params.append("filterXlsm", valueSearchLog.value);
    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }
  filterData().then((res) => {
    console.log("res: ", res);
    let data = processData(res);
    filteredFiles.value = [...data];
    showFliterBox.value = false;
    // filteredFiles.value = newFilteredFiles;
  });
};

// 日志详情
const showDetail = ref(false);
const detailName = ref("");
const detailDate = ref("");
const detailXlsmName = ref("");
const detailRate = ref("");
const detailList = ref([]);
const toggleDetail = (index) => {
  const detail = filteredFiles.value[index];
  detailName.value = detail["username"];
  detailDate.value = detail["create_time"];
  detailXlsmName.value = detail["title"];
  detailRate.value =
    detail["log"].length - detail["falseCount"] + "/" + detail["log"].length;
  detailList.value = detail["log"];
  console.log("detail: ", detail);
  showDetail.value = true;
};
// const isCorrectAnswer = (userChoices, answerString) => {
//   const answers = answerString.split("；"); // 将答案字符串分割成数组
//   if (userChoices.length !== answers.length) {
//     return false; // 如果两个数组长度不相等，直接返回false
//   }
//   return userChoices.every((choice, index) => choice === answers[index]);
// };
const isCorrectAnswer = (userChoices, answerString) => {
  const answers = answerString.split("；").sort(); // 将答案字符串分割成数组并排序
  const sortedUserChoices = [...userChoices].sort(); // 复制用户选择数组并排序

  if (sortedUserChoices.length !== answers.length) {
    return false; // 如果两个数组长度不相等，直接返回false
  }

  return sortedUserChoices.every((choice, index) => choice === answers[index]);
};


// 删除日志
const deleteItem = (item, index) => {
  // console.log("index: ", index);
  // console.log("item: ", item);
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
        refreshData();
        filteredStudent();
      })
      .catch((err) => {
        console.log("err: ", err);
        showFailToast("数据未找到");
      });
  });
};

onMounted(async () => {
  refreshData();
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
        title="账户日志"
        right-text="刷新"
        left-text="筛选"
        @click-right="reloadPage()"
        @click-left="showFliterBox = true"
      />
    </div>

    <router-view />
    <van-tabbar route>
      <van-tabbar-item icon="home-o" replace to="/teacher"
        >首页</van-tabbar-item
      >
      <van-tabbar-item icon="friends-o" replace to="/xlsmList"
        >用户xlsm</van-tabbar-item
      >
      <van-tabbar-item icon="search" replace to="/teacherComment"
        >试题</van-tabbar-item
      >
      <van-tabbar-item icon="list-switch" replace to="/logList"
        >日志</van-tabbar-item
      >
      <van-tabbar-item icon="vip-card-o" replace to="/textbookList"
        >单词本</van-tabbar-item
      >
    </van-tabbar>

    <!-- 筛选数据 -->
    <van-popup
      v-model:show="showFliterBox"
      position="center"
      :style="{ height: '40%' }"
      closeable
      :overlay="false"
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
    <van-cell-group style="margin-bottom: 80px">
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
        <van-cell
          :title="`${item.title}`"
          :label="item.create_time.slice(0, 10)"
          is-link
          @click="toggleDetail(index)"
        >
          <template #value>
            <div>
              <div style="color: black">
                {{ item.log.length - item.falseCount }} / {{ item.log.length }}
              </div>
              <div style="color: red">{{ item.username }}</div>
            </div>
          </template>
        </van-cell>
      </van-swipe-cell>
    </van-cell-group>

    <!-- 日志详情 -->
    <van-popup
      v-model:show="showDetail"
      position="bottom"
      :style="{ height: '70%' }"
      closeable
      :lock-scroll="false"
    >
      <van-cell-group inset>
        <div>
          <div style="display: flex; justify-content: space-between">
            <div style="font-size: 18px; font-weight: 700; margin: 1rem">
              {{ detailName }}
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
            <div style="margin-left: 1rem; color: blue; font-weight: 600">
              {{ detailRate }}
            </div>
            <div style="margin-right: 0rem; color: gray">
              {{ detailXlsmName }}
            </div>
          </div>
        </div>
        <div v-for="(item, index) in detailList" :key="index">
          <van-cell :label="`答案：${item.答案}`">
            <template #title>
              <div style="font-size: larger; font-weight: 700">
                {{ item.英文 }}
              </div>
              <div
                style="margin-top: 0.5rem"
                :style="{
                  color: isCorrectAnswer(item.用户选择, item.答案)
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
</style>
