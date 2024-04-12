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
} from "vant";
const router = useRouter();
const instance = getCurrentInstance();
const axios = instance.appContext.config.globalProperties.$ajax;

const originalData = ref([]);

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
    originalData.value = res;
    console.log(res);
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
      reloadPage()
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
      reloadPage()
    });
  });
};

onMounted(async () => {
  // const toast = showLoadingToast({
  //   message: "加载中...",
  //   forbidClick: true,
  // });

  let res = new Promise((resolve, reject) => {
    getListData();
    resolve("ok");
  });
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
        @click-right="reloadPage"
      />
    </div>

    <router-view />
    <van-tabbar route>
      <van-tabbar-item icon="home-o" replace to="/teacher"
        >首页</van-tabbar-item
      >
      <van-tabbar-item icon="friends-o" replace to="/xlsmList"
        >用户</van-tabbar-item
      >
      <van-tabbar-item icon="search" replace to="/xlsmList"
        >试题</van-tabbar-item
      >
    </van-tabbar>

    <van-cell-group>
      <van-swipe-cell
        v-for="(item, index) in originalData"
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
          :title="item.username"
          is-link
          :label="item.title"
          :value="`尝试${item.attempt}次 | 成功${item.rate}次`"
        >
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
