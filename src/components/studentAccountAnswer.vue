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
const instance = getCurrentInstance();
const axios = instance.appContext.config.globalProperties.$ajax;
const router = useRouter();
const compareResult = ref([]);
const userSelected = ref([]);
const nid = ref("");
const trueCount = computed(() => {
  return compareResult.value.filter((item) => item.flag === "true").length;
});
const halfCount = computed(() => {
  return compareResult.value.filter((item) => item.flag === "half").length;
});
const falseCount = computed(() => {
  return compareResult.value.filter((item) => item.flag === "false").length;
});
// 继续跳转做题
const gotoNext = () => {
  console.log(compareResult.value);
  console.log(nid.value);
  const rate = trueCount.value === compareResult.value.length ? 1 : 0;
  async function updateAccountData() {
    // 更新attempt和rate
    let params = new URLSearchParams();
    params.append("method", "updateUserData");
    params.append("nid", nid.value);
    params.append("rate", rate);
    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }
  async function refreshAccountData() {
    // 重新查找用户数据
    let params = new URLSearchParams();
    params.append("method", "refreshUserData");
    params.append("nid", nid.value);
    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }
  async function handleAccountData() {
    try {
      const updateResult = await updateAccountData();
      // console.log(updateResult);
      const refreshResult = await refreshAccountData();
      // console.log(refreshResult);
      // return refreshResult;
      return {
        refreshResult: refreshResult,
        rate: updateResult["rate"],
      };
    } catch (error) {
      console.error("Error handling account data:", error);
    }
  }

  async function updateAndNavigate() {
    // 导航到页面
    const data = await handleAccountData();
    console.log(data);
    router.push({
      path: "/studentAccountList",
      state: {
        data: JSON.stringify(data["refreshResult"]),
        flagRate: data["rate"],
      },
    });
  }
  updateAndNavigate();
};

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
  Math.round(0.25 * window.innerHeight),
  Math.round(0.55 * window.innerHeight),
];
const heightScroll = ref(anchorsScrolls[0]);
const setItemRef = (el) => {
  if (el) {
    myList.value.push(el);
  }
};
const scrollToItem = (index) => {
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
const showStar = ref(false);
const keywordsHighlight = "左上角👀";
const textHighlight = "点击左上角👀，查看错题";
const keywordsHighlight2 = "右上角继续";
const textHighlight2 = "确认并背诵单词后，点击右上角继续";
const keywordsHighlight3 = "下拉导航";
const textHighlight3 = "底部下拉导航快速定位";
onMounted(async () => {
  let res = new Promise((resolve, reject) => {
    compareResult.value = JSON.parse(history.state.compareResult);
    userSelected.value = JSON.parse(history.state.userSelected);
    nid.value = history.state.nid;
    resolve(compareResult.value);
  });
  res.then((res) => {
    console.log("compareResult", res);
    if (trueCount.value == compareResult.value.length) {
      showStar.value = true;
      setTimeout(() => {
        showStar.value = false; // 3秒后隐藏星星
      }, 5000);
    } else {
      showWelcome.value = true;
    }
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
        <div class="custom-content">
          <van-highlight
            :keywords="keywordsHighlight"
            :source-string="textHighlight"
            highlight-class="custom-class"
          />
        </div>
        <div class="custom-content">
          <van-highlight
            :keywords="keywordsHighlight3"
            :source-string="textHighlight3"
            highlight-class="custom-class"
          />
        </div>
        <div class="custom-content">
          <van-highlight
            :keywords="keywordsHighlight2"
            :source-string="textHighlight2"
            highlight-class="custom-class"
          />
        </div>

      </template>
    </van-dialog>

    <!-- 标题 -->
    <div class="nav-bar-container">
      <van-nav-bar title="背诵答案" right-text="继续" @click-right="gotoNext()">
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
    >
      <van-cell title="上拉查看导航" value="点击跳转" style="color: blue; font-weight: bold" />
      <van-cell-group
        v-for="(item, index) in filteredCompareResult"
        :key="index"
      >
        <van-cell
          @click="scrollToItem(item.序号)"
          is-link
          :title="item.序号 + '. ' + item.英文"
          :value="item.答案"
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
            <van-cell v-if="item.flag !== 'true'" class="answer-cell">
              <template #title>
                <div style="text-align: left">答案：{{ item.答案 }}</div>
              </template>
            </van-cell>
          </van-cell-group>
        </div>
      </van-cell-group>
    </van-checkbox-group>

    <!-- 星星动画容器 -->
    <div id="star-animation" class="star-container" v-if="showStar">★</div>
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

.star-container {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0); /* 开始时大小为0 */
  font-size: 5rem; /* 星星的基础大小 */
  color: gold;
  opacity: 0; /* 开始时透明度为0 */
  animation: starFadeInOut 5s forwards; /* 动画名称，持续时间，以及动画结束时的状态 */
}

@keyframes starFadeInOut {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0);
  }
  50% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(4); /* 中间点时最大 */
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.5); /* 结束时缩小并消失 */
  }
}
</style>
