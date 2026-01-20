<template>
  <div class="page">
    <div class="nav-bar-container">
      <van-nav-bar title="投票模式" fixed>
        <template #left>
          <div class="nav-bar-left">
            <span class="nav-button-left">
              已选 {{ selectedValues.length }} / {{ listEnglish.length }}
            </span>
          </div>
        </template>

        <template #right>
          <div class="nav-bar-right">
            <span
              class="nav-button-right"
              :class="{ disabled: submitting }"
              @click="submitSelection"
            >
              提交
            </span>
          </div>
        </template>
      </van-nav-bar>
    </div>

    <!-- 全宽列表：不要 inset；不要外层 padding -->
    <div class="list-wrap">
      <van-checkbox-group v-model="selectedValues">
        <van-cell-group>
          <van-cell
            v-for="(item, idx) in listEnglish"
            :key="getKey(item, idx)"
            clickable
            @click="toggleItem(item)"
          >
            <template #title>
              <div class="row-title">
                <span class="en"
                  >{{
                    item?.["序号"] ? String(item["序号"]).split(".")[0] : ""
                  }}. {{ item?.["英文"] }}</span
                >
              </div>
            </template>

            <template #right-icon>
              <van-checkbox :name="item?.['英文']" @click.stop />
            </template>
          </van-cell>
        </van-cell-group>
      </van-checkbox-group>

      <Empty v-if="!listEnglish.length" description="暂无可投票单词" />
    </div>
  </div>
</template>

<script setup>
import {
  ref,
  computed,
  onMounted,
  getCurrentInstance,
  onBeforeUnmount,
} from "vue";
import {
  showToast,
  showFailToast,
  showSuccessToast,
  showConfirmDialog,
  Empty,
  Dialog,
} from "vant";
import {
  onBeforeRouteLeave,
  onBeforeRouteUpdate,
  useRouter,
  useRoute,
} from "vue-router";

let leaveCount = 0;
const router = useRouter();
const route = useRoute();
const instance = getCurrentInstance();
const axios = instance.appContext.config.globalProperties.$ajax;
const listEnglish = ref([]);
const selectedValues = ref([]);
const submitting = ref(false);
const originalData = ref([]);
const isLoading = ref(false);
const basicPreExam = ref("");
const username = ref("");
const allowLeaveOnce = ref(false);
let backTriggered = false;
let backTriggeredAt = 0;

const selectedItems = computed(() => {
  const set = new Set(selectedValues.value);
  return listEnglish.value.filter((x) => set.has(x?.["英文"]));
});

const IGNORE_HIDDEN_MS = 6 * 1000;

let hiddenAt = 0; // 进入 hidden 的时间戳
let leftByRoute = false; // 是否通过路由离开
let pendingLeaveMark = false; // 是否经历过 hidden

async function onVisibilityChange() {
  if (document.visibilityState === "hidden") {
    hiddenAt = Date.now();
    pendingLeaveMark = true;
  } else if (document.visibilityState === "visible") {
    if (!pendingLeaveMark) return;

    const hiddenDuration = Date.now() - (hiddenAt || Date.now());
    pendingLeaveMark = false;

    if (!leftByRoute && hiddenDuration < IGNORE_HIDDEN_MS) {
      return;
    }

    // ✅ 计数
    leaveCount += 1;

    let coins = 0;
    if (leaveCount === 1) coins = 100;
    else if (leaveCount === 2) coins = 300;
    else coins = 800;

    console.log(
      `[StudentVoteMode] 第 ${leaveCount} 次离开后返回`,
      "hiddenDuration(ms)=",
      hiddenDuration,
      "leftByRoute=",
      leftByRoute
    );

    let params = new URLSearchParams();
    params.append("method", "updateLeaveFine");
    params.append("nid", originalData.value.nid);
    params.append("coins", coins);
    params.append("username", originalData.value.username);
    params.append("title", originalData.value.title);
    params.append("clientTime", JSON.stringify(new Date().toISOString()));
    const response = await axios.post("words/", params);

    if (response.data === "success") {
      showSuccessToast({
        message: `罚款成功\n第 ${leaveCount} 次离开\n扣除 ${coins} 金币`,
        duration: 0,
        closeOnClick: true,
      });
    }

    leftByRoute = false;
  }
}

// 防止页面下拉刷新
let startY = 0;
let triggered = false;

const onTouchStart = (e) => {
  startY = e.touches[0].clientY;
  triggered = false;
};
const onTouchMove = (e) => {
  const currentY = e.touches[0].clientY;
  const deltaY = currentY - startY;

  // 条件：页面在最顶部 + 向下拉
  if (window.scrollY === 0 && deltaY > 15 && !triggered) {
    triggered = true;

    // 关键：阻止浏览器下拉刷新
    e.preventDefault();

    showConfirmDialog({
      title: "提示",
      message: "刷新将重新投票，是否确认？",
      confirmButtonText: "确认刷新",
      cancelButtonText: "取消",
    })
      .then(() => {
        window.location.reload();
      })
      .catch(() => {
        // 什么都不做，留在页面
      });
  }
};

onBeforeUnmount(() => {
  document.removeEventListener("visibilitychange", onVisibilityChange);
  window.removeEventListener("popstate", onPopState);
  document.removeEventListener("touchstart", onTouchStart);
  document.removeEventListener("touchmove", onTouchMove);
});

onBeforeRouteLeave(async (to, from) => {
  // 提交触发的跳转：放行一次，不提示
  if (allowLeaveOnce.value) {
    allowLeaveOnce.value = false;
    backTriggered = false;
    return true;
  }

  // 只拦截“用户点击后退/前进”导致的离开
  // 这里加一个时间窗，避免某些 WebView popstate 残留误判
  const recentlyBack = backTriggered && Date.now() - backTriggeredAt < 1500;
  if (!recentlyBack) return true;

  try {
    await showConfirmDialog({
      title: "提示",
      message: "你正在返回上一页，未提交的选择可能会丢失，确认返回吗？",
      confirmButtonText: "确认返回",
      cancelButtonText: "留在本页",
    });

    backTriggered = false;
    return true;
  } catch {
    // 关键：用户取消时，要清掉 backTriggered，否则下一次可能误判
    backTriggered = false;

    // 在部分 WebView 中，点了后退浏览器历史已经变了，需要“补回去”
    // 用 replaceState 不可靠，直接 pushState 回当前地址最稳
    try {
      window.history.pushState(null, "", from.fullPath);
    } catch (e) {}

    return false;
  }
});

function onPopState() {
  backTriggered = true;
  backTriggeredAt = Date.now();
}

onMounted(() => {
  document.addEventListener("touchstart", onTouchStart, { passive: false });
  document.addEventListener("touchmove", onTouchMove, { passive: false });
  document.addEventListener("visibilitychange", onVisibilityChange, {
    passive: true,
  });
  window.addEventListener("popstate", onPopState, { passive: true });
  try {
    const raw = history?.state?.data;
    basicPreExam.value = history.state.basicPreExam;

    originalData.value = typeof raw === "string" ? JSON.parse(raw) : raw;
    username.value = originalData.value.username;
    console.log("originalData: ", originalData.value);
    listEnglish.value = Array.isArray(originalData.value?.answers)
      ? originalData.value.answers
      : [];
  } catch (e) {
    listEnglish.value = [];
    console.error("parse history.state.data failed:", e);
  }
});

function getKey(item, idx) {
  // 英文可能重复的话，可拼上序号/idx
  const en = item?.["英文"] ?? "";
  const no = item?.["序号"] ?? "";
  return `${en}_${no}_${idx}`;
}

function toggleItem(item) {
  const val = item?.["英文"];
  if (!val) return;

  const i = selectedValues.value.indexOf(val);
  if (i >= 0) selectedValues.value.splice(i, 1);
  else selectedValues.value.push(val);
}

async function submitSelection() {
  if (submitting.value) return;

  if (!listEnglish.value.length) {
    showFailToast("没有可提交的数据");
    return;
  }
  if (!selectedValues.value.length) {
    showToast("你还没选择任何英文");
    return;
  }

  try {
    await showConfirmDialog({
      title: "确认提交",
      message: `将提交 ${selectedValues.value.length} 个不会的英文，确认吗？`,
      confirmButtonText: "确认",
      cancelButtonText: "取消",
    });
  } catch {
    return;
  }

  submitting.value = true;

  async function updateAccountData() {
    let params = new URLSearchParams();
    params.append("method", "updateUserVoteSelection");
    params.append("selected", JSON.stringify(selectedValues.value));
    params.append("nid", originalData.value.nid);
    params.append("username", originalData.value.username);
    params.append("title", originalData.value.title);
    params.append("selectedCount", JSON.stringify(selectedValues.value.length));
    params.append("clientTime", JSON.stringify(new Date().toISOString()));
    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }

  const timeoutPromise = new Promise(
    (_, reject) => setTimeout(() => reject(new Error("请求超时")), 8000) // 8秒超时
  );
  const updateAccountPromise = updateAccountData();
  isLoading.value = true;

  try {
    let accountDataResult = await Promise.race([
      updateAccountPromise,
      timeoutPromise,
    ]);

    console.log("accountDataResult: ", accountDataResult);

    isLoading.value = false;
    allowLeaveOnce.value = true;

    router.push({
      path: "/homepage",
      // state: {
      //   username: username.value,
      //   data: basicPreExam.value,
      // },
    });
    showSuccessToast("提交成功");
  } catch (err) {
    console.error(err);
    showFailToast("提交失败，请稍后重试");
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f7f8fa;
}

/* 顶部吸顶 */
.nav-bar-container {
  position: sticky;
  top: 0;
  z-index: 10;
}

.nav-button-left {
  font-size: 13px;
  color: #1989fa;
}

.nav-button-right {
  font-size: 14px;
  color: #1989fa;
  padding: 0 8px;
  user-select: none;
}

.nav-button-right.disabled {
  opacity: 0.5;
  pointer-events: none;
}

/* 列表区域全宽：不要 padding，否则看起来像“卡片居中” */
.list-wrap {
  padding-top: 3rem;
}

/* 关键：英文不要被挤成很窄；允许换行但占满可用宽度 */
.row-title {
  display: flex;
  align-items: center;
  width: 100%;
}

.en {
  flex: 1;
  min-width: 0;
  font-size: 17px;
  font-weight: 400;
  color: #111;
  /* 如果你想“尽量不换行”，保留 word-break；如果想强制一行，改成 white-space: nowrap; */
  word-break: break-word;
}
</style>
