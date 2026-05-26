<script setup>
import {
  watch,
  onMounted,
  ref,
  getCurrentInstance,
  onBeforeUnmount,
  onBeforeUpdate,
  computed,
  nextTick,
  onBeforeMount,
  inject,
} from "vue";
import { gsap } from "gsap";
import "vant/lib/index.css";
import cover3500Image from "../assets/3500_cover_2025.png";
import cryEmoji from "../assets/cry_emoji.png";
import smileEmoji from "../assets/smile_emoji.png";
import angryWolf from "./angryWolf.vue";
import missyou from "./missyou.vue";
import challengeConfirm from "./challengeConfirm.vue";
import threeStar from "./threeStar.vue";
import { useRouter } from "vue-router";
import loading from "./loading.vue";
import getPassive from "./getPassive.vue";
import bearWarmup from "./bearWarmup.vue";
import { Chart, registerables } from "chart.js";
import { checkApkUpdate, openDirectDownload } from "./useUpdateCheck.js";
import { APP_VERSION_INFO } from "../version.js";
import { goToNextPage } from "./goToNextPage.js";

import {
  showFailToast,
  showToast,
  showLoadingToast,
  showConfirmDialog,
  showDialog,
  Divider,
  Toast,
  closeToast,
} from "vant";
Chart.register(...registerables);
// 主题路径
import chooseModelSrcGoatAndWolf from "../assets/choose.webp";
import chooseModelSrcGoatAndWolfReview from "../assets/review.png";
import chooseModelSrcBears from "../assets/Boonie Bears/choose.gif";
import chooseModelSrcBearsReview from "../assets/Boonie Bears/review.gif";
import reviewCompleteSrcGoatAndWolf from "../assets/review_complete.png";
import reviewFirstSrcGoatAndWolf from "../assets/swipeHelp2.webp";
import reviewFirstSrcGoatAndWolf2 from "../assets/sheep_3.gif";

import reviewCompleteSrcBears from "../assets/Boonie Bears/review_complete.png";
import reviewFirstSrcBears from "../assets/Boonie Bears/swipeHelp2.webp";
import reviewFirstSrcBears2 from "../assets/Boonie Bears/sheep_3.gif";

import WinningCalendar from "./WinningCalendar.vue";

const flagTheme = inject("flagTheme");
const passive_magic = inject("passive_magic");
const srcTheme = ref("");

const isLoading = ref(false);
const instance = getCurrentInstance();
const axios = instance.appContext.config.globalProperties.$ajax;

const router = useRouter();
// 返回首页
const gobackHomepage = () => {
  localStorage.removeItem("userData");
  localStorage.removeItem("expirationDate");
  Object.keys(sessionStorage).forEach((key) => {
    if (key.startsWith("missyouAnimationShown")) {
      sessionStorage.removeItem(key);
    }
  });
  sessionStorage.removeItem("shineThreeStarShown");
  localStorage.removeItem("theme_name");
  router.push({
    path: "/homepage",
  });
};

// 显示答案
const showAnswerSheet = ref(false);
const answerSheetList = ref([]);
const selfCheck = ref(true);
const toggleCheckSelf = () => {
  selfCheck.value = !selfCheck.value;
};

// 显示答案pro
const showAnswerProSheet = ref(false);
const answerSheetProList = ref([]);
const selfCheckPro = ref(true); // 乱序模式开关
const selfCheckView = ref(true); // 中文显示开关
const shuffleKey = ref(0);
const originalAnswerSheetList = ref([]);
const shuffledAnswerSheetList = ref([]);
const createTimeProAnswer = ref("");

const animateShuffle = () => {
  // 选中所有 cell
  const cells = document.querySelectorAll(".shuffle-list > div");

  // 先让所有元素随机飞散
  gsap.to(cells, {
    x: () => (Math.random() - 0.5) * 200, // -100~100 随机偏移
    y: () => (Math.random() - 0.5) * 200,
    rotation: () => (Math.random() - 0.5) * 90,
    opacity: 0.2,
    duration: 0.4,
    stagger: 0.05,
    onComplete: () => {
      // 飞散结束后恢复正常位置
      gsap.to(cells, {
        x: 0,
        y: 0,
        rotation: 0,
        opacity: 1,
        duration: 0.6,
        ease: "back.out(1.7)",
        stagger: 0.05,
      });
    },
  });
};

// 计算属性：根据模式返回对应的列表
const displayedAnswerSheetList = computed(() => {
  return selfCheckPro.value
    ? shuffledAnswerSheetList.value
    : originalAnswerSheetList.value;
});

// 打乱数组的函数
const shuffleArray = (array) => {
  const shuffled = [...array]; // 创建副本
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// 切换中文显示状态（全局）
const toggleChineseView = () => {
  selfCheckView.value = !selfCheckView.value;

  // 同步更新所有词条的 showChinese 状态
  const shouldShow = selfCheckView.value;

  originalAnswerSheetList.value.forEach((item) => {
    item.showChinese = shouldShow;
  });
  shuffledAnswerSheetList.value.forEach((item) => {
    item.showChinese = shouldShow;
  });
};

// 切换乱序/正序模式
const toggleSelfCheckWithShuffle = async () => {
  selfCheckPro.value = !selfCheckPro.value;

  if (selfCheckPro.value) {
    // console.log("切换到乱序模式");
    // 重新生成乱序列表，并同步当前的中文显示状态
    shuffledAnswerSheetList.value = shuffleArray(originalAnswerSheetList.value);
    shuffledAnswerSheetList.value.forEach((item) => {
      item.showChinese = selfCheckView.value;
    });
  } else {
    // console.log("切换到正序模式");
    // 切换到正序模式时，同步当前的中文显示状态
    originalAnswerSheetList.value.forEach((item) => {
      item.showChinese = selfCheckView.value;
    });
  }

  shuffleKey.value += 1; // 强制重新渲染

  nextTick(() => {
    animateShuffle();
  });
};

// 初始化数据
const initializeData = () => {
  const processedData = answerSheetProList.value.map((item) => ({
    ...item,
    showChinese: false, // 每个词条的单独显示状态
  }));

  originalAnswerSheetList.value = [...processedData];
  shuffledAnswerSheetList.value = shuffleArray(processedData);
};

// 监听弹窗显示状态
watch(showAnswerProSheet, (newVal) => {
  if (newVal) {
    // 弹窗打开时，重置为默认状态：显示中文，乱序模式，关闭普通复习
    selfCheckView.value = true;
    selfCheckPro.value = false;
    showAnswerSheet.value = false;

    // 清除所有单独显示状态
    const currentList = selfCheckPro.value
      ? shuffledAnswerSheetList.value
      : originalAnswerSheetList.value;
    currentList.forEach((item) => {
      item.showChinese = true;
    });
    createTimeProAnswer.value = new Date();
  } else {
    handleAnswerSheetProClose();
  }
});

// 监听原始数据变化
watch(
  answerSheetProList,
  (newVal) => {
    if (newVal && newVal.length > 0) {
      initializeData();
    }
  },
  { immediate: true, deep: true }
);

// 预加载语音
const audioCache = new Map();
const base64ToBlob = (base64, mimeType = "audio/mpeg") => {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};
const speakWordPro = (english, answer) => {
  // 1) 优先从缓存获取
  const cached = audioCache.get(english);
  if (cached) {
    if (cached instanceof Blob) {
      const audioUrl = URL.createObjectURL(cached);
      const audio = new Audio(audioUrl);
      audio.currentTime = 0;

      audio.addEventListener("ended", () => {
        URL.revokeObjectURL(audioUrl);
      });

      audio.addEventListener("error", () => {
        URL.revokeObjectURL(audioUrl);
        console.warn("缓存 Blob 播放失败，回退 TTS：", audio.error);
        fallbackSpeech(english, answer);
      });

      audio.play().catch((err) => {
        URL.revokeObjectURL(audioUrl);
        console.warn("播放被拒（缓存 Blob），回退 TTS：", err);
        fallbackSpeech(english, answer);
      });
      return;
    }

    if (cached instanceof Audio) {
      cached.currentTime = 0;
      cached.play().catch((err) => {
        console.warn("播放被拒或失败（Audio cache），回退 TTS：", err);
        fallbackSpeech(english, answer);
      });
      return;
    }
  }

  // 2) 从接口返回的 audio_data 查找
  if (window.preloadedAudioData && window.preloadedAudioData[english]) {
    try {
      const base64 = window.preloadedAudioData[english].data;
      const blob = base64ToBlob(base64, "audio/mpeg");
      audioCache.set(english, blob);
      return speakWordPro(english, answer); // 再次调用，走缓存逻辑
    } catch (err) {
      console.warn("base64 转换失败：", err);
    }
  }

  // 3) 从 item 对象查找（你原来的逻辑）
  const allItems = [
    ...originalAnswerSheetList.value,
    ...shuffledAnswerSheetList.value,
  ];
  const item = allItems.find((i) => i.英文 === english);
  if (item) {
    if (item.audioBinary instanceof Blob) {
      audioCache.set(english, item.audioBinary);
      return speakWordPro(english, answer);
    }
    if (item.audio instanceof Audio) {
      audioCache.set(english, item.audio);
      return speakWordPro(english, answer);
    }
  }

  // 4) 都没有，回退 TTS
  console.warn("未找到预加载音频，使用 fallback");
  fallbackSpeech(english, answer);
};
const fallbackSpeech = (english, answer) => {
  let utterance;
  if (!/[a-zA-Z]/.test(english)) {
    utterance = new SpeechSynthesisUtterance(answer);
  } else {
    utterance = new SpeechSynthesisUtterance(english);
  }
  utterance.lang = "en-US";
  utterance.pitch = 0.5;
  window.speechSynthesis.speak(utterance);
};
// 点击预习pro
const clickShowAnswerPro = async () => {
  // 清理过期数据（可选）
  cleanExpiredUsageData();

  // 检查今日使用次数
  const todayCount = getTodayUsageCount();
  // console.log("todayCount: ", todayCount);
  let dailyLimit = 6;
  let localTeacherPassword = window.localStorage.getItem("teacherPassword");
  // console.log('localTeacherPassword: ', localTeacherPassword);
  if (localTeacherPassword == "ss654321") {
    dailyLimit = 999;
  }

  if (todayCount >= dailyLimit) {
    // 如果已达到每日限制，显示提示
    showConfirmDialog({
      title: "今日查看次数已用完",
      message: `每日限额${dailyLimit}次，今日已使用${todayCount}次，请明天再试`,
      theme: "round-button",
      showCancel: false,
    });
    return;
  }

  const remainingCount = dailyLimit - todayCount;
  const confirm = await showConfirmDialog({
    title: "是否查看professional版本？",
    message: `每日限额${dailyLimit}次，今日还可使用${remainingCount}次`,
    theme: "round-button",
  });

  if (confirm) {
    incrementUsageCount();

    // 复制列表
    answerSheetProList.value = answerSheetList.value.map((item) => ({
      ...item,
      showChinese: false,
      audio: null,
    }));
    console.log("answerSheetProList: ", answerSheetProList.value);

    // 预加载音频
    const toast = showLoadingToast({
      duration: 0,
      forbidClick: true,
      message: "加载音频...",
      loadingType: "spinner",
    });
    let params = new URLSearchParams();
    params.append("method", "getAudioList");
    params.append("word_list", JSON.stringify(answerSheetProList.value));
    const response = await axios.post("words/", params);
    console.log("response: ", response.data);
    if (response.data.success && response.data.audio_data) {
      toast.close();
      showAnswerProSheet.value = true;
      // 成功的音频存进缓存
      Object.entries(response.data.audio_data).forEach(([word, obj]) => {
        try {
          const blob = base64ToBlob(obj.data, "audio/mpeg");
          audioCache.set(word, blob);
        } catch (err) {
          console.warn(`音频转换失败: ${word}`, err);
        }
      });

      // 检查是否有失败的词
      if (response.data.failed_words && response.data.failed_words.length > 0) {
        const failedList = response.data.failed_words.join("，");
        showConfirmDialog({
          theme: "round-button",
          title: "音频加载失败",
          message: `以下单词的音频未能加载：\n${failedList}`,
          confirmButtonText: "知道了",
        }).catch(() => {
          // 用户点了取消（如果你保留了取消按钮）
        });
      }
    }
  }
};

// 上传pro时间记录
const handleAnswerSheetProClose = () => {
  // 关闭答案页面执行
  const endTime = new Date();
  const timeDifference = endTime - createTimeProAnswer.value;
  const minutes = Math.floor(timeDifference / 1000 / 60);
  const seconds = Math.floor((timeDifference / 1000) % 60);
  const formattedTimeDifference = `${minutes}分${seconds}秒`;
  console.log("Time Difference:", formattedTimeDifference);

  const dataAnswer = originalData.value[indexAnswer.value];
  // console.log("dataAnswer:", dataAnswer);

  const date = new Date(createTimeProAnswer.value);
  const formattedDateStr = `${date.getFullYear()}年${(date.getMonth() + 1)
    .toString()
    .padStart(2, "0")}月${date.getDate().toString().padStart(2, "0")}日${date
    .getHours()
    .toString()
    .padStart(2, "0")}时${date.getMinutes().toString().padStart(2, "0")}分${date
    .getSeconds()
    .toString()
    .padStart(2, "0")}秒`;

  async function updateAnswerProDuration() {
    // 上传时间
    let params = new URLSearchParams();
    params.append("method", "updateAnswerProDuration");
    params.append("username", dataAnswer["username"]);
    params.append("account_data_id", dataAnswer["nid"]);
    params.append("account_log_id", -1);
    params.append("type", "预习pro");
    params.append("create_time", formattedDateStr);
    params.append("duration", formattedTimeDifference);
    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }
  updateAnswerProDuration().then((res) => {
    console.log(res);
  });
};

const getTodayString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// 获取今日已使用次数
const getTodayUsageCount = () => {
  const today = getTodayString();
  const storageKey = `pro_usage_${today}`;
  const count = localStorage.getItem(storageKey);
  return count ? parseInt(count, 10) : 0;
};

// 增加使用次数
const incrementUsageCount = () => {
  const today = getTodayString();
  const storageKey = `pro_usage_${today}`;
  const currentCount = getTodayUsageCount();
  localStorage.setItem(storageKey, (currentCount + 1).toString());
};

// 清理过期的存储数据（可选，保持localStorage整洁）
const cleanExpiredUsageData = () => {
  const today = getTodayString();
  const keys = Object.keys(localStorage);

  keys.forEach((key) => {
    if (key.startsWith("pro_usage_") && key !== `pro_usage_${today}`) {
      localStorage.removeItem(key);
    }
  });
};
// 获取今日剩余使用次数的辅助方法
const getRemainingCount = () => {
  const todayCount = getTodayUsageCount();
  return Math.max(0, 3 - todayCount);
};

// 如果你需要在组件中显示剩余次数
const remainingCount = ref(getRemainingCount());

// 可以添加一个刷新剩余次数的方法
const updateRemainingCount = () => {
  remainingCount.value = getRemainingCount();
};

// 查找拼写
async function getSpellVocabulary(account_data_id) {
  // 获得spell_vocabulary

  let params = new URLSearchParams();
  params.append("method", "getSpellVocabulary");
  params.append("username", username.value);
  params.append("account_data_id", account_data_id);
  return await axios.post("words/", params).then((ret) => {
    return ret.data.spell_vocabulary_records;
  });
}
const lock_spell = ref(false);
const lastSpeakTime = ref(0);

// 跳转下一面
const speakWord = async (english, answer) => {
  const now = Date.now();
  const timeDiff = now - lastSpeakTime.value;

  // 检查是否在2秒限制内
  if (timeDiff < 2000) {
    // 显示提示消息
    showToast("每2秒只能一次，可以尝试pro模式解除限制");
    return;
  }

  // 更新最后点击时间
  lastSpeakTime.value = now;

  // 显示加载提示
  let toast1 = showLoadingToast({
    message: "加载中...",
    forbidClick: true,
    duration: 0,
  });

  // 设置8秒超时
  const timeoutId = setTimeout(() => {
    toast1.close();
    showToast("超时，检查网络");
  }, 8000);

  try {
    // 原有的发音逻辑
    const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(
      english
    )}&type=1`;
    const audio = new Audio(url);

    await audio.play();

    // 播放成功，清除超时定时器并关闭加载提示
    clearTimeout(timeoutId);
    toast1.close();
  } catch (error) {
    console.log("Fallback to SpeechSynthesis");

    // 清除超时定时器
    clearTimeout(timeoutId);

    let utterance;
    if (!/[a-zA-Z]/.test(english)) {
      utterance = new SpeechSynthesisUtterance(answer);
    } else {
      utterance = new SpeechSynthesisUtterance(english);
    }

    utterance.lang = "en-US";
    utterance.pitch = 0.5;
    window.speechSynthesis.speak(utterance);

    // 备用方案播放完成，关闭加载提示
    toast1.close();
  }
};

const showChooseMode = ref(false);
const difficultyCoefficient = ref(30);
const showChooseTestMode = ref(false);
const gotoIndex = ref("");
const gotoData = ref("");
const progressColor = computed(() => {
  if (difficultyCoefficient.value >= 100) {
    difficultyCoefficient.value = 100;
  }
  if (difficultyCoefficient.value <= 30) {
    return "#90ee90"; // 浅绿色
  } else if (
    difficultyCoefficient.value > 30 &&
    difficultyCoefficient.value <= 49
  ) {
    return "#87CEFA"; // 蓝色
  } else if (
    difficultyCoefficient.value >= 50 &&
    difficultyCoefficient.value <= 69
  ) {
    return "#ff7f7f"; // 浅红色
  } else if (
    difficultyCoefficient.value >= 70 &&
    difficultyCoefficient.value <= 100
  ) {
    return "#ee0a24"; // 红色
  }
  return "#000000"; // 默认颜色
});
const isRegularModeEnabled = ref(true);
const confirmButtonText = ref("普通模式");
const runGoToNextPage = (...args) => {
  goToNextPage(...args, {
    isInChooseMode,
    checkedNoneOfAbove,
    checkedSpell,
    tabsName,
    originalData,
    usercoins,
    lock_spell,
    router,
    getSpellVocabulary,
    device_type: "mobile",
    complete_status: false,
    isBroken: false,
    listening_number_user: listening_number_user.value,
    writingwords_number_user: writingwords_number_user.value,
  });
};
const handleRegularMode = () => {
  if (originalData.value[gotoIndex.value]["type"] == 0) {
    // console.log("普通模式");
    runGoToNextPage(
      gotoIndex.value,
      gotoData.value,
      0,
      originalData.value[gotoIndex.value]["reversd_number"],
      originalData.value[gotoIndex.value]["none_of_above"],
      0,
      originalData.value[gotoIndex.value]["is_spell_number"],
      "mobile",
      flagMissingThunder.value,
      isBroken.value,
      listening_number_user.value,
      writingwords_number_user.value
    );
  }

  if (originalData.value[gotoIndex.value]["type"] == 2) {
    runGoToNextPage(
      gotoIndex.value,
      gotoData.value,
      2,
      originalData.value[gotoIndex.value]["reversd_number"],
      originalData.value[gotoIndex.value]["none_of_above"],
      0,
      originalData.value[gotoIndex.value]["is_spell_number"],
      "mobile",
      flagMissingThunder.value,
      isBroken.value,
      listening_number_user.value,
      writingwords_number_user.value,
    );
  }

  if (originalData.value[gotoIndex.value]["type"] == 1) {
    runGoToNextPage(
      gotoIndex.value,
      gotoData.value,
      1,
      originalData.value[gotoIndex.value]["reversd_number"],
      originalData.value[gotoIndex.value]["none_of_above"],
      0,
      originalData.value[gotoIndex.value]["is_spell_number"],
      "mobile",
      flagMissingThunder.value,
      isBroken.value,
      listening_number_user.value,
      writingwords_number_user.value,
    );
  }
};
const handleSwipeMode = () => {
  if (originalData.value[gotoIndex.value]["type"] == 1) {
    runGoToNextPage(
      gotoIndex.value,
      gotoData.value,
      1,
      originalData.value[gotoIndex.value]["reversd_number"],
      originalData.value[gotoIndex.value]["none_of_above"],
      1,
      originalData.value[gotoIndex.value]["is_spell_number"],
      "mobile",
      flagMissingThunder.value,
      isBroken.value,
      listening_number_user.value,
      writingwords_number_user.value,
    );
  } else {
    runGoToNextPage(
      gotoIndex.value,
      gotoData.value,
      1,
      originalData.value[gotoIndex.value]["reversd_number"],
      originalData.value[gotoIndex.value]["none_of_above"],
      0,
      originalData.value[gotoIndex.value]["is_spell_number"],
      "mobile",
      flagMissingThunder.value,
      isBroken.value,
      listening_number_user.value,
      writingwords_number_user.value,
    );
  }
};
const closeMode = () => {
  showChooseMode.value = false;
  difficultyCoefficient.value = 30;
  checkedNoneOfAbove.value = false;
  checkedSpell.value = false;
  isInChooseMode.value = false;
};

const checkedNoneOfAbove = ref(false);
const onUpdateNoneOfAbove = (newValue) => {
  if (!originalData.value[indexAnswer.value]["none_of_above"]) {
    showFailToast("已经取消\n无需购买");
    return;
  }

  if (newValue) {
    if (userdiamonds.value < 2) {
      showFailToast("钻石💎不足");
      return;
    } else if (checkedSpell.value == true && userdiamonds.value < 1) {
      showFailToast("钻石💎不足");
      return;
    } else {
      checkedNoneOfAbove.value = true;
      checkedSpell.value = true;
    }
  } else {
    checkedNoneOfAbove.value = false;
    checkedSpell.value = false;
  }
};
const checkedSpell = ref(false);
const onUpdateCheckedSpell = async (newValue) => {
  if (!newValue) {
    checkedSpell.value = false;
    checkedNoneOfAbove.value = false;
    return;
  }
  let toast1 = showLoadingToast({
    message: "查询中...",
    forbidClick: true,
  });

  // 设置 8 秒超时
  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => {
      showFailToast("请求超时");
      resolve(null);
    }, 8000);
  });

  let res = null;

  try {
    res = await Promise.race([
      getSpellVocabulary(originalData.value[indexAnswer.value]["nid"]),
      timeoutPromise,
    ]);
    if (res === null) return;
    console.log("res:", res);
  } catch (error) {
    console.error("请求出错:", error);
  } finally {
  }

  // 确保 res 不是 null，再进行后续逻辑
  if (
    !res ||
    originalData.value[indexAnswer.value]["is_spell_number"] == 0 ||
    !originalData.value[indexAnswer.value]["none_of_above"] ||
    res.length == 0
  ) {
    showFailToast("已经取消\n无需购买");
    return;
  }

  // 处理购买逻辑
  if (newValue) {
    if (
      userdiamonds.value < 1 ||
      (checkedNoneOfAbove.value && userdiamonds.value < 2)
    ) {
      showFailToast("钻石💎不足");
      return;
    }
    checkedSpell.value = true;
  }
};

const consumeText = computed(() => {
  if (checkedNoneOfAbove.value && checkedSpell.value) {
    return "消费2";
  } else if (checkedNoneOfAbove.value || checkedSpell.value) {
    return "消费1";
  } else {
    return ""; // 如果都是 false，就不显示
  }
});
const noneOfAboveStyle = computed(() => ({
  width: "200px",
  textAlign: "left",
  whiteSpace: "nowrap",
  color: checkedNoneOfAbove.value ? "#666666" : "#999999",
  textDecoration: checkedNoneOfAbove.value ? "none" : "line-through",
}));
const spellStyle = computed(() => ({
  width: "200px",
  textAlign: "left",
  whiteSpace: "nowrap",
  color: checkedSpell.value ? "#666666" : "#999999",
  textDecoration: checkedSpell.value ? "none" : "line-through",
}));
const disabledNoneOfAbove = ref(false);
const disabledSpell = ref(false);
let isInChooseMode = ref(true);
watch(checkedNoneOfAbove, (newValue) => {
  if (isInChooseMode.value) {
    // 只有在选择模式下才触发更新
    if (newValue) {
      difficultyCoefficient.value -= 10; // checkedNoneOfAbove 变为 true 时减 10
    } else {
      difficultyCoefficient.value += 10; // checkedNoneOfAbove 变为 false 时加 10
    }
  }
});
watch(checkedSpell, (newValue) => {
  if (isInChooseMode.value) {
    // 只有在选择模式下才触发更新
    if (newValue) {
      difficultyCoefficient.value -= 15; // checkedSpell 变为 true 时减 15
    } else {
      difficultyCoefficient.value += 15; // checkedSpell 变为 false 时加 15
    }
  }
});

// 复习模式
const showReviewMode = ref(false);
const reviewShow = ref(false);
const flagReview = ref(false);
const dataReview = ref([]);
const dataReview2 = ref([]);
const srcReview = ref("");
const srcReview_first = ref("");
const srcReview_first2 = ref("");
const flagReviewList = ref(true);
const nidReview = ref("");
const reviewRequired = ref(0);
const handleReviewMode = () => {
  reviewShow.value = true;
  // console.log("flagReviewList", flagReviewList.value);
  if (flagReviewList.value) {
    // console.log("正常列表");
    dataReview.value = originalData.value[indexAnswer.value]["synonyms"];
    nidReview.value = originalData.value[indexAnswer.value]["nid"];
  } else {
    // console.log("弹出列表");
  }
  reviewRequired.value =
    reviewList.value[indexAnswer.value]["is_review_required"];
  // console.log('reviewRequired: ', reviewRequired.value);
  let resultData = [];
  // console.log("dataReview:", dataReview.value);
  for (let i = 0; i < dataReview.value.length; i++) {
    let obj = {};
    obj["is_spell"] = false;
    obj["type"] = true;
    obj["中文"] = dataReview.value[i]["中文"];
    obj["序号"] = dataReview.value[i]["序号"];
    if (flagReviewList.value) {
      obj["正确答案"] =
        originalData.value[indexAnswer.value]["answers"][i]["中文"];
    } else {
      obj["正确答案"] =
        reviewList.value[indexAnswer.value]["answers"][i]["中文"];
    }
    obj["用户选择"] = ["无"];
    obj["答案"] = obj["正确答案"];
    obj["英文"] = dataReview.value[i]["英文"];
    obj["排除"] = dataReview.value[i]["排除"];
    resultData.push(obj);
  }
  console.log("resultData", resultData);

  const countShiti = resultData.filter((item) => item.排除 != "试题").length;
  if (countShiti == 0) {
    showToast("试题组不提供预习\n请直接挑战");
  }
  dataPreExam.value = resultData;
  dataReview2.value = resultData;
};
const startReview = () => {
  // console.log("dataPreExam: ", dataPreExam.value);

  console.log("reviewRequired: ", reviewRequired.value);

  router.push({
    path: "/studentAccountDaily",
    state: {
      data: JSON.stringify(dataPreExam.value),
      username: username.value,
      account_id_list: nidReview.value,
      basicPreExam: basicPreExam.value,
      reviewRequired: reviewRequired.value,
      isBroken: isBroken.value,
      listening_number_user: listening_number_user.value,
      writingwords_number_user: writingwords_number_user.value,
    },
  });
};
const gotoReview = (index) => {
  indexAnswer.value = index;
  dataReview.value = reviewList.value[index]["synonyms"];
  nidReview.value = reviewList.value[index]["nid"];
  // console.log(nidReview.value);
  flagReviewList.value = false;
  console.log("flagReviewList", flagReviewList.value);
  if (flagTheme.value == 1) {
    srcTheme.value = chooseModelSrcGoatAndWolfReview;
  }
  if (flagTheme.value == 2) {
    srcTheme.value = chooseModelSrcBearsReview;
  }
  showReviewMode.value = true;
};

// 复习功能
const reviewList = ref([]);
const showReviewList = ref(false);
const loadingReviewData = ref(false);
const finishedReviewData = ref(false);
const pageIndexReviewData = ref(0);
const reviewListLength = ref(0);
const reviewList_first = ref(1);

const onLoadReviewData = async (title = "全部") => {
  if (loadingReviewData.value || finishedReviewData.value) {
    return;
  }
  loadingReviewData.value = true;
  isLoading.value = true;
  try {
    const params = new URLSearchParams();
    params.append("method", "getUserReviewPage");
    params.append("user", username.value);
    params.append("page", pageIndexReviewData.value + 1);
    params.append("page_size", 20);

    const response = await axios.post("words/", params);
    let moreData = response.data.data;
    console.log("reviewListData: ", moreData);
    moreData = moreData.map((item) => {
      const progress = Math.min(Math.floor((item.coins / 2000) * 100), 100);
      return { ...item, progressPercentage: progress };
    });

    if (moreData.length) {
      // 综合排序：先按 is_review_required 从小到大，再按创建时间从新到旧
      moreData.sort((a, b) => {
        // 首先按 is_review_required 从小到大排序
        if (a.is_review_required !== b.is_review_required) {
          return a.is_review_required - b.is_review_required;
        }
        // 如果 is_review_required 相同，再按创建时间从新到旧排序
        return new Date(b.create_time) - new Date(a.create_time);
      });

      moreData.forEach((item) => {
        const answers = JSON.parse(item.answers);
        const synonyms = JSON.parse(item.synonyms);
        // 解析日期并格式化
        const date = new Date(item.create_time);
        const viewDate = new Date(item.view_time);
        const formatter = new Intl.DateTimeFormat("zh-CN", {
          year: "2-digit",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "numeric",
          hour12: false,
        });
        const formattedCreateTime = formatter.format(date);
        const formattedViewTime = formatter.format(viewDate);
        const newItem = {
          ...item,
          answers: answers,
          synonyms: synonyms,
          create_time: formattedCreateTime,
          view_time: formattedViewTime,
        };
        reviewList.value.push(newItem);
      });
      if (reviewList.value.length > 0) {
        flagReview.value = true;
        reviewList_first.value = reviewList.value.filter(
          (item) => item.is_review_required === 1
        ).length;
        reviewListLength.value = reviewList.value.length;
      } else {
        reviewListLength.value = 0;
      }

      if (reviewList.value.length == 0) {
        if (flagTheme.value == 1) {
          srcReview.value = reviewCompleteSrcGoatAndWolf;
          srcReview_first.value = reviewFirstSrcGoatAndWolf;
          srcReview_first2.value = reviewFirstSrcGoatAndWolf2;
        }
        if (flagTheme.value == 2) {
          srcReview.value = reviewCompleteSrcBears;
          srcReview_first.value = reviewFirstSrcBears;
          srcReview_first2.value = reviewFirstSrcBears2;
        }
      }
      pageIndexReviewData.value++;
    }
    finishedReviewData.value = !response.data.has_more;
  } catch (error) {
    console.error("Failed to fetch data:", error);
  }
  loadingReviewData.value = false;
  isLoading.value = false;
  console.log("reviewList", reviewList.value);
  return reviewList.value;
};

const flagDaily = ref(true);
const showDailyList = ref(false);
const dailyTimes = ref(0);
const dailyList = ref([]);
const dataDaily = ref([]);
const nidDaily = ref("");
const offsetDaily = ref({
  x: window.innerWidth - 67,
  y: 70,
});
window.addEventListener("scroll", () => {
  offsetDaily.value.y = 70 + window.scrollY; // 根据滚动条动态调整 y 轴位置
});
window.addEventListener("resize", () => {
  offsetDaily.value.x = window.innerWidth - 67;
});
const badgeStyle = computed(() => {
  return {
    position: "absolute",
    left: `${offsetDaily.value.x + 40}px`,
    top: `${offsetDaily.value.y}px`,
  };
});

const popupDaily = () => {
  let toast1 = showLoadingToast({
    message: "生成中...",
    forbidClick: true,
  });
  async function getDailyTask() {
    let params = new URLSearchParams();
    params.append("method", "getDailyTask");
    params.append("user", username.value);
    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }
  let res = getDailyTask().then((res) => {
    dailyList.value = res.map((item, index) => {
      return {
        ...item,
        alias: `本周任务（${index + 1}）`,
      };
    });
    // console.log(dailyList.value);
  });
  res.then(() => {
    toast1.close();
    showDailyList.value = true;
  });
};
const gotoDaily = (index) => {
  let resultData = [];
  let synonyms = JSON.parse(dailyList.value[index]["synonyms"]);
  // console.log('synonyms: ', synonyms);
  let answers = JSON.parse(dailyList.value[index]["answers"]);
  // console.log('answers: ', answers);
  for (let i = 0; i < synonyms.length; i++) {
    let obj = {};
    obj["is_spell"] = false;
    obj["type"] = true;
    obj["中文"] = synonyms[i]["中文"];
    obj["序号"] = i + 1;
    obj["正确答案"] = answers[i]["中文"];

    obj["用户选择"] = ["无"];
    obj["答案"] = obj["正确答案"];
    obj["英文"] = synonyms[i]["英文"];
    obj["排除"] = synonyms[i]["排除"];
    resultData.push(obj);
  }
  // console.log("resultData:", resultData);
  router.push({
    path: "/studentAccountDaily",
    state: {
      data: JSON.stringify(resultData),
      username: username.value,
      account_id_list: dailyList.value[index]["nid"],
      basicPreExam: basicPreExam.value,
      isBroken: isBroken.value,
      listening_number_user: listening_number_user.value,
      writingwords_number_user: writingwords_number_user.value,
    },
  });
};

// 动画
function showAnimation() {
  preExamAnimationRef.value.show();
}

const gotoItem = (index) => {
  forceShowReviewButtons.value = false;
  indexAnswer.value = index;
  flagReviewList.value = true;
  // 投票模式
  if (originalData.value[index]["type"] == 4) {
    const loadingToast = showLoadingToast({
      duration: 0,
      forbidClick: true,
      message: "请求中...",
      loadingType: "spinner",
    });
    console.log("index: ", index);
    async function isRecordExisted() {
      let params = new URLSearchParams();
      params.append("method", "isRecordExisted");
      params.append("username", username.value);
      params.append("nid", originalData.value[index].nid);
      return await axios.post("words/", params).then((ret) => {
        return ret.data;
      });
    }
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 8000)
    );

    let loadingClosed = false;
    Promise.race([isRecordExisted(), timeoutPromise])
      .then((res) => {
        console.log("res: ", res);
        if (!loadingClosed) {
          loadingToast.close();
          loadingClosed = true;
        }
        if (res === "record_exists") {
          showToast({
            message: "已参与记录，无法重复参与",
            duration: 4000,
            closeOnClick: true,
          });
        } else {
          router.push({
            path: "/studentVoteMode",
            state: {
              data: JSON.stringify(originalData.value[index]),
              nid: originalData.value[index].nid,
              usercoins: usercoins.value,
              basicPreExam: basicPreExam.value,
            },
          });
        }
      })
      .catch((err) => {
        if (!loadingClosed) {
          loadingToast.close();
          loadingClosed = true;
        }

        showToast({
          message: "网络超时，请刷新页面后重试",
          duration: 4000,
          closeOnClick: true,
        });
      })
      .finally(() => {
        if (!loadingClosed) {
          loadingToast.close();
          loadingClosed = true;
        }
      });
    return;
  }
  // 预热熊出没
  if (originalData.value[index]["alias"].includes("庆典")) {
    showbearWarmup();
  }
  // 复习模式
  if (originalData.value[index]["is_review_required"] == 100) {
    if (flagTheme.value == 1) {
      srcTheme.value = chooseModelSrcGoatAndWolfReview;
    }
    if (flagTheme.value == 2) {
      srcTheme.value = chooseModelSrcBearsReview;
    }
    showReviewMode.value = true;
    return;
  } else {
    if (flagTheme.value == 1) {
      srcTheme.value = chooseModelSrcGoatAndWolf;
    }
    if (flagTheme.value == 2) {
      srcTheme.value = chooseModelSrcBears;
    }
  }
  // 是否限制普通模式
  if (originalData.value[index]["type"] == 1) {
    isRegularModeEnabled.value = false;
    confirmButtonText.value = "无法使用";
  } else {
    isRegularModeEnabled.value = true;
    confirmButtonText.value = "普通模式";
  }

  // 计算难度系数
  const data = originalData.value[index];
  if (data.merge_option === false) {
    difficultyCoefficient.value -= 20;
  }

  if (data.reversd_number >= 1 && data.reversd_number < 5) {
    difficultyCoefficient.value += 10;
  } else if (data.reversd_number >= 5 && data.reversd_number < 8) {
    difficultyCoefficient.value += 15;
  } else if (data.reversd_number >= 8) {
    difficultyCoefficient.value += 30;
  }

  if (data.none_of_above) {
    difficultyCoefficient.value += 10;
  }

  if (1 < data.is_spell_number < 4) {
    difficultyCoefficient.value += 15;
  }

  if (data.is_spell_number >= 4) {
    difficultyCoefficient.value += 30;
  }
  // console.log(originalData.value);
  gotoIndex.value = index;
  gotoData.value = originalData.value[index];
  // 考试模式完成，无法进入
  if (originalData.value[index]["type"] == 3) {
    const accuracy = (originalData.value[index]["rate"] * 100).toFixed(2);
    showToast(`已完成\n正确率为${accuracy}%`);
    return;
  }
  // 考试模式开始：冰封先预习，否则进入模式选择。
  if (originalData.value[index]["type"] == 2) {
    forceShowReviewButtons.value =
      originalData.value[index]["swipe_status"] == 0;
    if (forceShowReviewButtons.value) {
      handleConfirmCheckAnswer();
    } else {
      showChooseMode.value = true;
    }
    return;
  }

  if (originalData.value[index]["swipe_status"] == 0) {
    handleConfirmCheckAnswer();
  } else {
    showChooseMode.value = true;
  }
};

// 是否提前查看答案

const spellWordsList = ref([]);
const forceShowReviewButtons = ref(false);
const handleConfirmCheckAnswer = () => {
  isLoading.value = true;
  getSpellVocabulary(originalData.value[gotoIndex.value]["nid"]).then((res) => {
    spellWordsList.value = res.flatMap((item) => {
      let dataString = item["data_words"]
        .replace(/(\W)'|'(\W)/g, '$1"$2')
        .replace(/([{,]\s*)'([^']+?)'(\s*[:])/g, '$1"$2"$3');
      return JSON.parse(dataString);
    });

    difficultyCoefficient.value = 30;
    showAnswerSheet.value = true;
    // answerSheetList.value = originalData.value[gotoIndex.value]["answers"];
    const answers = originalData.value[gotoIndex.value]?.answers || [];
    const synonyms = originalData.value[gotoIndex.value]?.synonyms || [];

    answerSheetList.value = answers.map((item, index) => {
      return {
        ...item,
        排除: synonyms[index]?.排除 || null,
      };
    });
    console.log("answerSheetList: ", answerSheetList.value);
    const countShiti = answerSheetList.value.filter(
      (item) => item.排除 != "试题"
    ).length;
    if (countShiti == 0) {
      showAnswerSheet.value = false;
      showToast("试题组不提供预习\n请直接挑战");
    }
    isLoading.value = false;
  });
};

// 答案页步骤
const activeSteps = ref(0.2);
// 记录答案时间
const indexAnswer = ref(0);
const createTimeAnswer = ref("");
const handleAnswerSheetClose = () => {
  // 关闭答案页面执行
  const endTime = new Date();
  const timeDifference = endTime - createTimeAnswer.value;
  const minutes = Math.floor(timeDifference / 1000 / 60);
  const seconds = Math.floor((timeDifference / 1000) % 60);
  const formattedTimeDifference = `${minutes}分${seconds}秒`;
  console.log("Time Difference:", formattedTimeDifference);

  const dataAnswer = originalData.value[indexAnswer.value];
  // console.log("dataAnswer:", dataAnswer);

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
    params.append("username", dataAnswer["username"]);
    params.append("account_data_id", dataAnswer["nid"]);
    params.append("account_log_id", -1);
    params.append("type", "预习");
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

watch(showAnswerSheet, (newVal) => {
  selfCheck.value = true;
  if (!newVal) {
    handleAnswerSheetClose();
    forceShowReviewButtons.value = false;
  } else {
    createTimeAnswer.value = new Date();
    // console.log("createTimeAnswer:", createTimeAnswer.value);
  }
});
const handleVisibilityChange = () => {
  if (document.hidden) {
    showAnswerSheet.value = false;
  }
};

const handlePageUnload = () => {
  showAnswerSheet.value = false;
};

// 提前查看答案
const dialogPosition = ref({ x: 0, y: 0 });
const viewAnswer = (item, index) => {
  gotoIndex.value = index;
  console.log("item: ", item);
  // console.log("item: ", item.attempt);
  // console.log("index: ", index);
  console.log("originalData: ", originalData.value[index]);
  if (item.attempt == 0) {
    gotoIndex.value = index;
    handleConfirmCheckAnswer();
    return;
  }
  if (item.rate >= 3) {
    getSpellVocabulary(originalData.value[index]["nid"]).then((res) => {
      console.log("res: ", res);
      spellWordsList.value = res.flatMap((item) => {
        let dataString = item["data_words"]
          .replace(/(\W)'|'(\W)/g, '$1"$2')
          .replace(/([{,]\s*)'([^']+?)'(\s*[:])/g, '$1"$2"$3');
        return JSON.parse(dataString);
      });
      showAnswerSheet.value = true;
      // answerSheetList.value = item["answers"];
      const synonyms = item["synonyms"];
      const answers = item["answers"];

      answerSheetList.value = answers.map((ans, idx) => {
        const exclude = synonyms?.[idx]?.排除 || "";
        return {
          ...ans,
          排除: exclude,
        };
      });

      console.log("answerSheetList: ", answerSheetList.value);
    });
    return;
  }
  showAnimationShine();
  showConfirmDialog({
    title: "😈 恶魔之眼 😈",
    message: "要查看答案吗？\n您的行为会被记录（首次不记录）",
    confirmButtonText: "查看答案",
    cancelButtonText: "取消，不看了",
    cancelButtonColor: "red",
    confirmButtonColor: "gray",
    className: "custom-dark-dialog", // 添加自定义类名
  })
    .then(() => {
      showAnimationShine();
      if (showAnswerSheet.value) {
        showChooseMode.value = false;
        return;
      }
      isLoading.value = true;
      getSpellVocabulary(originalData.value[index]["nid"]).then((res) => {
        console.log("res: ", res);
        spellWordsList.value = res.flatMap((item) => {
          let dataString = item["data_words"]
            .replace(/(\W)'|'(\W)/g, '$1"$2')
            .replace(/([{,]\s*)'([^']+?)'(\s*[:])/g, '$1"$2"$3');
          return JSON.parse(dataString);
        });
        showAnswerSheet.value = true;

        isLoading.value = false;
        // answerSheetList.value = item["answers"];
        const answers = originalData.value[index]?.answers || [];
        const synonyms = originalData.value[index]?.synonyms || [];

        answerSheetList.value = answers.map((item, index) => {
          return {
            ...item,
            排除: synonyms[index]?.排除 || null,
          };
        });
        console.log("answerSheetList: ", answerSheetList.value);
        const countShiti = answerSheetList.value.filter(
          (item) => item.排除 != "试题"
        ).length;
        if (countShiti == 0) {
          showAnswerSheet.value = false;
          showToast("试题组不提供预习\n请直接挑战");
          return;
        }

        // 定义异步函数updateView
        async function updateView() {
          // 更新 view + 1
          let params = new URLSearchParams();
          params.append("method", "updateView");
          params.append("nid", item["nid"]);
          return await axios.post("words/", params).then((ret) => {
            return ret.data;
          });
        }
        // 调用updateView并处理其promise
        if (item.attempt > 0) {
          updateView().then(async (res) => {
            originalData.value = [];
            pageIndexOriginalData.value = 0;
            finishedOriginalData.value = false;
            loadingOriginalData.value = false;
            activeTabs.value = 0;
            await onLoadOriginalData();
          });
        }
      });
    })
    .catch(() => {
      showAnimationShine();
    });
  nextTick(() => {
    const dialogElement = document.querySelector(".custom-dark-dialog");

    if (dialogElement) {
      const rect = dialogElement.getBoundingClientRect();
      // console.log('rect.top (relative to viewport): ', rect.top);
      // console.log('window.scrollY (scroll offset): ', window.scrollY);

      // 将视口坐标转换为文档坐标
      dialogPosition.value = {
        x: rect.right + window.scrollX - rect.width * 1.4,
        y: rect.top + window.scrollY - rect.height * 2,
      };

      // console.log("Corrected dialogPosition (relative to document):", dialogPosition.value);
    }
  });
};

// 星星plus显示
const showRatePlus = computed(() => {
  return originalData.value.map((item) => item.rate > 3);
});

// 总进度环形circle
const currentRate = ref(0);
const nameCircle = ref("全部");
const textCircle = computed(() => currentRate.value.toFixed(0) + "%");
const gradientColor = ref({
  "0%": "#ff0000",
  "100%": "#ffff00",
});

const getGradientColor = (index) => {
  const colors = [
    { "0%": "#ff0000", "100%": "#ffff00" }, // 红到黄
    { "0%": "#ffff00", "100%": "#00ff00" }, // 黄到绿
    { "0%": "#00ff00", "100%": "#ff00ff" }, // 绿到粉
    { "0%": "#3fecff", "100%": "#6149f6" },
  ];
  // 循环使用颜色
  gradientColor.value = colors[index % colors.length];
  // return colors[index % colors.length];
};

const rateCircle = ref(0);
const rateCircleList = ref([]);

const starRate = ref(1); // 总星星数

const starRateNumber = ref(0);
const starRateNumberList = ref([]);
const completeNumber = ref(0);
const completeNumberList = ref([]);

// textbook单词表
const textbookData = ref([]);
const showTextbookPop = ref(false);
const reviewProgress = ref(0);
const hasEnoughWords = ref(false);
const meaningShow = ref(false);
const meaningTitle = ref("");
const meaningData = ref({
  高考: { 英文: "", 中文: "" },
  教材: [{ 中文: "", 模块: "", 教材: "" }],
});
const matchGameWords = ref([]);
const isBroken = computed(
  () => reviewProgress.value === 100 && hasEnoughWords.value
);
watch(
  isBroken,
  (newVal) => {
    // 只有当 isBroken 从 false 变为 true 时才触发
    if (newVal === true) {
      handleEarningHalf();
    }
  },
  { immediate: false }
);

// 定义发送请求的方法
const handleEarningHalf = async () => {
  try {
    let params = new URLSearchParams();
    // 假设后端对应的接口方法名为 updatePenaltyStatus
    params.append("method", "handleEarningHalf");
    params.append("username", username.value);

    const response = await axios.post("words/", params);

    if (response.data.success) {
    }
  } catch (error) {
    console.error("同步减半状态失败:", error);
  }
};
const showTextbook = () => {
  if (!isBroken.value) {
    showToast("暂时无需回顾");
    return;
  }
  const toast = showLoadingToast({
    duration: 0,
    forbidClick: true,
    message: "加载数据...",
    loadingType: "spinner",
  });

  async function queryTextbook() {
    let params = new URLSearchParams();
    params.append("method", "queryTextbook");
    params.append("username", username.value);
    return await axios.post("words/", params).then((ret) => ret.data);
  }

  queryTextbook().then((res) => {
    if (res.length !== 0) {
      // 1. 解析数据
      let parsedData = JSON.parse(res[0]["textbook"]);

      // 2. 🔥 过滤掉答案为“以上都不对”的单词
      textbookData.value = parsedData.filter(
        (item) => item.答案 && !item.答案.includes("以上都不对")
      );

      // 3. 排序
      textbookData.value.sort((a, b) => b.times - a.times);
      console.log("textbookData: ", textbookData.value);

      // 取前18个，不够则提示 (这里的 length 已经是过滤后的真实有效数量了)
      if (textbookData.value.length < 18) {
        showConfirmDialog({
          title: "单词数量不足",
          theme: "round-button",
          showCancelButton: false,
          message: `当前只有 ${textbookData.value.length} 个有效单词，暂时无法生成连线游戏\n继续挑战积累更多词汇吧！`,
        }).then(() => {
          showTextbookPop.value = false;
        });
        return;
      }

      // 取前18个，转成游戏组件需要的格式
      matchGameWords.value = textbookData.value.slice(0, 18).map((item) => ({
        英文: item.英文,
        答案: item.答案,
        times: item.times,
      }));
      toast.close();
      showTextbookPop.value = true;
    } else {
      showConfirmDialog({
        title: "你还没有尝试单词挑战",
        theme: "round-button",
        showCancelButton: false,
        message: "单词表会随着挑战自动定制专属词汇\n开始挑战吧！",
      }).then(() => {
        showTextbookPop.value = false;
      });
    }
  });
};
const gotoWordMatchGame = () => {
  router.push({
    path: "/wordMatchGame",
    state: {
      words: JSON.stringify(matchGameWords.value),
      username: JSON.stringify(username.value),
    },
  });
};

// 导航分类
const activeTabs = ref("0");
const tabsName = ref([]);

// 加载数据
const originalData = ref([]);
const showStars = ref(false);
const carouselItems = computed(() => {
  return originalData.value
    .map((item, index) => ({ ...item, originalIndex: index }))
    .filter((item) => item.type != 4 && item.type != 2 && item.is_pinned && item.rate < 3);
});
const blueCarouselItems = computed(() => {
  return originalData.value
    .map((item, index) => ({ ...item, originalIndex: index }))
    .filter((item) => item.type == 2 && item.type != 4 && item.rate < 3);
});
const loadingOriginalData = ref(false);
const finishedOriginalData = ref(false);
const pageIndexOriginalData = ref(0);
const username = ref("");
const progressPercentage = ref("0");

const formattedRate = (rate) => {
  // 检查是否为整数
  if (Number.isInteger(rate)) {
    return rate - 3;
  } else {
    // 保留一位小数
    return (rate - 3).toFixed(1);
  }
};
const shouldHideFromList = (item) => {
  return (
    (item.type != 4 && item.is_pinned && item.rate < 3) ||
    (item.type == 2 && item.rate < 3)
  );
};
const blueSwipeRateIcon = (item) => {
  if (item.rate < 3) {
    return cryEmoji;
  }
  return smileEmoji;
};
const shouldShowListFrozen = (item) => {
  return item.type != 2 && item.swipe_status == 0 && item.rate < 3;
};

// 分页加载
const onLoadOriginalData = async (title = "全部") => {
  // console.log("title: ", title);
  // console.log('finishedOriginalData.value: ', finishedOriginalData.value);
  // console.log('loadingOriginalData.value: ', loadingOriginalData.value);
  if (loadingOriginalData.value || finishedOriginalData.value) {
    return;
  }
  loadingOriginalData.value = true;
  isLoading.value = true;
  try {
    const params = new URLSearchParams();
    params.append("method", "getUserDataPage");
    params.append("alias", title);
    params.append("user", username.value);
    params.append("page", pageIndexOriginalData.value + 1); // 请求下一页的数据
    params.append("page_size", 20); // 每页数据大小

    const response = await axios.post("words/", params);
    let moreData = response.data.data;
    // moreData.forEach((item) => {
    //   console.log(item.apply_challenge);
    // });

    moreData = moreData.map((item) => {
      const progress = Math.min(Math.floor((item.coins / 2000) * 100), 100);
      // console.log('item: ', item.title, item.coins, 'progress: ', progress);
      return { ...item, progressPercentage: progress };
    });

    if (moreData.length) {
      function sortDataByfigures(moreData) {
        // 汉字数字映射
        const chineseNumMap = {
          一: 1,
          二: 2,
          三: 3,
          四: 4,
          五: 5,
          六: 6,
          七: 7,
          八: 8,
          九: 9,
          十: 10,
          十一: 11,
          十二: 12,
          十三: 13,
          十四: 14,
          十五: 15,
          十六: 16,
          十七: 17,
          十八: 18,
          十九: 19,
          二十: 20,
          二十一: 21,
          二十二: 22,
          二十三: 23,
          二十四: 24,
          二十五: 25,
          二十六: 26,
          二十七: 27,
          二十八: 28,
          二十九: 29,
          三十: 30,
          三十一: 31,
          三十二: 32,
          三十三: 33,
          三十四: 34,
          三十五: 35,
          三十六: 36,
          三十七: 37,
          三十八: 38,
          三十九: 39,
          四十: 40,
          四十一: 41,
          四十二: 42,
          四十三: 43,
          四十四: 44,
          四十五: 45,
          四十六: 46,
          四十七: 47,
          四十八: 48,
          四十九: 49,
          五十: 50,
        };
        // 提取标题中的固定部分和数字部分
        moreData = moreData.map((item) => {
          const match = item.title.match(
            /(.+?)(一|二|三|四|五|六|七|八|九|十|十一|十二|十三|十四|十五|十六|十七|十八|十九|二十|二十一|二十二|二十三|二十四|二十五|二十六|二十七|二十八|二十九|三十|三十一|三十二|三十三|三十四|三十五|三十六|三十七|三十八|三十九|四十|四十一|四十二|四十三|四十四|四十五|四十六|四十七|四十八|四十九|五十)(\.\w+)$/
          );
          if (match) {
            return {
              ...item,
              title_base: match[1], // 提取标题中的固定部分
              title_num: chineseNumMap[match[2]], // 提取汉字数字部分并转换为阿拉伯数字
              title_ext: match[3], // 提取扩展名部分
            };
          } else {
            return {
              ...item,
              title_base: item.title,
              title_num: 0,
              title_ext: "",
            };
          }
        });
        // 将 is_pinned 为 true 且 rate < 3 的项放到最前面
        const pinnedItems = moreData.filter(
          (item) => item.is_pinned && item.rate < 3
        );
        const otherItems = moreData.filter(
          (item) => !(item.is_pinned && item.rate < 3)
        );

        // 根据标题的固定部分分组
        const groups = otherItems.reduce((acc, item) => {
          const base = item.title_base;
          if (!acc[base]) {
            acc[base] = [];
          }
          acc[base].push(item);
          return acc;
        }, {});

        // 对每个分组进行排序，并且对整个分组也按照 create_time 进行排序
        const sortedGroups = Object.values(groups)
          .map((group) => {
            group.sort((a, b) => a.title_num - b.title_num); // 组内按 title_num 升序
            return group;
          })
          .sort(
            (a, b) => new Date(b[0].create_time) - new Date(a[0].create_time)
          ); // 组间按 create_time 降序

        // 将分组后的数据合并回数组
        const result = [...pinnedItems, ...sortedGroups.flat()];

        return result;
      }

      moreData.sort(
        (a, b) => new Date(b.create_time) - new Date(a.create_time)
      );
      // console.log("moreData1: ", moreData);

      const result = sortDataByfigures(moreData);
      console.log("moreDat2: ", result);

      result.forEach((item) => {
        const answers = JSON.parse(item.answers);
        const synonyms = JSON.parse(item.synonyms);
        // 解析日期并格式化
        const date = new Date(item.create_time);
        const viewDate = new Date(item.view_time);
        const formatter = new Intl.DateTimeFormat("zh-CN", {
          year: "2-digit",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "numeric",
          hour12: false,
        });
        const formattedCreateTime = formatter.format(date);
        const formattedViewTime = formatter.format(viewDate);
        const newItem = {
          ...item,
          answers: answers,
          synonyms: synonyms,
          create_time: formattedCreateTime,
          view_time: formattedViewTime,
        };
        originalData.value.push(newItem);
      });
      pageIndexOriginalData.value++;
    }
    finishedOriginalData.value = !response.data.has_more;
  } catch (error) {
    console.error("Failed to fetch data:", error);
  }
  loadingOriginalData.value = false;
  isLoading.value = false;
  return originalData.value;
};

// 点击tab
const onClickTab = ({ title }) => {
  // console.log('title: ', title);
  originalData.value = [];
  loadingOriginalData.value = false;
  finishedOriginalData.value = false;
  pageIndexOriginalData.value = 0;
  nameCircle.value = title;
  const listTabs = ["全部", ...tabsName.value];
  const indexClickTab = listTabs.lastIndexOf(nameCircle.value);

  rateCircle.value = 0;
  setTimeout(() => {
    rateCircle.value = rateCircleList.value[indexClickTab];
  }, 0);
  currentRate.value = rateCircle.value;

  // console.log("rateCircle: ", rateCircle.value);
  starRateNumber.value = starRateNumberList.value[indexClickTab];
  completeNumber.value = completeNumberList.value[indexClickTab];
  getGradientColor(indexClickTab);
  onLoadOriginalData(title);
};

// 获取rateCircle
async function getRateCircle() {
  let params = new URLSearchParams();
  params.append("method", "getRateCircle");
  params.append("username", username.value);
  params.append("listlAias", JSON.stringify(tabsName.value));
  return await axios.post("words/", params).then((ret) => {
    return ret.data;
  });
}
// 生气动画
const wolfBackRef = ref(null);

const startOutRef = ref(null);
const threeStarRef = ref(null);
const animationVisible = ref(false);

function showAnimationShine() {
  if (wolfBackRef.value.visible) {
    wolfBackRef.value.hide();
  } else {
    wolfBackRef.value.show();
  }
  animationVisible.value = !animationVisible.value;
}

function showAnimationShineThreeStar() {
  if (threeStarRef.value.visible) {
    threeStarRef.value.hide();
  } else {
    threeStarRef.value.show();
  }
  animationVisible.value = !animationVisible.value;
}

// miss动画
const missyouRef = ref(null);
const missyouFlag = ref(false);
const missDays = ref(2);
const flagMissingThunder = ref(false);
function showAnimationShineMissYou() {
  missyouRef.value.show();

  setTimeout(() => {
    missyouRef.value.hide();
  }, 8000);
}

const processedTitle = (title) => {
  return title.split(".")[0]; // 获取第一个句点（.）之前的部分
};

// swipe徽章
const flagSwipe = ref(1);
const usercoins = ref(0);
const userdiamonds = ref(0);
const userflowers = ref(0);
const listening_number_user = ref(0);
const writingwords_number_user = ref(0);
const getPassiveRef = ref(null);
function showPassiveMagic() {
  if (getPassiveRef.value.visible) {
    getPassiveRef.value.hide();
  } else {
    getPassiveRef.value.show();
  }
  animationVisible.value = !animationVisible.value;
}

// 临考模式
const selectedItems = ref([]);
const dataPreExam = ref([]);
const basicPreExam = ref([]);
const account_id_list = ref([]);
const valueDropdown = ref(0);
const preExamShow = ref(false);
const optionDropdown = ref([
  { text: "普通模式", value: 0 },
  { text: "临考模式", value: 1 },
]);
const switchText = ref("普通模式");
const checkedSwitch = ref(true);
const showSwitchToast = ref(false);

const cellValue = ref(true);
const isMultiSelectMode = ref(false);
const toggleMultiSelectMode = () => {
  // cellValue.value = !cellValue.value;
  if (!checkedSwitch.value) {
    showSwitchToast.value = true;
    switchText.value = "多组复习";
  } else {
    switchText.value = "普通模式";
  }
  isMultiSelectMode.value = !isMultiSelectMode.value;
  if (!isMultiSelectMode.value) {
    // 清除所有选择
    selectedItems.value = [];
  }
};
const selectItem = (index) => {
  const selectedIndex = selectedItems.value.indexOf(index);
  if (selectedIndex !== -1) {
    selectedItems.value.splice(selectedIndex, 1);
  } else {
    selectedItems.value.push(index);
  }
};
const gotoPreExam = () => {
  // console.log(originalData.value);
  if (selectedItems.value.length < 2) {
    showFailToast("至少选择俩项");
    return;
  }
  if (selectedItems.value.length > 5) {
    showFailToast("至多选择5项");
    return;
  }
  const titles = selectedItems.value.map((id) => {
    return originalData.value[id].title;
  });
  const titlesHtml = titles
    .map((item) => `<div style="text-align: left;">${item}</div>`)
    .join("");
  showConfirmDialog({
    title: "确定将以下生成考前复习",
    message: titlesHtml,
    theme: "round-button",
    allowHtml: true,
  }).then(async () => {
    account_id_list.value = selectedItems.value.map(
      (id) => originalData.value[id].nid
    );
    const params = new URLSearchParams();
    params.append("method", "getPreExam");
    params.append("account_id_list", JSON.stringify(account_id_list.value));
    isLoading.value = true;
    try {
      const res = await axios.post("words/", params);
      console.log("res: ", res);
      dataPreExam.value = res.data.dataPreExam;

      // dataPreExam.value = dataPreExam.value
      //   .filter((item) => !/__{3,}/.test(item["英文"])) // 删除含有 3 个或以上下划线的项
      //   .map((item) => {
      //     if (item["正确答案"] === "无") {
      //       return {
      //         ...item,
      //         正确答案: item["答案"],
      //       };
      //     }
      //     return item;
      //   });
      dataPreExam.value = dataPreExam.value
        .filter((item) => {
          return !/__{3,}/.test(item["英文"]) && item["排除"] !== "手写";
        })
        .map((item) => {
          if (item["正确答案"] === "无") {
            return {
              ...item,
              正确答案: item["答案"],
            };
          }
          return item;
        });
      console.log("dataPreExam: ", dataPreExam.value);
      isLoading.value = false;
      preExamShow.value = true;
    } catch (error) {
      console.error("请求错误:", error);
      // 如果捕捉到错误，执行相应的函数
      showToast({
        message: "生成错误，请尝试更改选择顺序",
        duration: 10000,
        closeOnClick: true,
        closeOnClickOverlay: true,
      });
      isLoading.value = false;
      return;
    }
  });
};
const startPreExam = () => {
  // console.log("dataPreExam: ", dataPreExam.value);
  router.push({
    path: "/studentAccountPreExam",
    state: {
      data: JSON.stringify(dataPreExam.value),
      username: username.value,
      account_id_list: JSON.stringify(account_id_list.value),
      basicPreExam: basicPreExam.value,
    },
  });
};

onBeforeUnmount(() => {
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  window.removeEventListener("beforeunload", handlePageUnload);
  window.removeEventListener("pagehide", handlePageUnload);
});
const flagRate = ref(null);

const bearWarmupRef = ref(null);
function showbearWarmup() {
  if (bearWarmupRef.value.visible) {
    bearWarmupRef.value.hide();
  } else {
    bearWarmupRef.value.show();
  }
}
// 弹幕
const listBarrage = ref([]);
const listVideo = ref([]);
let wordIndex = 0; // 记录当前弹幕单词索引
let intervalId = null; // 保存 setInterval 的 ID，用于停止定时器

// 开始定时器，显示弹幕
intervalId = setInterval(() => {
  if (wordIndex < listVideo.value.length) {
    listBarrage.value.push({
      id: Math.random(),
      text: listVideo.value[wordIndex],
    });

    // 触发 Vue 重新渲染
    listBarrage.value = [...listBarrage.value];

    // 循环弹幕索引
    wordIndex = (wordIndex + 1) % listVideo.value.length;
  } else {
    wordIndex = 0;
  }
}, 1000);
// 使用 setTimeout 来在15秒后停止弹幕更新
setTimeout(() => {
  clearInterval(intervalId); // 停止 setInterval
  console.log("弹幕停止，已持续15秒");
}, 15000); // 10秒后停止

// 挑战赛
const result = ref("");
const challengeConfirmRef = ref(null);
function showChallenge() {
  challengeConfirmRef.value.show();
}
async function handleConfirmChallenge() {
  const applyitem = originalData.value[indexAnswer.value];
  console.log("applyitem: ", applyitem);
  let params = new URLSearchParams();
  params.append("method", "applyforChallenge");
  params.append("nid", applyitem["nid"]);

  const res = await axios.post("words/", params);
  console.log("res: ", res.data);
  if (res.data == "申请失败") {
    showFailToast("申请失败，联系老师");
  } else {
    runGoToNextPage(
      indexAnswer.value,
      originalData.value[indexAnswer.value],
      4,
      0,
      1,
      0,
      0,
      "mobile",
      flagMissingThunder.value,
      isBroken.value,
      listening_number_user.value,
      writingwords_number_user.value,
    );
  }
}

function handleCancelChallenge() {
  challengeConfirmRef.value.hide();
}

const applyforChallenge = () => {
  showChallenge();
};

// 本周日历，连胜
const weekDays = ref([]);
// const dailyCalendarData = ref({});
const showCalendar = ref(false);
const isWeekComplete = ref(false);
// const daysWinningStreak = ref(0);
// const completeWeeks = ref([]);
const weekCompleteState = ref("");
const completeWeekStates = ref({});
const has_enough_today = ref(false);

const showWinningCalendar = ref(false);
const daysWinningStreak = ref(0);
const completeWeeks = ref([]);
const dailyCalendarData = ref({});
const viewUsername = ref("");
const eightWeekAvg = ref(0);
const fourWeekAvg = ref(0);

// 首页弹出趋势
const showfourweeksPopup = ref(false);
let recitationChart = null;

function getStartOfWeek(dateStr) {
  const date = new Date(dateStr + "T00:00:00Z");
  const day = date.getUTCDay();
  // 计算到周一的偏移量（周日是 0，需要特殊处理）
  const diff = day === 0 ? -6 : 1 - day;

  const startOfWeek = new Date(date);
  startOfWeek.setUTCDate(date.getUTCDate() + diff);
  startOfWeek.setUTCHours(0, 0, 0, 0);

  return startOfWeek.toISOString().split("T")[0];
}

function formatDate2(dateStr) {
  const parts = dateStr.split("-");
  return `${parts[1]}.${parts[2]}`;
}

function processDataForChart(data) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 获取最近 8 周的周一日期（用于计算 8 周平均）
  const allWeeks = [];
  for (let i = 7; i >= 0; i--) {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() - i * 7);

    const startOfWeek = getStartOfWeek(targetDate.toISOString().split("T")[0]);

    const endDate = new Date(startOfWeek + "T00:00:00Z");
    endDate.setUTCDate(endDate.getUTCDate() + 6);
    const endDateStr = endDate.toISOString().split("T")[0];

    allWeeks.push({
      startDate: startOfWeek,
      endDate: endDateStr,
    });
  }

  // 为每一周聚合数据
  const weeklyData = allWeeks.map((week) => {
    let sum = 0;

    const startDate = new Date(week.startDate + "T00:00:00Z");
    for (let day = 0; day < 7; day++) {
      const currentDate = new Date(startDate);
      currentDate.setUTCDate(startDate.getUTCDate() + day);
      const dateStr = currentDate.toISOString().split("T")[0];

      sum += data[dateStr] || 0;
    }

    return {
      startDate: week.startDate,
      endDate: week.endDate,
      count: sum,
    };
  });

  // 最近 4 周用于显示
  const recentFourWeeks = weeklyData.slice(-4);

  // 计算 4 周平均
  const fourWeekAvg =
    recentFourWeeks.reduce((acc, item) => acc + item.count, 0) / 4;

  // 计算 8 周平均
  const eightWeekAvg =
    weeklyData.reduce((acc, item) => acc + item.count, 0) / 8;

  // 生成图表标签和数据
  const labels = recentFourWeeks.map(
    (item) => `${formatDate2(item.startDate)}-${formatDate2(item.endDate)}`
  );
  const counts = recentFourWeeks.map((item) => item.count);

  return { labels, counts, fourWeekAvg, eightWeekAvg };
}

function renderChart(labels, counts, fourWeekAvg, eightWeekAvg) {
  const ctx = document.getElementById("recitationChart")?.getContext("2d");
  if (!ctx) return;

  // 销毁旧图表实例（如果存在）
  if (recitationChart) {
    recitationChart.destroy();
  }

  recitationChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "背诵次数 (周总计)",
          data: counts,
          backgroundColor: "rgba(59, 130, 246, 0.7)",
          borderColor: "rgb(59, 130, 246)",
          borderWidth: 0.2,
          borderRadius: 6,
          barThickness: 50,
        },
        {
          label: "近四周平均",
          data: Array(labels.length).fill(fourWeekAvg),
          type: "line",
          borderColor: "rgb(239, 68, 68)",
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: {
            usePointStyle: true,
            padding: 15,
            font: { size: 12 },
          },
        },
        tooltip: {
          backgroundColor: "rgba(30, 41, 59, 0.9)",
          titleFont: { size: 14 },
          bodyFont: { size: 14 },
          padding: 10,
          callbacks: {
            label: function (context) {
              if (context.datasetIndex === 0) {
                return `背诵次数: ${context.parsed.y}`;
              } else {
                return `四周平均: ${fourWeekAvg.toFixed(1)}`;
              }
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "背诵次数",
            color: "#4b5563",
            font: { size: 14, weight: "bold" },
          },
          grid: { color: "rgba(0, 0, 0, 0.05)" },
          ticks: {
            color: "#6b7280",
            callback: function (value) {
              if (Number.isInteger(value)) {
                return value;
              }
            },
          },
        },
        x: {
          grid: { display: false },
          ticks: {
            color: "#6b7280",
            maxRotation: 45,
            minRotation: 45,
            autoSkip: false,
          },
        },
      },
    },
  });

  // 手动绘制数据标签
  const originalDraw = recitationChart.draw;
  recitationChart.draw = function () {
    originalDraw.apply(this, arguments);

    const ctx = this.ctx;
    ctx.textAlign = "center";

    this.data.datasets.forEach((dataset, datasetIndex) => {
      const meta = this.getDatasetMeta(datasetIndex);

      if (datasetIndex === 0) {
        // 柱状图数据标签（放在柱子内部）
        ctx.font = "bold 14px sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textBaseline = "top";

        meta.data.forEach((bar, index) => {
          const data = dataset.data[index];
          // 标签放在柱子顶部内侧，往下偏移10px
          ctx.fillText(data, bar.x, bar.y + 10);
        });
      } else if (datasetIndex === 1) {
        // 平均线数据标签（只在最后一个点显示）
        ctx.font = "bold 12px sans-serif";
        ctx.fillStyle = "#ef4444";
        ctx.textBaseline = "top";

        const lastPoint = meta.data[meta.data.length - 1];
        const avgValue = fourWeekAvg.toFixed(1);

        // 绘制背景
        const textWidth = ctx.measureText(avgValue).width;
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.fillRect(
          lastPoint.x - textWidth / 2 - 4,
          lastPoint.y + 5,
          textWidth + 8,
          18
        );

        // 绘制文字
        ctx.fillStyle = "#ef4444";
        ctx.fillText(avgValue, lastPoint.x, lastPoint.y + 8);
      }
    });
  };

  // 将 8 周平均数存储到全局变量，供模板使用
  window.eightWeekAverage = eightWeekAvg;
}

const onOpenedfourweeks = () => {
  const {
    labels,
    counts,
    fourWeekAvg: avg4,
    eightWeekAvg: avg8,
  } = processDataForChart(dailyCalendarData.value);
  fourWeekAvg.value = avg4; // 保存四周平均
  eightWeekAvg.value = avg8; // 保存八周平均
  renderChart(labels, counts, avg4, avg8);

  window.addEventListener("resize", () => {
    if (recitationChart) {
      recitationChart.resize();
    }
  });
};

const generateWeekDays = async () => {
  const today = new Date();
  const currentDay = today.getDay();
  const weekStart = currentDay === 0 ? -6 : 1 - currentDay;

  weekDays.value = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + weekStart + i);

    const weekNames = ["日", "一", "二", "三", "四", "五", "六"];
    const isToday = date.toDateString() === today.toDateString();

    weekDays.value.push({
      date: date.toISOString(),
      week: weekNames[date.getDay()],
      day: date.getDate(),
      isToday: isToday,
      isSelected: false,
    });
  }

  const mondayDate = new Date(today);
  mondayDate.setDate(today.getDate() + weekStart);
  const mondayString = formatDate(mondayDate);

  console.log("username:", username.value);
  let params = new URLSearchParams();
  params.append("method", "getUserWinningStreak");
  params.append("username", username.value);
  const response = await axios.post("words/", params);

  if (response.data.status === "success") {
    completeWeeks.value = response.data.data.map((record) => ({
      monday: record.week_monday.split(" ")[0],
      state: record.complete_state,
    }));

    daysWinningStreak.value = response.data.winning_streak * 7;
    const thisWeekRecord = response.data.data.find((record) => {
      const recordDate = record.week_monday.split(" ")[0];
      return recordDate === mondayString;
    });

    isWeekComplete.value =
      !!thisWeekRecord && thisWeekRecord.complete_state > 0;
    weekCompleteState.value = thisWeekRecord
      ? thisWeekRecord.complete_state
      : 0;

    completeWeekStates.value = {};
    response.data.data.forEach((record) => {
      const monday = record.week_monday.split(" ")[0];
      completeWeekStates.value[monday] = record.complete_state || 0;
    });

    has_enough_today.value = response.data.has_enough_today;
    dailyCalendarData.value = {};
    response.data.daily_data.forEach((record) => {
      const date = record.date.split(" ")[0];
      dailyCalendarData.value[date] = record.record_count || 0;
    });
    // console.log("dailyCalendarData", dailyCalendarData.value);
    if (Object.keys(dailyCalendarData.value).length > 0) {
      showfourweeksPopup.value = true;
    }

    weekDays.value = weekDays.value.map((day) => {
      const dateKey = formatDate(new Date(day.date));
      const recordCount = dailyCalendarData.value[dateKey] || 0;
      return {
        ...day,
        recordCount: recordCount,
        hasFlower: recordCount > 0,
      };
    });
  }
};

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// 连胜日历
const selectDate = (day) => {
  // showCalendar.value = true;
  getWinningCalendar();
  nextTick(() => {
    setTimeout(() => {
      const calendarBody = document.querySelector(".calendar-body");
      if (calendarBody) {
        calendarBody.scrollTop = calendarBody.scrollHeight;
      }
    }, 0);
  });
};

const getWinningCalendar = async () => {
  viewUsername.value = username.value;
  // 获取日历数据
  try {
    let params = new URLSearchParams();
    params.append("method", "getUserWinningStreak");
    params.append("username", viewUsername.value);

    const response = await axios.post("words/", params);

    if (response.data.status === "success") {
      // 处理周完成数据
      completeWeeks.value = response.data.data.map((record) => ({
        monday: record.week_monday.split(" ")[0],
        state: record.complete_state, // 0, 1, 2
      }));

      // 设置连胜天数
      daysWinningStreak.value = response.data.winning_streak * 7;

      // 处理每日数据
      dailyCalendarData.value = {};
      response.data.daily_data.forEach((record) => {
        const date = record.date.split(" ")[0]; // "YYYY-MM-DD"
        dailyCalendarData.value[date] = record.record_count || 0;
      });

      // 显示日历
      showWinningCalendar.value = true;
    }
  } catch (error) {
    console.error("获取日历数据失败:", error);
    showToast("获取数据失败");
  }
};

const handleDateClick = (dayData) => {
  // 点击日期回调
  const count = dayData.recordCount;
  if (count > 0) {
    showToast({
      message: `${dayData.dateString} 背诵 ${count} 次`,
      zIndex: 9999,
    });
  } else {
    showToast({
      message: `${dayData.dateString} 暂无背诵数据`,
      zIndex: 9999,
    });
  }
};

const onCalendarClose = () => {
  // 关闭日历回调
};

// 滑动模式
const gotoReviewWordSwipe = (item, index) => {
  console.log("item: ", item);
  if (
    originalData.value[index].swipe_status === 1 &&
    !forceShowReviewButtons.value
  ) {
    showChooseMode.value = true;
    return;
  }
  gotoWordSwipe(item, index);
};

const gotoWordSwipe = (item, index) => {
  router.push({
    path: "/wordSwipeReview",
    state: {
      answers: JSON.stringify(item.answers),
      username: item["username"],
      alias: item.alias,
      account_nid: item.nid,
      title: item.title,
      basicPreExam: basicPreExam.value,
      reviewRequired: reviewRequired.value,
    },
  });
};

const isSkipLoading = ref(false);

const skipSwipeReview = (item) => {
  // 动态判断当前花费
  const currentPrice = isBroken.value ? 5 : 4;

  // 动态构建提示信息，如果 isBroken 为 true，则加入红色的 HTML 字符串
  const dialogMessage = isBroken.value
    ? `<div style="color: red; margin-bottom: 8px; font-weight: bold;">💔 消费提升</div>需要花费${currentPrice}朵🌸，确定跳过吗？`
    : `需要花费${currentPrice}朵🌸，确定跳过吗？`;

  showConfirmDialog({
    title: "跳过滑动复习🌸",
    message: dialogMessage,
    allowHtml: true,
    theme: "round-button",
  }).then(async () => {
    isSkipLoading.value = true;
    let params = new URLSearchParams();
    params.append("method", "skipSwipeReview");
    params.append("username", username.value);
    params.append("nid", item.nid);
    // 把动态价格发送给后端
    params.append("price_skip", currentPrice);
    const response = await axios.post("words/", params);
    isSkipLoading.value = false;
    if (response.data.status === "success") {
      userflowers.value = response.data.flowers_after_skip;
      const index = originalData.value.findIndex((d) => d.nid === item.nid); // ✅ 定义 index
      if (index !== -1) {
        originalData.value[index] = {
          ...originalData.value[index],
          swipe_status: 1,
        };
      }
      showChooseMode.value = true;
    } else {
      showToast(response.data.message);
    }
  });
};
// 更新版本提示
const showUpdate = () => {
  // 使用版本号来管理更新提示
  const UPDATE_VERSION = "v5"; // 新版本号
  const lastShownTime = localStorage.getItem(
    `wordSwipeReview_${UPDATE_VERSION}_time`
  );
  const shownCount = parseInt(
    localStorage.getItem(`wordSwipeReview_${UPDATE_VERSION}_count`) || "0"
  );
  const now = Date.now();
  const dayInMs = 24 * 60 * 60 * 1000;

  // 清理旧版本的 localStorage 数据
  localStorage.removeItem(`wordSwipeReview_${UPDATE_VERSION}`);
  localStorage.removeItem("winStreakUpdateTime");
  localStorage.removeItem("winStreakUpdateCount");

  // 如果显示次数小于3次，且（从未显示过 或 距离上次显示超过1天）
  if (
    shownCount < 3 &&
    (!lastShownTime || now - parseInt(lastShownTime) > 1 * dayInMs)
  ) {
    showDialog({
      title: "更新：AI大模型接入",
      message:
        "deepseek‑v4‑flash 接入单词背诵<br/>" +
        "单词判定更智能、更高效、更准确<br/>" +
        "每次提交产生的费用由老师统一承担，无需额外支付",
      theme: "round-button",
      allowHtml: true,
      messageAlign: "left",
    }).then(() => {
      localStorage.setItem(
        `wordSwipeReview_${UPDATE_VERSION}_time`,
        now.toString()
      );
      localStorage.setItem(
        `wordSwipeReview_${UPDATE_VERSION}_count`,
        (shownCount + 1).toString()
      );
    });
  }
};
// 刷新数据
const refreshData = async () => {
  window.location.reload();
};

// setting设置
const showSettingPopup = ref(false);
function isAndroidApk() {
  const ua = navigator.userAgent.toLowerCase();
  const isAndroid = ua.indexOf("android") > -1;
  const isCordova = !!window.cordova;
  return isAndroid && isCordova;
}
function isAndroidWeb() {
  const ua = navigator.userAgent.toLowerCase();
  return /android/.test(ua) && !isAndroidApk();
}

const popupSetting = () => {
  showSettingPopup.value = true;
};

const downloadNewversion = () => {
  showToast("暂时找老师下载更新包哦~");
  // if (isAndroidApk()) {
  //   console.log("安卓APK应用内更新");
  //   checkApkUpdate({ showLatestToast: true });
  // } else if (isAndroidWeb()) {
  //   console.log("安卓网页版更新");
  //   openDirectDownload();
  // } else {
  //   console.log("非安卓环境");
  //   showToast("请在安卓App中更新");
  // }
};

// 主题
onMounted(async () => {
  // 更新pro显示答案次数
  updateRemainingCount();

  // 检查安卓版本
  // checkApkUpdate({ forceUpdate: true });    // 强制更新
  // checkApkUpdate({ showLatestToast: true });  // 可选更新

  // 检查是否已经显示过更新提示
  showUpdate();

  // 弹幕单词
  // 检查并清理旧格式的数据
  const storedList = localStorage.getItem("listBarrage");
  if (storedList && storedList !== "null" && storedList !== "undefined") {
    try {
      const parsedData = JSON.parse(storedList);
      // 如果解析的数据没有timestamp属性，说明是旧格式，删除它
      if (!parsedData.timestamp) {
        localStorage.removeItem("listBarrage");
        console.log("删除了旧格式的listBarrage数据");
      }
    } catch (error) {
      // 如果JSON解析失败，也删除这个数据
      localStorage.removeItem("listBarrage");
      console.log("删除了无效的listBarrage数据");
    }
  }

  // 弹幕单词
  const storedListAfterCheck = localStorage.getItem("listBarrage");
  if (
    storedListAfterCheck &&
    storedListAfterCheck !== "null" &&
    storedListAfterCheck !== "undefined"
  ) {
    const parsedData = JSON.parse(storedListAfterCheck);
    listVideo.value = parsedData.words; // 取出words部分
    // console.log("listVideo: ", listVideo.value);
  } else {
    console.log("listBarrage 不存在或为空");
  }

  // 获得user
  let user =
    (history.state.data && JSON.parse(history.state.data).username) ||
    history.state.username;
  const userData = JSON.parse(localStorage.getItem("userData"));
  // console.log("localuserData", userData);
  if (!user) {
    router.push({
      path: "/homepage",
    });
  }

  async function getUserThemeAndPassiveMagic() {
    let params = new URLSearchParams();
    params.append("method", "getUserThemeAndPassiveMagic");
    params.append("user", user);

    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }
  getUserThemeAndPassiveMagic().then((res) => {
    // console.log("res", res);
    if (res.theme == 1) {
      localStorage.setItem("theme_name", "喜羊羊与灰太狼");
    }
    if (res.theme == 2) {
      localStorage.setItem("theme_name", "熊出没");
    }

    passive_magic.value = res.passive_magic;
    // console.log("passive_magic", passive_magic.value);

    flagTheme.value = res.theme;
    // console.log("flagTheme.value", flagTheme.value);

    if (flagTheme.value == 1) {
      srcTheme.value = chooseModelSrcGoatAndWolf;
    }
    if (flagTheme.value == 2) {
      srcTheme.value = chooseModelSrcBears;
    }
  });

  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("beforeunload", handlePageUnload);
  window.addEventListener("pagehide", handlePageUnload);

  sessionStorage.removeItem("showAnswerMagic");
  sessionStorage.removeItem("showMagic");
  sessionStorage.removeItem("flagHelp");
  sessionStorage.removeItem("numberShowAnswer");
  sessionStorage.removeItem("numberTransparent");
  sessionStorage.removeItem("numberPrev");
  sessionStorage.removeItem("numberPauseBlackOverlay");

  // 加载数据
  originalData.value = [];
  let res = new Promise(async (resolve, reject) => {
    // console.log(history.state)
    // console.log("history.state.data", history.state.data);
    if (!history.state.data) {
      // 关闭页面，这个是undefined
      router.push({
        path: "/homepage",
      });
    } else {
      let res = JSON.parse(history.state.data);
      basicPreExam.value = history.state.data;
      // console.log('history.state: ', history.state);
      if (res.hasOwnProperty("username")) {
        tabsName.value = res.unique_aliases;
        username.value = res.username;
        resolve("ok");
      } else {
        // tabsName.value = JSON.parse(history.state.unique_aliases);
        try {
          // 尝试解析 JSON 数据
          // console.log("tabsName", tabsName);
          tabsName.value = JSON.parse(history.state.unique_aliases);
        } catch (error) {
          // 如果解析失败，捕获错误并处理
          console.error("Error parsing JSON:", error);
          router.push({
            path: "/homepage",
          });
        }
        username.value = history.state.username;
        resolve("ok");
      }
    }
  });
  res = res.then(() => {
    getRateCircle().then((res) => {
      rateCircleList.value = res.map((item) => item.rate * 100);
      // starRateNumberList.value = res.map((item) => item.starRateNumber);
      starRateNumberList.value = res.map((item) => {
        if (Number.isInteger(item.starRateNumber)) {
          return item.starRateNumber;
        } else {
          return parseFloat(item.starRateNumber.toFixed(1));
        }
      });
      completeNumberList.value = res.map((item) => item.completeNumber);

      rateCircle.value = rateCircleList.value[0];
      starRateNumber.value = starRateNumberList.value[0];
      completeNumber.value = completeNumberList.value[0];
    });

    return "ok";
  });
  res = res.then(() => {
    async function getUserCoins() {
      let params = new URLSearchParams();
      params.append("method", "getUserCoins");
      params.append("username", username.value);
      return await axios.post("words/", params).then((ret) => {
        return ret.data;
      });
    }
    // console.log('username', username.value);
    // 期末庆典
    getUserCoins().then((res) => {
      // console.log('res: ', res);
      usercoins.value = res["data_coins"][0]["coins"];
      userdiamonds.value = res["data_coins"][0]["diamonds"];
      userflowers.value = res["data_coins"][0]["flowers"];
      listening_number_user.value = res["listening_number_user"];
      writingwords_number_user.value = res["writingwords_number_user"];
      console.log("writingwords_number_user: ", writingwords_number_user.value);
      // userdiamonds.value = 1;
      // console.log("usercoins: ", usercoins.value);
    });
    return "ok";
  });
  res = res.then(() => {
    // 弹出庆祝
    async function missTask() {
      let params = new URLSearchParams();
      params.append("method", "missTask");
      params.append("user", username.value);
      return await axios.post("words/", params).then((ret) => {
        return ret.data;
      });
    }
    const today = new Date().toISOString().slice(0, 10); // "2026-04-06"
    const missyouKey = `missyouAnimationShown_${username.value}_${today}`;

    missTask().then((res_miss) => {
      console.log("res_miss: ", res_miss);
      flagMissingThunder.value = res_miss.complete_status;
      if (res_miss.message != "无") {
        missyouFlag.value = true;
        missDays.value = res_miss.message;
        // console.log("missDays.value: ", missDays.value);
      }
      if (!sessionStorage.getItem(missyouKey) && missyouFlag.value == true) {
        showAnimationShineMissYou();
        sessionStorage.setItem(missyouKey, "true");
      }
    });
  });

  res = res.then(() => {
    // 得到回顾进度
    async function getReviewProgress() {
      let params = new URLSearchParams();
      params.append("method", "getReviewProgress");
      params.append("username", username.value);
      return await axios.post("words/", params).then((ret) => {
        return ret.data;
      });
    }

    getReviewProgress().then((res) => {
      console.log("回顾进度", res);
      if (res.success) {
        setTimeout(() => {
          reviewProgress.value = res.progress;
          // reviewProgress.value = 75;
          hasEnoughWords.value = res.has_enough_words;
          // hasEnoughWords.value = true;
        }, 300);
      }
    });
  });

  res = res.then(() => {
    localStorage.removeItem("giveBears");
    if (flagRate.value >= 3 && !localStorage.getItem("givePassiveMagic")) {
      // 判断赠送 Bears
      async function checkExecutionBears() {
        let params = new URLSearchParams();
        params.append("method", "checkExecutionBears");
        params.append("username", username.value);
        return await axios.post("words/", params).then((ret) => {
          return ret.data;
        });
      }
      checkExecutionBears().then((res) => {
        console.log("是否需要赠送", res);
        // res.all_above_3 = true;
        if (res.all_above_3) {
          async function addThemeBears() {
            let params = new URLSearchParams();
            params.append("method", "addThemeBears");
            params.append("username", username.value);
            return await axios.post("words/", params).then((ret) => {
              return ret.data;
            });
          }
          addThemeBears().then((res) => {
            // console.log("res", res);
            // localStorage.setItem("theme_name", "熊出没");
            localStorage.setItem("givePassiveMagic", true);
            showPassiveMagic();
          });
          // console.log("bears available")
        } else {
          // console.log("not available")
        }
      });
    }
    return "ok";
  });
  res = res.then(() => {
    // 显示本周日历连胜
    generateWeekDays();
  });
  res = res.then(() => {
    // 判断是否需要复习
    async function getFlagReview() {
      const params = new URLSearchParams();
      params.append("method", "getUserReviewPage");
      params.append("user", username.value);
      params.append("page", pageIndexReviewData.value + 1);
      params.append("page_size", 20);

      return await axios.post("words/", params).then((ret) => {
        return ret.data.data;
      });
    }

    getFlagReview().then((response) => {
      // console.log("response: ", response);
      reviewList_first.value = response.filter(
        (item) => item.is_review_required === 1
      ).length;
      if (response.length > 0) {
        flagReview.value = true;
        reviewListLength.value = response.length;
        if (flagTheme.value == 1) {
          srcReview_first.value = reviewFirstSrcGoatAndWolf;
          srcReview_first2.value = reviewFirstSrcGoatAndWolf2;
        }
        if (flagTheme.value == 2) {
          srcReview_first.value = reviewFirstSrcBears;
          srcReview_first2.value = reviewFirstSrcBears2;
        }
      } else {
        flagReview.value = false;
        if (flagTheme.value == 1) {
          srcReview.value = reviewCompleteSrcGoatAndWolf;
          srcReview_first.value = reviewFirstSrcGoatAndWolf;
          srcReview_first2.value = reviewFirstSrcGoatAndWolf2;
        }
        if (flagTheme.value == 2) {
          srcReview.value = reviewCompleteSrcBears;
          srcReview_first.value = reviewFirstSrcBears;
          srcReview_first2.value = reviewFirstSrcBears2;
        }
      }
    });
    return "ok";
  });

  // res = res.then(() => {
  //   // 得到每日任务信息
  //   async function getFlagReview() {
  //     const params = new URLSearchParams();
  //     params.append("method", "getUserDaily");
  //     params.append("user", username.value);

  //     return await axios.post("words/", params).then((ret) => {
  //       return ret.data;
  //     });
  //   }
  //   getFlagReview().then((res) => {
  //     if (res == 0) {
  //       flagDaily.value = false;
  //     }
  //     dailyTimes.value = res;
  //   });
  // });
});
</script>

<template>
  <div class="container">
    <div class="nav-bar-container">
      <van-nav-bar
        :right-text="username"
        :left-text="isMultiSelectMode ? '确定选择' : '登出'"
        @click-left="isMultiSelectMode ? gotoPreExam() : gobackHomepage()"
      >
        <template #title>
          <div></div>
        </template>
        <template #right>
          <div style="color: #1a89fa; font-size: 15px">
            <van-icon name="add-o" size="1.2rem" @click="popupSetting" />
          </div>
        </template>
        <template #left>
          <div style="color: #1a89fa; font-size: 14px">
            {{ username }}&nbsp;&nbsp;{{
              isMultiSelectMode ? "确定" : "登出"
            }}&nbsp;
            <span @click.stop="handleCoinClick"> 💰 {{ usercoins }}</span>
            <span @click.stop="handleDiamondClick">
              &nbsp;&nbsp;💎 {{ userdiamonds }}
            </span>
            <span @click.stop="handleDiamondClick">
              &nbsp;&nbsp;🌸 {{ userflowers }}
            </span>
            <span v-if="flagMissingThunder" @click.stop="handleDiamondClick">
              &nbsp;&nbsp;⚡️
            </span>
          </div>
        </template>
      </van-nav-bar>
    </div>

    <!-- 本周日历 连胜 -->
    <div
      style="
        font-size: 12px;
        margin: 0.3rem 0rem 0.6rem 0.7rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
      "
    >
      <div style="display: flex; align-items: center">
        <span style="color: #1989fa">连胜{{ daysWinningStreak }}天</span>
        <span
          style="margin-left: 1rem"
          :style="{
            color: has_enough_today ? '#FFD700' : '#d0d0d0',
            filter: has_enough_today
              ? 'brightness(1.2) saturate(1.5) hue-rotate(-40deg)'
              : 'brightness(0.8) saturate(0.3)',
            textShadow: has_enough_today ? '0 0 8px #FFD700' : 'none',
          }"
        >
          {{ has_enough_today ? "获得今日🌸" : "未完成今日任务" }}
        </span>
      </div>
      <span style="color: #1989fa; margin-right: 1rem" @click="refreshData"
        >刷新</span
      >
    </div>

    <div class="week-calendar">
      <div
        v-for="day in weekDays"
        :key="day.date"
        class="calendar-day"
        :class="{
          'week-complete-1': weekCompleteState === 1,
          'week-complete-2': weekCompleteState === 2,
          'has-flower': day.hasFlower,
        }"
        @click="selectDate(day)"
      >
        <div class="week-text">{{ day.week }}</div>
        <div class="date-text">{{ day.day }}</div>
        <div v-if="day.isToday" class="today-dot"></div>
        <div v-if="day.hasFlower" class="week-flower-indicator">
          {{ day.recordCount === 1 ? "🔺" : "🌸" }}
        </div>
      </div>
    </div>

    <router-view />
    <van-tabbar route>
      <van-tabbar-item icon="home-o" replace to="/studentAccountList"
        >主页</van-tabbar-item
      >
      <van-tabbar-item
        icon="shopping-cart-o"
        replace
        :to="{ path: '/userinformation', query: { param: username } }"
        >商城</van-tabbar-item
      >
      <van-tabbar-item
        icon="question-o"
        replace
        :to="{ path: '/tutorial', query: { param: username } }"
        >教程</van-tabbar-item
      >
    </van-tabbar>

    <div class="custom-container">
      <div style="margin-left: 1.2rem; margin-top: 0.2rem; margin-top: 0.2rem">
        <!-- 共获得星星 -->
        <div style="display: flex">
          <div style="margin-top: 0.3rem">共获得</div>
          <van-rate
            v-model="starRate"
            color="#ffd21e"
            icon="like"
            :count="1"
            readonly
            allow-half
            size="28"
            style=""
          >
          </van-rate>
          <div style="margin-top: 0.3rem">
            &nbsp;&nbsp;✖️ {{ starRateNumber }}
          </div>
        </div>

        <!-- 共完成任务 -->
        <div style="display: flex; margin-top: 1rem">
          <div style="margin-top: 0.2rem">共完成</div>
          <img
            src="../assets/item_list_complete.png"
            style="
              width: 28px;
              height: auto;
              margin-right: rem;
              margin-left: 0.5rem;
              margin-top: -0.1rem;
            "
          />
          <div style="margin-top: 0.2rem">
            &nbsp;&nbsp;✖️ {{ completeNumber }}
          </div>
        </div>
      </div>

      <div
        style="
          display: flex;
          align-items: center;
          gap: 0.1rem;
          margin-right: 1.5rem;
          margin-top: 0.2rem;
        "
      >
        <div>{{ nameCircle }}：</div>
        <van-circle
          v-model:current-rate="currentRate"
          :rate="rateCircle"
          :speed="80"
          :text="textCircle"
          :color="gradientColor"
          size="70px"
          :stroke-width="60"
        />
      </div>
    </div>

    <!-- <van-dropdown-menu>
      <van-dropdown-item
        v-model="valueDropdown"
        :options="optionDropdown"
        @change="toggleMultiSelectMode(valueSort)"
      />
    </van-dropdown-menu> -->
    <div style="display: flex; width: 100%">
      <div style="font-size: 12px; margin: 0.2rem 0 0 0.8rem">
        {{ switchText }}
      </div>
      <van-switch
        style="margin-left: 0.5rem"
        size="18px"
        v-model="checkedSwitch"
        inactive-color="red"
        @change="toggleMultiSelectMode"
      />
      <van-notice-bar
        style="
          --van-notice-bar-icon-min-width: 16px;
          --van-notice-bar-padding: 0 0;
          flex: 1;
          height: 20px;
          margin-left: 0.5rem;
          margin-right: 0.5rem;
          margin-top: 0.2rem;
        "
        left-icon="volume-o"
        scrollable
        :delay="1"
        :speed="80"
        text="ai默写模式上线...有bug联系老师"
      />
    </div>
    <van-toast
      v-model:show="showSwitchToast"
      style="padding: 1rem"
      :closeOnClick="true"
      :duration="3000"
      :closeOnClickOverlay="true"
    >
      <template #message>
        <div>
          <p>1. 先选中单词组</p>
          <p>2. 点击左上角 确定选择</p>
        </div>
      </template>
    </van-toast>

    <!-- 任务列表 -->
    <div style="display: flex; align-items: flex-start; position: relative">
      <!-- 左侧圆形按钮区域（20%） -->
      <div
        style="
          width: 25%;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-top: 40px;
          gap: 12px;
          position: sticky;
          top: 0;
          z-index: 10;
        "
      >
        <!-- 待复习 -->
        <div style="display: flex">
          <div
            v-if="flagReview"
            style="display: flex; margin-top: 2.5rem"
            class="flashing-icon"
          >
            <div style="display: flex; align-items: center; position: relative">
              <van-badge
                :content="reviewList_first || ''"
                style="margin-right: 0.5rem"
              >
                <van-button
                  plain
                  round
                  color="gray"
                  @click="showReviewList = true"
                  style="
                    margin-right: 0.2rem;
                    font-size: 15px;
                    height: 62px;
                    width: 62px;
                  "
                >
                  复习
                </van-button>
              </van-badge>
              <img
                :src="
                  reviewList_first === 0 ? srcReview_first2 : srcReview_first
                "
                style="
                  width: auto;
                  height: 45px;
                  position: absolute;
                  left: 48%;
                  transform: translateX(-50%);
                  bottom: 100%;
                  margin-bottom: 4px;
                  z-index: 10;
                  margin-bottom: 1rem;
                "
              />
            </div>
          </div>
          <div v-else>
            <img
              :src="srcReview"
              style="
                width: 80px;
                height: auto;
                margin-left: 0.8rem;
                margin-top: 0.1rem;
                margin-bottom: 0rem;
              "
            />
          </div>
        </div>
        <!-- 回顾 -->
        <div class="review-btn-container">
          <van-button
            round
            class="liquid-btn"
            :class="{ 'is-broken': isBroken }"
            :disabled="isBroken"
            style="width: 62px; height: 62px; padding: 0"
            :style="{ '--progress': reviewProgress + '%' }"
            @click="showTextbook"
          >
            <template v-if="!isBroken">
              <div class="water-group">
                <div class="water-layer water-layer1"></div>
                <div class="water-layer water-layer2"></div>
              </div>
              <span
                class="btn-text"
                :style="{ color: reviewProgress > 40 ? '#fff' : '#ff976a' }"
              >
                回顾
              </span>
            </template>

            <div v-else class="broken-content" @click="showTextbook">
              <span class="broken-heart">💔</span>
              <span class="broken-text">需回顾</span>
            </div>
          </van-button>

          <div v-if="isBroken" class="penalty-warning">
            所有收益减半 消费增加 回顾后恢复
          </div>
        </div>
      </div>

      <!-- 右侧 tabs 区域（80%） -->
      <div style="width: 73.5%; min-width: 0">
        <van-tabs
          v-model:active="activeTabs"
          @click-tab="onClickTab"
          shrink
          sticky
        >
          <van-tab title="全部">
            <div
              v-if="carouselItems.length > 0"
              style="padding: 16px 12px 0px 12px; overflow: hidden"
            >
              <div
                style="
                  font-size: 12px;
                  color: #999;
                  margin-bottom: 6px;
                  margin-left: 4px;
                "
              >
                共 {{ carouselItems.length }} 组老师作业，⬅️ 左右 ➡️ 滑动选择
              </div>
              <van-swipe
                class="my-swipe"
                :class="{ 'peek-swipe': carouselItems.length > 1 }"
                :autoplay="0"
                indicator-color="#fff"
                :style="{
                  width: carouselItems.length > 1 ? '88%' : '100%',
                  borderRadius: '18px',
                  overflow: 'visible',
                }"
                :loop="false"
              >
                <van-swipe-item
                  v-for="(item, index) in carouselItems"
                  :key="index"
                  @click="gotoItem(item.originalIndex)"
                  style="padding-bottom: 3px"
                >
                  <div
                    :class="{ 'ice-frozen': item.swipe_status == 0 }"
                    style="
                      position: relative;
                      background: linear-gradient(145deg, #ff7e5f, #ff6b6b);
                      border-radius: 18px;
                      height: 260px;
                      padding: 24px 20px 20px;
                      display: flex;
                      flex-direction: column;
                      justify-content: flex-end;
                      color: white;
                      box-shadow: 0 10px 24px rgba(255, 107, 107, 0.4);
                      overflow: hidden;
                      box-sizing: border-box;
                    "
                  >
                    <!-- 冰封光效层 -->
                    <template v-if="item.swipe_status == 0">
                      <span class="ice-layer-prism" />
                      <span class="ice-layer-glint" />
                    </template>
                    <div
                      style="
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 45%;
                        background: linear-gradient(
                          180deg,
                          rgba(255, 255, 255, 0.25) 0%,
                          rgba(255, 255, 255, 0) 100%
                        );
                        pointer-events: none;
                        z-index: 0;
                      "
                    ></div>
                    <div
                      style="
                        position: absolute;
                        top: -30%;
                        left: -30%;
                        width: 160%;
                        height: 160%;
                        background: linear-gradient(
                          135deg,
                          rgba(255, 255, 255, 0.15) 0%,
                          rgba(255, 255, 255, 0) 30%,
                          transparent 100%
                        );
                        pointer-events: none;
                        z-index: 0;
                      "
                    ></div>
                    <div
                      style="
                        position: absolute;
                        bottom: -20px;
                        right: -20px;
                        width: 150px;
                        height: 150px;
                        background: rgba(255, 255, 255, 0.15);
                        border-radius: 50%;
                        filter: blur(30px);
                        pointer-events: none;
                        z-index: 0;
                      "
                    ></div>
                    <div
                      style="
                        position: absolute;
                        top: 20px;
                        left: 20px;
                        z-index: 1;
                      "
                    >
                      <van-tag
                        round
                        color="rgba(255,255,255,0.2)"
                        text-color="#fff"
                        style="
                          border: 1px solid rgba(255, 255, 255, 0.4);
                          backdrop-filter: blur(8px);
                          padding: 4px 10px;
                          font-size: 12px;
                          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                        "
                      >
                        <van-icon name="fire" style="margin-right: 2px" />
                        老师作业
                      </van-tag>
                    </div>

                    <div
                      style="
                        font-size: 13px;
                        opacity: 0.9;
                        margin-bottom: 8px;
                        display: flex;
                        align-items: center;
                        position: relative;
                        z-index: 1;
                        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
                      "
                    >
                      待复习 · {{ item.create_time }}
                    </div>

                    <div
                      style="
                        font-weight: 800;
                        font-size: 24px;
                        line-height: 1.3;
                        margin-bottom: 12px;
                        min-height: calc(18px * 1.3 * 2);
                        display: -webkit-box;
                        -webkit-line-clamp: 2;
                        -webkit-box-orient: vertical;
                        overflow: hidden;
                        text-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
                        letter-spacing: 0.5px;
                        position: relative;
                        z-index: 1;
                      "
                    >
                      <span v-if="item.complete_status == 1">⚡️</span>
                      {{ processedTitle(item.title) }}
                    </div>

                    <div
                      style="
                        display: flex;
                        align-items: center;
                        margin-bottom: 24px;
                        position: relative;
                        z-index: 1;
                      "
                    >
                      <div
                        style="
                          font-size: 15px;
                          font-weight: bold;
                          opacity: 0.95;
                          margin-right: 12px;
                          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
                        "
                      >
                        {{ item.answers ? item.answers.length : 0 }}词
                      </div>

                      <van-rate
                        v-model="item.rate"
                        :size="16"
                        color="#ffd21e"
                        void-icon="like"
                        icon="like"
                        void-color="rgba(255, 255, 255, 0.35)"
                        :count="3"
                        readonly
                        allow-half
                        style="
                          filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
                        "
                      />
                      <div
                        style="
                          font-size: 13px;
                          margin-left: 10px;
                          opacity: 0.9;
                          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
                        "
                      >
                        背<span style="font-weight: 700">{{
                          item.attempt
                        }}</span
                        >次
                      </div>
                    </div>
                    <div
                      style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        position: relative;
                        z-index: 1;
                      "
                    >
                      <div
                        style="
                          display: flex;
                          align-items: center;
                          background: rgba(255, 255, 255, 0.25);
                          backdrop-filter: blur(12px);
                          -webkit-backdrop-filter: blur(12px);
                          padding: 6px 14px;
                          border-radius: 20px;
                          border: 1px solid rgba(255, 255, 255, 0.4);
                          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                        "
                      >
                        <van-icon
                          name="play"
                          size="18"
                          style="margin-right: 6px"
                        />
                        <span style="font-size: 14px; font-weight: bold"
                          >开始挑战</span
                        >
                      </div>
                      <!-- 滑动提示箭头 -->
                    </div>
                  </div>
                </van-swipe-item>
                <template #indicator="{ active, total }">
                  <div class="custom-indicator">
                    <div class="swipe-hint-arrow">
                      <van-icon name="arrow" size="14" />
                      <van-icon name="arrow" size="14" />
                    </div>
                    <span>{{ active + 1 }} / {{ total }}</span>
                  </div>
                </template>
              </van-swipe>
            </div>
            <div
              v-if="blueCarouselItems.length > 0"
              style="padding: 0 12px 0px 12px; overflow: hidden"
            >
              <!-- <div
                style="
                  font-size: 12px;
                  color: #999;
                  margin-bottom: 6px;
                  margin-left: 4px;
                "
              >
                共 {{ blueCarouselItems.length }} 组待完成任务，⬅️ 左右 ➡️ 滑动选择
              </div> -->
              <van-swipe
                class="my-swipe blue-swipe"
                :class="{ 'peek-swipe': blueCarouselItems.length > 1 }"
                :autoplay="0"
                indicator-color="#fff"
                :style="{
                  width: blueCarouselItems.length > 1 ? '88%' : '100%',
                  borderRadius: '18px',
                  overflow: 'visible',
                }"
                :loop="false"
              >
                <van-swipe-item
                  v-for="(item, index) in blueCarouselItems"
                  :key="`blue-${index}`"
                  @click="gotoItem(item.originalIndex)"
                  style="padding-bottom: 3px"
                >
                  <div
                    :class="{
                      'ice-frozen': item.swipe_status == 0,
                      'blue-complete': item.swipe_status != 0,
                    }"
                    style="
                      position: relative;
                      border-radius: 18px;
                      height: 260px;
                      padding: 24px 20px 20px;
                      display: flex;
                      flex-direction: column;
                      justify-content: flex-end;
                      color: white;
                      box-shadow: 0 10px 24px rgba(102, 163, 255, 0.28);
                      overflow: hidden;
                      box-sizing: border-box;
                    "
                  >
                    <template v-if="item.swipe_status == 0">
                      <span class="ice-layer-prism" />
                      <span class="ice-layer-glint" />
                    </template>
                    <div
                      style="
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 45%;
                        background: linear-gradient(
                          180deg,
                          rgba(255, 255, 255, 0.25) 0%,
                          rgba(255, 255, 255, 0) 100%
                        );
                        pointer-events: none;
                        z-index: 0;
                      "
                    ></div>
                    <div
                      style="
                        position: absolute;
                        top: -30%;
                        left: -30%;
                        width: 160%;
                        height: 160%;
                        background: linear-gradient(
                          135deg,
                          rgba(255, 255, 255, 0.12) 0%,
                          rgba(255, 255, 255, 0) 30%,
                          transparent 100%
                        );
                        pointer-events: none;
                        z-index: 0;
                      "
                    ></div>
                    <div
                      style="
                        position: absolute;
                        bottom: -20px;
                        right: -20px;
                        width: 150px;
                        height: 150px;
                        background: rgba(255, 255, 255, 0.14);
                        border-radius: 50%;
                        filter: blur(30px);
                        pointer-events: none;
                        z-index: 0;
                      "
                    ></div>
                    <div
                      style="
                        position: absolute;
                        top: 20px;
                        left: 20px;
                        z-index: 1;
                      "
                    >
                      <van-tag
                        round
                        color="rgba(255,255,255,0.2)"
                        text-color="#fff"
                        style="
                          border: 1px solid rgba(255, 255, 255, 0.4);
                          backdrop-filter: blur(8px);
                          padding: 4px 10px;
                          font-size: 12px;
                          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                        "
                      >
                        <van-icon name="fire" style="margin-right: 2px" />
                        一次全对既完成(非紧急)
                      </van-tag>
                    </div>

                    <div
                      style="
                        font-size: 13px;
                        opacity: 0.9;
                        margin-bottom: 8px;
                        display: flex;
                        align-items: center;
                        position: relative;
                        z-index: 1;
                        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
                      "
                    >
                      待复习 · {{ item.create_time }}
                    </div>

                    <div
                      style="
                        font-weight: 800;
                        font-size: 24px;
                        line-height: 1.3;
                        margin-bottom: 12px;
                        min-height: calc(18px * 1.3 * 2);
                        display: -webkit-box;
                        -webkit-line-clamp: 2;
                        -webkit-box-orient: vertical;
                        overflow: hidden;
                        text-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
                        letter-spacing: 0.5px;
                        position: relative;
                        z-index: 1;
                      "
                    >
                      <span v-if="item.complete_status == 1">⚡️</span>
                      {{ processedTitle(item.title) }}
                    </div>

                    <div
                      style="
                        display: flex;
                        align-items: center;
                        margin-bottom: 24px;
                        position: relative;
                        z-index: 1;
                      "
                    >
                      <div
                        style="
                          font-size: 15px;
                          font-weight: bold;
                          opacity: 0.95;
                          margin-right: 12px;
                          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
                        "
                      >
                        {{ item.answers ? item.answers.length : 0 }}词
                      </div>

                      <div
                        style="
                          display: flex;
                          align-items: center;
                          gap: 4px;
                          filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
                        "
                      >
                        <img
                          :src="blueSwipeRateIcon(item)"
                          style="width: 22px; height: 22px; object-fit: contain"
                          alt="rate"
                        />
                      </div>
                      <div
                        style="
                          font-size: 13px;
                          margin-left: 10px;
                          opacity: 0.9;
                          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
                        "
                      >
                        背<span style="font-weight: 700">{{
                          item.attempt
                        }}</span
                        >次
                      </div>
                    </div>
                    <div
                      style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        position: relative;
                        z-index: 1;
                      "
                    >
                      <div
                        style="
                          display: flex;
                          align-items: center;
                          background: rgba(255, 255, 255, 0.25);
                          backdrop-filter: blur(12px);
                          -webkit-backdrop-filter: blur(12px);
                          padding: 6px 14px;
                          border-radius: 20px;
                          border: 1px solid rgba(255, 255, 255, 0.4);
                          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                        "
                      >
                        <van-icon
                          name="play"
                          size="18"
                          style="margin-right: 6px"
                        />
                        <span style="font-size: 14px; font-weight: bold"
                          >开始挑战</span
                        >
                      </div>
                    </div>
                  </div>
                </van-swipe-item>
                <template #indicator="{ active, total }">
                  <div class="custom-indicator">
                    <div class="swipe-hint-arrow">
                      <van-icon name="arrow" size="14" />
                      <van-icon name="arrow" size="14" />
                    </div>
                    <span>{{ active + 1 }} / {{ total }}</span>
                  </div>
                </template>
              </van-swipe>
            </div>
            <van-list
              v-model="loadingOriginalData"
              :finished="finishedOriginalData"
              finished-text="没有更多了"
              @load="onLoadOriginalData"
            >
              <div v-for="(item, index) in originalData" :key="index">
                <div v-if="!shouldHideFromList(item)">
                  <div v-if="item.type == 4">
                    <van-cell
                      is-link
                      center
                      clickable
                      @click="gotoItem(index)"
                      :class="[
                        'custom-cell',
                        {
                          'swipe-undone': item.swipe_status == 0,
                        },
                      ]"
                    >
                      <template #icon>
                        <img
                          src="../assets/vote.png"
                          style="
                            width: 23px;
                            height: auto;
                            margin-right: 0.5rem;
                          "
                          alt="Item List"
                        />
                      </template>
                      <template #title>
                        <div
                          v-if="item.swipe == 0"
                          style="
                            display: flex;
                            align-items: flex-start;
                            width: 200%;
                          "
                        >
                          <div
                            style="
                              margin-bottom: 7px;
                              font-weight: 700;
                              margin-left: 0.2rem;
                            "
                          >
                            <div v-if="item.complete_status == 1">
                              ⚡️ {{ processedTitle(item.title) }}
                            </div>
                            <div v-else>{{ processedTitle(item.title) }}</div>
                          </div>
                        </div>
                      </template>
                      <template #value>
                        <div style="font-size: 12px">
                          <div style="margin-top: 0rem">
                            {{ item.answers.length }}词
                          </div>
                        </div>
                      </template>
                      <template #label>
                        <div
                          style="
                            margin-left: 4px;
                            margin-top: 7px;
                            width: 200%;
                            font-size: 12px;
                          "
                        >
                          <div>{{ item.create_time }}</div>
                        </div>
                      </template>
                    </van-cell>
                  </div>

                  <div
                    v-if="item.type !== 2 && item.type != 3 && item.type != 4"
                  >
                    <van-cell
                      is-link
                      center
                      clickable
                      @click="
                        isMultiSelectMode ? selectItem(index) : gotoItem(index)
                      "
                      class="custom-cell"
                      :class="{
                        'pin-background': item.is_pinned && item.rate < 3,
                        'swipe-undone': item.swipe_status == 0,
                        'ice-frozen': item.swipe_status == 0,
                      }"
                    >
                      <template v-if="item.swipe_status == 0">
                        <span class="ice-layer-prism" />
                        <span class="ice-layer-glint" />
                      </template>
                      <template #icon>
                        <div v-if="item.alias.includes('庆典')">
                          <img
                            v-if="item.rate < 3"
                            src="../assets/Boonie Bears/item_list.png"
                            style="
                              width: 27px;
                              height: auto;
                              margin-right: 0.5rem;
                            "
                            alt="Item List Complete"
                          />
                          <img
                            v-else
                            src="../assets/item_list_complete.png"
                            style="
                              width: 27px;
                              height: auto;
                              margin-right: 0.5rem;
                            "
                            class="image-middle"
                            alt="Item List Complete"
                          />
                        </div>
                        <div v-else>
                          <div v-if="item.is_review_required == 1">
                            <img
                              src="../assets/item_list_complete_reviewed.png"
                              style="
                                width: 27px;
                                height: auto;
                                margin-right: 0.5rem;
                              "
                              class="image-middle"
                              alt="Item List"
                            />
                          </div>
                          <div v-else>
                            <img
                              v-if="item.rate < 3"
                              src="../assets/item_list.png"
                              style="
                                width: 27px;
                                height: auto;
                                margin-right: 0.5rem;
                              "
                              class="image-middle"
                              alt="Item List"
                            />
                            <img
                              v-else
                              src="../assets/item_list_complete.png"
                              style="
                                width: 27px;
                                height: auto;
                                margin-right: 0.5rem;
                              "
                              class="image-middle"
                              alt="Item List Complete"
                            />
                          </div>
                        </div>
                      </template>

                      <template #title>
                        <div
                          v-if="item.swipe == 0"
                          style="
                            display: flex;
                            align-items: flex-start;
                            width: 200%;
                          "
                        >
                          <img
                            v-show="item.alias.includes('庆典')"
                            src="../assets/Boonie Bears/edge.png"
                            style="
                              width: 25px;
                              height: auto;
                              margin-top: -0.2rem;
                              margin-left: -2.2rem;
                              margin-right: 0.7rem;
                            "
                          />

                          <div style="margin-bottom: 7px; font-weight: 700">
                            <div v-if="item.complete_status == 1">
                              ⚡️ {{ processedTitle(item.title) }}
                            </div>
                            <div v-else>{{ processedTitle(item.title) }}</div>
                          </div>
                        </div>

                        <div
                          v-else
                          style="
                            display: flex;
                            align-items: flex-start;
                            width: 200%;
                          "
                        >
                          <img
                            v-show="item.alias.includes('庆典')"
                            src="../assets/Boonie Bears/edge.png"
                            style="
                              width: 25px;
                              height: auto;
                              margin-top: -0.2rem;
                              margin-left: -2.2rem;
                              margin-right: 0.7rem;
                            "
                          />
                          <div
                            v-if="item.is_review_required == 1"
                            style="
                              margin-bottom: 7px;
                              font-weight: 700;
                              color: lightgray;
                            "
                          >
                            <div v-if="item.complete_status == 1">
                              ⚡️ {{ processedTitle(item.title) }}
                            </div>
                            <div v-else>{{ processedTitle(item.title) }}</div>
                          </div>
                          <div
                            v-else
                            style="margin-bottom: 7px; font-weight: 700"
                          >
                            <div v-if="item.complete_status == 1">
                              ⚡️ {{ processedTitle(item.title) }}
                            </div>
                            <div v-else>{{ processedTitle(item.title) }}</div>
                          </div>
                        </div>
                      </template>

                      <template #value>
                        <div
                          v-if="item.is_review_required == 1"
                          style="font-size: 12px; color: lightgray"
                        >
                          <div style="display: flex; justify-content: flex-end">
                            背
                            <div style="font-weight: 700; color: bisque">
                              {{ item.attempt }}
                            </div>
                            次
                          </div>

                          <div style="margin-top: 0.5rem">
                            {{ item.answers.length }}词
                          </div>
                        </div>

                        <div v-else style="font-size: 12px">
                          <div style="display: flex; justify-content: flex-end">
                            背
                            <div style="font-weight: 700; color: red">
                              {{ item.attempt }}
                            </div>
                            次
                          </div>

                          <div style="margin-top: 0.5rem">
                            {{ item.answers.length }}词
                          </div>
                        </div>
                      </template>

                      <template #label>
                        <div style="display: flex; width: 200%">
                          <van-rate
                            v-if="item.apply_challenge == 2"
                            v-model="item.rate"
                            :size="22"
                            color="#CD853F"
                            void-icon="good-job"
                            icon="good-job"
                            void-color="#eee"
                            :count="3"
                            readonly
                            allow-half
                          >
                          </van-rate>
                          <van-rate
                            v-else-if="item.is_review_required == 1"
                            v-model="item.rate"
                            :size="20"
                            color="#DBC8AF"
                            void-icon="like"
                            icon="like"
                            void-color="#eee"
                            :count="3"
                            readonly
                            allow-half
                          />
                          <van-rate
                            v-else
                            v-model="item.rate"
                            :size="20"
                            color="#ffd21e"
                            void-icon="like"
                            icon="like"
                            void-color="#eee"
                            :count="3"
                            readonly
                            allow-half
                          />
                          <div
                            style="
                              margin-top: 3%;
                              margin-left: 0.2rem;
                              color: lightgray;
                            "
                            v-if="
                              showRatePlus[index] &&
                              item.is_review_required == 1
                            "
                          >
                            + {{ formattedRate(item.rate) }}
                          </div>
                          <div
                            style="margin-top: 3%; margin-left: 0.2rem"
                            v-if="
                              showRatePlus[index] &&
                              !item.is_review_required == 1
                            "
                          >
                            + {{ formattedRate(item.rate) }}
                          </div>
                        </div>

                        <div
                          v-if="item.is_review_required == 1"
                          style="
                            margin-left: 4px;
                            margin-top: 7px;
                            width: 200%;
                            font-size: 12px;
                            color: lightgray;
                          "
                        >
                          {{ item.create_time }}
                        </div>
                        <div
                          v-else
                          style="
                            margin-left: 4px;
                            margin-top: 7px;
                            width: 200%;
                            font-size: 12px;
                          "
                        >
                          {{ item.create_time }}
                        </div>
                        <div style="margin-top: 1rem">
                          <div v-if="item.is_review_required == 1">
                            <van-progress
                              color="lightblue"
                              :percentage="item.progressPercentage"
                              stroke-width="2"
                              :show-pivot="true"
                              :inactive="item.progressPercentage === 100"
                            />
                          </div>
                          <div v-else>
                            <van-progress
                              v-if="item.alias.includes('庆典')"
                              color="#F4C244"
                              :percentage="item.progressPercentage"
                              stroke-width="2"
                              :show-pivot="true"
                              :inactive="item.progressPercentage === 100"
                            />
                            <van-progress
                              v-else
                              :percentage="item.progressPercentage"
                              stroke-width="2"
                              :show-pivot="true"
                              :inactive="item.progressPercentage === 100"
                            />
                          </div>
                        </div>
                      </template>

                      <template #right-icon>
                        <van-checkbox
                          v-if="isMultiSelectMode & (item.rate >= 3)"
                          :checked="selectedItems.includes(index)"
                          @click.stop="selectItem(index)"
                        />
                        <div v-else>
                          <div
                            v-if="item.is_pinned && item.rate < 3"
                            style="display: flex; flex-direction: column"
                          >
                            <van-icon
                              name="link-o"
                              color="red"
                              style="margin-bottom: 1.7rem"
                            />
                            <van-icon
                              name="arrow"
                              style="margin-bottom: 1.95rem"
                            />
                          </div>
                          <div v-else>
                            <van-icon
                              name="arrow"
                              style="margin-bottom: 1rem"
                            />
                          </div>
                        </div>
                      </template>
                    </van-cell>
                  </div>

                  <div v-if="item.type == 2 || item.type == 3">
                    <van-cell
                      is-link
                      center
                      clickable
                      @click="gotoItem(index)"
                      :class="[
                        'custom-cell',
                        {
                          'swipe-undone': shouldShowListFrozen(item),
                          'ice-frozen': shouldShowListFrozen(item),
                        },
                      ]"
                    >
                      <template v-if="shouldShowListFrozen(item)">
                        <span class="ice-layer-prism" />
                        <span class="ice-layer-glint" />
                      </template>
                      <template #icon>
                        <img
                          v-if="
                            item.rate < 3 && (item.type == 0 || item.type == 1)
                          "
                          src="../assets/item_list.png"
                          style="
                            width: 27px;
                            height: auto;
                            margin-right: 0.5rem;
                          "
                          alt="Item List"
                        />
                        <img
                          v-if="
                            item.rate >= 3 && (item.type == 0 || item.type == 1)
                          "
                          src="../assets/item_list_complete.png"
                          style="
                            width: 27px;
                            height: auto;
                            margin-right: 0.5rem;
                          "
                          alt="Item List Complete"
                        />
                        <img
                          v-if="item.type == 3"
                          src="../assets/item_list_complete.png"
                          style="
                            width: 27px;
                            height: auto;
                            margin-right: 0.5rem;
                          "
                          alt="Item List Complete"
                        />
                        <img
                          v-if="item.type == 2"
                          src="../assets/item_list.png"
                          style="
                            width: 27px;
                            height: auto;
                            margin-right: 0.5rem;
                          "
                          alt="Item List"
                        />
                      </template>

                      <template #title>
                        <div
                          v-if="item.swipe == 0"
                          style="
                            display: flex;
                            align-items: flex-start;
                            width: 200%;
                          "
                        >
                          <div style="margin-bottom: 7px; font-weight: 700">
                            <div v-if="item.complete_status == 1">
                              ⚡️ {{ processedTitle(item.title) }}
                            </div>
                            <div v-else>{{ processedTitle(item.title) }}</div>
                          </div>
                        </div>

                        <div
                          v-else
                          style="
                            display: flex;
                            align-items: flex-start;
                            width: 200%;
                          "
                        >
                          <div style="margin-bottom: 0px; font-weight: 700">
                            <div v-if="item.complete_status == 1">
                              ⚡️ {{ processedTitle(item.title) }}
                            </div>
                            <div v-else>{{ processedTitle(item.title) }}</div>
                          </div>
                        </div>
                      </template>

                      <template #value>
                        <div style="font-size: 12px">
                          <div style="margin-top: 0rem">
                            {{ item.answers.length }}词
                          </div>
                        </div>
                      </template>

                      <template #label>
                        <div
                          v-if="item.type == 2"
                          style="
                            display: flex;
                            align-items: center;
                            height: 50px;
                          "
                        >
                          <img
                            :src="blueSwipeRateIcon(item)"
                            style="
                              width: 42px;
                              height: 42px;
                              object-fit: contain;
                            "
                            alt="rate"
                          />
                        </div>
                        <van-rate
                          v-else
                          v-model="item.rate"
                          :size="50"
                          color="#ffd21e"
                          void-icon="chart-trending-o"
                          icon="chart-trending-o"
                          void-color="#eee"
                          :count="1"
                          readonly
                          allow-half
                        />
                        <div
                          style="
                            margin-left: 4px;
                            margin-top: 7px;
                            width: 200%;
                            font-size: 12px;
                          "
                        >
                          <div>{{ item.create_time }}</div>
                        </div>
                      </template>
                    </van-cell>
                  </div>
                </div>
              </div>
            </van-list>
          </van-tab>

          <div v-for="(item, index) in tabsName" :key="index">
            <van-tab :title="item">
              <van-list
                v-model="loadingOriginalData"
                :finished="finishedOriginalData"
                finished-text="没有更多了"
                @load="onLoadOriginalData(item)"
              >
                <div v-if="item && item.includes('庆典')">
                  <van-cell
                    center
                    is-link
                    clickable
                    value="限时任务"
                    class="custom-cell"
                  >
                    <template #icon>
                      <img
                        src="../assets/Boonie Bears/ad.png"
                        style="
                          width: 100px;
                          height: auto;
                          margin-right: 0.5rem;
                          margin-bottom: 0.5rem;
                        "
                        alt="Item List"
                      />
                    </template>
                    <template #title>
                      <div
                        style="
                          margin-bottom: 2.9rem;
                          font-weight: 700;
                          color: #f4c241;
                          width: 100%;
                        "
                      >
                        限定技能-不灭意志
                      </div>
                    </template>
                    <template #label>
                      <div style="width: 100%; font-size: smaller">
                        期末考试前完成本组试题
                      </div>
                      <div
                        style="
                          width: 80%;
                          margin-top: 0.2rem;
                          font-size: smaller;
                        "
                      >
                        免费获得
                      </div>
                    </template>
                  </van-cell>
                </div>

                <div v-for="(item, index) in originalData" :key="index">
                  <div v-if="item.type == 4 && !shouldHideFromList(item)">
                    <van-cell
                      is-link
                      center
                      clickable
                      @click="gotoItem(index)"
                      :class="[
                        'custom-cell',
                        {
                          'swipe-undone': item.swipe_status == 0,
                        },
                      ]"
                    >
                      <template #icon>
                        <img
                          src="../assets/vote.png"
                          style="
                            width: 23px;
                            height: auto;
                            margin-right: 0.5rem;
                          "
                          alt="Item List"
                        />
                      </template>

                      <template #title>
                        <div
                          v-if="item.swipe == 0"
                          style="
                            display: flex;
                            align-items: flex-start;
                            width: 200%;
                          "
                        >
                          <div
                            style="
                              margin-bottom: 7px;
                              font-weight: 700;
                              margin-left: 0.2rem;
                            "
                          >
                            <div v-if="item.complete_status == 1">
                              ⚡️ {{ processedTitle(item.title) }}
                            </div>
                            <div v-else>{{ processedTitle(item.title) }}</div>
                          </div>
                        </div>
                      </template>

                      <template #value>
                        <div style="font-size: 12px">
                          <div style="margin-top: 0rem">
                            {{ item.answers.length }}词
                          </div>
                        </div>
                      </template>

                      <template #label>
                        <div
                          style="
                            margin-left: 4px;
                            margin-top: 7px;
                            width: 200%;
                            font-size: 12px;
                          "
                        >
                          <div>{{ item.create_time }}</div>
                        </div>
                      </template>
                    </van-cell>
                  </div>
                  <div
                    v-if="
                      item.type !== 2 &&
                      item.type != 3 &&
                      item.type != 4 &&
                      !shouldHideFromList(item)
                    "
                  >
                    <van-cell
                      is-link
                      center
                      clickable
                      @click="
                        isMultiSelectMode ? selectItem(index) : gotoItem(index)
                      "
                      class="custom-cell"
                      :class="{
                        'pin-background': item.is_pinned && item.rate < 3,
                        'swipe-undone': item.swipe_status == 0,
                        'ice-frozen': item.swipe_status == 0,
                      }"
                    >
                      <!-- 冰封光效层，只在冰封时渲染 -->
                      <template v-if="item.swipe_status == 0">
                        <span class="ice-layer-prism" />
                        <span class="ice-layer-glint" />
                      </template>
                      <template #icon>
                        <div v-if="item.alias.includes('庆典')">
                          <img
                            v-if="item.rate < 3"
                            src="../assets/Boonie Bears/item_list.png"
                            style="
                              width: 27px;
                              height: auto;
                              margin-right: 0.5rem;
                            "
                            alt="Item List Complete"
                          />
                          <img
                            v-else
                            src="../assets/item_list_complete.png"
                            style="
                              width: 27px;
                              height: auto;
                              margin-right: 0.5rem;
                            "
                            class="image-middle"
                            alt="Item List Complete"
                          />
                        </div>
                        <div v-else>
                          <div v-if="item.is_review_required == 1">
                            <img
                              src="../assets/item_list_complete_reviewed.png"
                              style="
                                width: 27px;
                                height: auto;
                                margin-right: 0.5rem;
                              "
                              class="image-middle"
                              alt="Item List"
                            />
                          </div>
                          <div v-else>
                            <img
                              v-if="
                                item.rate < 3 &&
                                (item.type == 0 || item.type == 1)
                              "
                              src="../assets/item_list.png"
                              style="
                                width: 27px;
                                height: auto;
                                margin-right: 0.5rem;
                              "
                              alt="Item List"
                            />
                            <img
                              v-if="
                                item.rate >= 3 &&
                                (item.type == 0 || item.type == 1)
                              "
                              src="../assets/item_list_complete.png"
                              style="
                                width: 27px;
                                height: auto;
                                margin-right: 0.5rem;
                              "
                              alt="Item List Complete"
                            />
                            <img
                              v-if="item.type == 3"
                              src="../assets/item_list_complete.png"
                              style="
                                width: 27px;
                                height: auto;
                                margin-right: 0.5rem;
                              "
                              alt="Item List Complete"
                            />
                            <img
                              v-if="item.type == 2"
                              src="../assets/item_list.png"
                              style="
                                width: 27px;
                                height: auto;
                                margin-right: 0.5rem;
                              "
                              alt="Item List"
                            />
                          </div>
                        </div>
                      </template>

                      <template #title>
                        <div
                          v-if="item.swipe == 0"
                          style="
                            display: flex;
                            align-items: flex-start;
                            width: 200%;
                          "
                        >
                          <img
                            v-show="item.alias.includes('庆典')"
                            src="../assets/Boonie Bears/edge.png"
                            style="
                              width: 25px;
                              height: auto;
                              margin-top: -0.2rem;
                              margin-left: -2.2rem;
                              margin-right: 0.7rem;
                            "
                          />
                          <div style="margin-bottom: 7px; font-weight: 700">
                            <div v-if="item.complete_status == 1">
                              ⚡️ {{ processedTitle(item.title) }}
                            </div>
                            <div v-else>{{ processedTitle(item.title) }}</div>
                          </div>
                        </div>

                        <div
                          v-else
                          style="
                            display: flex;
                            align-items: flex-start;
                            width: 200%;
                          "
                        >
                          <img
                            v-show="item.alias.includes('庆典')"
                            src="../assets/Boonie Bears/edge.png"
                            style="
                              width: 25px;
                              height: auto;
                              margin-top: -0.2rem;
                              margin-left: -2.2rem;
                              margin-right: 0.7rem;
                            "
                          />
                          <div
                            v-if="item.is_review_required == 1"
                            style="
                              margin-bottom: 7px;
                              font-weight: 700;
                              color: lightgray;
                            "
                          >
                            <div v-if="item.complete_status == 1">
                              ⚡️ {{ processedTitle(item.title) }}
                            </div>
                            <div v-else>{{ processedTitle(item.title) }}</div>
                          </div>
                          <div
                            v-else
                            style="margin-bottom: 7px; font-weight: 700"
                          >
                            <div v-if="item.complete_status == 1">
                              ⚡️ {{ processedTitle(item.title) }}
                            </div>
                            <div v-else>{{ processedTitle(item.title) }}</div>
                          </div>
                        </div>
                      </template>

                      <template #value>
                        <div
                          v-if="item.is_review_required == 1"
                          style="font-size: 12px; color: lightgray"
                        >
                          <div style="display: flex; justify-content: flex-end">
                            背
                            <div style="font-weight: 700; color: bisque">
                              {{ item.attempt }}
                            </div>
                            次
                          </div>

                          <div style="margin-top: 0.5rem">
                            {{ item.answers.length }}词
                          </div>
                        </div>
                        <div v-else style="font-size: 12px">
                          <div style="display: flex; justify-content: flex-end">
                            背
                            <div style="font-weight: 700; color: red">
                              {{ item.attempt }}
                            </div>
                            次
                          </div>

                          <div style="margin-top: 0.5rem">
                            {{ item.answers.length }}词
                          </div>
                        </div>
                      </template>

                      <template #label>
                        <div style="display: flex; width: 200%">
                          <van-rate
                            v-if="item.is_review_required == 1"
                            v-model="item.rate"
                            :size="20"
                            color="#DBC8AF"
                            void-icon="like"
                            icon="like"
                            void-color="#eee"
                            :count="3"
                            readonly
                            allow-half
                          />
                          <van-rate
                            v-else
                            v-model="item.rate"
                            :size="20"
                            color="#ffd21e"
                            void-icon="like"
                            icon="like"
                            void-color="#eee"
                            :count="3"
                            readonly
                            allow-half
                          />
                          <div
                            style="
                              margin-top: 3%;
                              margin-left: 0.2rem;
                              color: lightgray;
                            "
                            v-if="
                              showRatePlus[index] &&
                              item.is_review_required == 1
                            "
                          >
                            + {{ formattedRate(item.rate) }}
                          </div>
                          <div
                            style="margin-top: 3%; margin-left: 0.2rem"
                            v-if="
                              showRatePlus[index] &&
                              !item.is_review_required == 1
                            "
                          >
                            + {{ formattedRate(item.rate) }}
                          </div>
                        </div>
                        <div
                          v-if="item.is_review_required == 1"
                          style="
                            margin-left: 4px;
                            margin-top: 7px;
                            width: 200%;
                            font-size: 12px;
                            color: lightgray;
                          "
                        >
                          <div>{{ item.create_time }}</div>
                        </div>
                        <div
                          v-else
                          style="
                            margin-left: 4px;
                            margin-top: 7px;
                            width: 200%;
                            font-size: 12px;
                          "
                        >
                          <div>{{ item.create_time }}</div>
                        </div>
                        <div style="margin-top: 1rem">
                          <div v-if="item.is_review_required == 1">
                            <van-progress
                              color="lightblue"
                              :percentage="item.progressPercentage"
                              stroke-width="2"
                              :show-pivot="true"
                              :inactive="item.progressPercentage === 100"
                            />
                          </div>
                          <div v-else>
                            <van-progress
                              v-if="item.alias.includes('庆典')"
                              color="#F4C244"
                              :percentage="item.progressPercentage"
                              stroke-width="2"
                              :show-pivot="true"
                              :inactive="item.progressPercentage === 100"
                            />
                            <van-progress
                              v-else
                              :percentage="item.progressPercentage"
                              stroke-width="2"
                              :show-pivot="true"
                              :inactive="item.progressPercentage === 100"
                            />
                          </div>
                        </div>
                      </template>

                      <template #right-icon>
                        <van-checkbox
                          v-if="isMultiSelectMode & (item.rate >= 3)"
                          :checked="selectedItems.includes(index)"
                          @click.stop="selectItem(index)"
                        />
                        <div v-else>
                          <van-icon name="arrow" style="margin-bottom: 1rem" />
                        </div>
                      </template>
                    </van-cell>
                  </div>

                  <div
                    v-if="
                      (item.type == 2 || item.type == 3) &&
                      !shouldHideFromList(item)
                    "
                  >
                    <van-cell
                      is-link
                      center
                      clickable
                      @click="gotoItem(index)"
                      :class="[
                        'custom-cell',
                        {
                          'swipe-undone': shouldShowListFrozen(item),
                          'ice-frozen': shouldShowListFrozen(item),
                        },
                      ]"
                    >
                      <!-- 冰封光效层，只在冰封时渲染 -->
                      <template v-if="shouldShowListFrozen(item)">
                        <span class="ice-layer-prism" />
                        <span class="ice-layer-glint" />
                      </template>
                      <template #icon>
                        <img
                          v-if="
                            item.rate < 3 && (item.type == 0 || item.type == 1)
                          "
                          src="../assets/item_list.png"
                          style="
                            width: 27px;
                            height: auto;
                            margin-right: 0.5rem;
                          "
                          alt="Item List"
                        />
                        <img
                          v-if="
                            item.rate >= 3 && (item.type == 0 || item.type == 1)
                          "
                          src="../assets/item_list_complete.png"
                          style="
                            width: 27px;
                            height: auto;
                            margin-right: 0.5rem;
                          "
                          alt="Item List Complete"
                        />
                        <img
                          v-if="item.type == 3"
                          src="../assets/item_list_complete.png"
                          style="
                            width: 27px;
                            height: auto;
                            margin-right: 0.5rem;
                          "
                          alt="Item List Complete"
                        />
                        <img
                          v-if="item.type == 2"
                          src="../assets/item_list.png"
                          style="
                            width: 27px;
                            height: auto;
                            margin-right: 0.5rem;
                          "
                          alt="Item List"
                        />
                      </template>

                      <template #title>
                        <div
                          v-if="item.swipe == 0"
                          style="
                            display: flex;
                            align-items: flex-start;
                            width: 200%;
                          "
                        >
                          <div style="margin-bottom: 7px; font-weight: 700">
                            <div v-if="item.complete_status == 1">
                              ⚡️ {{ processedTitle(item.title) }}
                            </div>
                            <div v-else>{{ processedTitle(item.title) }}</div>
                          </div>
                        </div>

                        <div
                          v-else
                          style="
                            display: flex;
                            align-items: flex-start;
                            width: 200%;
                          "
                        >
                          <div style="margin-bottom: 0px; font-weight: 700">
                            <div v-if="item.complete_status == 1">
                              ⚡️ {{ processedTitle(item.title) }}
                            </div>
                            <div v-else>{{ processedTitle(item.title) }}</div>
                          </div>
                        </div>
                      </template>

                      <template #value>
                        <div style="font-size: 12px">
                          <div style="margin-top: 0rem">
                            {{ item.answers.length }}词
                          </div>
                        </div>
                      </template>

                      <template #label>
                        <div
                          v-if="item.type == 2"
                          style="
                            display: flex;
                            align-items: center;
                            height: 50px;
                          "
                        >
                          <img
                            :src="blueSwipeRateIcon(item)"
                            style="
                              width: 42px;
                              height: 42px;
                              object-fit: contain;
                            "
                            alt="rate"
                          />
                        </div>
                        <van-rate
                          v-else
                          v-model="item.rate"
                          :size="50"
                          color="#ffd21e"
                          void-icon="chart-trending-o"
                          icon="chart-trending-o"
                          void-color="#eee"
                          :count="1"
                          readonly
                          allow-half
                        />
                        <div
                          style="
                            margin-left: 4px;
                            margin-top: 7px;
                            width: 200%;
                            font-size: 12px;
                          "
                        >
                          <div>{{ item.create_time }}</div>
                        </div>
                      </template>
                    </van-cell>
                  </div>
                </div>
              </van-list>
            </van-tab>
          </div>
        </van-tabs>
      </div>
    </div>

    <!-- 显示答案 -->
    <van-popup
      closeable
      v-model:show="showAnswerSheet"
      position="bottom"
      :style="{ height: '90%' }"
    >
      <div
        style="
          font-size: 18px;
          font-weight: 700;
          margin: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        "
      >
        挑战前复习
        <van-button type="warning" size="mini" @click.stop="clickShowAnswerPro">
          预习pro版
        </van-button>
      </div>

      <div
        @click="toggleCheckSelf"
        style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-right: 1rem;
        "
      >
        <div
          style="
            font-size: 13px;
            margin: 0.5rem 1rem 0.5rem 1rem;
            font-weight: 700;
          "
        >
          {{ answerSheetList.length }}词
        </div>
        <div style="display: flex">
          <div
            style="font-size: 12px; margin-right: 0.2rem; margin-top: 0.2rem"
          >
            点击自查词汇
          </div>
          <van-icon
            :name="selfCheck ? 'eye-o' : 'eye'"
            style="margin-right: 1rem; margin-top: 0.1rem"
            size="20"
          />
        </div>
      </div>
      <van-cell-group inset style="margin-top: 0.5rem; margin-left: -0.2rem">
        <van-cell-group>
          <div v-for="(item, index) in answerSheetList" :key="index">
            <div v-if="item.排除 !== '试题'">
              <van-cell
                :title="`${index + 1}. ${item.英文}`"
                :value="item.中文"
                @click="speakWord(item.英文, item.正确答案)"
              >
                <div v-show="selfCheck">
                  <!-- 检查 spellWordsList 是否包含当前 item 的英文 -->
                  <van-tag
                    mark
                    v-if="
                      spellWordsList.some(
                        (spellItem) => spellItem.英文 === item.英文
                      )
                    "
                    type="danger"
                  >
                    拼
                  </van-tag>
                  <van-tag mark v-if="item.排除 === '手写'" type="warning">
                    写
                  </van-tag>
                  {{ item.中文 }}
                  <img
                    src="../assets/speaker.png"
                    style="width: 12px; height: auto"
                  />
                </div>
              </van-cell>
            </div>
          </div>
        </van-cell-group>
      </van-cell-group>
      <div
        class="revview-button-group"
        v-if="
          originalData[gotoIndex]?.swipe_status === 0 || forceShowReviewButtons
        "
        style="
          position: sticky;
          bottom: 0;
          z-index: 10;
          background: #fff;
          padding: 10px 16px 14px;
        "
      >
        <van-button
          plain
          :loading="isSkipLoading"
          loading-type
          type="danger"
          class="review-btn-skip"
          @click="skipSwipeReview(originalData[gotoIndex], gotoIndex)"
        >
          🌸 跳过
        </van-button>
        <van-button
          type="primary"
          class="review-btn-start"
          @click="gotoReviewWordSwipe(originalData[gotoIndex], gotoIndex)"
        >
          开启挑战
        </van-button>
      </div>
    </van-popup>

    <!-- 显示答案pro -->
    <van-popup
      closeable
      v-model:show="showAnswerProSheet"
      position="top"
      :style="{ height: '100%' }"
    >
      <div
        style="
          font-size: 18px;
          font-weight: 700;
          margin: 1rem 1rem 0.8rem 1rem;
          color: red;
        "
      >
        复习功能pro
      </div>
      <div
        style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-right: 1rem;
        "
      >
        <div
          style="
            font-size: 13px;
            margin: 0.5rem 1rem 0.5rem 1rem;
            font-weight: 700;
          "
        >
          {{ answerSheetProList.length }}词
        </div>
        <div style="display: flex">
          <div
            style="font-size: 12px; margin-right: 0.2rem; margin-top: 0.2rem"
          >
            查看中文
          </div>

          <van-icon
            :name="selfCheckView ? 'eye-o' : 'closed-eye'"
            style="margin-right: 1rem; margin-top: 0.1rem"
            size="20"
            @click.stop="toggleChineseView"
          />

          <div
            style="font-size: 12px; margin-right: 0.2rem; margin-top: 0.2rem"
          >
            点击乱序
          </div>

          <van-icon
            :name="selfCheckPro ? 'notes' : 'notes-o'"
            style="margin-right: 1rem; margin-top: 0.1rem"
            size="20"
            @click.stop="toggleSelfCheckWithShuffle"
          />
        </div>
      </div>
      <van-cell-group inset style="margin-top: 0.5rem; margin-left: -0.2rem">
        <van-cell-group>
          <transition-group name="shuffle" tag="div" class="shuffle-list">
            <div v-for="(item, index) in displayedAnswerSheetList" :key="index">
              <div v-if="item.排除 !== '试题'">
                <van-cell
                  @click="speakWordPro(item.英文, item.正确答案)"
                  style="min-height: 40px"
                >
                  <!-- 自定义标题：英文 + 喇叭 -->
                  <template #title>
                    <div style="display: flex; align-items: center; gap: 6px">
                      <span>{{ parseInt(item.序号) }}. {{ item.英文 }}</span>
                      <img
                        src="../assets/speaker.png"
                        style="width: 16px; height: auto; cursor: pointer"
                        @click.stop="speakWordPro(item.英文, item.正确答案)"
                      />
                    </div>
                  </template>

                  <!-- 内容区域：中文 or 提示 -->
                  <div @click.stop>
                    <template v-if="item.showChinese">
                      {{ item.中文 }}
                    </template>
                    <template v-else>
                      <span
                        style="color: #999; cursor: pointer"
                        @click="item.showChinese = true"
                      >
                        点击查看答案
                      </span>
                    </template>
                  </div>
                </van-cell>
              </div>
            </div>
          </transition-group>
        </van-cell-group>
      </van-cell-group>
      <div
        class="revview-button-group"
        v-if="originalData[gotoIndex]?.swipe_status === 0"
      >
        <van-button
          plain
          :loading="isSkipLoading"
          loading-type
          type="danger"
          class="review-btn-skip"
          @click="skipSwipeReview(originalData[gotoIndex], gotoIndex)"
        >
          🌸 跳过
        </van-button>
        <van-button
          type="primary"
          class="review-btn-start"
          @click="gotoReviewWordSwipe(originalData[gotoIndex], gotoIndex)"
        >
          开启挑战
        </van-button>
      </div>
    </van-popup>

    <!-- 日常周常任务 -->
    <!-- <van-badge
      v-if="flagDaily"
      :content="dailyTimes"
      :style="badgeStyle"
      color="#ff9999"
    >
      <div class="child">
        <van-floating-bubble
          class="dailyFloat"
          v-if="flagDaily"
          axis="xy"
          magnetic="x"
          v-model:offset="offsetDaily"
          icon="diamond-o"
          @click="popupDaily()"
        />
      </div>
    </van-badge> -->

    <!-- 单词表textbook -->
    <van-popup
      closeable
      v-model:show="showTextbookPop"
      position="bottom"
      :style="{ height: '90%' }"
      :overlay-style="{ backgroundColor: 'rgba(0, 0, 0, 1)' }"
    >
      <div style="display: flex; align-items: center">
        <div style="font-size: 18px; font-weight: 700; margin: 1rem">
          个人定制单词手册
        </div>
      </div>
      <van-cell-group inset style="margin-top: 0.5rem">
        <van-cell-group>
          <div v-for="(item, index) in matchGameWords" :key="index">
            <van-cell
              :title="item.英文"
              :label="`累计${item.times}次`"
              @click="speakWord(item.英文, item.正确答案)"
              clickable
            >
              <template #value>
                <div
                  style="
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    gap: 4px;
                  "
                >
                  <span>{{ item.答案 }}</span>
                  <img
                    src="../assets/speaker.png"
                    alt="speaker"
                    style="width: 14px; height: auto"
                  />
                </div>
              </template>
            </van-cell>
          </div>
        </van-cell-group>
      </van-cell-group>

      <!-- 关闭按钮 -->
      <div
        style="
          display: flex;
          justify-content: center;
          width: 100%;
          padding-bottom: 20px;
          margin-top: 10px;
        "
      >
        <van-button
          block
          type="primary"
          @click="gotoWordMatchGame"
          style="width: 80%"
        >
          开启回顾
        </van-button>
      </div>
    </van-popup>

    <!-- vocabulary meaning -->
    <van-popup
      position="bottom"
      :style="{ height: '80%' }"
      v-model:show="meaningShow"
      style="padding: 1rem"
      closeable
    >
      <div
        style="
          font-weight: 700;
          font-size: 25px;
          color: red;
          margin-bottom: 1rem;
        "
      >
        {{ meaningTitle }}
      </div>
      <div v-if="meaningData['教材'] && meaningData['教材'].length > 0">
        <div v-for="(item, index) in meaningData['教材']" :key="index">
          <div style="display: flex; font-weight: 700">
            <div>{{ item["教材"] }}</div>
            &nbsp;&nbsp;&nbsp;
            <div style="margin-top: 0.07rem">{{ item["模块"] }}</div>
          </div>
          <div style="font-size: 14px; margin-top: 0.3rem">
            {{ item["中文"] }}
          </div>
          <Divider></Divider>
        </div>
      </div>
      <div v-else>
        <div style="font-weight: 700; margin-bottom: 0.3rem">教材：</div>
        <div>无</div>
        <Divider></Divider>
      </div>
      <div style="display: flex; justify-content: space-between">
        <div style="font-weight: 700; margin-bottom: 0.3rem">天津3500:</div>
        <img
          :src="cover3500Image"
          style="width: 40px; height: auto"
          fit="cover"
        />
      </div>
      <div style="white-space: pre-wrap; font-size: 14px">
        {{ meaningData["高考"]["中文"] }}
      </div>
    </van-popup>

    <!-- 模式选择 -->
    <van-dialog
      v-model:show="showChooseMode"
      title="模式选择"
      :confirmButtonText="confirmButtonText"
      cancelButtonText="游戏模式"
      cancelButtonColor="#ee0a24"
      show-cancel-button
      @confirm="handleRegularMode"
      @cancel="handleSwipeMode"
      :confirmButtonDisabled="!isRegularModeEnabled"
      :close-on-click-overlay="true"
    >
      <template #title>
        <div>
          <div style="margin-bottom: 1rem; margin-top: -0.8rem">
            <div
              style="
                display: flex;
                justify-content: center;
                align-items: center;
                position: relative;
                width: 100%;
              "
            >
              <div
                style="
                  font-size: 16px;
                  font-weight: bold;
                  display: flex;
                  align-items: center;
                "
              >
                <div v-if="originalData[gotoIndex]['complete_status']">⚡️</div>
                <div>模式选择</div>
              </div>
              <div
                v-if="consumeText"
                style="
                  position: absolute;
                  right: 35px;
                  font-size: 12px;
                  display: flex;
                  align-items: center;
                  color: #1a89fa;
                "
              >
                {{ consumeText }}
                <span style="font-size: 12px; margin-left: 4px">💎</span>
              </div>
            </div>
            <div
              style="
                display: flex;
                flex-direction: column;
                align-items: center;
                margin-top: 0rem;
                font-size: smaller;
              "
            >
              <div
                style="
                  color: lightcoral;
                  font-size: smaller;
                  margin-top: -0.1rem;
                "
                v-if="
                  originalData[gotoIndex]['is_pinned'] &&
                  originalData[gotoIndex]['rate'] < 3
                "
              >
                <van-icon name="link-o" /> 老师置顶了这组试题，希望你尽快完成
              </div>

              <div
                style="
                  display: flex;
                  align-items: center;
                  margin-bottom: 0.5rem;
                  margin-top: 0.2rem;
                "
              >
                <div :style="noneOfAboveStyle">去除本次背诵“以上都不对”</div>
                <van-switch
                  :disabled="disabledNoneOfAbove"
                  style="margin-left: 1rem"
                  :model-value="checkedNoneOfAbove"
                  @update:model-value="onUpdateNoneOfAbove"
                  size="20px"
                />
              </div>

              <div style="display: flex; align-items: center">
                <div :style="spellStyle">去除本次背诵“拼写”</div>
                <van-switch
                  :disabled="disabledSpell"
                  style="margin-left: 1rem"
                  :model-value="checkedSpell"
                  @update:model-value="onUpdateCheckedSpell"
                  size="20px"
                />
              </div>
            </div>
            <div style="width: 90%; margin-left: 1rem">
              <van-field
                v-model="result"
                is-link
                readonly
                name="picker"
                label="挑战赛"
                placeholder="需要老师开启"
                @click="applyforChallenge()"
              />
            </div>

            <van-progress
              style="margin-top: 0.5rem"
              :pivot-text="`选项难度 ${difficultyCoefficient}`"
              :color="progressColor"
              :percentage="difficultyCoefficient"
            />
          </div>
          <van-icon
            name="cross"
            @click="closeMode()"
            style="position: absolute; top: 10px; right: 10px"
          />
        </div>
      </template>
      <div
        style="
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
        "
      >
        <img
          :src="srcTheme"
          style="
            max-width: 100%;
            max-height: 100%;
            height: auto;
            display: block;
          "
        />
      </div>
      <!-- 自定义底部按钮区域 -->
      <template #footer>
        <div
          style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px;
          "
        >
          <van-button
            type="danger"
            @click="handleSwipeMode"
            style="flex: 1; margin-right: 8px"
          >
            游戏模式
          </van-button>

          <van-button
            size="small"
            type="default"
            plain
            @click="viewAnswer(originalData[gotoIndex], gotoIndex)"
            style="margin: 0 4px; font-size: 10px"
          >
            预习
          </van-button>
          <van-button
            size="small"
            type="default"
            plain
            @click="gotoWordSwipe(originalData[gotoIndex], gotoIndex)"
            style="margin: 0 4px; font-size: 10px"
          >
            跟读
          </van-button>

          <van-button
            type="primary"
            @click="handleRegularMode"
            :disabled="!isRegularModeEnabled"
            style="flex: 1; margin-left: 8px"
          >
            {{ confirmButtonText }}
          </van-button>
        </div>
      </template>
    </van-dialog>

    <!-- 复习模式选择 -->
    <van-dialog
      v-model:show="showReviewMode"
      title="模式选择"
      confirmButtonText="复习模式"
      @confirm="handleReviewMode"
      :close-on-click-overlay="true"
    >
      <template #title>
        <div>
          <div style="margin-bottom: 1rem; margin-top: -0.8rem">
            再次唤醒我吧！
            <van-progress
              style="margin-top: 1rem"
              :pivot-text="`选项难度 ${difficultyCoefficient}`"
              :color="progressColor"
              :percentage="difficultyCoefficient"
            />
          </div>
          <van-icon
            name="cross"
            @click="showReviewMode = false"
            style="position: absolute; top: 10px; right: 10px"
          />
        </div>
      </template>
      <div
        style="
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
        "
      >
        <img
          :src="srcTheme"
          style="
            max-width: 100%;
            max-height: 100%;
            height: auto;
            display: block;
          "
        />
      </div>
    </van-dialog>

    <!-- 考试模式选择 -->
    <van-dialog
      v-model:show="showChooseTestMode"
      title="模式选择"
      confirmButtonText="考试模式"
      @confirm="handleRegularMode"
    >
      <template #title>
        <div>
          <div style="margin-bottom: 1rem; margin-top: -0.8rem">
            别无选择
            <van-progress
              style="margin-top: 0.5rem"
              :pivot-text="`选项难度 ${difficultyCoefficient}`"
              :color="progressColor"
              :percentage="difficultyCoefficient"
            />
          </div>
          <van-icon
            name="cross"
            @click="showChooseTestMode = false"
            style="position: absolute; top: 10px; right: 10px"
          />
        </div>
      </template>
      <div
        style="
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
        "
      >
        <img
          :src="srcTheme"
          style="
            max-width: 100%;
            max-height: 100%;
            height: auto;
            display: block;
          "
        />
      </div>
    </van-dialog>

    <!-- 临考模式 -->
    <van-popup
      position="bottom"
      :style="{ height: '80%' }"
      v-model:show="preExamShow"
      style="padding: 1rem"
      closeable
    >
      <div
        style="
          font-weight: 700;
          font-size: 25px;
          color: black;
          margin-bottom: 0.5rem;
        "
      >
        多组复习
        <div
          style="font-size: 12px; color: red; margin: 0.1rem 0 -0.2rem -0.1rem"
        >
          👇 下拉到底部开启旅途
        </div>
      </div>

      <van-cell-group
        v-for="(item, index) in dataPreExam"
        :key="index"
        style="margin-left: -1rem"
      >
        <van-cell
          :title="`${index + 1}. ${item.英文}`"
          :value="item.正确答案"
          :label="item.type"
          @click="speakWord(item.英文, item.正确答案)"
          clickable
        >
          <template #value>
            <div>
              {{ item.正确答案 }}
              <img
                src="../assets/speaker.png"
                style="width: 12px; height: auto; margin-left: 0.2rem"
              />
            </div>
          </template>
        </van-cell>
      </van-cell-group>

      <van-button
        style="margin-bottom: 0.5rem; margin-right: 0.1rem"
        block
        type="success"
        plain
        @click="startPreExam"
        >开启旅程</van-button
      >
    </van-popup>

    <!-- 复习模式 -->
    <van-popup
      position="bottom"
      :style="{ height: '80%' }"
      v-model:show="reviewShow"
      style="padding: 1rem"
      closeable
    >
      <div
        style="
          font-weight: 700;
          font-size: 25px;
          color: black;
          margin-bottom: 0.5rem;
        "
      >
        唤醒复习
        <div
          style="font-size: 12px; color: red; margin: 0.1rem 0 -0.2rem -0.1rem"
        >
          👇 下拉到底部开启唤醒之旅
        </div>
      </div>

      <van-cell-group
        v-for="(item, index) in dataReview2"
        :key="index"
        style="margin-left: -1rem"
      >
        <div v-if="item.排除 != '试题'">
          <van-cell
            :title="`${index + 1}. ${item.英文}`"
            :value="item.正确答案"
            :label="item.type.toString()"
            @click="speakWord(item.英文, item.正确答案)"
            clickable
          >
            <template #value>
              <div>
                <van-tag mark v-if="item.排除 === '手写'" type="warning">
                  写
                </van-tag>
                {{ item.正确答案 }}
                <img
                  src="../assets/speaker.png"
                  style="width: 12px; height: auto; margin-left: 0.2rem"
                />
              </div>
            </template>
          </van-cell>
        </div>
      </van-cell-group>

      <van-button
        style="margin-bottom: 0.5rem; margin-right: 0.1rem"
        block
        type="success"
        plain
        @click="startReview"
        >开启旅程</van-button
      >
    </van-popup>

    <!-- 复习列表 -->
    <van-popup
      closeable
      round=""
      v-model:show="showReviewList"
      position="bottom"
      :style="{ height: '95%' }"
    >
      <div style="display: flex">
        <div
          style="font-size: 18px; font-weight: 700; margin: 1rem 0 0.5rem 1rem"
        >
          待复习列表
        </div>
        <div
          style="font-size: 11px; color: #8b0000; margin: 1.5rem 0 0rem 0.5rem"
        >
          <div style="display: flex; gap: 1rem">
            <div style="color: #ff0000">红色获得1钻石</div>
            <div style="color: #ff8c00">橙色获得2钻石</div>
            <div style="color: #0000ff">蓝获得2钻石</div>
          </div>
        </div>
      </div>

      <div
        style="
          display: flex;
          justify-content: space-between;
          margin-right: 1rem;
          font-weight: 700;
        "
      ></div>

      <van-list
        v-model="loadingReviewData"
        :finished="finishedReviewData"
        finished-text="没有更多了"
        @load="onLoadReviewData"
      >
        <div v-for="(item, index) in reviewList" :key="index">
          <van-cell is-link center clickable @click="gotoReview(index)">
            <template #icon>
              <img
                src="../assets/item_list_complete_reviewed.png"
                style="width: 27px; height: auto; margin-right: 0.5rem"
                alt="Item List Complete"
              />
            </template>
            <template #title>
              <div
                v-if="item.is_review_required == 1"
                style="display: flex; align-items: flex-start; width: 200%"
              >
                <div
                  style="margin-bottom: 7px; font-weight: 700; color: lightgray"
                >
                  {{ processedTitle(item.title) }}
                </div>
                <van-badge
                  content="一次复习"
                  color="#FF0000"
                  style="margin-left: -20px"
                />
              </div>

              <div
                v-if="item.is_review_required == 2"
                style="display: flex; align-items: flex-start; width: 200%"
              >
                <div
                  style="margin-bottom: 7px; font-weight: 700; color: lightgray"
                >
                  {{ processedTitle(item.title) }}
                </div>
                <van-badge
                  content="二次复习"
                  color="#FF8C00"
                  style="margin-left: -20px"
                />
              </div>

              <div
                v-if="item.is_review_required == 3"
                style="display: flex; align-items: flex-start; width: 200%"
              >
                <div
                  style="margin-bottom: 7px; font-weight: 700; color: lightgray"
                >
                  {{ processedTitle(item.title) }}
                </div>
                <van-badge
                  content="三次复习"
                  color="#0000FF"
                  style="margin-left: -20px"
                />
              </div>
            </template>

            <template #value>
              <div style="font-size: 12px; color: lightgray">
                <div style="display: flex; justify-content: flex-end">
                  背
                  <div style="font-weight: 700; color: red">
                    {{ item.attempt }}
                  </div>
                  次
                </div>

                <div style="margin-top: 0.5rem">
                  {{ item.answers.length }}词
                </div>
              </div>
            </template>

            <template #label>
              <div style="display: flex">
                <van-rate
                  v-model="item.rate"
                  :size="20"
                  color="#DBC8AF"
                  void-icon="like"
                  icon="like"
                  void-color="#eee"
                  :count="3"
                  readonly
                  allow-half
                />
                <div
                  style="margin-top: 3%; margin-left: 0.2rem"
                  v-if="showRatePlus[index]"
                >
                  + {{ formattedRate(item.rate) }}
                </div>
              </div>

              <div
                style="
                  margin-left: 4px;
                  margin-top: 7px;
                  width: 200%;
                  font-size: 12px;
                  color: lightgray;
                "
              >
                {{ item.create_time }}
              </div>
              <div style="margin-top: 1rem">
                <van-progress
                  color="lightblue"
                  :percentage="item.progressPercentage"
                  stroke-width="2"
                  :show-pivot="true"
                  :inactive="item.progressPercentage === 100"
                />
              </div>
            </template>
          </van-cell>
        </div>
      </van-list>
    </van-popup>

    <!-- 日常任务列表 -->
    <van-popup
      closeable
      round=""
      v-model:show="showDailyList"
      position="bottom"
      :style="{ height: '60%' }"
    >
      <div style="font-size: 18px; font-weight: 700; margin: 1rem">
        每周任务
      </div>
      <div style="margin: -0.5rem 0 1rem 1rem; font-size: smaller; color: gray">
        每完成一个任务可获得2颗钻石💎
      </div>

      <div
        style="
          display: flex;
          justify-content: space-between;
          margin-right: 1rem;
          font-weight: 700;
        "
      ></div>

      <van-list>
        <div v-for="(item, index) in dailyList" :key="index">
          <van-cell is-link center clickable @click="gotoDaily(index)">
            <template #icon>
              <img
                src="../assets/item_list_complete.png"
                style="width: 27px; height: auto; margin-right: 0.5rem"
                alt="Item List Complete"
              />
            </template>

            <template #title>
              <div style="display: flex; align-items: flex-start; width: 100%">
                <div style="margin-bottom: 7px; font-weight: 700; color: black">
                  {{ item.alias }}
                </div>
                <van-badge
                  content="Daily"
                  color="red"
                  style="margin-left: -20px"
                />
              </div>
            </template>

            <template #label>
              {{ processedTitle(item.title) }}
            </template>
          </van-cell>
        </div>
      </van-list>
    </van-popup>

    <!-- setting设置 -->
    <van-popup
      closeable
      round=""
      v-model:show="showSettingPopup"
      position="left"
      :style="{ height: '100%', width: '70%' }"
    >
      <div style="font-size: 18px; font-weight: 700; margin: 1rem">设置</div>
      <div style="margin: -0.5rem 0 1rem 1rem; font-size: smaller; color: gray">
        <div>版本号：{{ APP_VERSION_INFO.version }}</div>
        <div>后续开发中...</div>
        <div style="margin-top: 1rem">
          <van-button type="primary" @click="downloadNewversion">
            下载新版安卓apk
          </van-button>
        </div>
      </div>
    </van-popup>

    <!-- 弹幕 -->
    <van-barrage
      v-model="listBarrage"
      style="
        position: absolute;
        width: 100%;
        height: 150px;
        z-index: 99999;
        top: 0;
        pointer-events: none;
      "
    >
      <div class="video" style="width: 100%; height: 150px"></div>
    </van-barrage>

    <!-- 庆祝三星 -->
    <div v-if="showStars" class="stars">
      <div class="star">🐻</div>
      <div class="star" style="animation-delay: 0.5s">🐻</div>
      <div class="star" style="animation-delay: 1s">🐻</div>
    </div>

    <!-- 预热庆祝 -->
    <bearWarmup ref="bearWarmupRef" v-if="showbearWarmup" />

    <angryWolf ref="wolfBackRef" :dialogPosition="dialogPosition" />
    <missyou
      ref="missyouRef"
      :days="missDays"
      :flagMissingThunder="!!flagMissingThunder"
    />
    <challengeConfirm
      ref="challengeConfirmRef"
      @confirm="handleConfirmChallenge"
      @cancel="handleCancelChallenge"
    />
    <threeStar ref="threeStarRef" />
    <loading v-if="isLoading" />
    <getPassive
      ref="getPassiveRef"
      v-if="showPassiveMagic"
      :textGive="'不灭的意志'"
    />

    <!-- 连胜日历 -->
    <WinningCalendar
      v-model:visible="showWinningCalendar"
      :winning-streak="daysWinningStreak"
      :complete-weeks-data="completeWeeks"
      :daily-data="dailyCalendarData"
      :username="viewUsername"
      subtitle="点击：每周三次背诵完成周任务，6次变金色<br />
                🔺：背诵1次。🌸：背诵2次及以上</span"
      :months-to-show="3"
      @date-click="handleDateClick"
      @close="onCalendarClose"
    />

    <!-- 近四周曲线 -->
    <!-- 近四周曲线 -->
    <van-popup
      v-model:show="showfourweeksPopup"
      position="center"
      style="width: 90%; max-width: 500px; padding: 16px; border-radius: 12px"
      :close-on-click-overlay="true"
      @opened="onOpenedfourweeks"
    >
      <div class="p-2">
        <div
          style="
            font-size: 19px;
            font-weight: 700;
            display: flex;
            justify-content: flex-start;
            margin-bottom: 1.5rem;
          "
        >
          近四周趋势
          <div
            style="
              font-size: 14px;
              color: gray;
              margin-left: 0.5rem;
              margin-top: 0.4rem;
            "
          >
            {{ username }}
          </div>
        </div>

        <!-- canvas 组件用于 Chart.js 绘图 -->
        <div class="chart-container" style="margin-bottom: 1rem">
          <canvas id="recitationChart"></canvas>
        </div>

        <!-- 平均数标注 - 横线形式 -->
        <div
          style="
            padding: 12px;
            background-color: #f3f4f6;
            border-radius: 8px;
            margin-top: 1rem;
            display: flex;
            flex-direction: column;
            gap: 12px;
          "
        >
          <!-- 根据数值大小动态排序 -->
          <template v-if="fourWeekAvg >= eightWeekAvg">
            <!-- 近四周平均（数值较大，排在上面） -->
            <div style="display: flex; align-items: center; gap: 8px">
              <span
                style="font-size: 13px; color: #6b7280; white-space: nowrap"
              >
                近四周平均
              </span>
              <div
                style="
                  flex: 1;
                  height: 3px;
                  background: linear-gradient(
                    to right,
                    #ef4444,
                    #ef4444 70%,
                    transparent
                  );
                  border-radius: 2px;
                "
              ></div>
              <span style="font-size: 15px; font-weight: 600; color: #ef4444">
                {{ fourWeekAvg ? fourWeekAvg.toFixed(1) : "0" }}
              </span>
            </div>

            <!-- 近八周平均 -->
            <div style="display: flex; align-items: center; gap: 8px">
              <span
                style="font-size: 13px; color: #6b7280; white-space: nowrap"
              >
                近八周平均
              </span>
              <div
                style="
                  flex: 1;
                  height: 3px;
                  background: linear-gradient(
                    to right,
                    #10b981,
                    #10b981 70%,
                    transparent
                  );
                  border-radius: 2px;
                "
              ></div>
              <span style="font-size: 15px; font-weight: 600; color: #10b981">
                {{ eightWeekAvg ? eightWeekAvg.toFixed(1) : "0" }}
              </span>
            </div>
          </template>

          <template v-else>
            <!-- 近八周平均（数值较大，排在上面） -->
            <div style="display: flex; align-items: center; gap: 8px">
              <span
                style="font-size: 13px; color: #6b7280; white-space: nowrap"
              >
                近八周平均
              </span>
              <div
                style="
                  flex: 1;
                  height: 3px;
                  background: linear-gradient(
                    to right,
                    #10b981,
                    #10b981 70%,
                    transparent
                  );
                  border-radius: 2px;
                "
              ></div>
              <span style="font-size: 15px; font-weight: 600; color: #10b981">
                {{ eightWeekAvg ? eightWeekAvg.toFixed(1) : "0" }}
              </span>
            </div>

            <!-- 近四周平均 -->
            <div style="display: flex; align-items: center; gap: 8px">
              <span
                style="font-size: 13px; color: #6b7280; white-space: nowrap"
              >
                近四周平均
              </span>
              <div
                style="
                  flex: 1;
                  height: 3px;
                  background: linear-gradient(
                    to right,
                    #ef4444,
                    #ef4444 70%,
                    transparent
                  );
                  border-radius: 2px;
                "
              ></div>
              <span style="font-size: 15px; font-weight: 600; color: #ef4444">
                {{ fourWeekAvg ? fourWeekAvg.toFixed(1) : "0" }}
              </span>
            </div>
          </template>
        </div>
      </div>
    </van-popup>
  </div>
</template>




<style>
.chart-container {
  width: 100%;
  height: 280px;
}
.flashing-icon {
  animation: flash 0.4s infinite alternate;
  margin-left: 1rem;
}
@keyframes flash {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0.5;
  }
}
.progress-transition .van-progress__portion {
  transition: width 0.5s ease;
}

.close-icon-checkAnswer {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 24px;
  color: black;
  cursor: pointer;
  font-size: 15px;
}
.dialog-content {
  margin: 20px;
  font-size: 14px;
  text-align: center;
}
.custom-button-checkAnswer-group {
  display: flex;
}

.container {
  overflow: visible; /* 确保弹幕不会被裁剪 */
  width: 100%;
  margin: 0 auto;
  padding: 0;
}

.nav-bar-container {
  position: sticky;
  top: 0;
  z-index: 100;
}
.stars {
  position: fixed;
  top: 40%;
  left: 65%;
  transform: translate(-50%, -50%);
  display: flex; /* 使用flex布局让星星横向排列 */
  gap: 20px; /* 星星之间的间距 */
}

.star {
  transform: scale(0); /* 开始时大小为0 */
  font-size: 5rem; /* 星星的基础大小 */
  color: gold;
  opacity: 0; /* 开始时透明度为0 */
  animation: starFadeInOut 5s forwards; /* 动画名称，持续时间，以及动画结束时的状态 */
}

@keyframes starFadeInOut {
  0%,
  100% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1); /* 中间状态最大 */
    opacity: 1;
  }
}

.custom-dark-dialog .van-dialog__message {
  color: red; /* 设置内容颜色 */
  font-weight: 700;
}
.custom-dark-dialog .van-dialog__header {
  background-color: white; /* 设置暗黑色背景 */
}

.custom-dark-dialog .van-dialog__footer {
  border-top-color: #444; /* 设置底部边框颜色为暗色 */
  background-color: gray; /* 设置暗黑色背景 */
}
.custom-container {
  display: flex;
  justify-content: flex-start; /* 改为靠左 */
  gap: 10px; /* 自定义中间间距，想多小就多小 */
  background-color: #fff; /* 设置背景颜色为白色或其他浅色 */
  border-radius: 8px; /* 轻微圆角效果 */
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.2); /* 应用阴影效果 */
  margin: 10px auto; /* 为了更好的视觉效果和空间感，添加外边距，并居中对齐 */
  padding: 20px 15px 20px 10px;
  transition: box-shadow 0.3s ease; /* 平滑过渡效果 */
  width: 93.5%; /* 设置宽度为屏幕的94% */
  font-size: 13px;
}

.custom-cell {
  display: flex;
  justify-content: space-between;
  background-color: #fff; /* 设置背景颜色为白色或其他浅色 */
  border-radius: 8px; /* 轻微圆角效果 */
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.2); /* 应用阴影效果 */
  margin: 10px auto; /* 为了更好的视觉效果和空间感，添加外边距，并居中对齐 */
  padding: 15px 10px; /* 增加内边距，使内容与边框有一定距离 */
  transition: box-shadow 0.3s ease; /* 平滑过渡效果 */
  width: 94%; /* 设置宽度为屏幕的95% */
  font-size: 13px;
}
.swipe-undone {
  color: #1a89fa;
}

/* ─── 冰封容器 ─────────────────────────────────────── */
.ice-frozen {
  position: relative;
  overflow: hidden;
  background: linear-gradient(
    135deg,
    #e8f6ff 0%,
    #d4eeff 30%,
    #e0f4ff 60%,
    #cce8ff 100%
  ) !important;
  border: 1px solid rgba(140, 210, 255, 0.5) !important;
  box-shadow: 0 2px 12px rgba(80, 180, 255, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.8),
    inset 0 -1px 0 rgba(140, 210, 255, 0.3) !important;
}

/* ─── 慢速主光带（::before 独占） ───────────────────── */
.ice-frozen::before {
  content: "";
  position: absolute;
  /* 比容器更高更宽，配合 skew 不留白边 */
  top: -20%;
  left: -100%;
  width: 60%;
  height: 140%;
  pointer-events: none;
  z-index: 10;
  background: linear-gradient(
    to right,
    transparent 0%,
    rgba(255, 255, 255, 0) 10%,
    rgba(220, 245, 255, 0.25) 40%,
    rgba(255, 255, 255, 0.55) 50%,
    rgba(220, 245, 255, 0.25) 60%,
    rgba(255, 255, 255, 0) 90%,
    transparent 100%
  );
  transform: skewX(-15deg);
  animation: ice-sweep-slow 5s ease-in-out infinite;
}

@keyframes ice-sweep-slow {
  0% {
    left: -100%;
  }
  100% {
    left: 160%;
  }
}

/* ─── 快速细光条（::after 独占） ────────────────────── */
.ice-frozen::after {
  content: "";
  position: absolute;
  top: -20%;
  left: -60%;
  width: 30%;
  height: 140%;
  pointer-events: none;
  z-index: 11;
  background: linear-gradient(
    to right,
    transparent 0%,
    rgba(255, 255, 255, 0) 20%,
    rgba(200, 240, 255, 0.3) 45%,
    rgba(255, 255, 255, 0.7) 50%,
    rgba(200, 240, 255, 0.3) 55%,
    rgba(255, 255, 255, 0) 80%,
    transparent 100%
  );
  transform: skewX(-20deg);
  animation: ice-sweep-fast 2.8s ease-in-out 0.4s infinite;
}

@keyframes ice-sweep-fast {
  0% {
    left: -60%;
    opacity: 0;
  }
  15% {
    opacity: 1;
  }
  85% {
    opacity: 1;
  }
  100% {
    left: 130%;
    opacity: 0;
  }
}

/* ─── 棱镜彩虹 + 星形闪光（van-cell 内的 span 子元素） ─ */
/* 因为伪元素只有两个，第三四层用子元素 */
.ice-frozen .ice-layer-prism {
  position: absolute;
  top: -20%;
  left: -80%;
  width: 45%;
  height: 140%;
  pointer-events: none;
  z-index: 9;
  background: linear-gradient(
    to right,
    transparent,
    rgba(180, 220, 255, 0.1) 30%,
    rgba(200, 255, 240, 0.08) 45%,
    rgba(220, 240, 255, 0.15) 50%,
    rgba(180, 210, 255, 0.1) 65%,
    transparent
  );
  transform: skewX(-10deg);
  animation: ice-sweep-prism 7s ease-in-out 1.2s infinite;
}

@keyframes ice-sweep-prism {
  0% {
    left: -80%;
  }
  50% {
    left: 140%;
  }
  100% {
    left: -80%;
  }
}

.ice-frozen .ice-layer-glint {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 12;
  background: radial-gradient(
      circle at 18% 40%,
      rgba(255, 255, 255, 0.95) 0px,
      rgba(220, 245, 255, 0.4) 2px,
      transparent 7px
    ),
    radial-gradient(
      circle at 72% 25%,
      rgba(255, 255, 255, 0.9) 0px,
      rgba(200, 240, 255, 0.3) 2px,
      transparent 5px
    ),
    radial-gradient(
      circle at 45% 70%,
      rgba(255, 255, 255, 0.85) 0px,
      rgba(210, 242, 255, 0.3) 1px,
      transparent 5px
    ),
    radial-gradient(
      circle at 88% 55%,
      rgba(255, 255, 255, 0.9) 0px,
      rgba(220, 245, 255, 0.3) 2px,
      transparent 6px
    );
  animation: ice-glint 3.5s ease-in-out infinite;
}

@keyframes ice-glint {
  0% {
    opacity: 0.3;
  }
  25% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
  75% {
    opacity: 0.95;
  }
  100% {
    opacity: 0.3;
  }
}

/* ─── 文字层级置顶 ───────────────────────────────────── */
.ice-frozen .van-cell__title,
.ice-frozen .van-cell__value,
.ice-frozen .van-cell__label {
  color: #2a7abf;
  position: relative;
  z-index: 13;
}

@media (max-width: 768px) {
  .custom-container {
    width: 92.5%;
  }
  .custom-cell {
    width: 95%;
  }
}

@media (max-width: 430px) {
  .custom-container {
    width: 90.5%;
  }
  .custom-cell {
    width: 95%;
  }
}

.pin-background {
  background-color: rgba(245, 245, 245, 0.5); /* 浅灰色背景 */
  background-image: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 2px,
    rgba(200, 200, 200, 0.1) 5px,
    /* 更浅的灰色线条 */ rgba(245, 245, 245, 0.5) 10px /* 浅灰色交错 */
  );
}

.van-dropdown-menu {
  --van-dropdown-menu-height: 40px;
  --van-dropdown-menu-shadow: 0 0 0 0;
  --van-dropdown-menu-background: transparent;
  width: 20%;
  margin-bottom: -0.5rem;
  margin-top: -0.5rem;
}
.van-dropdown-menu__title {
  padding-left: 0.3rem;
  background-color: transparent;
  font-size: 13px !important;
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
.van-badge {
  z-index: 9999; /* 确保 badge 位于其他元素之上 */
}

.dailyFloat.van-floating-bubble {
  z-index: 10000; /* 提高 floating bubble 层级 */
}
.bubble-container {
  position: relative;
  display: inline-block;
}

/* 乱序 */
.shuffle-move {
  transition: transform 0.8s cubic-bezier(0.68, -0.55, 0.27, 1.55),
    opacity 0.8s ease;
}

/* 进入动画：从下方飞入并放大 */
.shuffle-enter-active {
  transition: all 0.8s ease;
}
.shuffle-enter-from {
  opacity: 0;
  transform: translateY(60px) scale(0.6) rotate(-10deg);
}

/* 离开动画：往上飞出并缩小 */
.shuffle-leave-active {
  transition: all 0.8s ease;
  position: absolute;
}
.shuffle-leave-to {
  opacity: 0;
  transform: translateY(-60px) scale(0.6) rotate(10deg);
}

/* 日历连胜 */
.week-calendar {
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 0px 0;
  background-color: #fff;
  border-bottom: 1px solid #ebedf0;
}

.calendar-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 45px;
  height: 60px;
  position: relative;
}

.week-flower-indicator {
  position: relative;
  top: 3px;
  bottom: 2px;
  right: px; /* 距离右侧 2px */
  font-size: 8px; /* 增大字体，让emoji更明显 */
  line-height: 0.2;
}

/* 可选：给有花的日期添加背景色或边框 */
.calendar-day.has-flower {
  background-color: rgba(255, 192, 203, 0.1); /* 淡粉色背景 */
}
.week-text {
  font-size: 12px;
  color: #969799;
  margin-bottom: 2px;
}

.date-text {
  font-size: 16px;
  color: #323233;
  font-weight: 500;
}

.calendar-day.active .week-text,
.calendar-day.active .date-text {
  color: #1989fa;
}

.today-dot {
  width: 4px;
  height: 4px;
  background-color: #1989fa;
  border-radius: 50%;
  position: absolute;
  bottom: 8px;
}

/* 本周完成时，所有日期变金色 */
/* 浅黄色（complete_state = 1） */
.calendar-day.week-complete-1::before {
  content: "";
  position: absolute;
  top: 0.35rem;
  left: 0;
  right: 0;
  bottom: 0.2rem;
  background: linear-gradient(135deg, #fff9cc 0%, #ffe680 100%);
  border-radius: 8px;
}

.calendar-day.week-complete-1 .week-text,
.calendar-day.week-complete-1 .date-text {
  color: #a67c00;
  position: relative;
  z-index: 1;
}

/* 金色（complete_state = 2） */
.calendar-day.week-complete-2::before {
  content: "";
  position: absolute;
  top: 0.35rem;
  left: 0;
  right: 0;
  bottom: 0.2rem;
  background: linear-gradient(135deg, #ffd700 0%, #ffa500 100%);
  border-radius: 8px;
}

.calendar-day.week-complete-2 .week-text,
.calendar-day.week-complete-2 .date-text {
  color: #8b4513;
  position: relative;
  z-index: 1;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.3);
}

/* 自定义日历样式 */
.custom-calendar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center; /* 改为 center，让日历垂直居中 */
  justify-content: center;
  z-index: 999;
  padding: 20px; /* 减少上下padding */
}

.custom-calendar {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 400px;
  max-height: 80vh; /* 限制最大高度为视口的85% */
  display: flex; /* 使用 flex 布局 */
  flex-direction: column;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
  flex-shrink: 0; /* 防止被压缩 */
  background: white;
}

.title-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.calendar-title {
  font-size: 16px;
  font-weight: bold;
  color: #323233;
}

.calendar-subtitle {
  font-size: 12px;
  color: #576b95;
  background: #ecf5ff;
  padding: 2px 8px;
  border-radius: 10px;
  cursor: pointer;
  display: inline-block;
}

.calendar-subtitle:hover {
  background: #d9ecff;
}

.calendar-subtitle:active {
  background: #c6e2ff;
}

.close-btn {
  font-size: 24px;
  color: #969799;
  cursor: pointer;
  line-height: 1;
}

.calendar-body {
  padding: 12px 12px 12px 12px;
  overflow-y: auto; /* 添加垂直滚动 */
  flex: 1; /* 占据剩余空间 */
  min-height: 0; /* 重要：允许 flex 子元素收缩 */
}

.month-section {
  margin-top: 16px;
}

.month-title {
  font-size: 14px;
  font-weight: bold;
  color: #323233;
  padding: 8px 4px;
}

.weekday-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 4px;
}

.weekday-cell {
  text-align: center;
  font-size: 12px;
  color: #969799;
  padding: 8px 0;
}

.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.day-cell {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
}

.day-cell.empty {
  cursor: default;
}

.day-cell:not(.empty):hover {
  background: #f7f8fa;
}

.day-cell.complete-week-1,
.day-cell.complete-week-2 {
  background: linear-gradient(135deg, #ffd700 0%, #ffa500 100%);
}

.day-cell.complete-week-1 .day-number,
.day-cell.complete-week-2 .day-number {
  color: #8b4513;
  font-weight: bold;
}

.day-cell.today {
  border: 1px solid #1989fa;
}

.day-number {
  font-size: 14px;
  color: #323233;
}

.today-indicator {
  position: absolute;
  bottom: 4px;
  width: 4px;
  height: 4px;
  background: #1989fa;
  border-radius: 50%;
}

.day-cell.complete-week-1 .today-indicator,
.day-cell.complete-week-2 .today-indicator {
  background: #8b4513;
}

.calendar-footer {
  padding: 12px 20px;
  border-top: 1px solid #eee;
  flex-shrink: 0; /* 防止被压缩 */
  background: white;
}

.confirm-btn {
  width: 100%;
  padding: 12px;
  background: #1989fa;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
}

.convert-btn:active {
  background: rgb(116, 183, 16);
}
.convert-btn {
  width: 100%;
  padding: 12px;
  background: rgb(116, 183, 16);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  margin-bottom: 0.2rem;
}

.confirm-btn:active {
  background: #1677d1;
}

/* ✅ 浅黄色（完成一半 complete_state = 1） */
.day-cell.complete-week-1 {
  background: linear-gradient(135deg, #fff9cc 0%, #ffe680 100%);
}

.day-cell.complete-week-1 .day-number {
  color: #a67c00;
  font-weight: bold;
}

/* ✅ 金色（完全完成 complete_state = 2） */
.day-cell.complete-week-2 {
  background: linear-gradient(135deg, #ffd700 0%, #ffa500 100%);
}

.day-cell.complete-week-2 .day-number {
  color: #8b4513;
  font-weight: bold;
}

/* 淡入 + 从下滑入的动画 */
.calendar-fade-enter-active,
.calendar-fade-leave-active {
  transition: all 0.3s ease;
}

.calendar-fade-enter-from,
.calendar-fade-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

.calendar-fade-enter-to,
.calendar-fade-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.flower-indicator {
  font-size: 0.8em;
}

.revview-button-group {
  width: 90%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 0.6rem auto 1rem;
}

.revview-button-group .review-btn-skip {
  flex: 1;
}

.revview-button-group .review-btn-start {
  flex: 3;
}

/* 回顾按钮 */
/* 按钮外壳设置 */
.liquid-btn {
  position: relative;
  overflow: hidden; /* 核心：切掉溢出的“水” */
  background-color: #fff3eb; /* 空状态时的浅橙色底色 */
  border: 2px solid #ff976a !important; /* 外围橙色边框 */
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 按钮文字层 */
.btn-text {
  position: relative;
  z-index: 10;
  font-size: 15px;
  font-weight: bold;
  transition: color 0.4s ease; /* 变色过渡 */
}

/* 水波容器组 */
.water-group {
  position: absolute;
  left: -50%;
  /* 魔法高度公式：0%时水落下，100%时水淹没顶部 */
  top: calc(130% - (var(--progress) * 1.5));
  width: 200%;
  height: 200%;
  z-index: 1;
  /* 水面升降的平滑动画 */
  transition: top 1.5s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 两个水波共用属性 */
.water-layer {
  position: absolute;
  width: 100%;
  height: 100%;
  transform-origin: center center;
}

/* 第一层深色主水波 */
.water-layer1 {
  background-color: #ff976a; /* 你的主题橙色 */
  border-radius: 38%;
  animation: liquid-spin 4s linear infinite;
}

/* 第二层浅色辅水波，用来制造 3D 景深交错感 */
.water-layer2 {
  background-color: rgba(255, 151, 106, 0.5); /* 半透明橙色 */
  border-radius: 42%;
  animation: liquid-spin 6s linear infinite;
}

/* 无限旋转动画 */
@keyframes liquid-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
/* 心碎状态下的按钮外壳 */
.liquid-btn.is-broken {
  background-color: #ebedf0 !important; /* Vant 标准灰色背景 */
  border: 2px solid #c8c9cc !important; /* 灰色边框 */
  cursor: not-allowed;
  opacity: 1; /* 覆盖 disabled 默认的半透明 */
}

/* 心碎内容容器 */
.broken-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1.2;
}

.broken-heart {
  font-size: 18px;
  filter: grayscale(100%); /* 让心碎图标也带上灰色调 */
  margin-bottom: 2px;
}

.broken-text {
  font-size: 11px;
  color: #969799;
  font-weight: normal;
}

/* 确保水波纹在心碎状态下不显示 (虽然 v-if 已经处理，但这能防止切换瞬间的闪烁) */
.is-broken .water-group {
  display: none;
}

/* --- 以下是你之前的原有样式，保持不变 --- */
.liquid-btn {
  position: relative;
  overflow: hidden;
  background-color: #fff3eb;
  border: 2px solid #ff976a !important;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-text {
  position: relative;
  z-index: 10;
  font-size: 15px;
  font-weight: bold;
  transition: color 0.4s ease;
}
.water-group {
  position: absolute;
  left: -50%;
  top: calc(130% - (var(--progress) * 1.5));
  width: 200%;
  height: 200%;
  z-index: 1;
  transition: top 1.5s cubic-bezier(0.4, 0, 0.2, 1);
}
.water-layer {
  position: absolute;
  width: 100%;
  height: 100%;
  transform-origin: center center;
}
.water-layer1 {
  background-color: #ff976a;
  border-radius: 38%;
  animation: liquid-spin 4s linear infinite;
}
.water-layer2 {
  background-color: rgba(255, 151, 106, 0.5);
  border-radius: 42%;
  animation: liquid-spin 6s linear infinite;
}
@keyframes liquid-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.review-btn-container {
  display: flex;
  flex-direction: column; /* 垂直排列 */
  align-items: center; /* 水平居中 */
  /* 如果你需要调整整个模块的位置，可以修改这里的 margin */
  margin-left: 0.5rem;
  margin-top: 0.2rem;
}

/* --- 美化提示文字 --- */
.penalty-warning {
  margin-top: 8px; /* 与按钮保持一点呼吸感距离 */
  font-size: 11px; /* 字体小一点，作为辅助信息 */
  color: #ee0a24; /* 使用 Vant 的警告红，或者 #ff976a (你的主题橙色) */
  font-weight: 500;
  text-align: center;
  background-color: #fef0f0; /* 非常淡的红色背景，增加警示感 */
  padding: 2px 6px; /* 加一点内边距让它看起来像个小标签 */
  border-radius: 4px; /* 圆角边框 */
  letter-spacing: 0.5px; /* 稍微增加字间距，更易读 */
  box-shadow: 0 1px 2px rgba(238, 10, 36, 0.1); /* 微微的红色阴影 */
  /* 如果不需要背景和小标签样式，只需要纯文字，把 background, padding, border-radius, box-shadow 删掉即可 */
}

/* 轮播图内冰封效果 - 改为浅红色调 */
.my-swipe .ice-frozen {
  background: linear-gradient(
    135deg,
    #fff0f0 0%,
    #ffe4e4 30%,
    #fff0f0 60%,
    #ffd6d6 100%
  ) !important;
  border: 1px solid rgba(255, 140, 140, 0.5) !important;
  box-shadow: 0 2px 12px rgba(255, 80, 80, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.8),
    inset 0 -1px 0 rgba(255, 140, 140, 0.3) !important;
}

.my-swipe .ice-frozen::before {
  background: linear-gradient(
    to right,
    transparent 0%,
    rgba(255, 255, 255, 0) 10%,
    rgba(255, 220, 220, 0.25) 40%,
    rgba(255, 255, 255, 0.55) 50%,
    rgba(255, 220, 220, 0.25) 60%,
    rgba(255, 255, 255, 0) 90%,
    transparent 100%
  );
}

.my-swipe .ice-frozen::after {
  background: linear-gradient(
    to right,
    transparent 0%,
    rgba(255, 255, 255, 0) 20%,
    rgba(255, 200, 200, 0.3) 45%,
    rgba(255, 255, 255, 0.7) 50%,
    rgba(255, 200, 200, 0.3) 55%,
    rgba(255, 255, 255, 0) 80%,
    transparent 100%
  );
}

.my-swipe .ice-frozen .ice-layer-prism {
  background: linear-gradient(
    to right,
    transparent,
    rgba(255, 180, 180, 0.1) 30%,
    rgba(255, 200, 200, 0.08) 45%,
    rgba(255, 220, 220, 0.15) 50%,
    rgba(255, 180, 180, 0.1) 65%,
    transparent
  );
}

.my-swipe .ice-frozen .ice-layer-glint {
  background: radial-gradient(
      circle at 18% 40%,
      rgba(255, 255, 255, 0.95) 0px,
      rgba(255, 220, 220, 0.4) 2px,
      transparent 7px
    ),
    radial-gradient(
      circle at 72% 25%,
      rgba(255, 255, 255, 0.9) 0px,
      rgba(255, 200, 200, 0.3) 2px,
      transparent 5px
    ),
    radial-gradient(
      circle at 45% 70%,
      rgba(255, 255, 255, 0.85) 0px,
      rgba(255, 210, 210, 0.3) 1px,
      transparent 5px
    ),
    radial-gradient(
      circle at 88% 55%,
      rgba(255, 255, 255, 0.9) 0px,
      rgba(255, 220, 220, 0.3) 2px,
      transparent 6px
    );
}

.my-swipe .ice-frozen .van-cell__title,
.my-swipe .ice-frozen .van-cell__value,
.my-swipe .ice-frozen .van-cell__label {
  color: #000000;
}
.my-swipe .ice-frozen div {
  color: #00000063 !important;
}
.my-swipe .ice-frozen .van-tag {
  color: #00000063 !important;
}
.blue-swipe {
  margin-bottom: 12px;
}
.blue-swipe .blue-complete {
  background: linear-gradient(145deg, #4f9cff, #2f80ed);
}
.blue-swipe .ice-frozen {
  background: linear-gradient(
    135deg,
    #eef7ff 0%,
    #d8edff 34%,
    #f4fbff 62%,
    #b9dcff 100%
  ) !important;
  border: 1px solid rgba(80, 158, 235, 0.5) !important;
  box-shadow: 0 10px 24px rgba(76, 145, 220, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.85),
    inset 0 -1px 0 rgba(80, 158, 235, 0.24) !important;
}
.blue-swipe .ice-frozen::before {
  background: linear-gradient(
    to right,
    transparent 0%,
    rgba(255, 255, 255, 0) 10%,
    rgba(210, 235, 255, 0.32) 40%,
    rgba(255, 255, 255, 0.68) 50%,
    rgba(210, 235, 255, 0.32) 60%,
    rgba(255, 255, 255, 0) 90%,
    transparent 100%
  );
}
.blue-swipe .ice-frozen::after {
  background: linear-gradient(
    to right,
    transparent 0%,
    rgba(255, 255, 255, 0) 20%,
    rgba(160, 215, 255, 0.38) 45%,
    rgba(255, 255, 255, 0.72) 50%,
    rgba(160, 215, 255, 0.38) 55%,
    rgba(255, 255, 255, 0) 80%,
    transparent 100%
  );
}
.blue-swipe .ice-frozen .ice-layer-prism {
  background: linear-gradient(
    to right,
    transparent,
    rgba(135, 200, 255, 0.14) 30%,
    rgba(185, 225, 255, 0.12) 45%,
    rgba(225, 245, 255, 0.2) 50%,
    rgba(135, 200, 255, 0.14) 65%,
    transparent
  );
}
.blue-swipe .ice-frozen .ice-layer-glint {
  background: radial-gradient(
      circle at 18% 40%,
      rgba(255, 255, 255, 0.95) 0px,
      rgba(205, 235, 255, 0.48) 2px,
      transparent 7px
    ),
    radial-gradient(
      circle at 72% 25%,
      rgba(255, 255, 255, 0.9) 0px,
      rgba(170, 220, 255, 0.38) 2px,
      transparent 5px
    ),
    radial-gradient(
      circle at 45% 70%,
      rgba(255, 255, 255, 0.85) 0px,
      rgba(190, 230, 255, 0.36) 1px,
      transparent 5px
    ),
    radial-gradient(
      circle at 88% 55%,
      rgba(255, 255, 255, 0.9) 0px,
      rgba(205, 235, 255, 0.38) 2px,
      transparent 6px
    );
}
.blue-swipe .blue-incomplete {
  background: linear-gradient(
    145deg,
    rgba(129, 190, 255, 0.38),
    rgba(92, 170, 255, 0.2)
  );
  border: 1px solid rgba(116, 184, 255, 0.46);
  color: rgba(255, 255, 255, 0.86);
}
.blue-swipe .blue-incomplete .van-tag {
  background: rgba(255, 255, 255, 0.14) !important;
}
.custom-indicator {
  position: absolute;
  right: 15px;
  bottom: 30px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(4px);
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
  letter-spacing: 1px;
  z-index: 20;
}
/* 滑动提示箭头 */
.custom-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  /* 你原有的颜色/背景/圆角等样式保持不变 */
}

.swipe-hint-arrow {
  display: flex;
  align-items: center;
  gap: 2px;
  opacity: 0.85;
}

/* 动画部分不变 */
.swipe-hint-arrow .van-icon:nth-child(1) {
  animation: swipe-bounce 1.2s ease-in-out infinite;
  animation-delay: 0s;
}
.swipe-hint-arrow .van-icon:nth-child(2) {
  animation: swipe-bounce 1.2s ease-in-out infinite;
  animation-delay: 0.15s;
}
.swipe-hint-arrow .van-icon:nth-child(3) {
  animation: swipe-bounce 1.2s ease-in-out infinite;
  animation-delay: 0.3s;
}

@keyframes swipe-bounce {
  0%,
  100% {
    transform: translateX(0);
    opacity: 0.3;
  }
  50% {
    transform: translateX(5px);
    opacity: 1;
  }
}

/* Peek 效果：让轨道可见，露出下一张卡片 */
.peek-swipe .van-swipe__track {
  overflow: visible !important;
}

/* 未激活的卡片稍微缩小，增强层次感 */
.peek-swipe .van-swipe-item {
  transition: transform 0.3s ease, opacity 0.3s ease;
  opacity: 0.6;
  transform: scale(0.95);
}

/* 当前激活卡片正常大小、完全不透明 */
.peek-swipe .van-swipe-item.active-peek {
  opacity: 1;
  transform: scale(1);
}
</style>
