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
  params.append("method", "queryPurchaseLog");
  return await axios.post("words/", params).then((ret) => {
    return ret.data;
  });
}
const formatDateTime = (dateTimeStr) => {
  const date = new Date(dateTimeStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}年${month}月${day}日${hours}时${minutes}分`;
};

function getListData() {
  queryData().then((res) => {
    // console.log('res: ', res);
    filteredFiles.value = [...res];
    filteredFiles.value.forEach((item) => {
      item.create_time = formatDateTime(item.create_time);
    });
    console.log("filteredFiles.value: ", filteredFiles.value);
    originalData.value = [...res]; // 使用扩展运算符进行深拷贝
    return filteredFiles.value;
  });
}
function processData(data) {
  return data.map((item) => {
    const { nid, username, textbook, modify_time } = item; // 使用解构赋值提取所需字段
    let dataString = textbook.replace(/(\W)'|'(\W)/g, '$1"$2'); // 替换单引号为双引号
    dataString = dataString.replace(/([{,]\s*)'([^']+?)'(\s*[:])/g, '$1"$2"$3');
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

// 搜索购买记录
const valueSearchTextbook = ref("");
const onSearchTextBook = (val) => {
  if (val.trim() == "") return;
  async function filterData() {
    let params = new URLSearchParams();
    params.append("method", "filterPurchaseLog");
    params.append("filterStudent", val);
    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }
  filterData().then((res) => {
    filteredFiles.value = [...res];
    filteredFiles.value.forEach((item) => {
      item.create_time = formatDateTime(item.create_time);
    });
    console.log("filteredFiles: ", filteredFiles.value);
  });
};
const onCancelSearchTextBook = () => {
  valueSearchTextbook.value = "";
  refreshData();
};

const processedTitle = (title) => {
  if (!title) return title;
  try {
    return title.split(".")[0];
  } catch (error) {
    console.error("处理标题时出错:", error);
    return title;
  }
};

const showDialogPassWord = ref(false);
const passwordTeacher = ref("");
const handlePassword = () => {
  console.log("用户输入的密码是：", passwordTeacher.value);
    if (passwordTeacher.value.trim()) {
      async function verifyTeacherPassword() {
        let params = new URLSearchParams();
        params.append("method", "verifyTeacherPassword");
        params.append("password", passwordTeacher.value.trim());
        return await axios.post("words/", params).then((ret) => {
          return ret.data;
        });
      }
      verifyTeacherPassword().then((res) => {
        // console.log("res: ", res);
        if (res == "ok") {
          localStorage.setItem(
            "teacherPassword",
            // Base64.encode(passwordTeacher.value)
            passwordTeacher.value
          );
          showSuccessToast("密码正确");
        } else {
          showFailToast("密码错误");
          localStorage.removeItem("teacherPassword");
        }
      });
    } 
};
const resetPassword = () => {
  showConfirmDialog({
    title: "删除教师权限",
    message: "确认删除吗？",
    theme: "round-button",
  }).then(() => {
    localStorage.removeItem("teacherPassword");
    showSuccessToast("已重置");
  });
  
};

const signInTeacher = () => {
  showDialogPassWord.value = true;
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
        title="消费列表"
        right-text="刷新"
        left-text="登陆"
        @click-right="reloadPage()"
        @click-left="signInTeacher()"
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
          :title="item.user__username"
          :value="item.type + ' ' + item.coins"
          is-link
        >
          <template #label>
            <div>{{ item.create_time }}</div>
            <div style="margin-top: 0.2rem">
              {{ processedTitle(item.account_data__title) }}
            </div>
          </template>
        </van-cell>
      </div>
    </van-cell-group>

    <!-- 教师密码 -->
    <van-dialog
      v-model:show="showDialogPassWord"
      title="教师权限"
      show-cancel-button
      closeOnClickOverlay
      showCancelButton
      cancelButtonText="重制"
      @confirm="handlePassword"
      @cancel="resetPassword"
    >
      <van-cell-group inset>
        <van-field
          v-model="passwordTeacher"
          label="密码"
          placeholder="请录入"
          label-align="left"
      /></van-cell-group>
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
  align-items: center; /* 这会使所有子元素垂直居中 */
  justify-content: space-between; /* 这是为了在左侧和右侧保持间距，可根据需要调整 */
  border-bottom: 1px solid #ebedf0;
}
.van-checkbox {
  margin-left: 16px;
}
</style>
