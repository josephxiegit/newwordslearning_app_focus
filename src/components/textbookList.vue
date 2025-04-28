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

// 获得试题
async function queryData() {
  let params = new URLSearchParams();
  params.append("method", "queryTextBook");
  return await axios.post("words/", params).then((ret) => {
    return ret.data;
  });
}
function getListData() {
  queryData().then((res) => {
    filteredFiles.value = [...res];
    filteredFiles.value = processData(filteredFiles.value);
    console.log("filteredFiles.value: ", filteredFiles.value);
    originalData.value = [...res]; // 使用扩展运算符进行深拷贝
    return filteredFiles.value;
  });
}
function processData(data) {
  return data.map((item) => {
    const { nid, username, textbook, modify_time } = item; // 使用解构赋值提取所需字段
    let dataString = textbook.replace(/(\W)'|'(\W)/g, '$1"$2'); // 替换单引号为双引号
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
        .replace(/"are/g, "'are'")
        .replace(/won"t/g, "won't")
        .replace(/it"s/g, "it's")
        .replace(/you"d/g, "you'd");

    dataString = dataString
      .replace(/\bFalse\b/g, "false")
      .replace(/\bTrue\b/g, "true")
      .replace(/\bNone\b/g, "null");
    // console.log('dataString: ', dataString);

    const parsedLog = JSON.parse(dataString);
    return { nid, username, textbook: parsedLog, modify_time };
  });
}

// 刷新页面
function refreshData() {
  let res = new Promise((resolve, reject) => {
    getListData();
    resolve("ok");
  });
}

// 搜索单词本
const valueSearchTextbook = ref("");
const onSearchTextBook = (val) => {
  if (val.trim() == "") return;
  async function filterData() {
    let params = new URLSearchParams();
    params.append("method", "filterTextBook");
    params.append("filterStudent", val);
    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }
  filterData().then((res) => {
    filteredFiles.value = processData(res);
    console.log("filteredFiles: ", filteredFiles.value);
  });
};
const onCancelSearchTextBook = () => {
  valueSearchTextbook.value = "";
  refreshData();
};

// 详情
const showDetail = ref(false);
const detailName = ref("");
const detailList = ref([]);
const toggleDetail = (index) => {
  showDetail.value = true;
  detailName.value = filteredFiles.value[index]["username"];
  detailList.value = filteredFiles.value[index]["textbook"];
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
        title="单词本列表"
        right-text="刷新"
        @click-right="reloadPage()"
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

    <!-- 搜索单词本 -->
    <form action="/">
      <van-search
        v-model="valueSearchTextbook"
        show-action
        placeholder="请输入搜索关键词"
        @search="onSearchTextBook"
        @cancel="onCancelSearchTextBook"
      />
    </form>

    <!-- 单词列表 -->
    <van-cell-group style="margin-bottom: 80px">
      <div v-for="(item, index) in filteredFiles" :key="index" stop-propagation>
        <van-cell
          :title="item.username"
          :value="item.modify_time.slice(0, 10)"
          is-link
          @click="toggleDetail(index)"
        >
        </van-cell>
      </div>
    </van-cell-group>

    <!-- 单词本详情 -->
    <van-popup
      v-model:show="showDetail"
      position="bottom"
      :style="{ height: '70%' }"
      closeable
      :lock-scroll="false"
    >
      <van-cell-group inset>
        <div style="font-size: 18px; font-weight: 700; margin: 1rem">
          {{ detailName }}
        </div>

        <div v-for="(item, index) in detailList" :key="index">
          <van-cell :title="item.英文" :value="item.times" :label="item.答案">
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
