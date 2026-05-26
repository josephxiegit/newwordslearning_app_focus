<script setup>
import { ref, onMounted, getCurrentInstance } from "vue";
import { useRouter } from "vue-router";
import {
  showSuccessToast,
  showFailToast,
  showConfirmDialog,
  showToast,
} from "vant";

const router = useRouter();
const instance = getCurrentInstance();
const axios = instance.appContext.config.globalProperties.$ajax;

const filteredTasks = ref([]);
const valueSearchTask = ref("");

// --- 格式化时间 ---
const formatDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return "未定";
  const date = new Date(dateTimeStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

// --- 映射推送等级颜色与标签 ---
const getLevelTag = (level) => {
  const levelMap = {
    0: { type: "primary", text: "普通" },
    1: { type: "warning", text: "重要" },
    2: { type: "danger", text: "紧急" },
    3: { type: "success", text: "表扬" },
  };
  return levelMap[level] || { type: "default", text: "未知" };
};

// --- 删除/取消预约任务 ---
const cancelTask = (taskId) => {
  showConfirmDialog({
    title: "取消预约",
    message: "确认要取消并删除这条未发送的通知吗？",
    theme: "round-button",
  })
    .then(async () => {
      let params = new URLSearchParams();
      params.append("method", "deletePushTask");
      params.append("taskId", taskId);

      try {
        const res = await axios.post("words/", params);
        if (res.data.code === 200) {
          showSuccessToast("已取消预约");
          // 重新拉取数据刷新列表
          fetchTasks(valueSearchTask.value);
        } else {
          showFailToast(res.data.msg || "取消失败");
        }
      } catch (error) {
        showFailToast("网络错误");
      }
    })
    .catch(() => {
      // on cancel
    });
};

// --- 新增：高级筛选相关的响应式变量 ---
const showFilterPopup = ref(false);
const filterForm = ref({
  studentName: "",
  startDate: "",
  endDate: "",
  levels: [], // 存储选中的推送等级：['0', '1', '2', '3']
});

const loading = ref(false);
const finished = ref(false);
const currentPage = ref(1);

// --- 修改：fetchTasks 支持多参数 ---
async function fetchTasks(keyword = "", isLoadMore = false) {
  // 如果是全新的搜索/筛选，重置所有分页状态
  if (!isLoadMore) {
    currentPage.value = 1;
    finished.value = false;
    filteredTasks.value = []; // 清空旧数据
    loading.value = true;
  }

  let params = new URLSearchParams();
  params.append("method", "queryPushTaskLog");

  // 传入分页参数
  params.append("page", currentPage.value);
  params.append("pageSize", 20);

  if (keyword) params.append("keyword", keyword.trim());
  if (filterForm.value.studentName)
    params.append("studentName", filterForm.value.studentName.trim());
  if (filterForm.value.startDate)
    params.append("startDate", filterForm.value.startDate);
  if (filterForm.value.endDate)
    params.append("endDate", filterForm.value.endDate);
  if (filterForm.value.levels.length > 0)
    params.append("levels", JSON.stringify(filterForm.value.levels));

  try {
    const res = await axios.post("words/", params);
    let data = res.data.data || [];
    let hasMore = res.data.has_more; // 接收后端传来的是否有下一页标识

    data.forEach((item) => {
      item.scheduled_time = formatDateTime(item.scheduled_time);
      item.actual_sent_time = item.actual_sent_time
        ? formatDateTime(item.actual_sent_time)
        : null;
    });

    // 追加数据还是覆盖数据
    if (isLoadMore) {
      filteredTasks.value.push(...data);
    } else {
      filteredTasks.value = data;
    }

    // 关闭加载动画
    loading.value = false;

    // 判断是否彻底加载完
    if (!hasMore || data.length === 0) {
      finished.value = true;
    } else {
      currentPage.value++; // 准备下一次加载的页码
    }
  } catch (error) {
    loading.value = false;
    finished.value = true;
    showFailToast("获取数据失败");
    console.error(error);
  }
}

const onLoad = () => {
  fetchTasks(valueSearchTask.value, true);
};

// --- 修改：确保各种查询/重置操作都能触发“全新加载” ---
const onSearchTask = (val) => {
  fetchTasks(val, false);
};

const onCancelSearchTask = () => {
  valueSearchTask.value = "";
  fetchTasks("", false);
};

const applyFilter = () => {
  showFilterPopup.value = false;
  fetchTasks(valueSearchTask.value, false);
};

const resetFilter = () => {
  filterForm.value = {
    studentName: "",
    startDate: "",
    endDate: "",
    levels: [],
  };
  // 可以选择重置后立即查询，或者让用户手动点确定
};

onMounted(() => {});

// --- 内存探照灯测试函数 ---
const showTaskDialog = ref(false);
const activeTasks = ref([]);

const testCheckTimer = async () => {
  try {
    const res = await axios.get("check_timers/");
    activeTasks.value = res.data.data || [];

    if (activeTasks.value.length === 0) {
      showToast("内存中空空如也，没有预约任务");
      return;
    }

    // 有数据，直接唤起模板弹窗
    showTaskDialog.value = true;
  } catch (error) {
    showFailToast("请求内存接口失败");
    console.error(error);
  }
};

// --- 教师权限逻辑 (保持你原有的不变) ---
const showDialogPassWord = ref(false);
const passwordTeacher = ref("");
const signInTeacher = () => {
  showDialogPassWord.value = true;
};
const handlePassword = () => {
  /* ...原逻辑... */
};
const resetPassword = () => {
  /* ...原逻辑... */
};
</script>

<template>
  <div class="notification-log-page">
    <div class="nav-bar-container">
      <van-nav-bar
        title="通知发送记录"
        left-text="登陆"
        @click-left="signInTeacher()"
      >
        <template #right>
          <div
            @click="testCheckTimer"
            style="
              margin-left: 20px;
              color: #07c160;
              display: flex;
              align-items: center;
            "
          >
            <van-icon size="18" style="margin-right: 4px" />
            查内存
          </div>

          <div
            @click="showFilterPopup = true"
            style="
              margin-left: 20px;
              display: flex;
              align-items: center;
              color: #1989fa;
            "
          >
            <van-icon name="filter-o" size="18" style="margin-right: 4px" />
            筛选
          </div>
        </template>
      </van-nav-bar>
    </div>
    
    <van-popup 
      v-model:show="showFilterPopup" 
      position="right" 
      :style="{ width: '85%', height: '100%', backgroundColor: '#f4f5f7' }"
    >
      <div class="filter-popup-content">
        <div class="filter-header">
          <span class="title">高级筛选</span>
          <van-icon name="cross" class="close-icon" @click="showFilterPopup = false" />
        </div>

        <div class="filter-body">
          <p class="section-title">基础条件</p>
          <van-cell-group inset class="filter-card">
            <van-field 
              v-model="filterForm.studentName" 
              label="指定姓名" 
              placeholder="输入姓名(支持模糊)" 
              clearable 
            />
            <van-field 
              v-model="filterForm.startDate" 
              label="开始日期" 
              type="date" 
              placeholder="选择开始时间" 
            />
            <van-field 
              v-model="filterForm.endDate" 
              label="结束日期" 
              type="date" 
              placeholder="选择结束时间" 
            />
          </van-cell-group>

          <p class="section-title">消息等级</p>
          <div class="filter-card checkbox-card">
            <van-checkbox-group v-model="filterForm.levels">
              <div class="checkbox-grid">
                <van-checkbox name="0" shape="square">普通 (0)</van-checkbox>
                <van-checkbox name="1" shape="square" checked-color="#ff976a">重要 (1)</van-checkbox>
                <van-checkbox name="2" shape="square" checked-color="#ee0a24">紧急 (2)</van-checkbox>
                <van-checkbox name="3" shape="square" checked-color="#07c160">表扬 (3)</van-checkbox>
              </div>
            </van-checkbox-group>
          </div>
        </div>

        <div class="filter-footer">
          <van-button plain type="default" class="footer-btn reset-btn" round @click="resetFilter">重置</van-button>
          <van-button type="primary" class="footer-btn" round @click="applyFilter">查看结果</van-button>
        </div>
      </div>
    </van-popup>

    <van-tabbar route>
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

    <form action="/">
      <van-search
        v-model="valueSearchTask"
        show-action
        placeholder="搜索姓名 / 内容 / 日期"
        @search="onSearchTask"
        @cancel="onCancelSearchTask"
      />
    </form>

    <van-list
      v-model:loading="loading"
      :finished="finished"
      finished-text="没有更多了"
      @load="onLoad"
    >
      <van-cell-group style="margin-bottom: 80px">
        <div v-for="task in filteredTasks" :key="task.nid">
          <van-cell center>
            <template #title>
              <div class="task-title">
                <span class="content-text van-multi-ellipsis--l2">{{
                  task.content
                }}</span>
                <van-tag
                  :type="getLevelTag(task.push_level).type"
                  size="medium"
                  class="level-tag"
                >
                  {{ getLevelTag(task.push_level).text }}
                </van-tag>
              </div>
            </template>

            <template #label>
              <div class="info-row">
                <span class="info-label">接收人:</span>
                <span class="info-value">{{
                  task.target_students_preview
                }}</span>
              </div>

              <div class="time-and-action">
                <div v-if="task.status" class="info-row status-sent">
                  已发送: {{ task.actual_sent_time }}
                </div>
                <div v-else class="info-row status-pending">
                  预约于: {{ task.scheduled_time }}
                </div>

                <van-button
                  v-if="!task.status"
                  type="danger"
                  size="mini"
                  plain
                  @click.stop="cancelTask(task.nid)"
                >
                  取消预约
                </van-button>
              </div>
            </template>

            <template #right-icon>
              <div class="right-icon-box">
                <van-icon
                  v-if="task.status"
                  name="success"
                  color="#07c160"
                  size="24"
                />
                <van-icon v-else name="clock-o" color="#ff976a" size="24" />
              </div>
            </template>
          </van-cell>
        </div>

        <div v-if="finished && filteredTasks.length === 0" class="custom-empty">
          <van-icon name="description" size="40" color="#dcdee0" />
          <p>没有找到相关的通知记录</p>
        </div>
      </van-cell-group>
    </van-list>

    <van-dialog
      v-model:show="showDialogPassWord"
      title="教师权限"
      show-cancel-button
      closeOnClickOverlay
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
        />
      </van-cell-group>
    </van-dialog>

    <!-- 探照灯函数 -->
    <van-dialog
      v-model:show="showTaskDialog"
      :title="`运行中的预约 (${activeTasks.length}个)`"
      confirmButtonText="我知道了"
    >
      <div class="task-dialog-content">
        <div
          v-for="(task, index) in activeTasks"
          :key="task.task_id"
          class="task-item"
        >
          <div class="task-item-title">{{ index + 1 }}. {{ task.content }}</div>
          <div class="task-item-info">
            <div style="margin-bottom: 2px">
              🕒 <span class="time-text">{{ task.time }}</span>
            </div>
            <div>👤 接收人: {{ task.targets }}</div>
          </div>
        </div>
      </div>
    </van-dialog>
  </div>
</template>

<style scoped>
.nav-bar-container {
  position: sticky;
  top: 0;
  z-index: 100;
}
.task-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 6px;
}
.content-text {
  flex: 1;
  font-size: 15px;
  font-weight: 500;
  color: #323233;
  margin-right: 8px;
}
.level-tag {
  flex-shrink: 0;
}
.info-row {
  margin-top: 4px;
  font-size: 13px;
}
.info-label {
  color: #969799;
}
.info-value {
  color: #646566;
}
.status-sent {
  color: #07c160;
}
.status-pending {
  color: #ff976a;
  font-weight: bold;
}
.time-and-action {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 6px;
  padding-right: 4px;
}
.right-icon-box {
  width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 16px; /* 控制右侧图标和左侧文字区域的距离 */
}
.custom-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: #969799;
  font-size: 14px;
}
.custom-empty p {
  margin-top: 16px;
}

/* 内存探照灯弹窗样式 */
.task-dialog-content {
  max-height: 60vh;
  overflow-y: auto;
  padding: 16px 20px;
  text-align: left;
}
.task-item {
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px dashed #ebedf0;
}
/* 最后一个元素不显示底边距和下划线 */
.task-item:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}
.task-item-title {
  font-size: 15px;
  font-weight: bold;
  color: #323233;
  margin-bottom: 6px;
  line-height: 1.4;
  /* 超过两行省略号 */
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
.task-item-info {
  font-size: 13px;
  color: #969799;
  line-height: 1.5;
}
.time-text {
  color: #ff976a;
  font-weight: bold;
}
.task-dialog-content {
  max-height: 55vh; /* 限制最大高度，大概占屏幕一半多一点 */
  overflow-y: auto; /* 内容超出时自动显示滚动条 */
  -webkit-overflow-scrolling: touch; /* ⚠️ 核心：让 iOS 苹果设备上滑动如丝绸般顺滑，带有惯性回弹 */
  overscroll-behavior: contain; /* ⚠️ 核心：防止滑动到底部时，不小心把背后的整个网页带跑（防止滚动穿透） */
  padding: 16px 20px;
  text-align: left;
}


/* ================= 高级筛选抽屉美化 ================= */
.filter-popup-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* 顶部标题区 */
.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 16px 12px;
  background-color: #fff;
}
.filter-header .title {
  font-size: 18px;
  font-weight: bold;
  color: #323233;
}
.filter-header .close-icon {
  font-size: 20px;
  color: #c8c9cc;
}

/* 滚动主体区 */
.filter-body {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 24px;
}
.section-title {
  font-size: 13px;
  color: #969799;
  margin: 16px 16px 8px;
  font-weight: 500;
}

/* 通用卡片样式 (覆盖 Vant 默认) */
.filter-card {
  margin: 0 16px !important;
  border-radius: 12px !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02); /* 添加极淡的高级感阴影 */
  overflow: hidden;
}

/* 复选框网格布局 (治愈强迫症) */
.checkbox-card {
  background: #fff;
  padding: 16px;
}
.checkbox-grid {
  display: grid;
  grid-template-columns: 1fr 1fr; /* 强制等宽两列对齐 */
  gap: 16px 8px; /* 上下间距 16px，左右间距 8px */
}

/* 底部固定操作栏 */
.filter-footer {
  display: flex;
  padding: 12px 16px;
  background-color: #fff;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.04); /* 顶部阴影，区分内容区 */
  padding-bottom: calc(12px + env(safe-area-inset-bottom)); /* 完美适配苹果手机底部小黑条 */
}
.footer-btn {
  flex: 1;
  height: 42px; /* 稍微加高一点按钮，手指更好按 */
}
.reset-btn {
  margin-right: 12px;
  color: #646566 !important;
  border-color: #ebedf0 !important;
}
</style>