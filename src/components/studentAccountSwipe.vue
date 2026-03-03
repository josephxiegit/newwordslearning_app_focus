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
import swipeHelp from "./swipeHelp.vue";
import submitloading from "./submitloading.vue";
import passiveMagic from "./passiveMagic.vue";
import passiveMagic2 from "./passiveMagic2.vue";
import WinningStreakPopup from "./WinningStreakPopup.vue";

import shouxieSrcGoatAndWolf from "../assets/test.gif";
import shouxieBears from "../assets/Boonie Bears/test.gif";
import woohooSound from "../assets/sound/woohoo.mp3";

import surpriseSound from "../assets/sound/surprise.mp3";
import swipeEncouragementSrcGoatAndWolf from "../assets/swipeEncouragement.gif";
import swipeEncouragementSrcGoatAndWolf2 from "../assets/swipeEncouragement2.gif";
import swipeEncouragementBears from "../assets/Boonie Bears/swipeEncouragement.gif";
import swipeEncouragementBears2 from "../assets/Boonie Bears/swipeEncouragement2.gif";

const flagTheme = inject("flagTheme");
const router = useRouter();
const instance = getCurrentInstance();
const axios = instance.appContext.config.globalProperties.$ajax;
const isLoading = ref(false);
const passive_magic = inject("passive_magic");

const synonymsOptions = ref([]);
const synonymsSelected = ref([]);
const answers = ref([]);
const checkboxRefs = ref([]);
const nid = ref("");

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

const swipeFlag = ref(0);
const totalCoins = ref(0);
const clickSubmitUser = async (action, done) => {
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

  // 处理迟疑库
  function handleUncertain(uncertainVocabulary, compareResult) {
    // console.log("uncertainVocabulary: ", uncertainVocabulary);
    // console.log("compareResult: ", compareResult);

    // 转换 uncertainVocabulary 为可以快速查找的 Map 结构
    let uncertainVocabularyMap = new Map(
      [...uncertainVocabulary].map((item) => [item.英文, item])
    );

    // 遍历 compareResult，检查条件并移除符合条件的 uncertainVocabulary 项
    compareResult.forEach((result) => {
      if (result.flag !== "true") {
        if (uncertainVocabularyMap.has(result.英文)) {
          uncertainVocabularyMap.delete(result.英文);
        }
      }
    });

    // 对于未移除的项，添加 "答案" 和 "正确答案"
    let updatedUncertainVocabulary = new Set();
    uncertainVocabularyMap.forEach((item, key) => {
      let correspondingResult = compareResult.find(
        (result) => result.英文 === key
      );
      if (correspondingResult) {
        item["答案"] = correspondingResult.答案;

        // 检查是否存在“正确答案”，如果存在则添加到 item 中
        if (correspondingResult.正确答案 !== undefined) {
          item["正确答案"] = correspondingResult.正确答案;
        } else {
          // 如果没有“正确答案”，可以选择添加一个默认值，或者直接不添加该键
          item["正确答案"] = "无"; // 或者直接跳过这行代码
        }
      }
      updatedUncertainVocabulary.add(item);
    });

    // 输出处理后的 uncertainVocabulary 集合
    return updatedUncertainVocabulary;
  }
  uncertainVocabulary.value = handleUncertain(
    uncertainVocabulary.value,
    compareResult
  );
  // console.log("uncertainVocabulary", uncertainVocabulary.value);

  // 计算拼写库
  if (!lock_spell.value) {
    function getSpellVocabulary(compareResult, uncertainVocabulary) {
      console.log("uncertainVocabulary: ", uncertainVocabulary);
      console.log("compareResult: ", compareResult);
      const spellVocabularyResult = []; // 这里使用局部变量，避免混淆
      const addedEnglishSet = new Set();
      const chineseCharacterRegex = /[\u4e00-\u9fa5]/;

      function isPhrase(text) {
        return /\s|,|\/|\.|…|-|_|'/.test(text);
      }
      function containsChineseSemicolon(str) {
        // return str.includes('；');
        const hasChineseSemicolon = str.includes("；");
        const hasEnglishComma = str.includes(",");
        return hasChineseSemicolon || hasEnglishComma;
      }
      function isPureEnglish(text) {
        return /^[A-Za-z]+$/.test(text);
      }
      compareResult.forEach((item) => {
        let english = item.英文;
        let correctAnswer = item.正确答案;
        let answer = item.答案;

        if (chineseCharacterRegex.test(english)) {
          if (correctAnswer !== undefined) {
            [english, correctAnswer] = [correctAnswer, english];
            answer = correctAnswer;
          } else {
            [english, answer] = [answer, english];
            correctAnswer = answer;
          }
        }
        // console.log(english, correctAnswer)
        // console.log('item:', item);
        if (
          item.flag !== "true" &&
          !addedEnglishSet.has(english) &&
          !isPhrase(english) &&
          typeof correctAnswer === "string" && // 如果“手写”错了item.flag !== "true"就符合要求了
          !containsChineseSemicolon(correctAnswer) &&
          isPureEnglish(english)
        ) {
          // console.log(english);
          spellVocabularyResult.push({
            英文: english,
            答案: answer,
            正确答案: correctAnswer,
            flag: item.flag,
          });
          addedEnglishSet.add(english);
        }
      });

      uncertainVocabulary.forEach((item) => {
        let english = item.英文;
        let correctAnswer = item.正确答案;
        let answer = item.答案;

        if (chineseCharacterRegex.test(english)) {
          if (correctAnswer !== undefined) {
            [english, correctAnswer] = [correctAnswer, english];
            answer = correctAnswer;
          } else {
            [english, answer] = [answer, english];
            correctAnswer = answer;
          }
        }

        if (
          item.type.includes(",") &&
          item.is_spell === false &&
          !addedEnglishSet.has(english) &&
          !isPhrase(english) &&
          isPureEnglish(english)
        ) {
          spellVocabularyResult.push({
            英文: english,
            答案: answer,
            正确答案: correctAnswer,
            flag: item.type,
          });
          addedEnglishSet.add(english);
        }
      });

      return spellVocabularyResult; // 返回局部变量
    }
    spellVocabulary.value = getSpellVocabulary(
      compareResult,
      uncertainVocabulary.value
    );
  } else {
    spellVocabulary.value = spellVocabulary.value;
  }

  // console.log("spellVocabulary", spellVocabulary.value);

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
        return item.flag === "true" ? coins + 10 : coins;
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
        return 0;
      }
      if (item.flag === "true") {
        trueCount++;
      } else if (item.flag === "half") {
        halfCount++;
        if (halfCount > 3) {
          return 0;
        }
      }
    }

    if (trueCount === compareResult.length) {
      return 1.5;
    }
    return halfCount <= 3 ? 0.5 : false;
  }
  const rate = checkFlags(compareResult);
  const type = Number(remainingSeconds.value) == 8 ? 0 : 1;
  // console.log('type', type);

  compareResult2.value = compareResult;
  rate2.value = rate;

  const timeDiff = submittoken.value ? Date.now() - submittoken.value : 0;
  async function updateAccountData() {
    // 更新AccountData
    let params = new URLSearchParams();
    params.append("method", "updateUserData");
    params.append("submittoken", submittoken.value);
    params.append("nid", nid.value);
    params.append("rate", rate);
    params.append("swipe", 1);
    params.append("type", type);
    params.append("coins", totalCoins.value);

    // 更新Accountlog
    params.append("log", JSON.stringify(compareResult));
    params.append("title", titleData.value);
    params.append("username", username.value);
    params.append("alias", alias.value);
    params.append("mode", "游戏");
    params.append("numberprev", clickNumberPrev.value);
    params.append("numbershowanswer", clickNumberShowAnswer.value);
    params.append("numbertransparent", clickNumberTransparent.value);
    params.append("checkedNoneOfAbove", checkedNoneOfAbove.value);
    params.append("checkedSpell", checkedSpell.value);
    params.append("teacher_mark", timeDiff);

    // 更新spell vocabulary
    params.append("data_words", JSON.stringify(spellVocabulary.value));
    params.append("lock_spell", lock_spell.value);

    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }

  async function updateUncertain(accountLogResult) {
    // 延迟库
    let params = new URLSearchParams();
    params.append("method", "updateUncertain");
    params.append("username", username.value);
    params.append("account_data_nid", nid.value);
    params.append("new_log_nid", accountLogResult);
    params.append("type", "游戏");
    params.append(
      "vocabulary",
      JSON.stringify(Array.from(uncertainVocabulary.value))
    );
    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }
  // 计算得到多少新coins
  const newCoins = totalCoins.value;
  newCoins2.value = newCoins;
  // console.log("newCoins: ", newCoins);

  // 开始加载
  isLoading.value = true;
  // 创建一个超时的 Promise
  const timeoutPromise = new Promise(
    (_, reject) => setTimeout(() => reject(new Error("请求超时")), 6000) // 6秒超时
  );
  startAnimation();
  // 创建一个更新账户数据的 Promise
  const updateAccountPromise = updateAccountData();

  // 使用 Promise.race 来竞速两个 Promise：正常的请求和超时的 Promise
  let accountDataResult;
  try {
    accountDataResult = await Promise.race([
      updateAccountPromise,
      timeoutPromise,
    ]);
    accountDataResult2.value = accountDataResult;
    console.log('accountDataResult: ', accountDataResult);
    new_final_rate.value = accountDataResult.rate;
    if (accountDataResult["message"] === "不能提交相同内容") {
      // 如果账户数据已提交，显示对话框并跳转
      isLoading.value = false;
      showDialog({
        title: "恭喜！提交成功！",
        message: "跳转答案页",
        theme: "round-button",
      }).then(() => {
        activeWinningStreak.value = accountDataResult["today_record_count"];
        dailyWinningStreak.value = accountDataResult["daily_record_count"];

        if (
          activeWinningStreak.value > 6 &&
          dailyWinningStreak.value > 2 &&
          new_final_rate.value >= 3
        ) {
          redirect(accountDataResult);
        } else {
          shoWinningStreak.value = true;
        }
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
    // 尝试更新不确定词汇（如果有的话）
    let UncertainResult;
    try {
      if (uncertainVocabulary.value.size !== 0) {
        UncertainResult = await updateUncertain(accountDataResult?.new_log_nid);
      }
    } catch (error) {
      console.log("更新不确定词汇时发生错误:", error);
    }

    // 停止加载，清除 session
    isLoading.value = false;
    sessionStorage.removeItem("numberShowAnswer");
    sessionStorage.removeItem("numberTransparent");
    sessionStorage.removeItem("numberPrev");
    changeOverlayColor("rgba(128, 128, 128, 0.6)");

    // 跳转（只有在没有超时的情况下才执行）
    if (
      accountDataResult &&
      accountDataResult["message"] !== "不能提交相同内容"
    ) {
      // redirect(accountDataResult);
      activeWinningStreak.value = accountDataResult["today_record_count"];
      dailyWinningStreak.value = accountDataResult["daily_record_count"];

      if (
        activeWinningStreak.value > 6 &&
        dailyWinningStreak.value > 2 &&
        new_final_rate.value >= 3
      ) {
        redirect(accountDataResult);
      } else {
        shoWinningStreak.value = true;
      }
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
const uncertainVocabulary = ref(new Set());

// 加入迟疑库
function addUncertain(index, content) {
  const uncertainItem =
    content === "回溯"
      ? synonymsOptions.value[index - 1].英文
      : synonymsOptions.value[index].英文;

  const exists = Array.from(uncertainVocabulary.value).find((vocab) => {
    return vocab.英文 === uncertainItem;
  });

  if (exists) {
    const types = exists.type.split(","); // 将 type 字符串分割为数组
    let updated = false;

    const updatedTypes = types.map((type) => {
      if (type.startsWith(content)) {
        // 如果 type 中已存在该 content，则增加计数
        const match = type.match(/(.+)\+(\d+)/);
        if (match) {
          const [_, baseContent, count] = match;
          updated = true;
          return `${baseContent}+${parseInt(count, 10) + 1}`;
        } else {
          updated = true;
          return `${content}+1`; // 初次重复时加上 "+1"
        }
      }
      return type;
    });

    if (!updated) {
      // 如果 type 中没有该 content，则添加
      updatedTypes.push(content);
    }

    // 合并更新后的类型数组为字符串，不会重复添加相同的 content
    exists.type = updatedTypes.join(",");
  } else {
    // 如果不存在相同的 '英文' 项，则添加新字典
    uncertainVocabulary.value.add({ 英文: uncertainItem, type: content });
  }
  console.log("uncertainVocabulary: ", uncertainVocabulary.value);
}

// 用于存储点击时间戳的 ref
const firstClickTime = ref(null);
const lastClickTime = ref(null);
const totalTimeInterval = ref(0);
const standardTimeInterval = ref(0);

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

  if (
    wasSelected &&
    !synonymsOptions.value[index].is_spell &&
    synonymsOptions.value[index].排除 !== "试题"
  ) {
    const content = "撤销";
    const uncertainItem = synonymsOptions.value[index].英文;

    const exists = Array.from(uncertainVocabulary.value).find((vocab) => {
      return vocab.英文 === uncertainItem;
    });

    if (exists) {
      const types = exists.type.split(","); // 将 type 字符串分割为数组
      let updated = false;

      const updatedTypes = types.map((type) => {
        if (type.startsWith(content)) {
          const match = type.match(/(.+)\+(\d+)/);
          if (match) {
            const [_, baseContent, count] = match;
            updated = true;
            return `${baseContent}+${parseInt(count, 10) + 1}`;
          } else {
            updated = true;
            return `${content}+1`; // 初次重复时加上 "+1"
          }
        }
        return type;
      });

      if (!updated) {
        updatedTypes.push(content);
      }

      exists.type = updatedTypes.join(",");
    } else {
      uncertainVocabulary.value.add({ 英文: uncertainItem, type: content });
    }
  }

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

const submitFlag = ref(false);
function isSelectionTrue(currentSlideIndex) {
  if (mergedData.value[currentSlideIndex]["is_spell"]) {
    const userSelection = resultDataTempt.value[currentSlideIndex]["用户选择"];
    const correctAnswer = mergedData.value[currentSlideIndex]["正确答案"];
    const userSelectionStr = userSelection.join("");
    if (correctAnswer === userSelectionStr) {
      return true;
    } else {
      return false;
    }
  } else if (mergedData.value[currentSlideIndex]["排除"] == "手写") {
    const userSelection = handwriteInputs.value[currentIndex.value];
    // console.log('userSelection: ', userSelection);
    const correctAnswer = mergedData.value[currentSlideIndex]["英文"];
    const cleanString = (str) =>
      (str || "").toLowerCase().replace(/[^a-z]/g, "");
    const userInput = cleanString(userSelection);
    // console.log("userInput: ", userInput);
    const target = cleanString(correctAnswer);
    // console.log("target: ", target);
    if (userInput && target && userInput === target) {
      return true;
    } else {
      return false;
    }
  } else {
    const userSelection = resultDataTempt.value[currentSlideIndex]["用户选择"];
    // console.log("userSelection: ", userSelection);
    const correctAnswer = mergedData.value[currentSlideIndex]["答案"];
    // console.log("mergedData: ", mergedData.value[currentSlideIndex]);
    const correctArray = correctAnswer
      .split(/；|,/)
      .map((item) => item.trim())
      .sort();
    const userArray = userSelection
      .join(",")
      .split(/；|,/)
      .map((item) => item.trim())
      .sort();
    const areEqual =
      correctArray.length === userArray.length &&
      correctArray.every((item) => userArray.includes(item));

    return areEqual;
  }
}
const goToNext = () => {
  // 获取当前轮播图的索引
  const currentSlideIndex = currentIndex.value;

  // 检查当前轮播图中的选中项
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
    // console.log("mergedData.value: ", mergedData.value);
    hasSelection = true;
  } else {
    hasSelection = currentSlideSelections.some(
      (key) => selectedIndexes.value[key]
    );
  }

  if (!hasSelection) {
    showFailToast("不能为空");
    return; // 如果没有选中项，直接返回，不进行后续操作
  }
  // 判断对错
  const areEqual = isSelectionTrue(currentSlideIndex);
  // console.log("areEqual: ", areEqual);
  if (!areEqual && flagPassiveMagic.value) {
    const randomChance = Math.random();
    if (randomChance < 0.7) {
      // if (randomChance < 2) {
      const audiosurpriseSound = new Audio(surpriseSound);
      audiosurpriseSound.play().catch((err) => {
        console.warn("播放失败：", err);
      });
      showAnimationPassiveMagic();
      pause();
      setTimeout(() => {
        currentRate.value = 100;
        timerRate.value = 100;
        resume();
      }, 3400);
      flagPassiveMagic.value = false;
      return;
    }
  }

  if (!isButtonDisabled.value) {
    const now = new Date().getTime();
    if (firstClickTime.value === null) {
      // 记录第一次点击的时间戳
      firstClickTime.value = now;
    } else {
      // 计算点击间隔
      const interval =
        (now - (lastClickTime.value || firstClickTime.value)) / 1000;
      totalTimeInterval.value += interval;
    }
    // 更新最后一次点击的时间戳
    lastClickTime.value = now;

    if (currentIndex.value < totalSlides.value - 1) {
      flagSingleOrMultiChoice.value = getSingeOrMultiChoice(
        currentIndex.value + 1
      );
      completeCount.value = (parseInt(completeCount.value) + 1).toString();
      swipeRef.value.next();
      currentRate.value = 100;
      timerRate.value = 100;
    } else {
      // 到达最后一个轮播图，执行提交函数
      console.log("totalTimeInterval: ", totalTimeInterval.value);
      console.log("standardTimeInterval: ", standardTimeInterval.value);
      if (submitFlag) {
        pause();
        clickSubmitUser();
      } else {
        if (totalTimeInterval.value <= standardTimeInterval.value) {
          submitFlag.value = true;
          clickSubmitUser();
        } else {
          showFailToast("监测到作弊行为，请重新作答");
        }
      }
    }
  }
  // console.log("synonymsOptions", synonymsOptions.value)
};

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

// 提交进度条
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

// 场外支援；暂停功能
const clickNumberPrev = ref(0);
const clickNumberShowAnswer = ref(0);
const clickNumberTransparent = ref(0);
// 记录遮罩打开和关闭的时间戳
const overlayOpenTime = ref(null);

const handleButtonClick = (buttonType) => {
  switch (buttonType) {
    case "gotoPre":
      clickNumberPrev.value++;
      break;
    case "autoSelectAnswer":
      clickNumberShowAnswer.value++;
      break;
    case "transparent":
      clickNumberTransparent.value++;
      break;
  }
};
const showOverlay = ref(true);
const pauseSwipe = () => {
  if (pauseBlackOverlay.value <= 0) {
    showToast("场外支援已达上限");
    return;
  };
  pauseBlackOverlay.value -= 1;

  showAnswerButton.value = true;
  durationRolling.value = 2;
  rollingTextRef.value.reset();
  usercoinsStart.value = usercoins.value;

  if (swipeHelpRef.value) {
    swipeHelpRef.value.show();
  }
  showMagicStart.value = true;
  pause();
  isButtonTransparentDisabled.value = false;
  showOverlay.value = true;
  changeOverlayColor("#000000");
  if (currentIndex.value != 0) {
    overlayOpenTime.value = new Date().getTime(); // 记录打开遮罩的时间戳
  }
};
const continueSwipe = () => {
  if (overlayOpenTime.value !== null) {
    const now = new Date().getTime();
    const interval = (now - overlayOpenTime.value) / 1000; // 计算时间间隔（秒）
    standardTimeInterval.value += interval;
    // console.log("Interval time:", interval.toFixed(2), "seconds");
    // console.log(
    //   "standardTimeInterval:",
    //   standardTimeInterval.value.toFixed(2),
    //   "s"
    // );
  }
  showOverlay.value = false;
  if (currentIndex.value != 0) {
    resume();
  }
};
// 场外支援

// 购买魔法
const priceMagic = ref(600);

async function consumeMagic(type) {
  isLoading.value = true;
  let params = new URLSearchParams();
  params.append("method", "consumeMagic");
  params.append("username", username.value);
  params.append("priceMagic", priceMagic.value);
  params.append("type", type);
  params.append("account_data_nid", nid.value);
  return await axios.post("words/", params).then((ret) => {
    return ret.data;
  });
}
const purchaseMagic = (buttonStyle) => {
  // 回溯
  if (buttonStyle == "gotoPre") {
    if (numberPrev.value > 0) {
      showToast("剩余0，才可购买");
      return;
    }
    if (usercoins.value < priceMagic.value) {
      showToast("余额不足");
      return;
    }
    showConfirmDialog({
      title: "确认购买吗？",
      message: `账户剩余${usercoins.value}金币，确定消费${priceMagic.value}来购买回溯单词一次吗？`,
      theme: "round-button",
    })
      .then(async () => {
        if (currentIndex.value == 0) {
          showFailToast("无法回溯");
          return;
        }
        rollingTextRef.value.reset();

        const res = await consumeMagic("回溯");

        // 更新 usercoinsEnd 并确保 DOM 已更新后触发动画
        usercoinsEnd.value = res["coins"];
        await nextTick();
        rollingTextRef.value.start();

        // 等待动画完成
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // 更新 usercoins
        usercoins.value = res["coins"];
        isLoading.value = false;
        gotoPreHelp(true);
        numberPrev.value = 0;
      })
      .catch(() => {
        // on cancel
      });
  }

  // 赠送答案
  if (buttonStyle == "autoSelect") {
    if (numberShowAnswer.value > 0) {
      showToast("剩余0，才可购买");
      return;
    }
    if (usercoins.value < priceMagic.value) {
      showToast("余额不足");
      return;
    }
    showConfirmDialog({
      title: "确认购买吗？",
      message: `账户剩余${usercoins.value}金币，确定消费${priceMagic.value}来购买赠送答案一次吗？`,
      theme: "round-button",
    })
      .then(async () => {
        rollingTextRef.value.reset();

        const res = await consumeMagic("点金");
        console.log("res: ", res);

        if (res.content == "日期") {
          const date = new Date(res.date);
          const datePlusOneHour = new Date(date.getTime() + 3600000);
          // console.log("datePlusOneHour: ", datePlusOneHour);

          const timeDifferenceInSeconds = computed(() => {
            const now = new Date(); // 每次计算时动态获取当前时间
            const timeDifferenceInMilliseconds = Math.abs(
              datePlusOneHour - now
            );
            return Math.floor(timeDifferenceInMilliseconds / 1000); // 转换为秒
          });
          // console.log(
          //   "timeDifferenceInSeconds: ",
          //   timeDifferenceInSeconds.value
          // );

          const formattedTimeDifference = computed(() => {
            const totalSeconds = timeDifferenceInSeconds.value;
            const minutes = Math.floor(totalSeconds / 60); // 计算分钟
            const seconds = totalSeconds % 60; // 剩余的秒数
            return `${minutes}分${seconds}秒`;
          });
          // console.log(formattedTimeDifference.value);

          showDialog({
            title: "每小时点金只能购买3次",
            message: `距离下次购买还有${formattedTimeDifference.value}`,
            theme: "round-button",
          });
          isLoading.value = false;
          numberShowAnswer.value = 0;
          return;
        }

        if (res.content == "金币") {
          usercoinsEnd.value = res["coins"];
          await nextTick(); // 更新 usercoinsEnd 并确保 DOM 已更新后触发动画
          rollingTextRef.value.start();
          // 更新 usercoins
          usercoins.value = res["coins"];
          isLoading.value = false;
          autoSelectAnswer(currentIndex.value, true);
          numberShowAnswer.value = 0;
        }
      })
      .catch(() => {
        // on cancel
      });
  }

  // 透视，凝固时间
  if (buttonStyle == "transparent") {
    if (numberTransparent.value > 0) {
      showToast("剩余0，才可购买");
      return;
    }
    if (usercoins.value < priceMagic.value) {
      showToast("余额不足");
      return;
    }
    showConfirmDialog({
      title: "确认购买吗？",
      message: `账户剩余${usercoins.value}金币，确定消费${priceMagic.value}来购买透视一次吗？`,
      theme: "round-button",
    })
      .then(async () => {
        rollingTextRef.value.reset();

        const res = await consumeMagic("透视");

        // 更新 usercoinsEnd 并确保 DOM 已更新后触发动画
        usercoinsEnd.value = res["coins"];
        await nextTick();
        rollingTextRef.value.start();

        // 更新 usercoins
        usercoins.value = res["coins"];
        isLoading.value = false;
        transparentHelp(true);
        numberTransparent.value = 0;
      })
      .catch(() => {
        // on cancel
      });
  }
};

// 暂停功能
const pauseBlackOverlay = ref(5);
// 魔法赠送答案
const numberShowAnswer = ref(2);
const disabledShowAnswer = ref(false);
const showAnswerButton = ref(true);
const showAnswerIsSpell = ref("");
const autoSelectAnswer = (index, flag) => {
  if (synonymsOptions.value[index].排除 == "手写") {
    showToast("拼写无法点金");
    return;
  }
  if (
    !synonymsOptions.value[index].is_spell &&
    synonymsOptions.value[index].排除 !== "试题" &&
    synonymsOptions.value[index].排除 !== "手写"
  ) {
    addUncertain(index, "点金");
  }
  const answerItem = answers.value.find(
    (item) => item.序号 === synonymsOptions.value[index].序号
  );
  if (answerItem) {
    showMagicStart.value = false; // 隐藏魔法启动，变小字体
    swipeHelpRef.value.hide();
    const correctAnswers = answerItem.中文.split("；");
    if (synonymsOptions.value[index]["is_spell"]) {
      // 拼写题提示答案
      function getRandomLetters(word) {
        // 将字符串转换为字符数组
        const letters = word.split("");
        // 确保第一个字母始终显示
        const result = [letters[0]];

        // 计算需要显示的字母总数，除了第一个字母以外的1/3
        const totalToShow = Math.ceil((letters.length - 1) / 3);

        // 随机选择剩余字母的位置
        const indices = new Set();
        while (indices.size < totalToShow) {
          const randomIndex =
            Math.floor(Math.random() * (letters.length - 1)) + 1; // 从第二个字母开始
          indices.add(randomIndex);
        }

        // 构建结果字符串
        for (let i = 1; i < letters.length; i++) {
          if (letters[i] === " ") {
            result.push("  "); // 如果是空格，继续用空格
          } else if (indices.has(i)) {
            result.push(letters[i]); // 显示随机选择的字母
          } else {
            result.push("()"); // 其余用 ___ 代替
          }
        }

        // 返回结果字符串
        return result.join("");
      }
      showAnswerIsSpell.value = getRandomLetters(answers.value[index].英文);
      showOverlay.value = false;
      currentRate.value = 100;
      timerRate.value = 100;
      continueSwipe();
      numberShowAnswer.value -= 1;
      if (flag == false && numberShowAnswer.value <= 0) {
        disabledShowAnswer.value = true;
      }
    } else {
      let availableAnswers = correctAnswers.filter((answer) => {
        const idx2 = synonymsOptions.value[index].中文.indexOf(answer);
        return idx2 !== -1 && !isSelected(index, idx2);
      });

      if (availableAnswers.length > 0) {
        const randomCorrectAnswer =
          availableAnswers[Math.floor(Math.random() * availableAnswers.length)];
        const index2 =
          synonymsOptions.value[index].中文.indexOf(randomCorrectAnswer);
        if (index2 !== -1) {
          numberShowAnswer.value -= 1;
          if (flag == false && numberShowAnswer.value <= 0) {
            disabledShowAnswer.value = true;
          }
          toggleCheckChinese(index, index2);
          changeOverlayColor("rgba(128, 128, 128, 0.6)");
          handleButtonClick("autoSelectAnswer");
          showAnswerButton.value = false;
          if (!isButtonTransparentDisabled.value) {
            setTimeout(() => {
              showAnswerButton.value = true;
              swipeHelpRef.value.show();
              changeOverlayColor("#000000");
              showMagicStart.value = true; // 恢复魔法启动，变回字体
            }, 6000);
          }
        }
      } else {
        showToast("已经全部显示");
        if (numberShowAnswer.value > 0) {
          numberShowAnswer.value -= 1;
        }
        disabledShowAnswer.value = numberShowAnswer.value === 0;
      }
    }
  }
};
// 透视功能
const overlayColor = ref("#000000");
const isButtonTransparentDisabled = ref(false);
const numberTransparent = ref(2);
const showMagicStart = ref(true);
const changeOverlayColor = (color) => {
  overlayColor.value = color;
};

const transparentHelp = (flag) => {
  //加入迟疑库
  if (
    !synonymsOptions.value[currentIndex.value].is_spell &&
    synonymsOptions.value[currentIndex.value].排除 !== "试题" &&
    synonymsOptions.value[currentIndex.value].排除 !== "手写"
  ) {
    addUncertain(currentIndex.value, "透视");
  }

  if (flag == false && numberTransparent.value <= 0) {
    showToast("次数为0，无法透视");
    return;
  }
  if (currentIndex.value == 0) {
    showFailToast("无需透视");
    return;
  }
  showMagicStart.value = false; // 隐藏魔法启动
  showAnswerButton.value = false;
  handleButtonClick("transparent");
  swipeHelpRef.value.hide();
  isButtonDisabled.value = false; // 下一个按钮变为可以点选
  numberTransparent.value -= 1; // 透视数字减1
  isButtonTransparentDisabled.value = true; // 一次场外支援只能透视一次
  currentRate.value = 100;
  timerRate.value = 100;

  changeOverlayColor("rgba(128, 128, 128, 0.6)");
};
// 回溯功能
const numberPrev = ref(2);
const gotoPreHelp = (flag) => {
  if (flag == false && numberPrev.value <= 0) {
    showToast("次数为0，无法回溯");
    return;
  }
  if (currentIndex.value == 0) {
    showFailToast("无法回溯");
    return;
  }

  // console.log(synonymsOptions.value);
  // console.log("currentIndex", currentIndex.value);
  //加入迟疑库
  if (
    !synonymsOptions.value[currentIndex.value - 1].is_spell &&
    synonymsOptions.value[currentIndex.value - 1].排除 !== "试题" &&
    synonymsOptions.value[currentIndex.value - 1].排除 !== "手写"
  ) {
    addUncertain(currentIndex.value, "回溯");
  }

  console.log("currentIndex: ", currentIndex.value);
  console.log("synonymsOptions", synonymsOptions.value);
  if (synonymsOptions.value[currentIndex.value - 1].排除 == "手写") {
    handwriteAnswers.value = handwriteAnswers.value.filter(
      (item) => Number(item.序号) !== Number(currentIndex.value)
    );
  }
  console.log("handwriteAnswers: ", handwriteAnswers.value);

  flagSingleOrMultiChoice.value = getSingeOrMultiChoice(currentIndex.value - 1);
  handleButtonClick("gotoPre");
  const now = new Date().getTime();
  const interval = (now - firstClickTime.value) / 1000; // 计算时间间隔（秒）
  standardTimeInterval.value += interval;
  // console.log("standardTimeInterval: ", standardTimeInterval.value);

  swipeHelpRef.value.hide();
  completeCount.value = (parseInt(completeCount.value) - 1).toString();
  isButtonDisabled.value = false;
  swipeRef.value.prev();
  showOverlay.value = false;
  numberPrev.value -= 1;
};

// 动画场外支援
const swipeHelpRef = ref(null);

// 被动技能
const passiveMagicRef = ref(null);
const passiveMagic2Ref = ref(null);
const flagPassiveMagic = ref(false);
function showAnimationPassiveMagic() {
  // 加入迟疑库
  if (
    !synonymsOptions.value[currentIndex.value].is_spell &&
    synonymsOptions.value[currentIndex.value].排除 !== "试题" &&
    synonymsOptions.value[currentIndex.value].排除 !== "手写"
  ) {
    addUncertain(currentIndex.value, "被动魔法");
  }

  // console.log("currentIndex.value: ", currentIndex.value);
  if (synonymsOptions.value[currentIndex.value].排除 == "手写") {
    handwriteAnswers.value = handwriteAnswers.value.filter(
      (item) => Number(item.序号) !== Number(currentIndex.value + 1)
    );
  }
  // console.log('handwriteAnswers: ', handwriteAnswers.value);
  passiveMagicRef.value.show();
  setTimeout(() => {
    passiveMagicRef.value.hide();
    passiveMagic2Ref.value.show();
    setTimeout(() => {
      passiveMagic2Ref.value.hide();
    }, 1500);
  }, 1800);
}

const srcTheme = ref();

// 计时器
const timerRate = ref(0);
const autoplay2 = ref(8000);
const autoplayInit = ref("");
const currentRate = ref(100);
const swipeRef = ref(null);
const completeCount = ref("1");
const currentIndex = ref(0);
const totalSlides = ref(25); // 假设总共有5个轮播图项
const isButtonDisabled = ref(false);
const remainingSeconds = ref(0);
const circleColor = ref("#1989fa");
// const circleColor = computed(() => {
//   if (remainingCount.value <= 5) {
//     return '#ee0a24'; // 红色 - 当剩余5个时
//   } else if (timerRate.value <= 50) {
//     return '#ffd21e'; // 黄色 - 当进度过半时
//   } else {
//     return '#1989fa'; // 蓝色 - 默认状态
//   }
// });
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
const resetTimer = () => {
  pause();
  // 更新点击的时间戳
  const now = new Date().getTime();
  const interval = (now - (lastClickTime.value || firstClickTime.value)) / 1000;
  totalTimeInterval.value += interval;
  // console.log("Time interval between clicks:", totalTimeInterval.value, "s");
  setTimeout(() => {
    // 判断对错
    const areEqual = isSelectionTrue(currentIndex.value);
    if (!areEqual && flagPassiveMagic.value) {
      const randomChance = Math.random();
      if (randomChance < 0.7) {
        const audiosurpriseSound = new Audio(surpriseSound);
        audiosurpriseSound.play().catch((err) => {
          console.warn("播放失败：", err);
        });
        showAnimationPassiveMagic();
        pause();
        setTimeout(() => {
          currentRate.value = 100;
          timerRate.value = 100;
          resume();
        }, 3400);
        flagPassiveMagic.value = false;
        return;
      }
    }

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

        lastClickTime.value = now;
        currentRate.value = 100;
        timerRate.value = 100;
        completeCount.value = (parseInt(completeCount.value) + 1).toString();
        isButtonDisabled.value = false; // 恢复按钮点击
        resume();
      }, 0); // 确保视图更新后再开始计时
    } else {
      // 提交

      // console.log("totalTimeInterval: ", totalTimeInterval.value);
      // console.log("standardTimeInterval: ", standardTimeInterval.value);
      if (totalTimeInterval.value <= standardTimeInterval.value) {
        clickSubmitUser();
      } else {
        showFailToast("监测到作弊行为，请重新作答");
      }
    }
  }, 0);
};
const executedWords = new Set();
const handleTimerRate = () => {
  const currentWordIndex = currentIndex.value; // 当前词的索引

  // 检查 timerRate.value 是否小于 20 且当前词没有被执行过
  const now = new Date().getTime();
  const interval = (now - (lastClickTime.value || firstClickTime.value)) / 1000;
  // if (timerRate.value < 20 && !executedWords.has(currentWordIndex)) {
  // console.log('interval', interval);
  if (
    interval > 6 &&
    !executedWords.has(currentWordIndex) &&
    !synonymsOptions.value[currentWordIndex].is_spell &&
    synonymsOptions.value[currentWordIndex].排除 !== "试题" &&
    synonymsOptions.value[currentWordIndex].排除 !== "手写"
  ) {
    addUncertain(currentIndex.value, "超时");
    // 将当前词标记为已执行
    executedWords.add(currentWordIndex);
  }
};
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
let hasShownEncouragement2 = false;
const isExtended = ref(false);
watch(isOverHalf, (newVal) => {
  if (newVal && !hasShownEncouragement) {
    hasShownEncouragement = true;
    isExtended.value = true;
    circleColor.value = "#ffd21e";

    const audio = new Audio(woohooSound);
    audio.play().catch((err) => {
      console.warn("播放失败：", err);
    });

    showEncouragement.value = true;

    // console.log("autoplay2: ", autoplay2.value);
    setTimeout(() => {
      showEncouragement.value = false;
    }, 1500);
  }
});
watch(remainingCount, (newVal) => {
  if (newVal <= 5 && !hasShownEncouragement2) {
    hasShownEncouragement2 = true;
    isExtended.value = true;
    circleColor.value = "#ee0a24";
    const audio = new Audio(woohooSound);
    audio.play().catch((err) => {
      console.warn("播放失败：", err);
    });

    showEncouragement2.value = true;
    setTimeout(() => {
      showEncouragement2.value = false;
    }, 1500);
  }
});
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
      handleTimerRate();
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
const handleSwipeChange = (index) => {
  // 到下一个页面自动触发
  nextTick(() => {
    const el = swipeRef.value?.$el?.querySelector(
      `.van-swipe-item:nth-child(${index + 1}) .card`
    );
    if (el) {
      currentHeight.value = el.offsetHeight;
      // console.log('当前 swipe-item 高度：', currentHeight.value);
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
      autoplay2.value = autoplayInit.value + 2000;
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
  showAnswerIsSpell.value = "";
  // selectedItems.value = [];
  currentIndex.value = index;
  currentRate.value = 100;
  timerRate.value = 100;
  pause(); // 暂停计时器
  resume();
};

watch(overlayColor, (newColor) => {
  document.documentElement.style.setProperty(
    "--van-overlay-background",
    newColor
  );
});
// const handleBeforeUnload = (event) => {
const handlePageHide = (event) => {
  sessionStorage.setItem(
    "numberShowAnswer",
    JSON.stringify(numberShowAnswer.value)
  );
  sessionStorage.setItem(
    "numberTransparent",
    JSON.stringify(numberTransparent.value)
  );
  sessionStorage.setItem("numberPrev", JSON.stringify(numberPrev.value));
};

// 连胜奖励
const shoWinningStreak = ref(false);
const activeWinningStreak = ref(0);
const dailyWinningStreak = ref(0);
const rate2 = ref(0);
const new_final_rate = ref(0);

const compareResult2 = ref("");
const accountDataResult2 = ref("");
const newCoins2 = ref("");

const handleContinue = () => {
  // 用户点击继续按钮
  redirect(accountDataResult2.value);
};
const handleAutoClose = () => {
  // 8秒后自动关闭
};
const redirect = (accountDataResult) => {
  router.push({
    path: "/studentAccountAnswer",
    state: {
      uncertainResult: JSON.stringify(Array.from(uncertainVocabulary.value)),
      compareResult: JSON.stringify(compareResult2.value), // 注意这里需要用 .value
      userSelected: JSON.stringify(synonymsSelected.value),
      nid: nid.value,
      rate: accountDataResult.rate,
      halfTrue: rate2.value, // 注意这里需要用 .value
      newCoins: newCoins2.value,
      username: username.value,
      account_log_id: accountDataResult["new_log_nid"],
      spellVocabulary: JSON.stringify(spellVocabulary.value),
      lock_spell: lock_spell.value,
      complement: 1.5 - rate2.value, // 注意这里需要用 .value
      RateOrigin: RateOrigin.value,
    },
  });
};

const handleVisibilityChange = () => {
  if (document.hidden) {
    console.log("用户离开了页面");

    // 执行你的逻辑,比如暂停视频、停止请求等
  } else {
    console.log("用户回到了页面");
    showDialog({
      title: "警告",
      message: "中途退出，重新背诵",
      theme: "round-button",
    }).then(() => {
            router.push({
        path: "/homepage",
      });
    });

    setTimeout(() => {
      router.push({
        path: "/homepage",
      });
    }, 3000);

    // 执行恢复逻辑
  }
};

const titleData = ref("");
const username = ref("");
const alias = ref("");
const selectedResults = ref({});
const usercoins = ref(0);
const submittoken = ref("");
const usercoinsStart = ref(0);
const usercoinsEnd = ref(0);
const rollingTextRef = ref(null);
const durationRolling = ref(0.8);
const isRewardEligible = ref(true);
const lock_spell = ref(false);
const spellVocabulary = ref([]);
const checkedNoneOfAbove = ref(false);
const checkedSpell = ref(false);
const RateOrigin = ref(0);
onBeforeUnmount(() => {
  window.removeEventListener("pagehide", handlePageHide);
});
onUnmounted(() => {
  window.removeEventListener("beforeunload", handleBeforeUnload);
  document.removeEventListener("visibilitychange", handleVisibilityChange);
});
function handleBeforeUnload(event) {
  event.preventDefault();
  event.returnValue = ""; // 显示浏览器默认的“离开页面”确认对话框
}
onMounted(async () => {
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("beforeunload", handleBeforeUnload);
  if (flagTheme.value == 1) {
    srcTheme.value = shouxieSrcGoatAndWolf;
    srcswipeEncouragement.value = swipeEncouragementSrcGoatAndWolf;
    srcswipeEncouragement2.value = swipeEncouragementSrcGoatAndWolf2;
  }
  if (flagTheme.value == 2) {
    srcTheme.value = shouxieBears;
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
  // 被动技能
  flagPassiveMagic.value = passive_magic.value;
  // flagPassiveMagic.value = true;
  console.log("flagPassiveMagic", flagPassiveMagic.value);

  // 监测恶意刷新
  window.addEventListener("pagehide", handlePageHide);
  // 监测恶意刷新
  numberShowAnswer.value = JSON.parse(
    sessionStorage.getItem("numberShowAnswer")
  );
  if (numberShowAnswer.value == null) numberShowAnswer.value = 2;

  numberTransparent.value = JSON.parse(
    sessionStorage.getItem("numberTransparent")
  );
  if (numberTransparent.value == null) numberTransparent.value = 2;

  numberPrev.value = JSON.parse(sessionStorage.getItem("numberPrev"));
  if (numberPrev.value == null) {
    numberPrev.value = 2;
  }

  if (
    numberShowAnswer.value != 2 ||
    numberTransparent.value != 2 ||
    numberPrev.value != 2
  ) {
    showDialog({
      title: "警告",
      theme: "round-button",
      message: "监测到可能的恶意刷新\n场外支援被重置到刷新前状态",
    });
  }
  if (numberShowAnswer.value == 0) {
    disabledShowAnswer.value = true;
  }
  currentRate.value = 100;
  timerRate.value = 100;
  const toast = showLoadingToast({
    duration: 0,
    forbidClick: true,
    message: "加载音频...",
    loadingType: "spinner",
  });
  document.documentElement.style.setProperty(
    "--van-overlay-background",
    overlayColor.value
  );

  const initData = async () => {
    // 初始化数据
    checkedNoneOfAbove.value = history.state.checkedNoneOfAbove;
    checkedSpell.value = history.state.checkedSpell;
    // console.log("history.state: ", history.state);
    const data = JSON.parse(history.state.data);

    // console.log("data: ", data);

    autoplay2.value = history.state.autoplay2;
    autoplayInit.value = history.state.autoplay2;
    // console.log("autoplay2: ", autoplay2.value);

    remainingSeconds.value = (autoplay2.value / 1000).toString();
    totalSlides.value = data.answers.length;

    console.log("totalSlides", totalSlides.value);
    alias.value = data.alias;
    lock_spell.value = history.state.lock_spell;
    if (lock_spell.value) {
      async function getSpellVocabulary() {
        let params = new URLSearchParams();
        params.append("method", "getSpellVocabulary");
        params.append("username", data.username);
        params.append("account_data_id", data.nid);
        return await axios.post("words/", params).then((ret) => {
          return ret.data.spell_vocabulary_records;
        });
      }
      getSpellVocabulary().then((res) => {
        spellVocabulary.value = res.flatMap((item) => {
          let dataString = item["data_words"]
            .replace(/(\W)'|'(\W)/g, '$1"$2')
            .replace(/([{,]\s*)'([^']+?)'(\s*[:])/g, '$1"$2"$3');
          return JSON.parse(dataString);
        });
        console.log("spellVocabulary", spellVocabulary.value);
      });
    }

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

    titleData.value = data.title;

    // console.log("titleData: ", titleData.value);

    const keywords = [
      "中考",
      "初中",
      "七年级",
      "八年级",
      "九年级",
      "小升初",
      "六年级",
    ];
    if (keywords.some((keyword) => titleData.value.includes(keyword))) {
      numberShowAnswer.value = 1;
      numberTransparent.value = 1;
      numberPrev.value = 1;
    }

    if (titleData.value.length <= 20) {
      numberShowAnswer.value = 1;
    }

    username.value = data.username;

    submittoken.value = new Date().getTime();
    console.log("submittoken: ", submittoken.value);

    const trueCount_is_spell =
      synonymsOptions.value.filter((item) => item.is_spell === true).length ||
      0;
    standardTimeInterval.value =
      (totalSlides.value - 1) * (autoplay2.value / 1000) +
      0.2 * totalSlides.value +
      trueCount_is_spell * 17000 +
      3;
    // console.log("standardTimeInterval: ", standardTimeInterval.value);

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

    toast.close();

    // 启动滚动文字动画
    await nextTick(); // 确保 DOM 更新完毕后再启动动画
    rollingTextRef.value.start();

    // 在动画启动后隐藏覆盖层
    setTimeout(() => {
      showOverlay.value = false;
    }, 1500);
  };

  // 调用初始化函数
  initData();
});
</script>

<template>
  <div class="parent-container">
    <div class="nav-bar-container">
      <van-nav-bar
        title="学生题目"
        left-text=""
      >
      </van-nav-bar>
    </div>

    <van-overlay
      :show="showOverlay"
      z-index="100"
      class="overlay-container"
      @click="continueSwipe"
    >
      <van-icon name="cross" class="close-icon" @click.stop="continueSwipe" />
      <div class="swipe-help-container">
        <swipeHelp ref="swipeHelpRef" style="margin-right: 10px" />
      </div>
      <div class="space">
        <div class="space-buttons">
          <div style="color: gray; font-size: 12px; margin-left: 10px">
            剩余
            <van-rolling-text
              ref="rollingTextRef"
              :start-num="usercoinsStart"
              :target-num="usercoinsEnd"
              :auto-start="false"
              :duration="durationRolling"
              style="
                --van-rolling-text-color: gray;
                --van-rolling-text-item-width: 10px;
                --van-rolling-text-font-size: 12px;
                --van-rolling-text-gap: -2px;
              "
            />
            金币：每次消费 {{ priceMagic }}
          </div>
          <div
            v-show="showAnswerButton"
            class="button-container"
            style="margin-top: -15px"
          >
            <van-button
              type="warning"
              block
              @click.stop="gotoPreHelp(false)"
              icon="replay"
              class="custom-button"
              >回溯 🚗 + {{ numberPrev }}</van-button
            >
            <van-button
              icon="plus"
              type="warning"
              color="linear-gradient(to right, #FFD1B3, #FF6034)"
              class="custom-button-plus"
              @click.stop="purchaseMagic('gotoPre')"
            >
              购买</van-button
            >
          </div>

          <div class="button-description">回退到上一个单词</div>
          <div class="button-container" style="margin-top: -5px">
            <van-button
              :disabled="disabledShowAnswer"
              type="success"
              block
              @click.stop="autoSelectAnswer(currentIndex, false)"
              icon="aim"
              class="custom-button"
              >点金 🎉 + {{ numberShowAnswer }}</van-button
            >
            <van-button
              icon="plus"
              type="warning"
              color="linear-gradient(to right, #A4E8C0, #0DC160)"
              class="custom-button-plus"
              @click.stop="purchaseMagic('autoSelect')"
            >
              购买</van-button
            >
          </div>
          <div class="button-description">随机赠送一个答案</div>
          <div class="button-container" style="margin-top: -5px">
            <van-button
              type="primary"
              block
              :disabled="isButtonTransparentDisabled"
              @click.stop="transparentHelp(false)"
              icon="eye-o"
              class="custom-button"
              >透视 👓 + {{ numberTransparent }}</van-button
            >
            <van-button
              icon="plus"
              type="warning"
              color="linear-gradient(to right, #A3C9FA, #1A89FA)"
              class="custom-button-plus"
              @click.stop="purchaseMagic('transparent')"
            >
              购买</van-button
            >
          </div>
          <div class="button-description">时间被凝固</div>
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
                            style="font-size: 17px; color: red"
                          >
                            {{ flagSingleOrMultiChoice }}
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
              style="width: 103.5px"
              >{{ textButtonNext }}</van-button
            >
          </van-col>
          <!-- span="4" -->
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
            {{ showAnswerIsSpell }}
          </van-col>
          <!-- <van-col span="8"><img :src="srcTheme" alt="swipeHelp" v-show="showShouxie"></van-col> -->
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
          <van-col span="9" offset="">
            <van-button type="warning" @click="pauseSwipe" size="normal"
              >场外支援: {{ pauseBlackOverlay }}</van-button
            >
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
    <submitloading v-if="isLoading" />
    <passive-magic ref="passiveMagicRef" />
    <passive-magic-2 ref="passiveMagic2Ref" />
    <WinningStreakPopup
      v-model:show="shoWinningStreak"
      :active-step="activeWinningStreak"
      :daily-step="dailyWinningStreak"
      :rate-step="new_final_rate"
      :flag-theme="flagTheme"
      @continue="handleContinue"
      @auto-close="handleAutoClose"
    />
  </div>
</template>




<style scope>
html {
  touch-action: manipulation; /* 禁用双击缩放 */
}
.my-swipe {
  margin-top: 30px;
}

.overlay-container .van-overlay {
  display: flex;
  flex-direction: column;
  background-color: var(--van-overlay-background);
  justify-content: center;
}

.swipe-help-container {
  height: 40%;
}

.close-icon {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 24px;
  color: white;
  cursor: pointer;
}

.space {
  height: 52%;
  font-size: 30px;
  font-weight: 700;
  color: #ee0a24;
  display: flex;
  flex-direction: column;
  width: 95%;
  align-items: center;
}

.space-text {
  font-size: 18px;
  color: darkred;
}

.space-buttons {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: end;
  justify-content: center;
  margin-top: auto;
}
.button-container {
  display: flex;
  width: 95%;
  align-items: center;
}
.custom-button {
  width: 95%;
  margin-top: 10px;
  height: 50px; /* 固定按钮高度 */
}
.custom-button-plus {
  font-size: 10px;
  width: 30%;
  margin-top: 10px;
  height: 50px; /* 固定按钮高度 */
}
.button-description {
  font-size: 12px;
  color: white;
  margin-top: 3px;
  margin-bottom: 0px;
  text-align: center; /* 新增 */
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
</style>
