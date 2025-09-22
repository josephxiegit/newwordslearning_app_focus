<script setup>
import {
  watch,
  onMounted,
  onUnmounted,
  ref,
  getCurrentInstance,
  computed,
  nextTick,
  onBeforeUnmount,
  inject,
} from "vue";
import {
  showFailToast,
  showDialog,
  showConfirmDialog,
  showLoadingToast,
  showToast,
} from "vant";

import { useIntervalFn } from "@vueuse/core";
import { useRouter } from "vue-router";
import submitloading from "./submitloading.vue";
import half from "./half.vue";
import halfSound from "../assets/sound/half.mp3";

import swipeEncouragementSrcGoatAndWolf from "../assets/swipeEncouragement.gif";
import swipeEncouragementSrcGoatAndWolf2 from "../assets/swipeEncouragement2.gif";
import swipeEncouragementBears from "../assets/Boonie Bears/swipeEncouragement.gif";
import swipeEncouragementBears2 from "../assets/Boonie Bears/swipeEncouragement2.gif";

const flagTheme = inject("flagTheme");
const router = useRouter();
const instance = getCurrentInstance();
const axios = instance.appContext.config.globalProperties.$ajax;
const isLoading = ref(false);

const synonymsOptions = ref([]);
const synonymsSelected = ref([]);
const answers = ref([]);
const checkboxRefs = ref([]);
const nid = ref("");

// 半程奖励
const halfRef = ref(null);
const animationhalfVisible = ref(false);
let currentHalfAudio = null;

function showAnimationhalf(callback) {
  showFlagText.value = false;
  // 如果之前有音频在播放，先停止它
  if (currentHalfAudio) {
    currentHalfAudio.pause();
    currentHalfAudio = null;
  }

  currentHalfAudio = new Audio(halfSound);
  currentHalfAudio.volume = 0.3;
  currentHalfAudio.addEventListener("ended", () => {
    if (currentHalfAudio) {
      currentHalfAudio.volume = 1.0; // 恢复到原始音量
    }
  });
  currentHalfAudio.play().catch((err) => {
    console.warn("播放失败：", err);
  });

  if (halfRef.value.visible) {
    halfRef.value.hide();
  } else {
    pause();
    // 创建一个包装回调，在动画显示时停止音频
    const wrappedCallback = callback
      ? () => {
          // 停止音频
          if (currentHalfAudio) {
            currentHalfAudio.pause();
            currentHalfAudio.currentTime = 0; // 重置播放位置
            currentHalfAudio = null;
          }
          // 执行原始回调
          callback();
        }
      : () => {
          // 即使没有回调，也要停止音频
          if (currentHalfAudio) {
            currentHalfAudio.pause();
            currentHalfAudio.currentTime = 0;
            currentHalfAudio = null;
          }
        };

    halfRef.value.show(wrappedCallback);
  }
  animationhalfVisible.value = !animationhalfVisible.value;
}

// 拼写tag
const selectedItems = ref([]);
const removeSelected = (index) => {
  const selectedItem = selectedItems.value[index];
  const [i, j] = selectedItem.key.split("-").map(Number);

  // 移除selectedItems中的项
  selectedItems.value.splice(index, 1);

  // 同步更新复选框状态
  if (checkboxRefs.value[selectedItem.key]) {
    checkboxRefs.value[selectedItem.key].toggle();
  }

  // 更新selectedIndexes和selectedResults
  selectedIndexes.value[selectedItem.key] = false;
  const removeChinese = synonymsOptions.value[i].中文[j];
  const removeIndex = selectedResults.value[i].indexOf(removeChinese);

  if (removeIndex !== -1) {
    selectedResults.value[i].splice(removeIndex, 1);
  }

  // 更新合并后的数据
  mergedData.value = mergeAnswerAndSynonym();

  // 将用户选择转化为中文
  const synonymsSelectedChinese = convertSelections(
    synonymsSelected.value,
    synonymsOptions.value
  );

  // 将中文用户选择和选项答案合并
  resultDataTempt.value = mergeSynonymAndSelections(synonymsSelectedChinese);
};

// 提交按钮
const showDialogSubmit = ref(false);
const mergedData = ref([]);

const mergeSynonymAndSelections = (synonymsSelectedChinese) => {
  return mergedData.value.map((item) => {
    const 用户选择 = synonymsSelectedChinese[item.序号 - 1].中文;
    return {
      ...item,
      用户选择,
    };
  });
};
const mergeAnswerAndSynonym = () => {
  let newList = [];
  for (let i = 0; i < synonymsOptions.value.length; i++) {
    let obj = {};
    obj["序号"] = synonymsOptions.value[i].序号;
    obj["中文"] = synonymsOptions.value[i].中文;
    obj["英文"] = synonymsOptions.value[i].英文;
    obj["is_spell"] = synonymsOptions.value[i].is_spell;
    obj["答案"] = answers.value[i].中文;
    obj["正确答案"] = answers.value[i].正确答案;
    obj["排除"] = synonymsOptions.value[i].排除;
    newList.push(obj);
  }
  // console.log("newList: ", newList);
  return newList;
};
const convertSelections = (synonymsSelected, synonymsOptions) => {
  const resultMap = new Map();

  synonymsOptions.forEach((option) => {
    resultMap.set(option.序号, ["无"]); // 初始标记为“无”
  });

  synonymsSelected.forEach((selection) => {
    const [dictNumber, chineseIndex] = selection.split("-").map(Number);
    const dictEntry = synonymsOptions.find((item) => item.序号 === dictNumber);
    if (dictEntry) {
      const chineseWord = dictEntry.中文[chineseIndex - 1];
      if (resultMap.get(dictNumber)[0] === "无") {
        resultMap.set(dictNumber, [chineseWord]);
      } else {
        resultMap.get(dictNumber).push(chineseWord);
      }
    }
  });

  // 将Map转换为所需的数组格式
  return Array.from(resultMap, ([序号, 中文]) => ({ 序号, 中文 })).sort(
    (a, b) => a.序号 - b.序号
  ); // 确保结果是按序号排序的
};

const compareAndAddFlag = (dictArray) => {
  // console.log("dictArray: ", dictArray);
  return dictArray.map((item) => {
    const { 答案, 用户选择, 正确答案, is_spell, 排除, 英文, 序号 } = item;

    // 统一处理分隔符，将所有中文分号和逗号替换为英文逗号，然后进行分割和修整
    const normalize = (str) =>
      str
        .replace(/；/g, ",")
        .replace(/，/g, ",")
        .split(",")
        .map((s) => s.trim());

    // 定义原来的处理逻辑
    const answerArray = normalize(答案).sort();
    const correctAnswerArray = 正确答案 ? normalize(正确答案).sort() : [];
    const userSelectionArray = normalize(用户选择.join(",")).sort();

    let flag = "false"; // 默认为没有匹配

    if (is_spell) {
      // 当 is_spell 为 true 时，使用新的逻辑
      const userSelectionString = 用户选择.join("").replace(/\s/g, "");
      const correctAnswerString = 正确答案.replace(/\s/g, "");

      if (userSelectionString === correctAnswerString) {
        flag = "true";
      } else {
        flag = "false";
      }
    } else if (排除 == "手写") {
      if (
        Array.isArray(handwriteAnswers.value) &&
        handwriteAnswers.value.length > 0
      ) {
        const answerObj = handwriteAnswers.value.find(
          (ans) => ans.序号 === 序号
        );
        if (answerObj && answerObj.英文) {
          const cleanedInput = answerObj.英文
            .replace(/[^a-zA-Z]/g, "")
            .toLowerCase();
          const cleanedTarget =
            英文?.replace(/[^a-zA-Z]/g, "").toLowerCase() || "";

          // 将手写答案赋值给 item.用户选择（以便后续可追踪）
          item.用户选择 = [answerObj.英文];

          if (cleanedInput && cleanedInput === cleanedTarget) {
            flag = "true";
          }
        }
      }
    } else {
      // 原有的逻辑
      // 完全匹配：用户选择和答案（或正确答案）完全一致
      if (
        userSelectionArray.join(",") === answerArray.join(",") ||
        (correctAnswerArray.length &&
          userSelectionArray.join(",") === correctAnswerArray.join(","))
      ) {
        flag = "true";
      }
      // 如果答案为“以上都不对”，且用户选择与正确答案完全匹配
      else if (
        答案 === "以上都不对" &&
        correctAnswerArray.length &&
        userSelectionArray.join(",") === correctAnswerArray.join(",")
      ) {
        flag = "true";
      }
      // 部分匹配：用户选择数组至少包含一个答案数组中的元素
      else if (answerArray.some((ans) => userSelectionArray.includes(ans))) {
        if (答案 == 用户选择) {
          flag = "true";
        } else {
          flag = "half";
        }
      }
    }

    // 返回结果
    return {
      ...item,
      flag,
    };
  });
};

const totalCoins = ref(0);
const clickSubmitUser = async (action, done) => {
  // 显示倒计时并等待完成
  await startCountdownSubmit();

  // 直接提交
  showDialogSubmit.value = false;
  mergedData.value = mergeAnswerAndSynonym();

  // 将用户选择转化为中文
  const synonymsSelectedChinese = convertSelections(
    synonymsSelected.value,
    synonymsOptions.value
  );

  // 将中文用户选择和选项答案合并
  const synonymAndSelections = mergeSynonymAndSelections(
    synonymsSelectedChinese
  );

  // 比对结果给出flag
  const compareResult = compareAndAddFlag(synonymAndSelections);
  console.log("compareResult: ", compareResult);

  // 计算金币
  function calculateAccuracy(compareResult) {
    const total = compareResult.length;
    const correct = compareResult.filter((item) => item.flag === "true").length;
    return ((correct / total) * 100).toFixed(2);
  }
  if (isRewardEligible.value) {
    if (calculateAccuracy(compareResult) < 70) {
      totalCoins.value = 0;
    } else {
      totalCoins.value = compareResult.reduce((coins, item) => {
        return item.flag === "true" ? coins + 12 : coins;
      }, 0);
    }
  } else {
    totalCoins.value = 0;
  }

  function checkFlags(compareResult) {
    let halfCount = 0;
    let trueCount = 0;

    for (const item of compareResult) {
      if (item.flag !== "true" && item.flag !== "half") {
        return { result: 0, flagGoden: false };
      }
      if (item.flag === "true") {
        trueCount++;
      } else if (item.flag === "half") {
        halfCount++;
        if (halfCount > 3) {
          return { result: 0, flagGoden: false };
        }
      }
    }

    // 判断 flagGoden：所有item.flag都为"true"且teacherMark.value为null
    const allTrue = trueCount === compareResult.length;
    const flagGoden = allTrue && teacherMark.value === null;

    if (allTrue) {
      return { result: 1.5, flagGoden };
    }
    return {
      result: halfCount <= 3 ? 0.5 : false,
      flagGoden: false,
    };
  }
  const { result: rate, flagGoden } = checkFlags(compareResult);
  console.log("flagGoden: ", flagGoden);
  console.log("rate: ", rate);
  const type = Number(remainingSeconds.value) == 8 ? 0 : 1;
  // console.log('type', type);

  async function submitAccountDataChallenge() {
    // 更新AccountData
    let params = new URLSearchParams();
    params.append("method", "submitAccountDataChallenge");
    params.append("submittoken", submittoken.value);
    params.append("nid", nid.value);
    params.append("nidSubmit", nidSubmit.value);
    params.append("rate", rate);
    params.append("flagGoden", flagGoden ? "1" : "0");
    params.append("swipe", 1);
    params.append("type", type);
    params.append("coins", totalCoins.value);

    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }

  // 计算得到多少新coins
  const newCoins = totalCoins.value;
  // console.log("newCoins: ", newCoins);
  function redirect(accountDataResult) {
    sessionStorage.removeItem(`logSubmitted_${nid.value}`);
    router.push({
      path: "/studentAccountAnswerChallenge",
      state: {
        compareResult: JSON.stringify(compareResult),
        userSelected: JSON.stringify(synonymsSelected.value),
        nid: nid.value,
        rate: accountDataResult.rate,
        halfTrue: rate,
        newCoins: newCoins,
        username: username.value,
        account_log_id: nidSubmit.value,
        complement: 1.5 - rate,
        RateOrigin: RateOrigin.value,
        teacherMark: JSON.stringify(teacherMark.value),
      },
    });
  }

  // 开始加载
  isLoading.value = true;
  // 创建一个超时的 Promise
  const timeoutPromise = new Promise(
    (_, reject) => setTimeout(() => reject(new Error("请求超时")), 6000) // 6秒超时
  );
  startAnimation();
  // 创建一个更新账户数据的 Promise
  // const updateRefreshChallenge = refreshDataChallenge();
  const updateAccountPromise = submitAccountDataChallenge();

  // 使用 Promise.race 来竞速两个 Promise：正常的请求和超时的 Promise
  let accountDataResult;
  try {
    accountDataResult = await Promise.race([
      updateAccountPromise,
      // updateRefreshChallenge,
      timeoutPromise,
    ]);

    if (accountDataResult === "不能提交相同内容") {
      // 如果账户数据已提交，显示对话框并跳转
      isLoading.value = false;
      showDialog({
        title: "恭喜！提交成功！",
        message: "跳转答案页",
        theme: "round-button",
      }).then(() => {
        redirect(accountDataResult);
      });
      return;
    }
  } catch (error) {
    // 如果超时，弹出超时提醒
    if (error.message === "请求超时") {
      isLoading.value = false; // 停止加载
      stopAnimation();
      showDialog({
        title: "超时",
        message: "请求超时，请稍后再试。",
        theme: "round-button",
      }).then(() => {
        return;
        // 让用户重新点击提交
        // 可以根据需要做其他处理，例如恢复按钮状态
      });
    } else {
      // 其他错误
      console.log("发生错误:", error.message);
    }
    return; // 不跳转
  } finally {
    isLoading.value = false;
    // 跳转（只有在没有超时的情况下才执行）
    if (accountDataResult && accountDataResult !== "不能提交相同内容") {
      redirect(accountDataResult);
    }
  }
};

// 手写模式
const handwriteInputs = ref({});
const handwriteAnswers = ref([]);
const onEnter = (event) => {
  event.target.blur(); // 收起移动端输入法
};
// 点击选项
const resultDataTempt = ref([]);
const selectedIndexes = ref({});
const flagSingleOrMultiChoice = ref("单选");
const showFlagText = ref(false);
const toggleFlagText = () => {
  showFlagText.value = !showFlagText.value;
}
let originalChinese = "";
const isDisabled = (index, index2) => {
  const item = synonymsOptions.value[index];
  const chineseOption = item.中文[index2];
  return chineseOption === "无";
};
const toggleCheckChinese = (index, index2) => {
  if (isDisabled(index, index2)) {
    return;
  }
  const key = `${index}-${index2}`;
  const checkboxRef = checkboxRefs.value[key];
  if (checkboxRef) {
    checkboxRef.toggle();
  }
  // 捕捉用户是否取消了选项
  const wasSelected = selectedIndexes.value[key]; // 之前的状态
  selectedIndexes.value[key] = !wasSelected; // 切换状态

  // 更新选择结果
  const selectedChineses = selectedResults.value[index] || [];
  const currentChinese = synonymsOptions.value[index].中文[index2];
  const is_spell_selectedItems = synonymsOptions.value[index].is_spell;
  if (selectedIndexes.value[key]) {
    // 如果选中，添加到累积数组中
    selectedChineses.push(currentChinese);
  } else {
    // 如果取消选中，从累积数组中移除
    const removeIndex = selectedChineses.indexOf(currentChinese);
    if (removeIndex !== -1) {
      selectedChineses.splice(removeIndex, 1);
    }
  }
  selectedResults.value[index] = selectedChineses; // 更新累积的选项结果
  // console.log("selectedChineses", selectedChineses);
  // 累积选中的选项转换为字符串
  let mergedChinese = selectedChineses.join("");

  // 与 answers.value[index].英文 比对长度
  const answerEnglish = answers.value[index]?.英文;
  // 在相同位置添加空格

  let addedChinese = "";
  const containsSpace = answerEnglish.includes(" ");
  const containsChinese = /[\u4e00-\u9fa5]/.test(answerEnglish); // 使用正则表达式检查中文字符

  if (containsSpace && !containsChinese) {
    if (answerEnglish && mergedChinese.length <= answerEnglish.length) {
      let spacedChinese = "";
      let chineseIndex = 0;

      for (let i = 0; i < answerEnglish.length; i++) {
        if (answerEnglish[i] === " ") {
          spacedChinese += " "; // 在相同位置添加空格
        } else {
          spacedChinese += mergedChinese[chineseIndex] || ""; // 添加中文字符
          chineseIndex++;
        }
      }

      mergedChinese = spacedChinese.trim(); // 更新带空格的字符串
      // console.log("mergedChinese: ", mergedChinese);

      // 计算新增的部分

      let originalIndex = 0;

      // 比较 mergedChinese 和 originalChinese，找出新增的部分
      for (let i = 0; i < mergedChinese.length; i++) {
        // 如果 originalIndex 已经到达 originalChinese 的末尾，或者字符不相等，则记录新增部分
        if (
          originalIndex >= originalChinese.length ||
          mergedChinese[i] !== originalChinese[originalIndex]
        ) {
          // 如果是空格，则替换成两个空格
          if (mergedChinese[i] === " ") {
            addedChinese += "  "; // 替换空格为两个空格
          } else {
            addedChinese += mergedChinese[i]; // 记录新增的字符
          }
        } else {
          originalIndex++; // 如果字符相同，则移动 originalChinese 的指针
        }
      }

      // console.log("addedChinese: ", addedChinese); // 输出新增的部分
      // console.log("addedChinese: ", addedChinese.length); // 输出新增的部分
    }
    // 更新选中的项列表
    const existingItemIndex = selectedItems.value.findIndex(
      (item) => item.key === key
    );
    if (selectedIndexes.value[key]) {
      if (existingItemIndex !== -1) {
        // 如果选项已存在，更新其 label
        selectedItems.value[existingItemIndex].label = mergedChinese;
      } else {
        // 如果选项不存在，添加新的选项
        selectedItems.value.push({
          label: addedChinese, // 使用带空格的字符串作为 label
          key: key,
          is_spell: is_spell_selectedItems,
        });
      }
    } else {
      // 从选中的项列表中移除
      selectedItems.value = selectedItems.value.filter(
        (item) => item.key !== key
      );
    }
  } else {
    const existingItemIndex = selectedItems.value.findIndex(
      (item) => item.key === key
    );
    if (selectedIndexes.value[key]) {
      if (existingItemIndex !== -1) {
        // 如果选项已存在，更新其 label
        selectedItems.value[existingItemIndex].label = mergedChinese;
      } else {
        // 如果选项不存在，添加新的选项
        selectedItems.value.push({
          label: currentChinese, // 使用带空格的字符串作为 label
          key: key,
          is_spell: is_spell_selectedItems,
        });
      }
    } else {
      // 从选中的项列表中移除
      selectedItems.value = selectedItems.value.filter(
        (item) => item.key !== key
      );
    }
  }
  originalChinese = mergedChinese;
  // console.log("originalChinese: ", originalChinese);
  // console.log(selectedItems.value);

  // 合并答案和选项
  mergedData.value = mergeAnswerAndSynonym();

  // 将用户选择转化为中文
  const synonymsSelectedChinese = convertSelections(
    synonymsSelected.value,
    synonymsOptions.value
  );

  // 将中文用户选择和选项答案合并
  resultDataTempt.value = mergeSynonymAndSelections(synonymsSelectedChinese);
  // console.log("resultDataTempt.value: ", resultDataTempt.value);
  // completeCount.value = resultDataTempt.value.reduce((count, item) => {
  //   if (item.用户选择[0] !== "无") {
  //     return count + 1;
  //   }
  //   return count;
  // }, 0);
  // console.log('completeCount.value: ', completeCount.value);
};

function isSelected(index, index2) {
  return selectedIndexes.value[`${index}-${index2}`];
}
// function speakWord(word) {
//   const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(
//     word
//   )}&type=1`;
//   const audio = new Audio(url);
//   audio.play().catch(() => {
//     console.log("Fallback to SpeechSynthesis");
//     let utterance;
//     utterance = new SpeechSynthesisUtterance(word);
//     if (!/[a-zA-Z]/.test(word)) {
//       utterance.lang = "zh-CN";
//     } else {
//       utterance.lang = "en-US";
//     }
//     utterance.pitch = 0.5;
//     setTimeout(() => {
//       window.speechSynthesis.speak(utterance);
//     }, 800);
//   });
// }

const teacherMark = ref("");
const teacherMarkCount = ref(0);
const showTeacherMark = ref(false);
const showTeacherMark2 = ref(true);
let hideTimer = null;

const processTeacherMarkData = (data) => {
  const processedData = [];
  let teacherMarkCount = 0;

  data.forEach((item) => {
    const processedItem = {
      序号: item.序号,
      英文: item.英文,
    };

    if (item.teacherMark) {
      processedItem.teacher_mark = item.teacherMark;
      teacherMarkCount++;
    }

    processedData.push(processedItem);
  });

  return {
    data: processedData,
    teacherMarkCount: teacherMarkCount,
  };
};

// 监听teacherMarkCount变化
watch(teacherMarkCount, (newValue, oldValue) => {
  if (newValue !== oldValue && newValue > 0) {
    if (hideTimer) {
      clearTimeout(hideTimer);
    }
    showTeacherMark.value = true;
  }
});

// 启动隐藏定时器
const startHideTimer = () => {
  hideTimer = setTimeout(() => {
    showTeacherMark.value = false;
  }, 2000);
};

const refreshDataChallenge = async () => {
  mergedData.value = mergeAnswerAndSynonym();
  const synonymsSelectedChinese = convertSelections(
    synonymsSelected.value,
    synonymsOptions.value
  );
  const synonymAndSelections = mergeSynonymAndSelections(
    synonymsSelectedChinese
  );
  const compareResult = compareAndAddFlag(synonymAndSelections);
  // console.log("compareResult: ", compareResult);
  let params = new URLSearchParams();
  params.append("method", "refreshDataChallenge");
  params.append("nidSubmit", nidSubmit.value);
  params.append("username", username.value);
  params.append("log", JSON.stringify(compareResult));
  const response = await axios.post("words/", params);
  if (response.data.teacher_mark.length == 0) {
    return;
  }
  const result = processTeacherMarkData(JSON.parse(response.data.teacher_mark));

  teacherMark.value = result.data;
  teacherMarkCount.value = result.teacherMarkCount;
  // console.log("teacherMark: ", teacherMark.value);

  return response.data;
};

// 提交进度条
const goToNext = () => {
  const currentSlideIndex = currentIndex.value;

  // 检查当前轮播图中的选中项
  // console.log("selectedIndexes: ", selectedIndexes.value);
  const currentSlideSelections = Object.keys(selectedIndexes.value).filter(
    (key) => key.startsWith(`${currentSlideIndex}-`)
  );

  let hasSelection = null;

  if (
    currentSlideIndex == 0 &&
    (!mergedData.value || Object.keys(mergedData.value).length === 0)
  ) {
    mergedData.value = mergeAnswerAndSynonym();
  }

  if (mergedData.value[currentSlideIndex]["排除"] == "手写") {
    const input = (handwriteInputs.value[currentSlideIndex] || "").trim();
    if (!input) {
      showFailToast("不能为空");
      return;
    }
    handwriteAnswers.value.push({
      序号: mergedData.value[currentSlideIndex]["序号"],
      英文: input,
    });
    console.log("handwriteAnswers: ", handwriteAnswers.value);
    hasSelection = true;
  } else {
    hasSelection = currentSlideSelections.some(
      (key) => selectedIndexes.value[key]
    );
    // console.log("currentSlideSelections: ", currentSlideSelections);
  }

  if (!hasSelection) {
    showFailToast("不能为空");
    return; // 如果没有选中项，直接返回，不进行后续操作
  }

  // 定义继续执行的函数
  const continueToNext = () => {
    if (!isButtonDisabled.value) {
      refreshDataChallenge(); // 更新数据

      if (currentIndex.value < totalSlides.value - 1) {
        flagSingleOrMultiChoice.value = getSingeOrMultiChoice(
          currentIndex.value + 1
        );
        completeCount.value = (parseInt(completeCount.value) + 1).toString();

        swipeRef.value.next();
        currentRate.value = 100;
        timerRate.value = 100;
        showFlagText.value = false;
      } else {
        // 到达最后一个轮播图，执行提交函数
        pause();
        clickSubmitUser();
      }
    }
  };

  // 检查是否会触发半程奖励（在更新 completeCount 之前检查）
  const nextCompleteCount = parseInt(completeCount.value) + 1;
  const willReachHalf =
    nextCompleteCount >= totalCount.value / 2 && !hasShownEncouragement;

  if (willReachHalf) {
    // 如果会触发半程奖励，先显示动画，完成后再继续
    showAnimationhalf(() => {
      hasShownEncouragement = true;
      isExtended.value = true;

      // 动画完成后继续执行
      continueToNext();
    });
  } else {
    // 直接继续执行，不显示动画
    continueToNext();
  }
};
const percentage = ref(100); // 初始值为 100%
const showProgress = ref(false);
let intervalId = null; // 保存定时器的 ID
const stopAnimation = () => {
  clearInterval(intervalId); // 清除定时器
  intervalId = null; // 避免重复调用
  showProgress.value = false; // 隐藏进度条
  percentage.value = 0; // 重置进度条为 0
};
const startAnimation = () => {
  if (intervalId) {
    clearInterval(intervalId); // 清除之前的定时器，防止重复动画
  }

  showProgress.value = true; // 显示进度条
  percentage.value = 100; // 初始化进度条为 100%

  const duration = 6000; // 动画总时长 6 秒
  const step = 100 / (duration / 50); // 每 50ms 减少的百分比

  intervalId = setInterval(() => {
    if (percentage.value > 0) {
      percentage.value = Math.max(0, percentage.value - step); // 确保 percentage 不低于 0
    } else {
      percentage.value = 0;
      clearInterval(intervalId); // 清除定时器
      showProgress.value = false; // 动画结束后隐藏进度条
    }
  }, 50);
};

// 遮罩层
const showOverlay = ref(true);
const currentSwipeIndex = ref(0);
const countdown = ref(3);
const countdownMounted = ref(6);
const isButtonDisabledMounted = ref(true);
const countdownTimer = ref(null);

// 计算当前显示卡片的英文
const getCurrentEnglish = () => {
  if (synonymsOptions.value && synonymsOptions.value[currentSwipeIndex.value]) {
    return synonymsOptions.value[currentSwipeIndex.value].英文;
  }
  return "";
};

// 提交倒计时
const showCountdownSubmit = ref(false);
const countdownSubmitValue = ref(5);

// 倒计时函数
function startCountdownSubmit() {
  return new Promise((resolve) => {
    showCountdownSubmit.value = true;
    countdownSubmitValue.value = 5;

    const countdown = () => {
      if (countdownSubmitValue.value > 0) {
        setTimeout(() => {
          countdownSubmitValue.value--;
          countdown();
        }, 1000);
      } else {
        // 倒计时结束，隐藏组件
        showCountdownSubmit.value = false;
        resolve(); // 倒计时完成
      }
    };

    countdown(); // 开始倒计时
  });
}

// 每个单词倒计时
const startCountdown = () => {
  countdown.value = 3;
  countdownTimer.value = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      clearCountdown();
      showOverlay.value = false;
    }
  }, 1000);
};

// 清理倒计时
const clearCountdown = () => {
  if (countdownTimer.value) {
    clearInterval(countdownTimer.value);
    countdownTimer.value = null;
  }
};

// 点击遮罩关闭
const continueSwipe = () => {
  showOverlay.value = false;
};

// 显示遮罩层（在当前组件中调用）
const showOverlayWithCountdown = () => {
  showOverlay.value = true;
};

// 监听遮罩层显示状态
watch(showOverlay, (newVal) => {
  if (newVal) {
    startCountdown();
  } else {
    clearCountdown();
  }
});

// 计时器
const timerRate = ref(0);
const autoplay2 = ref(9000);
const autoplayInit = ref("");
const currentRate = ref(100);
const swipeRef = ref(null);
const completeCount = ref("1");
const currentIndex = ref(0);
const totalSlides = ref(25); // 假设总共有5个轮播图项
const isButtonDisabled = ref(false);
const remainingSeconds = ref(0);
const circleColor = ref("#1989fa");
// 使用computed计算属性来确定按钮的文本
const textButtonNext = computed(() => {
  if (currentIndex.value === 0) {
    return "开始";
  } else if (currentIndex.value === totalSlides.value - 1) {
    return "提交";
  } else {
    return "下一个";
  }
});
// 计算按钮的背景颜色和透明度
const buttonColor = computed(() => {
  // 计算当前索引占总幻灯片数的比例
  const ratio = currentIndex.value / (totalSlides.value - 1);
  const alpha = 0.5 + 0.5 * ratio; // 透明度从0.5逐渐增加到1

  if (currentIndex.value === totalSlides.value - 1) {
    // 最后一个幻灯片使用蓝绿色且完全不透明
    return `rgba(0, 176, 155, 1)`;
  } else {
    // 根据比例调整绿色深浅和透明度，起始绿色设为105，透明度从0.5到1
    const green = 105 + Math.round(70 * (1 - ratio));
    return `rgba(0, ${green}, 0, ${alpha})`;
  }
});
function getSingeOrMultiChoice(currentIndex) {
  if (synonymsOptions.value[currentIndex]["is_spell"]) {
    return "多选";
  }
  // 假设 answers.value 是一个包含所有项的数组
  const currentItem = answers.value[currentIndex];

  // 获取当前项的中文字段
  const chineseText = currentItem["中文"];
  // console.log('chineseText: ', chineseText);

  // 根据分号分割后的长度判断是单选还是多选
  const chineseTextArray = chineseText.split("；");
  const textLength = chineseTextArray.length;

  let answerType;
  if (textLength === 1) {
    answerType = "单选";
  } else {
    answerType = "多选";
  }
  return answerType;
}
// const resetTimer = () => {
//   pause();
//   setTimeout(() => {
//     // 判断对错
//     if (currentIndex.value < totalSlides.value - 1) {
//       swipeRef.value.next();

//       setTimeout(() => {
//         flagSingleOrMultiChoice.value = getSingeOrMultiChoice(
//           currentIndex.value + 1
//         );

//         // console.log("currentIndex", currentIndex.value);
//         if (synonymsOptions.value[currentIndex.value].排除 == "手写") {
//           const input = (
//             handwriteInputs.value[currentIndex.value] || ""
//           ).trim();
//           handwriteAnswers.value.push({
//             序号: mergedData.value[currentIndex.value]["序号"],
//             英文: input,
//           });
//         }
//         // console.log('handwriteAnswers.value: ', handwriteAnswers.value);

//         refreshDataChallenge(); // 更新数据
//         currentRate.value = 100;
//         timerRate.value = 100;
//         completeCount.value = (parseInt(completeCount.value) + 1).toString();
//         isButtonDisabled.value = false; // 恢复按钮点击
//         resume();
//       }, 0); // 确保视图更新后再开始计时
//     } else {
//       // 提交
//       clickSubmitUser();
//     }
//   }, 0);
// };
const resetTimer = () => {
  pause();
  setTimeout(() => {
    // 定义继续执行的函数
    const continueWithTimer = () => {
      // 判断对错
      if (currentIndex.value < totalSlides.value - 1) {
        swipeRef.value.next();

        setTimeout(() => {
          flagSingleOrMultiChoice.value = getSingeOrMultiChoice(
            currentIndex.value + 1
          );

          // console.log("currentIndex", currentIndex.value);
          if (synonymsOptions.value[currentIndex.value].排除 == "手写") {
            const input = (
              handwriteInputs.value[currentIndex.value] || ""
            ).trim();
            handwriteAnswers.value.push({
              序号: mergedData.value[currentIndex.value]["序号"],
              英文: input,
            });
          }
          // console.log('handwriteAnswers.value: ', handwriteAnswers.value);

          refreshDataChallenge(); // 更新数据
          currentRate.value = 100;
          timerRate.value = 100;
          completeCount.value = (parseInt(completeCount.value) + 1).toString();
          isButtonDisabled.value = false; // 恢复按钮点击
          resume();
        }, 0); // 确保视图更新后再开始计时
      } else {
        // 提交
        clickSubmitUser();
      }
    };

    // 检查是否会触发半程奖励（在更新 completeCount 之前检查）
    const nextCompleteCount = parseInt(completeCount.value) + 1;
    const willReachHalf =
      nextCompleteCount >= totalCount.value / 2 && !hasShownEncouragement;

    if (willReachHalf) {
      // 如果会触发半程奖励，先显示动画，完成后再继续
      showAnimationhalf(() => {
        hasShownEncouragement = true;
        isExtended.value = true;

        // 动画完成后继续执行
        continueWithTimer();
      });
    } else {
      // 直接继续执行，不显示动画
      continueWithTimer();
    }
  }, 0);
};

const executedWords = new Set();

// 做题目进度条
const srcswipeEncouragement = ref("");
const srcswipeEncouragement2 = ref("");
const totalCount = computed(() => synonymsOptions.value.length);
const progressPercentage = computed(() => {
  if (synonymsOptions.value.length === 0) return 0;
  return Math.round((completeCount.value / synonymsOptions.value.length) * 100);
});

const isOverHalf = computed(() => completeCount.value >= totalCount.value / 2); // 判断是否过半
const remainingCount = computed(() => totalCount.value - completeCount.value);

const progressColor = computed(() => {
  if (remainingCount.value <= 5) {
    return "#FF3E00"; // 金红色
  } else if (isOverHalf.value) {
    return "#DAA520"; // 深金色
  } else {
    return "#1989fa"; // 蓝色
  }
});

const progressStyle = computed(() => {
  return {
    width: "80%",
    margin: "0 auto",
    boxShadow: isOverHalf.value
      ? "0 0 8px 4px rgba(218, 165, 32, 0.6)"
      : "none",
    transition: "box-shadow 0.3s ease",
  };
});
const pivotFontStyle = computed(() => {
  const text = `${completeCount.value} / ${totalCount.value}`;
  return {
    whiteSpace: "nowrap",
    fontSize: text.length > 7 ? "8px" : "12px",
  };
});

const showEncouragement = ref(false);
const showEncouragement2 = ref(false);

let hasShownEncouragement = false;
const isExtended = ref(false);

watch(currentIndex, () => {
  resetExecutionForNewWord();
});
const resetExecutionForNewWord = () => {
  executedWords.clear(); // 清空已执行的记录
  // 你也可以根据需要在这里处理其他逻辑
};
const { pause, resume } = useIntervalFn(
  () => {
    if (currentRate.value > 0) {
      // console.log(totalSlides.value);
      timerRate.value -= 100 / (autoplay2.value / 70);
      if (
        timerRate.value <= 20 &&
        currentIndex.value != totalSlides.value - 1
      ) {
        isButtonDisabled.value = true; // 禁用按钮
      }
    } else {
      resetTimer();
    }
  },
  70,
  { immediate: false }
);
const currentHeight = ref("");
const rowMarginTop = ref(0);
const handleSwipeChange = async (index) => {
  currentSwipeIndex.value = index;
  // 到下一个页面自动触发
  nextTick(() => {
    const el = swipeRef.value?.$el?.querySelector(
      `.van-swipe-item:nth-child(${index + 1}) .card`
    );
    if (
      synonymsOptions.value[index].排除 !== "试题" &&
      synonymsOptions.value[index].排除 !== "手写" &&
      !synonymsOptions.value[index].is_spell
    ) {
      showOverlayWithCountdown();
    }

    if (el) {
      currentHeight.value = el.offsetHeight;
    }
  });
  if (!isExtended.value) {
    if (synonymsOptions.value[index].is_spell) {
      autoplay2.value = autoplayInit.value + 17000;
    } else if (
      synonymsOptions.value[index].排除 === "试题" ||
      synonymsOptions.value[index].排除 === "手写"
    ) {
      autoplay2.value = autoplayInit.value + 27000;
      // autoplay2.value = autoplayInit.value
    } else {
      autoplay2.value = autoplayInit.value;
    }
  } else {
    // woohoo后增加2秒
    if (synonymsOptions.value[index].is_spell) {
      autoplay2.value = autoplayInit.value + 19000;
    } else if (
      synonymsOptions.value[index].排除 === "试题" ||
      synonymsOptions.value[index].排除 === "手写"
    ) {
      autoplay2.value = autoplayInit.value + 29000;
      // autoplay2.value = autoplayInit.value
    } else {
      // autoplay2.value = autoplayInit.value + 2000;
    }
    isExtended.value = false;
  }

  // console.log(autoplay2.value);
  try {
    if (
      synonymsOptions.value[index]["排除"] !== "试题" &&
      synonymsOptions.value[index]["排除"] !== "手写"
    ) {
      const word = synonymsOptions.value[index]["英文"];

      if (completeCount.value === totalCount.value / 2) {
        setTimeout(() => {
          speakWord(word);
        }, 2500); // 延迟2秒
      } else {
        speakWord(word); // 立即执行
      }
    }
  } catch (error) {
    console.error("Error speaking word:", error);
  }
  currentIndex.value = index;
  currentRate.value = 100;
  timerRate.value = 100;

  pause(); // 暂停计时器
  resume();
};

// 预加载音频
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
const speakWord = (english) => {
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
        fallbackSpeech(english);
      });

      audio.play().catch((err) => {
        URL.revokeObjectURL(audioUrl);
        console.warn("播放被拒（缓存 Blob），回退 TTS：", err);
        fallbackSpeech(english);
      });
      return;
    }

    if (cached instanceof Audio) {
      cached.currentTime = 0;
      cached.play().catch((err) => {
        console.warn("播放被拒或失败（Audio cache），回退 TTS：", err);
        fallbackSpeech(english);
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
      return speakWord(english); // 再次调用，走缓存逻辑
    } catch (err) {
      console.warn("base64 转换失败：", err);
    }
  }

  // 3) 从 item 对象查找
  const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(
    english
  )}&type=1`;
  const audio = new Audio(url);
  audio.play().catch(() => {
    console.log("Fallback to SpeechSynthesis");
    let utterance;
    utterance = new SpeechSynthesisUtterance(english);
    if (!/[a-zA-Z]/.test(english)) {
      utterance.lang = "zh-CN";
    } else {
      utterance.lang = "en-US";
    }
    utterance.pitch = 0.5;
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 800);
  });
};

const fallbackSpeech = (english) => {
  let utterance;
  utterance = new SpeechSynthesisUtterance(english);
  utterance.lang = "en-US";
  utterance.pitch = 0.5;
  window.speechSynthesis.speak(utterance);
};

const titleData = ref("");
const username = ref("");
const alias = ref("");
const selectedResults = ref({});
const usercoins = ref(0);
const submittoken = ref("");
const usercoinsStart = ref(0);
const usercoinsEnd = ref(0);
const isRewardEligible = ref(true);
const checkedNoneOfAbove = ref(false);
const checkedSpell = ref(false);
const RateOrigin = ref(0);
const isSubmitting = ref(false);
const hasSubmitted = ref(false);
const nidSubmit = ref("");

onUnmounted(() => {});

onMounted(async () => {
  // 显示倒计时并等待完成
  const timer = setInterval(() => {
    countdownMounted.value--;
    if (countdownMounted.value <= 0) {
      isButtonDisabledMounted.value = false;
      clearInterval(timer);
    }
  }, 1000);

  if (flagTheme.value == 1) {
    srcswipeEncouragement.value = swipeEncouragementSrcGoatAndWolf;
    srcswipeEncouragement2.value = swipeEncouragementSrcGoatAndWolf2;
  }
  if (flagTheme.value == 2) {
    srcswipeEncouragement.value = swipeEncouragementBears;
    srcswipeEncouragement2.value = swipeEncouragementBears2;
  }
  nextTick(() => {
    const el = swipeRef.value?.$el?.querySelector(
      ".van-swipe-item:nth-child(1) .card"
    );
    if (el) {
      currentHeight.value = el.offsetHeight;
      // console.log('初始第一个 item 高度：', currentHeight.value);
    }
  });
  RateOrigin.value = history.state.RateOrigin;

  currentRate.value = 100;
  timerRate.value = 100;
  const toast = showLoadingToast({
    duration: 0,
    forbidClick: true,
    message: "加载音频...",
  });

  const initData = async () => {
    // 初始化数据
    checkedNoneOfAbove.value = history.state.checkedNoneOfAbove;
    checkedSpell.value = history.state.checkedSpell;
    const data = JSON.parse(history.state.data);

    // console.log("data: ", data);

    autoplay2.value = history.state.autoplay2;
    autoplayInit.value = history.state.autoplay2;
    // console.log("autoplay2: ", autoplay2.value);

    remainingSeconds.value = (autoplay2.value / 1000).toString();
    totalSlides.value = data.answers.length;

    console.log("totalSlides", totalSlides.value);
    alias.value = data.alias;

    if (data.coins >= 2000) {
      isRewardEligible.value = false;
    }
    nid.value = history.state.nid;
    synonymsOptions.value = data.synonyms;

    console.log("synonymsOptions: ", synonymsOptions.value);
    const len = synonymsOptions.value[0]?.["中文"]?.length || 0;
    if (len === 7) {
      rowMarginTop.value = 340;
    } else if (len === 6) {
      rowMarginTop.value = 310;
    } else {
      rowMarginTop.value = 340; // 默认值，可调整
    }
    try {
      if (
        synonymsOptions.value[0]["排除"] !== "试题" &&
        synonymsOptions.value[0]["排除"] !== "手写"
      ) {
        speakWord(synonymsOptions.value[0]["英文"]);
      }
    } catch (error) {
      console.error("Error speaking word:", error);
    }
    answers.value = data.answers;
    synonymsOptions.value.forEach((item) => {
      if (item.is_spell) {
        const answerItem = answers.value.find(
          (answer) => answer.序号 === item.序号
        );
        if (answerItem) {
          answerItem.正确答案 = answerItem.英文;
        }
      }
    });
    console.log("answers: ", answers.value);

    // 预加载语音
    const answerSheetProList = answers.value.map((item) => ({
      ...item,
      showChinese: false,
      audio: null,
    }));
    console.log("answerSheetProList: ", answerSheetProList);
    let params = new URLSearchParams();
    params.append("method", "getAudioList");
    params.append("word_list", JSON.stringify(answerSheetProList));
    const response = await axios.post("words/", params);
    console.log("response: ", response.data);
    if (response.data.success && response.data.audio_data) {
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

    titleData.value = data.title;

    username.value = data.username;

    submittoken.value = new Date().getTime();
    // console.log("submittoken: ", submittoken.value);

    flagSingleOrMultiChoice.value = getSingeOrMultiChoice(0);

    // 获取用户金币
    const getUserCoins = async () => {
      let params = new URLSearchParams();
      params.append("method", "getUserCoins");
      params.append("username", username.value);
      const response = await axios.post("words/", params);
      return response.data;
    };

    const res = await getUserCoins();
    usercoins.value = res["data_coins"][0]["coins"];
    // console.log("usercoins: ", usercoins.value);

    usercoinsStart.value = 0;
    usercoinsEnd.value = usercoins.value;

    // 上传数据
    const updateDataChallenge = async () => {
      mergedData.value = mergeAnswerAndSynonym();
      const synonymsSelectedChinese = convertSelections(
        synonymsSelected.value,
        synonymsOptions.value
      );
      const synonymAndSelections = mergeSynonymAndSelections(
        synonymsSelectedChinese
      );
      const compareResult = compareAndAddFlag(synonymAndSelections);
      console.log("compareResult: ", compareResult);
      let params = new URLSearchParams();
      params.append("method", "updateDataChallenge");
      params.append("submittoken", submittoken.value);
      params.append("nid", nid.value);
      params.append("username", username.value);
      params.append("log", JSON.stringify(compareResult));
      params.append("title", titleData.value);
      params.append("username", username.value);
      params.append("alias", alias.value);
      params.append("mode", "挑战");
      const response = await axios.post("words/", params);
      return response.data;
    };
    const clearDataChallenge = async () => {
      let params = new URLSearchParams();
      params.append("method", "clearDataChallenge");
      params.append("nidSubmit", nidSubmit.value);
      const response = await axios.post("words/", params);
      return response.data;
    };
    const submitLog = async () => {
      // 防止重复提交
      if (isSubmitting.value) return;

      isSubmitting.value = true;

      try {
        const response = await updateDataChallenge();
        if (response.success) {
          hasSubmitted.value = true;
          const logData = {
            submitted: true,
            nid: response.new_log_nid,
            timestamp: Date.now(), // 可选：添加时间戳
          };
          sessionStorage.setItem(
            `logSubmitted_${nid.value}`,
            JSON.stringify(logData)
          );
        }
        return response.new_log_nid;
      } catch (error) {
        console.error("提交失败:", error);
      } finally {
        isSubmitting.value = false;
      }
    };
    const checkSubmissionStatus = () => {
      const storedData = sessionStorage.getItem(`logSubmitted_${nid.value}`);

      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData);
          if (parsedData.submitted && parsedData.nid) {
            console.log("发现已提交的记录，nid:", parsedData.nid);
            return parsedData.nid; // 返回之前保存的nid
          }
        } catch (error) {
          console.error("解析存储数据失败:", error);
          // 如果解析失败，清除无效数据
          sessionStorage.removeItem(`logSubmitted_${nid.value}`);
        }
      }

      return null;
    };
    // 主逻辑
    const existingNid = checkSubmissionStatus();

    if (existingNid) {
      // 如果已经提交过，使用之前保存的nid
      nidSubmit.value = existingNid;
      hasSubmitted.value = true;
      await clearDataChallenge();
      console.log("使用已保存的nidSubmit:", nidSubmit.value);
    } else {
      // 如果没有提交过，执行提交
      nidSubmit.value = await submitLog();
      console.log("新提交的nidSubmit:", nidSubmit.value);
    }
    toast.close();
  };

  // 调用初始化函数
  initData();
});
</script>

<template>
  <div class="parent-container">
    <div class="nav-bar-container">
      <van-nav-bar
        title="挑战赛"
        :left-text="`${completeCount}/${synonymsOptions.length}`"
      >
      </van-nav-bar>
    </div>

    <!-- 遮罩层 -->
    <van-overlay
      :show="showOverlay"
      z-index="100"
      class="overlay-container"
      :duration="0.2"
    >
      <div class="overlay-content">
        <!-- 显示当前卡片的同义词英文 -->
        <div class="synonym-display">
          <img src="../assets/getPassive.gif" class="passive-gif" />
          <div class="synonym-item">
            {{ getCurrentEnglish() }}
          </div>
        </div>

        <!-- 提示文字、倒计时和关闭按钮 -->
        <div class="overlay-footer">
          <div class="countdown" v-show="!isButtonDisabledMounted">
            {{ countdown }}s
          </div>
          <div class="tip-text" v-show="!isButtonDisabledMounted">
            自动关闭倒计时
          </div>
          <!-- 可选的提示文字 -->
          <van-button
            type="warning"
            @click="continueSwipe"
            class="close-button"
            :disabled="isButtonDisabledMounted"
            round
          >
            {{
              isButtonDisabledMounted
                ? `关闭遮罩层 (${countdownMounted}s)`
                : "关闭遮罩层"
            }}
          </van-button>

          <!-- 添加过渡动画 -->
          <transition name="slide-fade" @after-enter="startHideTimer">
            <div v-if="showTeacherMark" class="teacher-mark-text">
              老师标记了{{ teacherMarkCount }}词
            </div>
          </transition>
        </div>
      </div>
    </van-overlay>

    <!-- 做题进度 -->
    <div style="margin-top: 3vh">
      <van-progress
        :pivot-text="`${completeCount} / ${totalCount}`"
        :color="progressColor"
        :percentage="progressPercentage"
        :style="progressStyle"
        :pivot-style="pivotFontStyle"
      />
      <img
        v-if="showEncouragement"
        :src="srcswipeEncouragement"
        alt="鼓励动画"
        style="
          position: fixed; /* 关键：相对于整个屏幕定位 */
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 75vw;
          max-width: 400px;
          z-index: 1000; /* 保证浮在最前面 */
          pointer-events: none; /* 避免点击时挡住操作 */
        "
      />
      <img
        v-if="showEncouragement2"
        :src="srcswipeEncouragement2"
        alt="鼓励动画"
        style="
          position: fixed; /* 关键：相对于整个屏幕定位 */
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 75vw;
          max-width: 400px;
          z-index: 1000; /* 保证浮在最前面 */
          pointer-events: none; /* 避免点击时挡住操作 */
        "
      />
    </div>

    <van-row justify="center">
      <van-col span="23" style="margin-top: px">
        <van-swipe
          class="my-swipe"
          :show-indicators="false"
          :loop="false"
          @change="handleSwipeChange"
          ref="swipeRef"
          :touchable="false"
        >
          <van-swipe-item v-for="(item, index) in synonymsOptions" :key="index">
            <div class="card">
              <van-checkbox-group v-model="synonymsSelected" ref="checkboxRefs">
                <van-cell-group>
                  <div class="custom-cell-group">
                    <van-cell clickable class="bold-title2 border-cell">
                      <template #title>
                        <div
                          v-if="item.排除 !== '试题'"
                          style="
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                          "
                        >
                          <div v-if="item.排除 !== '手写'">
                            {{ item.序号 + ". " + item.英文 }}
                          </div>
                          <div v-else>
                            {{ item.序号 + ". " + answers[index].中文 }}
                          </div>
                          <div
                            v-if="item.排除 !== '手写'"
                          >
                            <div
                              v-if="!showFlagText"
                              @click="toggleFlagText"
                              style="cursor: pointer"
                            >
                              <van-icon name="closed-eye" />
                            </div>
                            <div v-else style="font-size: 17px; color: red">
                              {{ flagSingleOrMultiChoice }}
                            </div>
                          </div>
                        </div>
                        <div
                          v-else
                          style="
                            font-size: 500px;
                            line-height: 1.3;
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                          "
                        >
                          <div style="font-weight: 400; font-size: 14px">
                            {{ item.序号 + ". " + item.英文 }}
                          </div>
                          <!-- <div style="font-size: 10px; color: red">
                            {{ flagSingleOrMultiChoice }}
                          </div> -->
                        </div>

                        <div v-show="item.is_spell" class="selected-tags">
                          <div
                            v-for="(selected, index2) in selectedItems"
                            v-show="
                              selected.is_spell == true &&
                              selected.key.split('-')[0] == String(index)
                            "
                            :key="index2"
                            style="color: orange; font-size: smaller"
                            class="flying-tag"
                            @click="removeSelected(index2)"
                            :style="{
                              padding: '0.2rem 0px 0.3rem 0px',
                              'white-space': 'pre',
                            }"
                          >
                            {{ selected.label }}
                          </div>
                        </div>
                      </template>
                    </van-cell>

                    <div v-if="item.排除 !== '手写'">
                      <van-cell-group>
                        <van-cell
                          v-for="(chinese, index2) in item.中文"
                          :key="index2"
                          clickable
                          @click="toggleCheckChinese(index, index2)"
                          :class="
                            isSelected(index, index2) ? 'selected-cell' : ''
                          "
                          class="chinese-cell"
                        >
                          <template #title>
                            <div style="text-align: left">{{ chinese }}</div>
                          </template>
                          <template #right-icon>
                            <van-checkbox
                              :name="`${index + 1}-${index2 + 1}`"
                              :disabled="isDisabled(index, index2)"
                              @click.stop.prevent="
                                toggleCheckChinese(index, index2)
                              "
                              :ref="
                                (el) =>
                                  (checkboxRefs[`${index}-${index2}`] = el)
                              "
                            />
                          </template>
                        </van-cell>
                      </van-cell-group>
                    </div>
                    <div
                      v-else
                      class="handwrite-area"
                      style="padding: 0.5rem 1rem"
                    >
                      <van-field
                        v-model="handwriteInputs[index]"
                        placeholder="请拼写对应的英文"
                        input-align="left"
                        clearable
                        style="border-bottom: 1px solid #ccc"
                        @keydown.enter.prevent="onEnter"
                      />
                    </div>
                  </div>
                </van-cell-group>
              </van-checkbox-group>
            </div>
          </van-swipe-item>
        </van-swipe>
      </van-col>
    </van-row>

    <van-row
      class="my-swipe-container"
      justify="space-between"
      :style="{ marginTop: currentHeight - rowMarginTop + 'px' }"
    >
      <van-col span="20" offset="">
        <van-row>
          <van-col span="8">
            <van-button
              type="success"
              @click="goToNext"
              size="normal"
              :disabled="isButtonDisabled"
              :style="{ backgroundColor: buttonColor }"
              style="width: 87.5px"
              >{{ textButtonNext }}</van-button
            >
          </van-col>
          <van-col
            span="14"
            style="
              font-size: 18px;
              color: #ff976a;
              font-weight: 700;
              display: flex;
              align-items: center;
              padding-right: 10%;
            "
          >
          </van-col>
          <van-col span="2" offset="">
            <van-circle
              v-model:current-rate="currentRate"
              :rate="timerRate"
              :speed="0"
              stroke-width="120"
              layer-color="#ebedf0"
              :color="circleColor"
              size="50"
              class="time-circle"
            >
            </van-circle>
          </van-col>
        </van-row>
        <van-row style="margin-top: px">
          <van-col span="13" offset="">
            <!-- 添加过渡动画 -->
            <transition name="slide-fade" @after-enter="startHideTimer">
              <div v-if="showTeacherMark2" style="font-size: smaller">
                <div v-if="teacherMarkCount == 0">恭喜！老师尚未标记</div>
                <div v-else>糟糕！老师标记了{{ teacherMarkCount }}词</div>
              </div>
            </transition>
          </van-col>
        </van-row>
      </van-col>
    </van-row>

    <!-- 进度条 -->
    <div class="progress" v-if="showProgress">
      <van-progress
        pivot-text="努力提交..."
        color="#f2826a"
        :percentage="percentage"
      />
    </div>

    <!-- 最终提交倒计时 -->
    <div v-if="showCountdownSubmit" class="countdown-overlay-submit">
      <div class="countdown-box-submit">
        <div class="countdown-text-submit">即将提交答案</div>
        <div class="countdown-number-submit">{{ countdownSubmitValue }}</div>
      </div>
    </div>

    <half ref="halfRef" />
    <submitloading v-if="isLoading" />
  </div>
</template>




<style scoped>
html {
  touch-action: manipulation; /* 禁用双击缩放 */
}
.my-swipe {
  margin-top: 30px;
}

.teacher-marked :deep(.van-cell__title) {
  padding-top: 0.1px !important;
  padding-bottom: 0.5px !important;
}
.title-container {
  display: flex;
  align-items: center; /* 垂直居中 */
  gap: 0.25rem; /* 元素间距 */
  min-height: 20px; /* 确保有足够高度 */
}

.title-text {
  flex: 1; /* 占据剩余空间 */
  line-height: 1.4; /* 调整行高 */
}

/* 遮罩层 */
.overlay-container {
  display: flex;
  background-color: rgba(0, 0, 0, 1) !important;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.overlay-content {
  width: 100%;
  height: 100vh;
  position: relative;
  display: flex;
  flex-direction: column;
  color: white;
  transform: translateY(0px);
}

.synonym-display {
  position: absolute;
  top: 27%; /* 从33.33%改为30%，稍微向上 */
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  display: flex;
  flex-direction: column; /* 改为垂直布局 */
  align-items: center; /* 居中对齐 */
  justify-content: center;
}

.passive-gif {
  width: 100px;
  height: auto;
  margin-bottom: 15px; /* 图片和文字之间的间距 */
}

.synonym-item {
  font-size: 48px;
  font-weight: bold;
  color: white;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  text-align: center;
  word-break: break-word;
  max-width: 85vw;
  line-height: 1.2;
  padding: 0 15px;
}

.overlay-footer {
  position: absolute;
  bottom: 30vh;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.close-button {
  min-width: 140px;
  height: 44px;
  font-size: 16px;
  border-radius: 22px;
}

.countdown {
  font-size: 24px;
  font-weight: bold;
  color: #ff6b6b;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #ff6b6b;
}

.space {
  height: 60%;
  font-size: 30px;
  font-weight: 700;
  color: #ee0a24;
  display: flex;
  flex-direction: column;
  width: 95%;
  align-items: center;
}

.block {
  width: 120px;
  height: 120px;
  background-color: #fff;
}

.selected-cell {
  font-weight: bold;
  color: #1a89fa !important;
  background-color: #c0c6cc !important;
}

.card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  padding: 10px 20px;
  margin: 10px auto;
  width: calc(90% - 40px);
}

.bold-title2 div {
  font-weight: 900; /* 加粗英文和序号 */
  font-size: 26px;
  color: #1a89fa;
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

.colon {
  display: inline-block;
  margin: 0 4px;
  color: #ee0a24;
}
.block {
  display: inline-block;
  width: 22px;
  color: #fff;
  font-size: 12px;
  text-align: center;
  background-color: #ee0a24;
}
.nav-bar-container {
  position: sticky;
  top: 0;
  z-index: 100;
}
.nav-bar-right {
  display: flex;
  align-items: center;
}
.nav-button {
  margin-left: 10px;
  padding: 5px 5px;
  margin-top: 4px;
  color: #208bfa;
  cursor: pointer;
  user-select: none;
}

.my-swipe-container {
  margin-top: 20px;
  margin-left: auto;
  margin-right: auto;
  display: flex;
  justify-content: center;
}

.time-circle {
  margin-left: -20px;
}
@media (min-width: 557px) {
  .time-circle {
    margin-left: 20px;
  }
}

.selected-tags {
  min-height: 30px;
  display: flex;
  margin-bottom: -2px;
  margin-top: 2px;
}
.tag-placeholder {
  margin-top: 2px;
  margin-bottom: -2px;
  display: inline-block;
  height: 30px; /* 和 van-tag 的高度保持一致 */
}
.flying-tag {
  animation: fly-up 0.5s ease-out;
}

@keyframes fly-up {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.progress {
  position: fixed; /* 固定定位，确保进度条在屏幕的特定位置 */
  left: 50%; /* 水平居中 */
  bottom: 25%; /* 距离屏幕底部 25% */
  transform: translateX(-50%); /* 修正水平居中时的偏移 */
  width: 80%; /* 设置进度条的宽度，根据需要调整 */
}

.van-progress__pivot {
  white-space: nowrap !important;
}

/* 遮罩层主容器 */
.overlay-content {
  display: flex; /* 启用 Flexbox 布局 */
  flex-direction: column; /* 垂直排列子元素 (上 -> 中 -> 下) */
  height: 100vh; /* 高度撑满整个视口 */
  width: 100vw; /* 宽度撑满整个视口 */
  box-sizing: border-box;
  padding: 40px 20px 30px; /* 顶部、左右、底部留出安全间距 */
  justify-content: space-between; /* 关键！让顶部和底部元素远离，中间元素占据剩余空间 */
}

/* 中间：英文显示区 */
.synonym-display {
  flex: 1; /* 关键！占据所有可用的剩余空间 */
  display: flex;
  flex-direction: column; /* 内部也用flex，方便居中 */
  align-items: center;
  justify-content: center;
  min-height: 0; /* Flexbox hack，允许在空间不足时收缩 */
  overflow-y: auto; /* 如果内容实在太多，则此区域内部滚动，不影响底部按钮 */
  margin-bottom: 20px; /* 和底部元素保持一点距离 */
}

.synonym-item {
  text-align: center; /* 文本居中 */
  /* 您可以根据需要调整字体大小等 */
}

.passive-gif {
  /* 您可以设置一个最大高度，防止图片过大 */
  max-height: 150px;
  margin-bottom: 20px;
}

/* 底部：操作区 */
.overlay-footer {
  display: flex;
  flex-direction: column; /* 垂直排列倒计时、提示和按钮 */
  align-items: center; /* 水平居中 */
  flex-shrink: 0; /* 防止在空间不足时被压缩 */
  gap: 8px; /* 现代CSS方式，在子元素之间创建8px的间距，比margin更方便 */
}

.countdown {
  font-size: 1.2rem;
  font-weight: bold;
}

.tip-text {
  font-size: 0.8rem;
  color: #aaa;
}

/* 教师标记文字 */
.teacher-mark-text {
  /* 注意：如果teacher-mark-text也想参与布局，就不要用 absolute 定位 */
  /* 这里我们让它作为footer的一部分，或者放在最上面 */
  /* 如果您依然希望它绝对定位，那它可能会和其他元素重叠，需要微调 top/bottom */
  position: relative; /* 改为相对定位，让它在文档流中 */
  margin-bottom: 15px; /* 和下方内容隔开 */
  align-self: center; /* 在flex容器中自我居中 */
  background-color: #ff6b35;
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: bold;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  text-align: center;
  white-space: nowrap;
}

/* 针对特别小的屏幕，可以进一步减小间距和字体 */
@media (max-height: 600px) {
  .overlay-content {
    padding: 20px 20px 20px;
  }
  .teacher-mark-text {
    font-size: 12px;
    padding: 6px 12px;
  }
}

.slide-fade-enter-active {
  transition: all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.slide-fade-leave-active {
  transition: all 0.4s ease-in;
}

.slide-fade-enter-from {
  transform: translateX(-100px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateX(100px);
  opacity: 0;
}

.slide-fade-enter-to {
  transform: translateX(0);
  opacity: 1;
}

/* 最终提交倒计时 */
.countdown-overlay-submit {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  font-family: Arial, sans-serif;
  animation: fadeIn 0.3s ease-out;
}

.countdown-box-submit {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40px 60px;
  border-radius: 20px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  animation: scaleIn 0.3s ease-out;
}

.countdown-text-submit {
  color: white;
  font-size: 18px;
  margin-bottom: 20px;
  font-weight: 500;
}

.countdown-number-submit {
  color: #fff;
  font-size: 72px;
  font-weight: bold;
  margin: 20px 0;
  text-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  animation: pulse 1s ease-in-out infinite;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes scaleIn {
  from {
    transform: scale(0.9);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

@keyframes fadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

.countdown-overlay.fade-out {
  animation: fadeOut 0.3s ease-in forwards;
}

/* 音频下载进度 */
.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: rgba(255, 255, 255, 0.9);
}

.loading-content {
  text-align: center;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  min-width: 280px;
}

.progress-info {
  margin-top: 16px;
}

.progress-info p {
  margin: 8px 0;
  color: #666;
  font-size: 14px;
}
</style>