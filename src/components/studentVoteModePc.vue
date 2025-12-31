<template>
  <div class="wide-page">
    <!-- 顶部固定 Nav -->
    <div class="top-nav">
      <van-nav-bar title="投票模式" fixed placeholder />
    </div>

    <!-- 下方主体：左侧竖栏 + 右侧内容 -->
    <div class="layout">
      <aside class="left-rail">
        <div class="rail-top">
          <div class="rail-user">{{ username || "user" }}</div>

          <div class="rail-progress">
            <div class="rail-progress-title">进度</div>
            <div class="rail-progress-value">
              {{ selectedValues.length }}/{{ listEnglish.length }}
            </div>
          </div>
        </div>

        <div class="rail-bottom">
          <van-button
            type="primary"
            block
            :loading="submitting"
            :disabled="submitting"
            @click="submitSelection"
          >
            提交
          </van-button>
        </div>
      </aside>

      <main class="content2">
        <Empty v-if="!listEnglish.length" description="暂无可投票单词" />

        <div v-else class="grid">
          <div
            v-for="(item, idx) in listEnglish"
            :key="getKey(item, idx)"
            class="card"
            :class="{ checked: selectedValues.includes(item?.['英文']) }"
            @click="toggleItem(item)"
          >
            <div class="card-header">
              <div class="card-title">
                <span class="no">
                  {{ item?.["序号"] ? String(item["序号"]).split(".")[0] : idx + 1 }}.
                </span>
                <span class="en">{{ item?.["英文"] }}</span>
              </div>

              <van-checkbox
                class="card-check"
                :name="item?.['英文']"
                :model-value="selectedValues.includes(item?.['英文'])"
                @click.stop
                @update:model-value="() => toggleItem(item)"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, getCurrentInstance, onBeforeUnmount } from "vue";
import { showToast, showFailToast, showSuccessToast, showConfirmDialog, Empty } from "vant";
import { useRouter } from "vue-router";

const router = useRouter();
const instance = getCurrentInstance();
const axios = instance.appContext.config.globalProperties.$ajax;

const listEnglish = ref([]);
const selectedValues = ref([]);
const submitting = ref(false);

const originalData = ref({});
const basicPreExam = ref("");
const username = ref("");

// ====== 你原来的 onMounted 取数逻辑（保留） ======
onMounted(() => {
  try {
    const raw = history?.state?.data;
    basicPreExam.value = history?.state?.basicPreExam || "";

    originalData.value = typeof raw === "string" ? JSON.parse(raw) : raw || {};
    username.value = originalData.value.username || "";

    listEnglish.value = Array.isArray(originalData.value?.answers)
      ? originalData.value.answers
      : [];
  } catch (e) {
    listEnglish.value = [];
    console.error("parse history.state.data failed:", e);
  }
});

function getKey(item, idx) {
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

// ====== 提交（把你现有 submitSelection 的后端逻辑粘进来即可） ======
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

  try {
    // ====== 这里放你原来的 axios 提交逻辑 ======
    // 示例（按你项目实际参数改）：
    let params = new URLSearchParams();
    params.append("method", "updateUserVoteSelection");
    params.append("selected", JSON.stringify(selectedValues.value));
    params.append("nid", originalData.value.nid);
    params.append("username", originalData.value.username);
    params.append("title", originalData.value.title);
    params.append("selectedCount", String(selectedValues.value.length));
    params.append("clientTime", JSON.stringify(new Date().toISOString()));

    const ret = await axios.post("words/", params);
    // 你按后端返回判断成功与否
    showSuccessToast("提交成功");

    router.push({ path: "/homepage" });
  } catch (err) {
    console.error(err);
    showFailToast("提交失败，请稍后重试");
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.wide-page {
  height: 100vh;
  background: #f6f7f9;
}

/* 顶部固定 Nav */
.top-nav {
  z-index: 1000;
}

/* 主体布局 */
.layout {
  height: calc(100vh - 46px);;
  display: flex;
  width: 100%;
  overflow: hidden;
}

/* 左侧竖栏：稍微窄一点，给右侧更多空间 */
.left-rail {
  width: 140px;
  background: #fff;
  border-right: 1px solid #eee;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 12px 10px;
}

.rail-top {
  display: grid;
  gap: 12px;
}

.rail-user {
  font-size: 14px;
  color: #333;
  font-weight: 600;
  padding: 6px 8px;
  border-radius: 10px;
  background: #f7f8fa;
}

.rail-progress {
  padding: 10px 8px;
  border-radius: 12px;
  background: #f7f8fa;
}

.rail-progress-title {
  font-size: 12px;
  color: #666;
  margin-bottom: 6px;
}

.rail-progress-value {
  font-size: 18px;
  font-weight: 700;
  color: #1989fa;
}

.rail-bottom {
  display: grid;
  gap: 10px;
  margin-bottom: 60vh;
}


.content2 {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr)); 
  gap: 2px; 
  width: 100%;
  box-sizing: border-box;
}

/* 卡片 */
.card {
  width: 100%;
  box-sizing: border-box;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 12px;
  padding: 12px 14px;  
}

.card.checked {
  border-color: #1989fa;
  box-shadow: 0 6px 18px rgba(25, 137, 250, 0.12);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.card-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
}

.no {
  color: #666;
  flex: 0 0 auto;
  width: 34px;
}

.en {
  font-size: 18px;
  font-weight: 600;
  color: #111;
  min-width: 0;
  word-break: break-word;
}

.card-check {
  flex: 0 0 auto;
}
</style>
