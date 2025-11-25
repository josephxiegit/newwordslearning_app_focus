<script setup>
import {
  watch,
  onMounted,
  onUnmounted,
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
import VideoListPc from "./videoListPc.vue";
import success1 from "../assets/sound/success1.mp3";
import fail1 from "../assets/sound/fail1.mp3";
const instance = getCurrentInstance();
const axios = instance.appContext.config.globalProperties.$ajax;
const router = useRouter();
const compareResult = ref([]);
const userSelected = ref([]);
const nid = ref("");

const trueCount = computed(() => {
  return compareResult.value.filter((item) => item.flag === "true").length;
});
const falseCount_danci = computed(() => {
  return compareResult.value.filter(
    (item) => item.flag != "true" && item.排除 !== "试题"
  ).length;
});
const halfCount = computed(() => {
  return compareResult.value.filter((item) => item.flag === "half").length;
});
const falseCount = computed(() => {
  return compareResult.value.filter((item) => item.flag === "false").length;
});
// 继续跳转做题
const gotoNext = () => {
  const toast1 = showLoadingToast({
    message: "跳转中...",
    forbidClick: true,
    duration: 0,
  });

  let timeoutFlag = false;

  // 设定 8 秒超时机制
  const timeout = setTimeout(() => {
    timeoutFlag = true;
    toast1.close();
    showToast("网络延迟，稍后尝试");
  }, 8000);

  // 并行执行两个异步任务
  const task1 = handleAnswerSheetClose();
  const task2 = (async function refreshAccountData() {
    let params = new URLSearchParams();
    params.append("method", "refreshUserData");
    params.append("nid", nid.value);
    const response = await axios.post("words/", params);
    return response.data;
  })();

  Promise.all([task1, task2])
    .then(([_, res]) => {
      if (timeoutFlag) return; // 超时后不执行后续跳转
      clearTimeout(timeout);
      toast1.close();

      const targetRoute =
        rate.value >= 3 && RateOrigin.value < 3
          ? "/complete3starPc"
          : "/studentAccountListPc";

      router.push({
        path: targetRoute,
        state: {
          data: JSON.stringify(res.data),
          unique_aliases: JSON.stringify(res.unique_aliases),
          username: res.username,
          flagRate: rate.value,
        },
      });
    })
    .catch((err) => {
      console.error("跳转失败", err);
      toast1.close();
      clearTimeout(timeout);
      showToast("发生错误，请稍后再试");
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
  if (showAll.value) {
    showToast({
      message: "显示全部",
      position: "bottom",
    });
  } else {
    showToast({
      message: "仅显示错题",
      position: "bottom",
    });
  }
}

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
  const word = /[a-zA-Z]/.test(english) ? english : answer;
  const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(
    word
  )}&type=1`;
  const audio = new Audio(url);
  audio.play().catch(() => {
    console.log("Fallback to SpeechSynthesis");
    let utterance;
    if (!/[a-zA-Z]/.test(english)) {
      utterance = new SpeechSynthesisUtterance(answer);
    } else {
      utterance = new SpeechSynthesisUtterance(english);
    }

    utterance.lang = "en-US";
    utterance.pitch = 0.5;
    window.speechSynthesis.speak(utterance);
  });
};
// 记录答案时间
const createTimeAnswer = ref("");
const createTimeUncertain = ref("");
const account_data_id = ref(0);
const account_log_id = ref(0);
const complement = ref(0);
const username = ref("");
const handleAnswerSheetClose = async () => {
  const endTime = new Date();
  const timeDifference = endTime - createTimeAnswer.value;
  const minutes = Math.floor(timeDifference / 1000 / 60);
  const seconds = Math.floor((timeDifference / 1000) % 60);
  const formattedTimeDifference = `${minutes}分${seconds}秒`;

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
  console.log('account_data_id: ', account_data_id);
  let params = new URLSearchParams();
  params.append("method", "updateAnswerDuration");
  params.append("username", username.value);
  params.append("account_data_id", account_data_id.value);
  params.append("account_log_id", account_log_id.value);
  params.append("type", "检查");
  params.append("create_time", formattedDateStr);
  params.append("duration", formattedTimeDifference);
  const res = await axios.post("words/", params);
  return res.data;
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
  y: 90,
});
const handleConfirmResult = async () => {
  // if (falseCount_danci.value > 0 && falseCount_danci.value <= 2) {
    if (falseCount_danci.value > 0 && falseCount_danci.value <= 8) {
    // console.log('补全单词');
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
      videoList.value = [];
      compareResult.value.forEach((item) => {
        if (item.flag !== "true" && item.排除 !== "试题") {
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
        pauseAudio();
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
      title: `视频补全失败`,
      theme: "round-button",
      message: `错误在2个及以下才能补全错误<br><b>(不含试题部分)</b>`,
      allowHtml: true,
      showCancelButton: false,
    });
  }
};

const onFinishedVideo = () => {
  showVideoPopup.value = false;
  setTimeout(() => {
    playAudio();
  }, 1000);
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
  setTimeout(() => {
    playAudio();
  }, 1000);
  showToast("人不在屏幕前，游戏结束");
};

const onExitVideo2 = () => {
  showVideoPopup.value = false;
  setTimeout(() => {
    playAudio();
  }, 1000);
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
onUnmounted(() => {
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
    audio = null;
    isPlaying.value = false;
  }
});

// 音乐播放
let audio = null;
const isPlaying = ref(false);
const playAudio = () => {
  if (!audio) {
    audio = new Audio("/answerBGM.mp3");
    audio.loop = true;
    audio.volume = 0.3;
  }

  audio
    .play()
    .then(() => {
      isPlaying.value = true;
    })
    .catch((err) => {
      console.warn("播放失败：", err);
    });
};

const pauseAudio = () => {
  if (audio && isPlaying.value) {
    audio.pause();
    isPlaying.value = false;
  }
};

const toggleAudio = () => {
  if (isPlaying.value) {
    pauseAudio();
  } else {
    playAudio();
  }
};

onMounted(async () => {
  window.addEventListener("beforeunload", handlePageUnload);
  createTimeAnswer.value = new Date();
  console.log("history.state", history.state)
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
      const audiosuccess1eSound = new Audio(success1);
      audiosuccess1eSound.play().catch((err) => {
        console.warn("播放失败：", err);
      });
      showAnimationShineVictory();
      showWelcomeAllTrue.value = true;
    } else if (halfTrue.value == 0.5) {
      const audiofail1Sound = new Audio(fail1);
      audiofail1Sound.play().catch((err) => {
        console.warn("播放失败：", err);
      });
      showWelcomeHalf.value = true;
      showAnimationHalfTrue();
    } else {
      const audiofail1Sound = new Audio(fail1);
      audiofail1Sound.play().catch((err) => {
        console.warn("播放失败：", err);
      });
      showWelcome.value = true;
      showAnimationShine();
    }
    return "ok";
  });
});
</script>

<template>
  <div class="layout-container">
    <!-- 左侧导航栏 -->
    <div class="left-sidebar">
      <!-- 眼睛符号和正确率 -->
      <div class="sidebar-item" @click="toggleShowAll">
        <van-icon :name="showAll ? 'eye-o' : 'closed-eye'" size="24" color="#4087f2" />
        <div class="sidebar-text">
          <div style="font-size: 12px; color: #666">正确率</div>
          <div style="font-weight: bold; color: #4087f2">
            {{ trueCount }}/{{ compareResult.length }}
          </div>
        </div>
      </div>

      <!-- 迟疑/拼写 -->
      <div class="sidebar-item" @click="showUncertainResult()">
        <van-badge :dot="showUncertainDot">
          <van-icon name="warning-o" size="24" color="#ff976a" />
        </van-badge>
        <div class="sidebar-text">
          <div style="font-size: 11px">迟疑/拼写</div>
        </div>
      </div>

      <!-- 背景音乐控制 -->
      <div class="sidebar-item" @click="toggleAudio">
        <van-icon
          :name="isPlaying ? 'volume-o' : 'volume-o'"
          size="24"
          :color="isPlaying ? '#07c160' : '#999'"
        />
        <div class="sidebar-text">
          <div style="font-size: 11px">{{ isPlaying ? "暂停" : "播放" }}</div>
        </div>
      </div>

      <!-- 继续按钮 -->
      <div class="sidebar-item continue-btn" @click="gotoNext()">
        <van-icon name="arrow" size="24" color="#fff" />
        <div class="sidebar-text" style="color: #fff">
          <div style="font-size: 12px; font-weight: bold">继续</div>
        </div>
      </div>
    </div>

    <!-- 右侧内容区域 -->
    <div class="right-content">
      <!-- 顶部导航栏 -->
      <div class="top-nav">
        <div class="nav-left">{{ username }}</div>
        <div class="nav-title">背诵答案</div>
        <div class="nav-right"></div>
      </div>
      <!-- 弹出提示 -->
      <van-dialog
        v-model:show="showWelcome"
        title="完成试题"
        theme="round-button"
        class="custom-dialog"
        @confirm="playAudio"
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
        @confirm="playAudio"
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
        @confirm="playAudio"
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

      <!-- 视频钻石 -->
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
          <div
            style="margin-left: 0.5rem; font-weight: 700; margin-right: 2rem"
          >
            <p style="font-size: 20px; color: black; margin-top: 2rem">
              迟疑库
            </p>
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
        :style="{ height: '100%', overflow: 'hidden' }"
        closeable
        :lock-scroll="false"
      >
        <VideoListPc
          v-if="showVideoPopup"
          :words="customWord"
          @finished="onFinishedVideo"
          @exit="onExitVideo"
          @exit2="onExitVideo2"
        />
      </van-popup>

      <!-- 多列卡片布局 -->
      <div class="cards-grid">
        <div
          v-for="(item, index) in filteredCompareResult"
          :key="index"
          class="card-item"
          :class="{
            'card-correct': item.flag === 'true',
            'card-wrong': item.flag === 'false',
            'card-half': item.flag === 'half',
          }"
        >
          <!-- 卡片头部 -->
          <div class="card-header">
            <div
              class="card-title"
              @click="speakWord(item.英文, item.正确答案)"
            >
              <span class="card-number">{{ item.序号 }}.</span>
              {{ item.英文 }}
              <img
                src="../assets/speaker.png"
                style="width: 14px; height: auto; margin-left: 4px"
              />
            </div>
          </div>

          <!-- 卡片内容 -->
          <div class="card-body">
            <!-- 非手写题 -->
            <div v-if="item.排除 !== '手写'">
              <div
                v-for="(chinese, index2) in item.中文"
                :key="index2"
                class="option-item"
              >
                <div class="option-text">{{ chinese }}</div>
                <van-checkbox
                  :name="`${item.序号}-${index2 + 1}`"
                  :disabled="true"
                  :checked="userSelected.includes(`${item.序号}-${index2 + 1}`)"
                />
              </div>

              <!-- 拼写题答案显示 -->
              <div
                v-if="item.is_spell && item.flag === 'false'"
                class="answer-box wrong-answer"
              >
                <div>正确答案：{{ item.正确答案 }}</div>
                <div>用户选择: {{ item.用户选择.join("") }}</div>
              </div>

              <div
                v-else-if="item.is_spell && item.flag === 'true'"
                class="answer-box correct-answer"
              >
                正确答案：{{ item.正确答案 }}
              </div>

              <!-- 普通题答案显示 -->
              <div
                v-if="
                  item.flag !== 'true' &&
                  (!item.is_spell || item.flag !== 'false')
                "
                class="answer-box wrong-answer"
              >
                <div v-if="item.答案 !== item.正确答案">
                  正确答案：{{ item.正确答案 }}
                </div>
                <div v-else>答案：{{ item.答案 }}</div>
              </div>

              <div
                v-if="
                  (item.flag === 'true' || item.flag === 'half') &&
                  item.答案 === '以上都不对' &&
                  !item.is_spell
                "
                class="answer-box correct-answer"
              >
                以上都不对 ｜ 正确答案：{{ item.正确答案 }}
              </div>

              <div
                v-if="
                  item.正确答案 &&
                  areAnswersDifferent(item.答案, item.正确答案) &&
                  item.答案 !== '以上都不对' &&
                  !item.is_spell &&
                  item.flag === 'true'
                "
                class="answer-box correct-answer"
              >
                {{ item.答案 }} ｜ 完全答案：{{ item.正确答案 }}
              </div>
            </div>

            <!-- 手写题 -->
            <div v-else>
              <div class="option-item">
                <div class="option-text">用户拼写：{{ item.用户选择[0] }}</div>
              </div>
              <div
                v-if="item.排除 === '手写' && item.flag === 'true'"
                class="answer-box correct-answer"
              >
                正确答案：{{ item.英文 }}
              </div>
              <div
                v-if="item.排除 === '手写' && item.flag === 'false'"
                class="answer-box wrong-answer"
              >
                正确答案：{{ item.英文 }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 动画组件 -->
    <WolfBack ref="wolfBackRef" />
    <VictorySheep ref="victorySheepRef" />
    <HalfTrue ref="halfTrueRef" />
  </div>
</template>

<style scoped>
.layout-container {
  display: flex;
  min-height: 100vh;
  background: #f5f5f5;
}

/* 左侧导航栏 - 调整位置避免被顶部导航栏遮挡 */
.left-sidebar {
  position: fixed;
  left: 0;
  top: 60px;
  width: 80px;
  height: calc(100vh - 60px);
  background: #ffffff;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
  gap: 30px;
  z-index: 1000;
}

.sidebar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 12px 8px;
  border-radius: 12px;
  transition: all 0.3s;
  color: #fff;
  width: 64px;
}

.sidebar-item:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.sidebar-item:active {
  transform: scale(0.95);
}

.sidebar-text {
  text-align: center;
  font-size: 11px;
  line-height: 1.3;
  color: black;
}

.continue-btn {
  background: linear-gradient(135deg, #ff6b6b 0%, #ff8e8e 100%);
  margin-top: auto;
  margin-bottom: 20px;
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.4);
}

.continue-btn:hover {
  background: linear-gradient(135deg, #ff5252 0%, #ff7979 100%);
  box-shadow: 0 6px 16px rgba(255, 107, 107, 0.5);
}

/* 顶部导航栏 - 固定在页面最上方 */
.top-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.nav-left {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.nav-title {
  font-size: 18px;
  font-weight: 700;
  color: #4087f2;
}

.nav-right {
  width: 80px;
}

/* 右侧内容区域 - 添加顶部边距避免被导航栏遮挡 */
.right-content {
  margin-left: 80px;
  flex: 1;
  padding: 80px 20px 20px;
  width: calc(100% - 80px);
}

/* 卡片网格布局 */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
  padding-bottom: 40px;
}

/* 响应式：大屏幕3列 */
@media (min-width: 1400px) {
  .cards-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* 响应式：中等屏幕2列 */
@media (min-width: 768px) and (max-width: 1399px) {
  .cards-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* 响应式：小屏幕1列 */
@media (max-width: 767px) {
  .cards-grid {
    grid-template-columns: 1fr;
  }
  
  .left-sidebar {
    width: 60px;
    top: 60px;
    height: calc(100vh - 60px);
  }
  
  .right-content {
    margin-left: 60px;
    padding: 80px 12px 12px;
    width: calc(100% - 60px);
  }
  
  .sidebar-item {
    width: 48px;
    padding: 8px 4px;
  }
  
  .sidebar-text {
    font-size: 10px;
  }
}

/* 卡片样式 */
.card-item {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s;
  border-left: 4px solid #ddd;
}

.card-item:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.card-correct {
  border-left-color: #07c160;
  background: linear-gradient(to bottom, #fff 0%, #f0fff4 100%);
}

.card-wrong {
  border-left-color: #ee0a24;
  background: linear-gradient(to bottom, #fff 0%, #fff1f0 100%);
}

.card-half {
  border-left-color: #ff976a;
  background: linear-gradient(to bottom, #fff 0%, #fff7e6 100%);
}

.card-header {
  padding: 16px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  cursor: pointer;
  display: flex;
  align-items: center;
  line-height: 1.5;
}

.card-title:hover {
  color: #4087f2;
}

.card-number {
  color: #4087f2;
  margin-right: 6px;
  font-weight: 700;
}

.card-body {
  padding: 12px 16px 16px;
}

.option-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
}

.option-item:last-of-type {
  border-bottom: none;
}

.option-text {
  flex: 1;
  font-size: 14px;
  color: #666;
  line-height: 1.5;
}

.answer-box {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.6;
}

.correct-answer {
  background: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #a5d6a7;
}

.wrong-answer {
  background: #ffe4d6;
  color: #c8511b;
  border: 1px solid #ffcca7;
}

/* 浮动按钮 */
.dailyFloat.van-floating-bubble {
  width: 50px !important;
  height: 50px !important;
  border-radius: 50% !important;
  z-index: 999;
  background: linear-gradient(135deg, #ff6b6b 0%, #ff8e8e 100%) !important;
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.4);
}

.dailyFloat .van-floating-bubble__icon {
  font-size: 28px !important;
}

/* 对话框样式 */
.custom-title {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  width: 100%;
  font-size: 18px;
  margin-bottom: 10px;
}

.custom-content {
  text-align: center;
  margin-bottom: 20px;
}

.result-row {
  display: flex;
  justify-content: center;
  text-align: left;
  width: 100%;
  padding: 4px 0;
}
</style>
