<script setup>
import {
  watch,
  onMounted,
  ref,
  getCurrentInstance,
  onBeforeUpdate,
  computed,
} from "vue";
import { showDialog, showToast } from "vant";
import { useRouter } from "vue-router";
import WolfBack from "./wolfBack.vue";
const router = useRouter();
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

// 切换显示
const showAll = ref(true); // 控制是否显示所有数据项的布尔变量
const filteredCompareResult = computed(() => {
  // 根据 showAll 的值过滤 compareResult 数据
  if (showAll.value) {
    return compareResult.value;
  } else {
    // 当 showAll 为 false 时，过滤掉 flag 为 true 的项
    return compareResult.value.filter((item) => item.flag !== "true");
  }
});
function toggleShowAll() {
  // 切换 showAll 的值
  showAll.value = !showAll.value;
  showScroll.value = !showScroll.value;
  myList.value = [];

  if (showScroll.value) {
    showToast({
      message: "下拉导航可用",
      position: "bottom",
    });
  } else {
    showToast({
      message: "下拉导航隐藏",
      position: "bottom",
    });
  }
}

// 预览跳转功能
const myList = ref([]);
const showScroll = ref(true);
const anchorsScrolls = [
  65,
  Math.round(0.4 * window.innerHeight),
  Math.round(0.65 * window.innerHeight),
];
const heightScroll = ref(anchorsScrolls[0]);
const setItemRef = (el) => {
  if (el) {
    myList.value.push(el);
  }
};
const scrollToItem = (index) => {
  // 检查是否点击的是列表中的最后两个选项
  if (index >= filteredCompareResult.value.length - 1) {
    heightScroll.value = 65;
  }
  if (myList.value[index]) {
    const item = myList.value[index - 1];
    const top = item.getBoundingClientRect().top + window.scrollY - 40; // 获取元素的顶部位置并向上偏移10px
    window.scrollTo({
      top: top,
      behavior: "smooth",
    });
  }
};

// 弹出欢迎
const showWelcome = ref(false);
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
    <WolfBack ref="wolfBackRef" />
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
      <van-nav-bar title="背诵答案" :right-text="`${user}`">
        <template #left>
          <div
            style="
              display: flex;
              align-items: center;
              justify-content: center;
              padding-top: 1px;
              padding-bottom: 1px;
            "
          >
            <van-icon
              :name="showAll ? 'eye-o' : 'eye'"
              @click="toggleShowAll"
              style="margin-left: -5px; margin-right: 5px"
              size="28"
            />
            <span style="color: rgb(64, 135, 242)"
              >正确率：{{ trueCount }}/{{ compareResult.length }}</span
            >
          </div>
        </template>
      </van-nav-bar>
    </div>

    <!-- 预览滚动 -->
    <van-floating-panel
      v-model:height="heightScroll"
      :anchors="anchorsScrolls"
      v-show="showScroll"
      :content-draggable="false"
    >
      <van-cell
        title="上拉查看导航"
        value="点击跳转"
        style="color: blue; font-weight: bold"
      />
      <van-cell-group
        v-for="(item, index) in filteredCompareResult"
        :key="index"
      >
        <van-cell
          @click="scrollToItem(item.序号)"
          is-link
          :title="item.序号 + '. ' + item.英文"
          :value="item.答案.join('; ')"
          size="large"
          :style="{
            color:
              item.flag === 'true'
                ? 'green'
                : item.flag === 'false'
                ? 'red'
                : 'orange',
          }"
        />
      </van-cell-group>
    </van-floating-panel>

    <!-- 列表 -->
    <van-checkbox-group v-model="userSelected" style="margin-bottom: 150px">
      <van-cell-group>
        <div
          v-for="(item, index) in filteredCompareResult"
          :key="index"
          :ref="setItemRef"
        >
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
                  :name="`${item.序号}-${index2 + 1}`"
                  :disabled="true"
                  :checked="userSelected.includes(`${item.序号}-${index2 + 1}`)"
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
