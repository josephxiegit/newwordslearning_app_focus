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
  showConfirmDialog
} from "vant";
const router = useRouter();
const instance = getCurrentInstance();
const axios = instance.appContext.config.globalProperties.$ajax;

const originalData = ref([]);
const filterXlsmData = ref([]);

// 跳转明细
async function queryData() {
  let params = new URLSearchParams();
  params.append("method", "queryTeacherComment");
  return await axios.post("words/", params).then((ret) => {
    return ret.data;
  });
}
function getListData() {
  queryData().then((res) => {
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
      if (valueSearchStudent.value == "" && valueSearchXlsm.value == "") {
        reloadPage();
      } else {
        showSuccessToast("处于筛选状态")
        filterData();
      }
      
    });
  });
};
// 编辑项的函数
const editItem = (item, index) => {
  // console.log("编辑项目：", item, "索引：", index);
  async function clearUserRateAndAttempt() {
    let params = new URLSearchParams();
    params.append("method", "clearUserRateAndAttempt");
    params.append("nid", item["nid"]);
    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }
  showConfirmDialog({
    title: "Clear",
    message: "是否确认清除次数?",
    theme: "round-button",
  }).then(() => {
    clearUserRateAndAttempt().then((ret) => {
      reloadPage();
    });
  });
};

// 筛选
const showFliterBox = ref(false);
const valueSearchStudent = ref("");
const valueSearchXlsm = ref("");
const clearFilterData = () => {
  valueSearchStudent.value = "";
  valueSearchXlsm.value = "";
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
    } = item;
    let dataAnswers = answers.replace(/(\W)'|'(\W)/g, '$1"$2'); // 替换单引号为双引号
    dataAnswers = dataAnswers.replace(
      /([{,]\s*)'([^']+?)'(\s*[:])/g,
      '$1"$2"$3'
    );
    const parsedAnswers = JSON.parse(dataAnswers);

    let dataSynonyms = synonyms.replace(/(\W)'|'(\W)/g, '$1"$2'); // 替换单引号为双引号
    dataSynonyms = dataSynonyms.replace(
      /([{,]\s*)'([^']+?)'(\s*[:])/g,
      '$1"$2"$3'
    );
    const parsedSynonyms = JSON.parse(dataSynonyms);
    return {
      title,
      username,
      answers: parsedAnswers,
      synonyms: parsedSynonyms,
      create_time,
      rate,
      attempt,
      nid,
    };
  });
}
const filterData = () => {
  if (valueSearchStudent.value == "" && valueSearchXlsm.value == "") {
    return;
  }
  async function filterData() {
    let params = new URLSearchParams();
    params.append("method", "filterTeacherComment");
    params.append("filterStudent", valueSearchStudent.value);
    params.append("filterXlsm", valueSearchXlsm.value);
    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }
  filterData().then((res) => {
    console.log("res: ", res);

    const newFilteredFiles = [];
    res.forEach((item) => {
      newFilteredFiles.push({
        nid: item.pk,
        ...item.fields,
      });
    });

    let data = processData(newFilteredFiles);
    filterXlsmData.value = [...data];
    console.log("filterXlsmData: ", filterXlsmData.value);
  });
};

const filteredStudent = () => {
  filterData();
  // showFliterBox.value = false;
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
        right-text="刷新"
        left-text="筛选"
        @click-right="reloadPage"
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
      <van-tabbar-item icon="search" replace to="/xlsmList"
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
        <!-- 试题 -->
        <van-field
          v-model="valueSearchXlsm"
          label="试题"
          placeholder="请输入试题"
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

    <!-- 数据列表 -->
    <van-cell-group style="margin-bottom: 80px">
      <van-swipe-cell
        v-for="(item, index) in filterXlsmData"
        :key="index"
        stop-propagation
      >
        <template #left>
          <van-button
            square
            type="primary"
            text="编辑"
            @click="editItem(item, index)"
          />
        </template>
        <van-cell
          :label="item.title"
          style="padding-top: 0.5rem; padding-bottom: 0.5rem"
        >
          <template #title>
            <van-tag color="#ffe1e1" text-color="#ad0000" plain>{{
              item.username
            }}</van-tag>
          </template>
          <template #value>
            <div style="display: flex; justify-content: space-between">
              <div style="display: flex">
                <van-rate
                  v-model="item.rate"
                  :size="18"
                  icon="like"
                  void-icon="like-o"
                  :count="3"
                />
                <div
                  v-if="showRatePlus[index]"
                  style="margin-top: 4%; font-size: 12px; margin-left: 0.2rem"
                >
                  +{{ item.rate - 3 }}
                </div>
              </div>
              <div style="font-size: 15px; color: black; font-weight: 700">
                {{ item.attempt }}次
              </div>
            </div>
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
      </van-swipe-cell>
    </van-cell-group>
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
