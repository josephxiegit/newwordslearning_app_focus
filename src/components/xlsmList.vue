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
const studentData = ref([]);
const filterStudentData = ref([]);
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
function getListData() {
  queryData().then((res) => {
    filteredFiles.value = [...res];
    originalData.value = [...res]; // 使用扩展运算符进行深拷贝
    applySearchFilter();
    return filteredFiles.value;
  });
}
function applySearchFilter() {
  if (valueSearchXlsm.value.trim().length != 0) {
    filteredFiles.value = filteredFiles.value.filter((item) =>
      item.toLowerCase().includes(valueSearchXlsm.value.toLowerCase())
    );
  }
}

// 删除试题
const deleteXlsm = (item, index) => {
  // console.log('item, index: ', item, index);
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
  // console.log("studentsSelected", studentsSelected);
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
    DeleteUser().then((ret) => {
      // refreshUserList();
      filteredStudent();
    });
  });
};

// 学生显示已有试题
const showStudentAccountData = ref(false);
const studentAccountDataName = ref("");
const studentAccountData = ref([]);
const showAccountItem = (item, index) => {
  const username = item["username"];
  const password = item["password"];
  async function getAccountData() {
    let params = new URLSearchParams();
    params.append("method", "getUserData");
    params.append("user", username);
    params.append("password", password);
    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }
  getAccountData().then((res) => {
    // console.log(res);
    showStudentAccountData.value = true;
    studentAccountData.value = res;
    studentAccountDataName.value = res[0]["username"];
  });
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
      refreshUserList();
      return "ok";
    })
    .catch((error) => {
      console.error("Error:", error.response.data);
      showFailToast("用户名重复");
    });
}
function clearStudent() {
  userAccount.value = "";
  userPassword.value = "123456";
  valueGrade.value = "";
  valueLocation.value = "";
}

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
    console.log(studentsSelected.value);
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
      // console.log(studentsSelected.value);
      // console.log("selectXlsm: ", selectXlsm.value);
      async function updateStudentList() {
        let params = new URLSearchParams();
        params.append("studentList", JSON.stringify(studentsSelected.value));
        params.append("title", JSON.stringify(selectXlsm.value));
        params.append("catalogue", titlecatalogue.value);

        params.append("method", "addStudentXlsm");
        return await axios.post("words/", params).then((ret) => {
          return ret.data;
        });
      }
      updateStudentList().then((ret) => {
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

// 搜索试题
const valueSearchXlsm = ref("");
const onSearchXlsm = (val) => {
  filteredFiles.value = originalData.value.filter((item) =>
    item.toLowerCase().includes(val.toLowerCase())
  );
  console.log("filteredFiles.value: ", filteredFiles.value);
};
const onCancelSearchXlsm = () => {
  valueSearchXlsm.value = "";
  refreshData();
};

// 排序试题
function isSorted(array) {
  // 函数用于检查数组是否已按字典顺序排序(名称顺序)
  for (let i = 0; i < array.length - 1; i++) {
    if (array[i].localeCompare(array[i + 1]) > 0) {
      return false;
    }
  }
  return true;
}

const sortXlsm = () => {
  if (isSorted(filteredFiles.value)) {
    // 如果已排序，则检查是否有搜索关键字
    if (valueSearchXlsm.value.trim().length !== 0) {
      // 应用搜索过滤器并恢复原始顺序
      filteredFiles.value = originalData.value.filter((item) =>
        item.toLowerCase().includes(valueSearchXlsm.value.trim().toLowerCase())
      );
    } else {
      // 没有搜索关键字时，恢复全部原始数据
      filteredFiles.value = [...originalData.value];
    }
    showToast("时间顺序");
  } else {
    filteredFiles.value = [...filteredFiles.value].sort((a, b) =>
      a.localeCompare(b)
    );
    showToast("名称顺序");
  }
};

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
  console.log("selectXlsm: ", selectXlsm.value);

  refreshUserList();
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

    <!-- 单词列表 -->
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
            @click="deleteXlsm(item, index)"
          />
        </template>
        <van-cell
          :title="item"
          is-link
          clickable
          @click="getUserList(index)"
          :class="{ 'selected-cell': selectedXlsmItems.includes(index) }"
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
            {{ item }}
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
                text="试题"
                @click="showAccountItem(item2, index2)"
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
                <van-tag color="#7232dd" plain>{{ item2.username }}</van-tag>
              </template>
              <template #right-icon>
                <van-checkbox
                  :name="item2.username"
                  @click.native.stop="() => {}"
                />
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
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #ebedf0;
}
.van-checkbox {
  margin-left: 0px;
}
.selected-cell {
  background-color: #f0f0f0; /* 灰色背景，或者任何你希望的颜色 */
}
</style>
