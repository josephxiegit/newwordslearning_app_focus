<script setup>
import {
  watch,
  onMounted,
  ref,
  getCurrentInstance,
  onBeforeUnmount,
  onBeforeUpdate,
  computed,
} from "vue";
import {
  Divider,
  showDialog,
  showToast,
  showLoadingToast,
  showConfirmDialog,
  closeToast,
  Toast,
} from "vant";
import { useRouter } from "vue-router";
import WolfBack from "./wolfBack.vue";
import VictorySheep from "./victorySheep.vue";
import HalfTrue from "./HalfTrue.vue";
import VideoList from "./videoList.vue";
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
  handleAnswerSheetClose();
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
    // console.log("res.username", res.username);
    // console.log("flagRate", rate.value);
    if (rate.value >= 3 && RateOrigin.value < 3) {
      // 三星庆祝
      router.push({
        path: "/complete3star",
        state: {
          data: JSON.stringify(res.data),
          unique_aliases: JSON.stringify(res.unique_aliases),
          username: res.username,
          flagRate: rate.value,
        },
      });
    } else {
      // 跳转主页
      router.push({
        path: "/studentAccountList",
        state: {
          data: JSON.stringify(res.data),
          unique_aliases: JSON.stringify(res.unique_aliases),
          username: res.username,
          flagRate: rate.value,
        },
      });
    }
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
const showWelcomeAllTrue = ref(false);
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

// 延迟库
const showUncertain = ref(false);
const uncertainResult = ref("");
const showUncertainDot = ref(false);
const showUncertainAndSpell = () => {
  showWelcomeHalf.value = false;
  showWelcome.value = false;
  showUncertain.value = true;
  showUncertainDot.value = false;
  handleUncertainClose();
};
const showUncertainResult = () => {
  showUncertain.value = true;
  showUncertainDot.value = false;
  handleUncertainClose();
};

// 单词发音
const speakWord = (english, answer) => {
  try {
    let utterance;

    if (!/[a-zA-Z]/.test(english)) {
      utterance = new SpeechSynthesisUtterance(answer);
      utterance.lang = "en-US";
    } else {
      utterance = new SpeechSynthesisUtterance(english);
      utterance.lang = "en-US";
    }
    window.speechSynthesis.speak(utterance);
  } catch (error) {
    showToast("此浏览器不支持发音，请更换chrome或edge");
  }
};
// 记录答案时间
const createTimeAnswer = ref("");
const createTimeUncertain = ref("");
const account_data_id = ref(0);
const account_log_id = ref(0);
const complement = ref(0);
const username = ref("");
const handleAnswerSheetClose = () => {
  // 关闭答案页面执行
  const endTime = new Date();
  const timeDifference = endTime - createTimeAnswer.value;
  const minutes = Math.floor(timeDifference / 1000 / 60);
  const seconds = Math.floor((timeDifference / 1000) % 60);
  const formattedTimeDifference = `${minutes}分${seconds}秒`;
  console.log("Time Difference:", formattedTimeDifference);

  const date = new Date(createTimeAnswer.value);
  const formattedDateStr = `${date.getFullYear()}年${(date.getMonth() + 1)
    .toString()
    .padStart(2, "0")}月${date.getDate().toString().padStart(2, "0")}日${date
    .getHours()
    .toString()
    .padStart(2, "0")}时${date.getMinutes().toString().padStart(2, "0")}分${date
    .getSeconds()
    .toString()
    .padStart(2, "0")}秒`;

  async function updateAnswerDuration() {
    // 上传时间
    let params = new URLSearchParams();
    params.append("method", "updateAnswerDuration");
    params.append("username", username.value);
    params.append("account_data_id", account_data_id.value);
    params.append("account_log_id", account_log_id.value);
    params.append("type", "检查");
    params.append("create_time", formattedDateStr);
    params.append("duration", formattedTimeDifference);
    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }
  updateAnswerDuration().then((res) => {
    console.log(res);
  });
};
async function updateUncertainDuration(formattedDateStr) {
  // 上传时间
  let params = new URLSearchParams();
  params.append("method", "updateAnswerDuration");
  params.append("username", username.value);
  params.append("account_data_id", account_data_id.value);
  params.append("account_log_id", account_log_id.value);
  params.append("type", "迟疑");
  params.append("create_time", formattedDateStr);
  params.append("duration", 0);
  return await axios.post("words/", params).then((ret) => {
    return ret.data;
  });
}
const handleUncertainClose = () => {
  const date = new Date();
  const formattedDateStr = `${date.getFullYear()}年${(date.getMonth() + 1)
    .toString()
    .padStart(2, "0")}月${date.getDate().toString().padStart(2, "0")}日${date
    .getHours()
    .toString()
    .padStart(2, "0")}时${date.getMinutes().toString().padStart(2, "0")}分${date
    .getSeconds()
    .toString()
    .padStart(2, "0")}秒`;
  // console.log("formattedDateStr:", formattedDateStr);

  updateUncertainDuration(formattedDateStr).then((res) => {
    console.log(res);
  });
};

const handlePageUnload = () => {
  // 页面关闭
  handleAnswerSheetClose();
  sessionStorage.removeItem("videoGame");
};

// 看视频
const showVideoPopup = ref(false);
const showVideoButton = ref(true);
const videoList = ref([]);
const customWord = ref([]);
const userDiamonds = ref("");

const offsetDaily = ref({
  x: window.innerWidth - 67,
  y: 70,
});
const handleConfirmResult = async () => {
  if (
    compareResult.value.length - trueCount.value > 0 &&
    compareResult.value.length - trueCount.value <= 2
  ) {
    let toast1 = showLoadingToast({
      message: "查询中...",
      forbidClick: true,
    });
    let params = new URLSearchParams();
    params.append("method", "getUserDiamonds");
    params.append("user", username.value);
    params.append("account_log_id", account_log_id.value);
    let res = await axios.post("words/", params);
    console.log("res: ", res);

    toast1.close();
    if (res.data == "补全已完成") {
      showToast("补全已完成");
      showVideoButton.value = false;
      return;
    }
    userDiamonds.value = res.data.diamonds;
    console.log("userDiamonds: ", userDiamonds.value);
    if (userDiamonds.value >= 3) {
      compareResult.value.forEach((item) => {
        if (item.flag !== "true") {
          const correctAnswer =
            item["正确答案"] !== undefined ? item["正确答案"] : item["答案"];

          const errorItem = {
            英文: item["英文"],
            答案: correctAnswer,
          };
          videoList.value.push(errorItem);
        }
      });
      console.log("videList:", videoList.value);

      customWord.value = videoList.value.map(
        (item) => `${item.英文} ${item.答案}`
      );

      showConfirmDialog({
        title: "视频看单词",
        showCancelButton: true,
        theme: "round-button",
        message: `当前账户💎${userDiamonds.value}\n看视频抵消背诵错误，消耗💎*3，\n是否确认？`,
      }).then(() => {
        showVideoPopup.value = true;
      });
    } else {
      showConfirmDialog({
        title: "视频补全失败",
        theme: "round-button",
        message: "钻石数量不足，周长任务可以获得钻石",
        showCancelButton: false,
      });
    }
  } else {
    showConfirmDialog({
      title: "视频补全失败",
      theme: "round-button",
      message: "错误在2个及以下才能补全错误",
      showCancelButton: false,
    });
  }
};

const onFinishedVideo = () => {
  showVideoPopup.value = false;
  showVideoButton.value = false;
  showLoadingToast({
    message: "补全中...",
    duration: 0,
  });
  async function completeLog() {
    let params = new URLSearchParams();
    params.append("method", "completeLog");
    params.append("account_data_id", account_data_id.value);
    params.append("account_log_id", account_log_id.value);
    params.append("complement", complement.value);
    params.append("user", username.value);
    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }
  completeLog().then((res) => {
    // console.log(res);
    closeToast();
    showConfirmDialog({
      title: "恭喜！本次补全完成",
      theme: "round-button",
      message: "多多完成周长任务吧！",
      showCancelButton: false,
    });
  });
};

const onExitVideo = () => {
  showVideoPopup.value = false;
  showToast("人不在屏幕前，游戏结束");
};

const onExitVideo2 = () => {
  showVideoPopup.value = false;
  showToast("点击次数过多，不够专心");
};

const areAnswersDifferent = (answer, correctAnswer) => {
  // console.log("correctAnswer: ", correctAnswer);
  // console.log("answer: ", answer);
  // 定义分隔符，包含逗号和分号
  const delimiters = /[；,]/;

  // 根据分隔符拆分答案和正确答案为数组
  const answerArray = answer.split(delimiters).map((s) => s.trim());
  // console.log('answerArray: ', answerArray);
  const correctAnswerArray = correctAnswer
    .split(delimiters)
    .map((s) => s.trim());
  // console.log('correctAnswerArray: ', correctAnswerArray);
  // 创建一个集合，包含所有唯一的答案项
  const answerSet = new Set(answerArray);
  const correctAnswerSet = new Set(correctAnswerArray);

  // 检查两个集合是否相等
  if (answerSet.size !== correctAnswerSet.size) {
    // console.log(111)
    // console.log('--------------------------------')
    return true;
  }
  for (let ans of answerSet) {
    if (!correctAnswerSet.has(ans)) {
      // console.log(222)
      // console.log('--------------------------------')
      return true;
    }
  }
  // console.log(333)
  // console.log('--------------------------------')
  return false;
};

const newCoins = ref(0);
const lock_spell = ref(false);
const spellVocabulary = ref([]);
const RateOrigin = ref(0);
onBeforeUnmount(() => {
  // document.removeEventListener("visibilitychange", handleVisibilityChange);
  window.removeEventListener("beforeunload", handlePageUnload);
  // window.removeEventListener("pagehide", handlePageUnload);
});
onMounted(async () => {
  window.addEventListener("beforeunload", handlePageUnload);
  createTimeAnswer.value = new Date();
  let res = new Promise((resolve, reject) => {
    compareResult.value = JSON.parse(history.state.compareResult);

    account_data_id.value = history.state.nid;
    account_log_id.value = history.state.account_log_id;
    RateOrigin.value = history.state.RateOrigin;
    complement.value = history.state.complement;
    username.value = history.state.username;

    uncertainResult.value = JSON.parse(history.state.uncertainResult);
    spellVocabulary.value = JSON.parse(history.state.spellVocabulary);
    lock_spell.value = history.state.lock_spell;
    // console.log("spellVocabulary: ", spellVocabulary.value);
    // console.log("lock_spell: ", lock_spell.value);

    uncertainResult.value.sort((a, b) => {
      const importantTypes = ["点金", "透视", "回溯"];

      const aHasImportantType = importantTypes.some((type) =>
        a.type.includes(type)
      );
      const bHasImportantType = importantTypes.some((type) =>
        b.type.includes(type)
      );

      // 如果 a 有重要类型而 b 没有，a 排在前面
      if (aHasImportantType && !bHasImportantType) {
        return -1;
      }
      // 如果 b 有重要类型而 a 没有，b 排在前面
      if (bHasImportantType && !aHasImportantType) {
        return 1;
      }
      // 如果两者都有或都没有重要类型，则保持原顺序
      return 0;
    });
    if (uncertainResult.value.length != 0) {
      showUncertainDot.value = true;
    }

    newCoins.value = history.state.newCoins;
    userSelected.value = JSON.parse(history.state.userSelected);
    rate.value = history.state.rate;
    nid.value = history.state.nid;
    halfTrue.value = history.state.halfTrue;
    resolve(compareResult.value);
  });
  res.then((res) => {
    // console.log("compareResult", res);
    // console.log("uncertainResult", uncertainResult.value);
    // console.log('trueCount.value: ', trueCount.value);
    console.log("compareResult.value: ", compareResult.value);

    if (trueCount.value == compareResult.value.length) {
      showAnimationShineVictory();
      showWelcomeAllTrue.value = true;
    } else if (halfTrue.value == 0.5) {
      showWelcomeHalf.value = true;
      showAnimationHalfTrue();
    } else {
      showWelcome.value = true;
      showAnimationShine();
    }
    return "ok";
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
      @confirm=""
    >
      <template #title>
        <div class="custom-title">很遗憾！下次加油哦</div>
      </template>
      <template #default>
        <div class="custom-content">
          <div class="result-row">正确{{ trueCount }}道题</div>
          <div class="result-row">半对{{ halfCount }}道题目</div>
          <div class="result-row">错误{{ falseCount }}道题</div>
          <div class="result-row">新获得{{ newCoins }}金币</div>
          <Divider></Divider>
          <van-tag type="warning" size="large" round
            >下次将进行拼写考察，点击
            <van-tag
              type="danger"
              size="large"
              round
              @click="showUncertainAndSpell"
              >迟疑/拼写</van-tag
            >
            复习</van-tag
          >
        </div>
      </template>
    </van-dialog>

    <!-- 弹出提示 -->
    <van-dialog
      v-model:show="showWelcomeHalf"
      title="完成试题"
      theme="round-button"
      class="custom-dialog"
      @confirm=""
    >
      <template #title>
        <div class="custom-title">还不错！获得1/2奖励</div>
      </template>
      <template #default>
        <div class="custom-content">
          <div class="result-row">正确{{ trueCount }}道题</div>
          <div class="result-row">半对{{ halfCount }}道题目</div>
          <div class="result-row">错误{{ falseCount }}道题</div>
          <div class="result-row">新获得{{ newCoins }}金币</div>
          <Divider></Divider>
          <van-tag type="warning" size="large" round
            >下次将进行拼写考察，点击
            <van-tag
              type="danger"
              size="large"
              round
              @click="showUncertainAndSpell"
              >迟疑/拼写</van-tag
            >
            复习</van-tag
          >
        </div>
      </template>
    </van-dialog>

    <!-- 弹出提示 -->
    <van-dialog
      v-model:show="showWelcomeAllTrue"
      title="完成试题"
      theme="round-button"
      class="custom-dialog"
    >
      <template #title>
        <div class="custom-title">恭喜，全对了！</div>
      </template>
      <template #default>
        <div class="custom-content">
          <div class="result-row">新获得{{ newCoins }}金币</div>
        </div>
      </template>
    </van-dialog>
    <!-- 标题 -->
    <div class="nav-bar-container">
      <van-nav-bar title="背诵答案">
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
            <span style="color: rgb(64, 135, 242)">
              正确率：{{ trueCount }}/{{ compareResult.length }}
            </span>
          </div>
        </template>
        <template #right>
          <div style="margin-right: 1rem" @click="showUncertainResult()">
            <van-badge :dot="showUncertainDot">
              <span style="color: rgb(64, 135, 242)">迟疑 / 拼写</span>
            </van-badge>
          </div>

          <div @click="gotoNext()">
            <span style="color: rgb(64, 135, 242)"> 继续 </span>
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

    <!-- 视频 -->
    <div class="child">
      <van-floating-bubble
        v-if="showVideoButton"
        class="dailyFloat"
        axis="xy"
        magnetic="x"
        v-model:offset="offsetDaily"
        icon="gem-o"
        @click="handleConfirmResult()"
      />
    </div>

    <!-- 延迟库 -->
    <van-popup
      v-model:show="showUncertain"
      position="left"
      :style="{ height: '100%' }"
      closeable
      :lock-scroll="false"
    >
      <van-cell-group inset>
        <div style="margin-left: 0.5rem; font-weight: 700; margin-right: 2rem">
          <p style="font-size: 20px; color: black; margin-top: 2rem">迟疑库</p>
          <p style="color: red; margin-top: -1rem">
            监测到以下词汇不够熟练，请再次复习!
          </p>
          <div
            style="
              font-size: 16px;
              margin-top: -0.5rem;
              font-weight: 400;
              color: gray;
            "
          >
            共{{ uncertainResult.length }}词
          </div>
        </div>
        <div v-for="(item, index) in uncertainResult" :key="index">
          <van-cell
            :label="
              item.正确答案 === '无'
                ? `答案：${item.答案}`
                : `答案：${item.正确答案}`
            "
            :value="item.type"
          >
            <template #title>
              <div style="font-size: larger; font-weight: 700">
                {{ item.英文 }}
              </div>
            </template>
          </van-cell>
        </div>
      </van-cell-group>
      <van-divider></van-divider>
      <div style="margin-left: 1.5rem; font-weight: 700; margin-right: 2rem">
        <p style="font-size: 20px; color: black; margin-top: 1rem">拼写库</p>
        <div v-if="lock_spell">
          <p style="color: red; margin-top: -1rem">
            拼写库被锁死，继续复习以下词汇
          </p>
        </div>
        <div v-else>
          <p style="color: red; margin-top: -1rem">
            监测到以下词汇为非常不熟练，将进行拼写考察，请重视！
          </p>
        </div>

        <div
          style="
            font-size: 16px;
            margin-top: -0.5rem;
            font-weight: 400;
            color: gray;
          "
        >
          共{{ spellVocabulary.length }}词
        </div>
      </div>
      <div
        v-for="(item, index) in spellVocabulary"
        :key="index"
        style="margin-left: 1rem"
      >
        <van-cell
          :label="
            item.正确答案 === '无' || !item.正确答案
              ? `答案：${item.答案}`
              : `答案：${item.正确答案}`
          "
          :value="item.type"
        >
          <template #title>
            <div style="font-size: larger; font-weight: 700">
              {{ item.英文 }}
            </div>
          </template>
        </van-cell>
      </div>
    </van-popup>

    <!-- 看视频 -->
    <van-popup
      v-model:show="showVideoPopup"
      position="bottom"
      :style="{ height: '100%' }"
      closeable
      :lock-scroll="false"
    >
      <VideoList
        v-if="showVideoPopup"
        :words="customWord"
        @finished="onFinishedVideo"
        @exit="onExitVideo"
        @exit2="onExitVideo2"
      />
    </van-popup>

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
              <div @click="speakWord(item.英文, item.正确答案)">
                {{ item.序号 + ". " + item.英文 }}
                <img
                  src="../assets/speaker.png"
                  style="width: 12px; height: auto"
                />
              </div>
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

            <!-- 当 item.is_spell 为 true 且 item.flag 为 false 时，显示橙色背景和正确答案 -->
            <van-cell
              v-if="item.is_spell && item.flag === 'false'"
              style="background-color: bisque"
            >
              <template #title>
                正确答案：{{ item.正确答案 }} ｜ 用户选择:
                {{ item.用户选择.join("") }}</template
              >
            </van-cell>

            <!-- 当 item.is_spell 为 true 且 item.flag 为 true 时，显示绿色背景和正确答案 -->
            <van-cell
              v-else-if="item.is_spell && item.flag === 'true'"
              style="background-color: lightgreen"
            >
              <template #title> 正确答案：{{ item.正确答案 }} </template>
            </van-cell>

            <!-- 当 item.flag 不为 true 且不属于 is_spell 的情况，显示答案 -->
            <van-cell
              v-if="
                item.flag !== 'true' &&
                (!item.is_spell || item.flag !== 'false')
              "
              class="answer-cell"
            >
              <template #title>
                <div v-if="item.答案 !== item.正确答案">
                  正确答案：{{ item.正确答案 }}
                </div>
                <div v-else>答案：{{ item.答案 }}</div>
              </template>
            </van-cell>

            <van-cell
              v-if="
                (item.flag === 'true' || item.flag === 'half') &&
                item.答案 === '以上都不对' &&
                !item.is_spell
              "
              style="background-color: lightgreen"
            >
              <template #title>
                <div>以上都不对 ｜ 正确答案：{{ item.正确答案 }}</div>
              </template>
            </van-cell>

            <van-cell
              v-if="
                item.正确答案 &&
                areAnswersDifferent(item.答案, item.正确答案) &&
                item.答案 !== '以上都不对' &&
                !item.is_spell &&
                item.flag === 'true'
              "
              style="background-color: lightgreen"
            >
              <template #title>
                <!-- {{ areAnswersDifferent(item.答案, item.正确答案) }}
              {{ item.答案 !== '以上都不对' }}
              {{ !item.is_spell }}
              {{ item.flag === 'true' }} -->
                <div>{{ item.答案 }} ｜ 完全答案：{{ item.正确答案 }}</div>
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
    margin-top: 10px;
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

.dailyFloat.van-floating-bubble {
  width: 40px !important; /* 矩形宽度 */
  height: 50px !important; /* 矩形高度 */
  border-radius: 8px !important; /* 直角矩形，去掉圆角 */
  z-index: 0;
  background: linear-gradient(
    45deg,
    rgba(255, 79, 79, 0.3),
    rgba(240, 166, 202, 0.3)
  ) !important;
}

/* 确保图标居中 */
.dailyFloat .van-floating-bubble__icon {
  margin: auto;
  font-size: 28px !important;
}
</style>
