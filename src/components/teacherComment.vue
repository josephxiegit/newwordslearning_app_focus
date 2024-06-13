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
const filterXlsmData = ref([]);

// 跳转明细
function formatDateString(dateString) {
  const date = new Date(dateString);

  const year = date.getFullYear();
  const month = date.getMonth() + 1; // getMonth() 返回的月份是从0开始的
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();

  // 使用模板字符串来格式化日期，确保月份和日期总是显示为两位数
  return `${year}年${month.toString().padStart(2, "0")}月${day
    .toString()
    .padStart(2, "0")}日${hours}时${minutes}分`;
}
function processDatetime(res) {
  return res.map((item) => {
    const {
      alias,
      answers,
      attempt,
      complete_status,
      create_time,
      nid,
      rate,
      synoyms,
      title,
      username,
      view,
      view_time,
      swipe
    } = item;
    const formattedCreateTime = formatDateString(create_time);
    const formattedViewTime = formatDateString(view_time);
    return {
      alias,
      answers,
      attempt,
      complete_status,
      create_time: formattedCreateTime,
      nid,
      rate,
      synoyms,
      title,
      username,
      view,
      view_time: formattedViewTime,
      swipe
    };
  });
}

async function queryData() {
  let params = new URLSearchParams();
  params.append("method", "queryTeacherComment");
  return await axios.post("words/", params).then((ret) => {
    return ret.data;
  });
}
function getListData() {
  queryData().then((res) => {
    res = processDatetime(res);
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
        showSuccessToast("处于筛选状态");
        filterData();
      }
    });
  });
};

// 筛选
const formattedRate = (rate) => {
  // 检查是否为整数
  if (Number.isInteger(rate)) {
    return rate - 3;
  } else {
    // 保留一位小数
    return (rate - 3).toFixed(1);
  }
};
const showFliterBox = ref(false);
const valueSearchStudent = ref("");
const valueSearchXlsm = ref("");
const valueSearchGroup = ref("");
const columnsGrade = [
  //年级
  { text: "七年级", value: "七年级" },
  { text: "八年级", value: "八年级" },
  { text: "九年级", value: "九年级" },
  { text: "高一", value: "高一" },
  { text: "高二", value: "高二" },
  { text: "高三", value: "高三" },
];
const showGradePicker = ref(false);
const valueGrade = ref("");
const onConfirmGrade = ({ selectedValues }) => {
  showGradePicker.value = false;

  valueGrade.value = selectedValues[0];
};

const showLocationPicker = ref(false); // 地点
const columnsLocation = ref([]);
async function queryLocations() {
  let params = new URLSearchParams();
  params.append("method", "queryLocations");
  return await axios.post("words/", params).then((ret) => {
    return ret.data;
  });
}
const valueLocation = ref("");
const onConfirmLocation = ({ selectedValues }) => {
  showLocationPicker.value = false;
  valueLocation.value = selectedValues[0];
};

const showCalendar = ref(false); // 日期
const dateCalendar = ref("");
const formatDate = (date) =>
  `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
const onConfirmCalendar = (values) => {
  const [start, end] = values;
  showCalendar.value = false;
  dateCalendar.value = `${formatDate(start)} - ${formatDate(end)}`;
};

const clearFilterData = () => {
  valueSearchStudent.value = "";
  valueSearchXlsm.value = "";
  valueSearchGroup.value = "";
  valueLocation.value = "";
  valueGrade.value = "";
};
const showFilter = () => {
  showFliterBox.value = true;
  queryLocations().then((ret) => {
    columnsLocation.value = ret.map((item) => ({
      text: item.location_name,
      value: item.location_name,
    }));
    // console.log("columnsLocation", columnsLocation.value);
  });
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
      alias,
      view,
      view_time,
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
      alias,
      view,
      view_time,
    };
  });
}
const filterData = () => {
  if (
    valueSearchStudent.value == "" &&
    valueSearchXlsm.value == "" &&
    valueSearchGroup.value == "" &&
    valueLocation.value == "" &&
    valueGrade.value == "" &&
    dateCalendar.value == ""
  ) {
    return;
  }
  async function filterData() {
    let params = new URLSearchParams();
    params.append("method", "filterTeacherComment");
    params.append("filterStudent", valueSearchStudent.value);
    params.append("filterXlsm", valueSearchXlsm.value);
    params.append("filterGroup", valueSearchGroup.value);
    params.append("filterLocation", valueLocation.value);
    params.append("filterGrade", valueGrade.value);
    params.append("filterDate", dateCalendar.value);
    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }
  filterData()
    .then((res) => {
      // console.log("res: ", res);

      const newFilteredFiles = [];
      res.forEach((item) => {
        newFilteredFiles.push({
          nid: item.pk,
          ...item.fields,
        });
      });

      let data = processData(newFilteredFiles);
      data = processDatetime(data);
      filterXlsmData.value = [...data];
    })
    .then(() => {
      filterXlsmData.value.sort((a, b) => {
        if (a.username < b.username) return -1;
        if (a.username > b.username) return 1;

        const dateA = new Date(
          a.create_time.replace(/[年月日时分]/g, "-").slice(0, -1)
        );
        const dateB = new Date(
          b.create_time.replace(/[年月日时分]/g, "-").slice(0, -1)
        );

        return dateA - dateB;
      });
      console.log("filterXlsmData: ", filterXlsmData.value);
    });
};

const filteredStudent = () => {
  filterData();
  // showFliterBox.value = false;
};

// 多选修改分组
const cellValue = ref(true);
const valueNewGroup = ref("");
const showReviseGroup = ref(false);
const isMultiSelectMode = ref(false);
const selectedItems = ref([]);
const toggleMultiSelectMode = () => {
  cellValue.value = !cellValue.value;
  isMultiSelectMode.value = !isMultiSelectMode.value;
  if (!isMultiSelectMode.value) {
    // 清除所有选择
    selectedItems.value = [];
  }
};
const selectItem = (index) => {
  // 选中删除checkbox
  const selectedIndex = selectedItems.value.indexOf(index);
  if (selectedIndex !== -1) {
    selectedItems.value.splice(selectedIndex, 1);
  } else {
    selectedItems.value.push(index);
  }
};
const popReviseGroup = () => {
  showReviseGroup.value = true;
};
const reviseGroup = () => {
  const selectedNids = selectedItems.value.map(
    (index) => filterXlsmData.value[index].nid
  );
  // console.log("selectedNids: ", selectedNids);
  async function reviseGroups() {
    let params = new URLSearchParams();
    params.append("method", "reviseGroups");
    params.append("nids", JSON.stringify(selectedNids));
    params.append("groupName", valueNewGroup.value);
    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }
  reviseGroups().then((res) => {
    // console.log('res: ', res);
    selectedItems.value = [];
    if (res["message"] == "修改完成") {
      filterData();
      showSuccessToast("修改成功");
    }
    return;
  });
};

// 编辑数据
const showReviseData = ref(false);
const itemEdit = ref("");
const valueAlias = ref("");
const valueTitle = ref("");
const valueStar = ref(0);
const valueAttempt = ref(0);
const valueView = ref(0);
const valueContents = ref("");
const valueNid = ref("");
const editData = (index) => {
  itemEdit.value = filterXlsmData.value[index];
  // console.log('itemEdit: ', itemEdit.value);
  showReviseData.value = true;
  valueAlias.value = itemEdit.value.alias;
  valueTitle.value = itemEdit.value.title;
  valueStar.value = itemEdit.value.rate;
  valueAttempt.value = itemEdit.value.attempt;
  valueView.value = itemEdit.value.view;
  if (typeof itemEdit.value.synonyms === "string") {
    let dataAnswers = itemEdit.value.synonyms.replace(/(\W)'|'(\W)/g, '$1"$2'); // 替换单引号为双引号
    dataAnswers = dataAnswers.replace(
      /([{,]\s*)'([^']+?)'(\s*[:])/g,
      '$1"$2"$3'
    );
    valueContents.value = JSON.parse(dataAnswers);
  } else {
    valueContents.value = itemEdit.value.synonyms;
  }

  valueNid.value = itemEdit.value.nid;
};
async function reviseUserData() {
  let params = new URLSearchParams();
  params.append("method", "reviseUserData");
  params.append("title", valueTitle.value);
  params.append("nid", valueNid.value);
  params.append("alias", valueAlias.value);
  params.append("attempt", valueAttempt.value);
  params.append("view", valueView.value);
  params.append("rate", valueStar.value);
  return await axios.post("words/", params).then((ret) => {
    return ret.data;
  });
}
const reviseButton = () => {
  showConfirmDialog({
    title: "修改数据",
    message: "是否确认修改?",
    theme: "round-button",
  }).then(() => {
    reviseUserData().then((ret) => {
      if (valueSearchStudent.value == "" && valueSearchXlsm.value == "") {
        reloadPage();
      } else {
        showSuccessToast("处于筛选状态");
        filterData();
      }
      showReviseData.value = false;
    });
  });
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
        :right-text="isMultiSelectMode ? '取消' : '多选'"
        :left-text="isMultiSelectMode ? '改分组' : '筛选'"
        @click-right="toggleMultiSelectMode()"
        @click-left="isMultiSelectMode ? popReviseGroup() : showFilter()"
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
      position="bottom"
      :style="{ height: '70%' }"
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
        <!-- 分组 -->
        <van-field
          v-model="valueSearchGroup"
          label="分组"
          placeholder="请输入组名"
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
        <!-- 试题 -->
        <van-field
          v-model="valueSearchXlsm"
          label="试题"
          placeholder="请输入试题"
        />
        <!-- 日期 -->
        <van-field
          v-model="dateCalendar"
          label="日期"
          placeholder="选择日期区间"
          @click="showCalendar = true"
          readonly
        />
        <van-calendar
          v-model:show="showCalendar"
          type="range"
          @confirm="onConfirmCalendar"
          allow-same-day
          :min-date="new Date(2024, 4, 1)"
          :max-date="new Date(2030, 11, 31)"
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
    <van-cell-group v-model="selectedItems" style="margin-bottom: 80px">
      <van-swipe-cell
        v-for="(item, index) in filterXlsmData"
        :key="index"
        stop-propagation
      >
        <van-cell
          :label="item.title"
          style="padding-top: 0.5rem; padding-bottom: 0.5rem"
          @click="isMultiSelectMode ? selectItem(index) : editData(index)"
        >
          <template #title>
            <van-tag color="#ffe1e1" text-color="#ad0000" plain>{{
              item.username
            }} ｜ 游戏{{ item.swipe }}次</van-tag>
          </template>
          <template #label>
            <div style="margin-top: 0.2rem">{{ item.title }}</div>
            <div style="margin-top: 0.2rem">{{ item.alias }}</div>
            <div style="margin-top: 0.3rem">{{ item.create_time }}</div>
          </template>
          <template #value v-if="cellValue">
            <div style="display: flex; justify-content: space-between">
              <div style="display: flex">
                <van-rate
                  v-model="item.rate"
                  :size="18"
                  icon="like"
                  void-icon="like-o"
                  :count="3"
                  readonly
                  allow-half
                />
                <div
                  style="
                    margin-top: 4%;
                    font-size: 12px;
                    margin-left: 0rem;
                    width: 32px;
                  "
                >
                  <span v-if="showRatePlus[index]">
                    +{{ formattedRate(item.rate) }}
                  </span>
                  <span v-else style="visibility: hidden"> +0 </span>
                </div>
              </div>
              <div
                style="
                  font-size: 15px;
                  color: black;
                  font-weight: 700;
                  margin-right: 20px;
                "
              >
                {{ item.attempt }}次
              </div>
              <div v-if="item.view == null">
                <div style="margin-left: -2rem">0次</div>
              </div>
              <div v-else>
                <div style="margin-left: -2rem">{{ item.view }}次</div>
              </div>
            </div>
          </template>
          <template #right-icon>
            <van-checkbox
              v-if="isMultiSelectMode"
              :checked="selectedItems.includes(index)"
              @click.stop="selectItem(index)"
            />
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

    <!-- 改分组 -->
    <van-dialog
      v-model:show="showReviseGroup"
      title="修改分组"
      @confirm="reviseGroup"
      show-cancel-button
    >
      <van-cell-group inset>
        <van-field
          v-model="valueNewGroup"
          label="组名"
          placeholder="请输入新组名"
        />
      </van-cell-group>
    </van-dialog>

    <!-- 修改数据 -->
    <van-popup
      v-model:show="showReviseData"
      position="bottom"
      :style="{ height: '80%' }"
      closeable
    >
      <van-cell-group inset style="">
        <div style="font-size: 18px; font-weight: 700; margin: 1rem">
          {{ itemEdit.username }}
        </div>
        <van-field v-model="valueAlias" label="分组" placeholder="请输入组名" />
        <van-field
          v-model="valueTitle"
          label="标题"
          placeholder="请输入试题名称"
        />
        <van-field
          v-model="valueStar"
          label="星星"
          placeholder="请输入星星数"
        />
        <van-field
          v-model="valueAttempt"
          label="尝试"
          placeholder="请输入尝试次数"
        />
        <van-field
          v-model="valueView"
          label="查看"
          placeholder="请输入查看答案次数"
        />
        <div style="color: gray; font-size: 12px; margin: 0.5rem 0 0 1rem">
          {{ itemEdit.view_time }}
        </div>
        <van-button
          @click="reviseButton()"
          type="danger"
          block
          style="margin-top: 1rem"
          >修改试题</van-button
        >
      </van-cell-group>
      <van-grid style="margin: 0.5rem 1rem 0.5rem 1rem">
        <van-grid-item
          v-for="(item, index) in valueContents"
          :key="index"
          :text="item.英文"
        />
      </van-grid>
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
