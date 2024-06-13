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
import VictorySheep from "./victorySheep.vue";
import HalfTrue from "./HalfTrue.vue";
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

  async function refreshAccountData() {
    // 重新查找用户数据
    let params = new URLSearchParams();
    params.append("method", "refreshUserData");
    params.append("nid", nid.value);
    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }
  refreshAccountData().then((res) => {
    router.push({
      path: "/studentAccountList",
      state: {
        data: JSON.stringify(res),
        flagRate: rate.value,
      },
    });
  });
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
const showWelcomeHalf = ref(false);
const showStar = ref(false);
const rate = ref("");
const halfTrue = ref("");
const wolfBackRef = ref(null);
const halfTrueRef = ref(null);
const victorySheepRef = ref(null);
function showAnimationShine() {
  wolfBackRef.value.show();

  setTimeout(() => {
    wolfBackRef.value.hide();
  }, 4000);
}
function showAnimationHalfTrue() {
  halfTrueRef.value.show();

  setTimeout(() => {
    halfTrueRef.value.hide();
  }, 4000);
}
function showAnimationShineVictory() {
  victorySheepRef.value.show();

  setTimeout(() => {
    victorySheepRef.value.hide();
  }, 8000);
}
onMounted(async () => {
  let res = new Promise((resolve, reject) => {
    compareResult.value = JSON.parse(history.state.compareResult);
    userSelected.value = JSON.parse(history.state.userSelected);
    rate.value = history.state.rate;
    nid.value = history.state.nid;
    halfTrue.value = history.state.halfTrue;
    resolve(compareResult.value);
  });
  res.then((res) => {
    console.log("compareResult", res);
    console.log('trueCount.value: ', trueCount.value);
    console.log('compareResult.value: ', compareResult.value.length);
    if (trueCount.value == compareResult.value.length) {
      // showStar.value = true;
      // setTimeout(() => {
      //   showStar.value = false; // 3秒后隐藏星星
      // }, 5000);
      showAnimationShineVictory();
    } else if (halfTrue.value == 0.5) {
      showWelcomeHalf.value = true;
      showAnimationHalfTrue();
    } else {
      showWelcome.value = true;
      showAnimationShine();
      
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
      class="custom-dialog"
    >
      <template #title>
        <div class="custom-title">很遗憾！下次加油哦</div>
      </template>
      <template #default>
        <div class="custom-content">
          <div class="result-row">正确{{ trueCount }}道题</div>
          <div class="result-row">半对{{ halfCount }}道题目</div>
          <div class="result-row">错误{{ falseCount }}道题</div>
        </div>
      </template>
    </van-dialog>

    <!-- 弹出提示 -->
    <van-dialog
      v-model:show="showWelcomeHalf"
      title="完成试题"
      theme="round-button"
      class="custom-dialog"
    >
      <template #title>
        <div class="custom-title">还不错！获得1/2奖励</div>
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
    <van-checkbox-group v-model="userSelected" class="checkbox-container">
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
                  :name="`${item.序号}-${index2 + 1}`"
                  :disabled="true"
                  :checked="userSelected.includes(`${item.序号}-${index2 + 1}`)"
                  
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
    <div class="bottom-placeholder"></div>
    <!-- 星星动画容器 -->
    <!-- <div id="star-animation" class="star-container" v-if="showStar">★</div> -->
    <WolfBack ref="wolfBackRef" />
    <VictorySheep ref="victorySheepRef" />
    <HalfTrue ref="halfTrueRef" />
  </div>

  
</template>




<style>
.checkbox-container {
  width: 100%;
  margin: 0 auto;
  
  
}
@media (min-width: 431px) {
  .checkbox-container {
    width: 90%;
    box-shadow: -5px 0 8px rgba(0, 0, 0, 0.2), 5px 0 8px rgba(0, 0, 0, 0.2);
    padding: 10px; 
    margin-top:10px
  }
}

.bottom-placeholder {
  height: 80px;
}



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

/* .custom-dialog {
  top: 0% !important;
} */
</style>
