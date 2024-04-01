<script setup>
import {
  watch,
  onMounted,
  ref,
  getCurrentInstance,
  onBeforeUpdate,
  computed,
} from "vue";
import { showDialog } from "vant";
const compareResult = ref([]);
const userSelected = ref([]);
const user = ref();
const trueCount = computed(() => {
  return compareResult.value.filter((item) => item.flag === "true").length;
});
const halfCount = computed(() => {
  return compareResult.value.filter((item) => item.flag === "half").length;
});
const falseCount = computed(() => {
  return compareResult.value.filter((item) => item.flag === "false").length;
});

// 弹出欢迎
const showWelcome = ref(false);
// 计算正确率
const accuracy = computed(() => {
  if (compareResult.value.length === 0) return 0;
  console.log((trueCount.value / compareResult.value.length) * 100);
  return (trueCount.value / compareResult.value.length) * 100;
});
// 根据正确率决定显示哪个表情
const face = computed(() => {
  if (accuracy.value >= 85) {
    return "smile-o"; // 笑脸
  } else if (accuracy.value >= 60) {
    return "neutral-o"; // 正常脸
  } else {
    return "sad-o"; // 哭脸
  }
});

onMounted(async () => {
  // showWelcome.value = true;
  let res = new Promise((resolve, reject) => {
    compareResult.value = JSON.parse(history.state.compareResult);
    user.value = history.state.user;
    userSelected.value = JSON.parse(history.state.userSelected);

    resolve(compareResult.value);
  });
  res.then((res) => {
    console.log("compareResult", res);
    showWelcome.value = true;
  });
});
</script>

<template>
  <div>
    <!-- 弹出提示 -->
    <van-dialog
      v-model:show="showWelcome"
      title="完成试题"
      theme="round-button"
    >
      <template #title>
        <div class="custom-title">恭喜完成了{{ compareResult.length }}道题</div>
      </template>
      <template #default>
        <div class="custom-content">
          <div class="result-row">正确{{ trueCount }}道题</div>
          <div class="result-row">半对{{ halfCount }}道题目</div>
          <div class="result-row">错误{{ falseCount }}道题</div>
        </div>
      </template>
    </van-dialog>

    <!-- 标题 -->
    <div class="nav-bar-container">
      <van-nav-bar
        title="背诵答案"
        :right-text="user"
        :left-text="`正确率：${trueCount}/${compareResult.length}`"
      />
    </div>

    <!-- 列表 -->
    <van-checkbox-group v-model="userSelected">
      <van-cell-group>
        <div v-for="(item, index) in compareResult" :key="index">
          <van-cell
            class="bold-title border-cell"
            :class="{
              'green-background': item.flag === 'true',
              'red-background': item.flag === 'false',
              'orange-background': item.flag === 'half',
            }"
          >
            <template #title>
              <div>{{ item.序号 + ". " + item.英文 }}</div>
            </template>
          </van-cell>
          <!-- 显示对应的中文选项 -->
          <van-cell-group>
            <van-cell
              v-for="(chinese, index2) in item.中文"
              :key="index2"
              clickable
              class="chinese-cell"
            >
              <template #title>
                <div style="text-align: left">{{ chinese }}</div>
              </template>
              <template #right-icon>
                <van-checkbox
                  :name="`${index + 1}-${index2 + 1}`"
                  :disabled="true"
                  :checked="userSelected.includes(`${index + 1}-${index2 + 1}`)"
                />
              </template>
            </van-cell>
            <!-- 条件渲染显示答案 -->
            <van-cell v-if="item.flag !== 'true'" class="answer-cell">
              <template #title>
                <div style="text-align: left">
                  答案：{{ item.答案.join("；") }}
                </div>
              </template>
            </van-cell>
          </van-cell-group>
        </div>
      </van-cell-group>
    </van-checkbox-group>
  </div>
</template>




<style>
.border-cell {
  border-top: 4px solid #eee; /* 每组的顶部边框加粗 */
}

.custom-cell-group:not(:last-child) {
  margin-bottom: 10px; /* 组之间的间隔 */
}

.chinese-cell {
  border-bottom: 0.5px solid #eee; /* 中文选项之间的分割线 */
}

.chinese-cell:last-of-type {
  border-bottom: none; /* 移除最后一个中文选项的分割线 */
}
.wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%; /* 确保wrapper高度充满父容器 */
}
.green-background {
  background-color: green !important;
}

.red-background {
  background-color: red !important;
}

.orange-background {
  background-color: orange !important;
}

.answer-cell {
  background-color: bisque !important;
}
.nav-bar-container {
  position: sticky;
  top: 0;
  z-index: 100;
}
/* 对话框标题居中 */
.custom-title {
  display: flex;
  align-items: center;
  justify-content: center; /* 水平居中 */
  text-align: center; /* 文本居中 */
  width: 100%;
  font-size: 18px;
  margin-bottom: 10px;
}

/* 图标调整，如果需要 */
.van-icon {
  margin-left: 8px; /* 根据需要调整图标和文本的间距 */
}

.custom-content {
  text-align: center; /* 文本居中 */
  margin-bottom: 20px;
}

.result-row {
  display: flex;
  justify-content: center; /* 使flex项在容器中居中 */
  text-align: left; /* 文本左对齐 */
  width: 100%; /* 可以根据需要调整宽度 */
}
</style>
