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
} from "vant";
const router = useRouter();
const instance = getCurrentInstance();
const axios = instance.appContext.config.globalProperties.$ajax;

const originalData = ref([]);
const studentData = ref([]);
const selectXlsm = ref("");

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
      studentData.value = ret;
      console.log(studentData.value);
    })
    .then(() => {
      showStudent.value = true;
    });
}
const getUserList = (index) => {
  selectXlsm.value = originalData.value[index];
  refreshUserList();
};

// 获得试题
async function queryData() {
  let params = new URLSearchParams();
  params.append("method", "queryXlsms");
  return await axios.post("words/", params).then((ret) => {
    return ret.data;
  });
}
function getListData() {
  queryData().then((res) => {
    originalData.value = res;
    console.log("originalData.value", originalData.value);
    return originalData.value;
  });
}

// 弹出学生
const showStudent = ref(false);
const studentsSelected = ref([]);
function toggleStudent(index) {
  const username = studentData.value[index].username;
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
  // console.log("studentsSelected", studentsSelected);
}

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
    DeleteUser().then((ret) => {
      refreshUserList();
    });
  });
};

// 地点
const columnsLocation = [
  {
    text: "王串场",
    value: "王串场",
  },
  {
    text: "小树林",
    value: "小树林",
  },
  {
    text: "朗图",
    value: "朗图",
  },
  {
    text: "海光寺",
    value: "海光寺",
  },
  {
    text: "上门",
    value: "上门",
  },
  {
    text: "惠学教育",
    value: "惠学教育",
  },
  {
    text: "中山路春柳公寓",
    value: "中山路春柳公寓",
  },
  {
    text: "网课",
    value: "网课",
  },
  {
    text: "新东方",
    value: "新东方",
  },
  {
    text: "尚佳教育",
    value: "尚佳教育",
  },
  {
    text: "张鑫",
    value: "张鑫",
  },
];
const showNewStudentAndQueryLocations = () => {
  showNewStudent.value = true;

  // queryLocations().then((ret) => {
  //   nextTick().then(() => {
  //     columnsLocation.value = ret.map((item) => ({
  //       text: item.location_name,
  //       value: item.location_name,
  //     }));
  //     console.log("columnsLocation", columnsLocation.value);
  //   });
  // });
};

// 增加新生
const showNewStudent = ref(false);
const showGradePicker = ref(false); //年级
const valueGrade = ref("");
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
async function queryLocations() {
  let params = new URLSearchParams();
  params.append("method", "queryLocations");
  try {
    const response = await axios.post("words/", params);
    return response.data;
  } catch (error) {
    console.error("Error querying locations:", error);
    return []; // 在错误情况下返回空数组
  }
}
const onConfirmLocation = ({ selectedValues }) => {
  showLocationPicker.value = false;
  valueLocation.value = selectedValues[0];
};

const userAccount = ref("");
const userPassword = ref("123456");

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
      showNewStudent.value = false;
      return "ok";
    })
    .then(() => {
      refreshUserList();
    });
}
function clearStudent() {
  userAccount.value = "";
  userPassword.value = "123456";
  valueGrade.value = "";
  valueLocation.value = "";
}

// 增加新试题
const addNewStudentList = () => {
  showConfirmDialog({
    title: "Confirm",
    message: "是否确认添加试题?",
    theme: "round-button",
  }).then(() => {
    if (!studentsSelected.value || studentsSelected.value.length === 0) {
      showFailToast("没有选中");
      return;
    } else {
      console.log(studentsSelected.value);
      async function updateStudentList() {
        let params = new URLSearchParams();
        params.append("studentList", JSON.stringify(studentsSelected.value));
        params.append("title", selectXlsm.value);
        params.append("method", "addStudentXlsm");
        return await axios.post("words/", params).then((ret) => {
          return ret.data;
        });
      }
      updateStudentList().then((ret) => {
        console.log(ret);
        showStudent.value = false;
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
        title="词汇分配列表"
        right-text="刷新"
        @click-right="reloadPage()"
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
      <van-tabbar-item icon="search" replace to="/teacherComment"
        >试题</van-tabbar-item
      >
    </van-tabbar>

    <!-- 单词列表 -->
    <van-cell-group>
      <div v-for="(item, index) in originalData" :key="index">
        <van-cell :title="item" is-link clickable @click="getUserList(index)">
        </van-cell>
      </div>
    </van-cell-group>

    <!-- 弹出学生 -->
    <van-popup
      v-model:show="showStudent"
      position="bottom"
      :style="{ height: '80%' }"
      closeable
    >
      <div style="display: flex; align-items: center">
        <div
          style="
            font-size: 20px;
            font-weight: 700;
            margin: 1rem 1rem 0.5rem 1rem;
          "
        >
          用户列表
        </div>
        <div
          style="
            font-size: 12px;
            margin-left: 3ch;
            color: gray;
            margin-top: 0.5rem;
          "
        >
          {{ selectXlsm }}
        </div>
      </div>
      <!-- 增加新生 -->
      <div style="display: flex; justify-content: space-between">
        <van-button
          @click="addNewStudentList"
          type="warning"
          size="small"
          style="margin-left: 1rem; margin-bottom: 0.4rem"
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
      <van-popup
        v-model:show="showNewStudent"
        position="bottom"
        :style="{ height: '50%' }"
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

      <!-- 学生列表 -->
      <van-checkbox-group v-model="studentsSelected">
        <van-cell-group>
          <van-swipe-cell
            v-for="(item2, index2) in studentData"
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
            <van-cell
              :title="item2.username"
              :label="item2.password"
              :value="`${item2.location__location_name}: ${item2.grade__grade_name}`"
              is-link
              clickable
              @click="toggleStudent(index2)"
            >
              <template #right-icon>
                <van-checkbox :name="item2.username" />
              </template>
            </van-cell>
          </van-swipe-cell>
        </van-cell-group>
      </van-checkbox-group>
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
