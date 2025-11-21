<script setup>
import {
  watch,
  onMounted,
  onUnmounted,
  ref,
  getCurrentInstance,
  onBeforeUpdate,
  computed,
  nextTick,
  onBeforeUnmount,
  reactive,
  inject,
} from "vue";
import {
  showFailToast,
  showDialog,
  showConfirmDialog,
  showLoadingToast,
  showToast,
  Toast,
} from "vant";

import { useRouter } from "vue-router";
import encouragement from "./encouragement.vue";
import helpforgood from "./helpforgood.vue";
import helpforbad from "./helpforbad.vue";
import submitloading from "./submitloading.vue";
import WinningStreakPopupPc from "./WinningStreakPopupPc.vue";

import happyhalf from "../assets/sound/happyhalf.mp3";

const flagTheme = inject("flagTheme");
const router = useRouter();
const instance = getCurrentInstance();
const axios = instance.appContext.config.globalProperties.$ajax;
const isLoading = ref(false);

// 导航栏数据
const navTitle = ref("");
const navUsername = ref("");

const synonymsOptions = ref([]);
const synonymsSelected = ref([]);
const answers = ref([]);
const checkboxRefs = ref([]);
const nid = ref("");

// 提交按钮
const showDialogSubmit = ref(false);
const mergedData = ref([]);
const showDataEmpty = ref(false);

const submitSelection = () => {
  // 右上角提交
  showDialogSubmit.value = true;
};
const mergeSynonymAndSelections = (synonymsSelectedChinese) => {
  // console.log("mergedData", mergedData.value);
  // console.log("synonymsSelectedChinese", synonymsSelectedChinese);
  // console.log("---------------------------");
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
  return newList;
};
const convertSelections = (synonymsSelected, synonymsOptions) => {
  const resultMap = new Map();

  // 初始化每个序号为 ["无"]
  synonymsOptions.forEach((option) => {
    resultMap.set(option.序号, ["无"]);
  });

  // 添加多选的中文项
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
  if (handwriteAnswers.value.length > 0) {
    handwriteAnswers.value.forEach(({ 序号, 英文 }) => {
      if (!英文?.trim()) return;
      const current = resultMap.get(序号);
      if (current && !current.includes(英文)) {
        // 如果当前是 ["无"]，则替换
        if (current.length === 1 && current[0] === "无") {
          resultMap.set(序号, [英文]);
        } else {
          resultMap.get(序号).push(英文);
        }
      }
    });
  }

  // 返回按序号排序的结果数组
  return Array.from(resultMap, ([序号, 中文]) => ({ 序号, 中文 })).sort(
    (a, b) => a.序号 - b.序号
  );
};

const compareAndAddFlag = (dictArray) => {
  return dictArray.map((item) => {
    const { 答案, 用户选择, 正确答案, is_spell, 排除, 英文 } = item;

    // 统一处理分隔符，将所有中文分号和逗号替换为英文逗号，然后进行分割和修整
    const normalize = (str) =>
      str
        .replace(/；/g, ",")
        .replace(/，/g, ",")
        .split(",")
        .map((s) => s.trim());

    const answerArray = normalize(答案).sort();
    // console.log('answerArray', answerArray);

    const correctAnswerArray = 正确答案 ? normalize(正确答案).sort() : [];
    const userSelectionArray = normalize(用户选择.join(",")).sort();

    // 计算匹配情况
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
      const cleanString = (str) =>
        (str || "").toLowerCase().replace(/[^a-z]/g, "");
      const userInput = cleanString(用户选择[0]);
      const target = cleanString(英文);

      if (userInput && target && userInput === target) {
        flag = "true";
      } else {
        flag = "false";
      }
    } else {
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

const clickSubmitUser = async (action, done) => {
  // 输入用户名后，确认提交
  if (action === "confirm") {
    // 合并答案和选项
    showDialogSubmit.value = false;
    mergedData.value = mergeAnswerAndSynonym();

    // 将用户选择转化为中文
    const synonymsSelectedChinese = convertSelections(
      synonymsSelected.value,
      synonymsOptions.value
    );
    // console.log('synonymsSelectedChinese', synonymsSelectedChinese)
    // 将中文用户选择和选项答案合并
    const synonymAndSelections = mergeSynonymAndSelections(
      synonymsSelectedChinese
    );
    // console.log('synonymAndSelections', synonymAndSelections)
    // 比对结果给出flag
    const compareResult = compareAndAddFlag(synonymAndSelections);

    // 处理迟疑库
    function handleUncertain(uncertainVocabulary, compareResult) {
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
    // console.log('lock_spell', lock_spell.value);
    if (!lock_spell.value) {
      function getSpellVocabulary(compareResult, uncertainVocabulary) {
        const spellVocabularyResult = []; // 这里使用局部变量，避免混淆
        const addedEnglishSet = new Set();
        const chineseCharacterRegex = /[\u4e00-\u9fa5]/;

        function isPhrase(text) {
          return /\s|,|\/|\.|…|-|_|'/.test(text);
        }
        function containsChineseSemicolon(str) {
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
          if (
            item.flag !== "true" &&
            !addedEnglishSet.has(english) &&
            !isPhrase(english) &&
            typeof correctAnswer === "string" &&
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
      // console.log("uncertainVocabulary", uncertainVocabulary.value);
      spellVocabulary.value = getSpellVocabulary(
        compareResult,
        uncertainVocabulary.value
      ); // 确保将结果赋值给响应式变量的 .value 属性
    } else {
      spellVocabulary.value = spellVocabulary.value; // 保持 spellVocabulary 的值
    }

    // console.log("spellVocabulary", spellVocabulary.value);

    // 计算金币
    // console.log('isRewardEligible: ', isRewardEligible);
    function calculateAccuracy(compareResult) {
      const total = compareResult.length;
      const correct = compareResult.filter(
        (item) => item.flag === "true"
      ).length;
      return ((correct / total) * 100).toFixed(2);
    }
    if (isRewardEligible.value) {
      // console.log('calculateAccuracy', calculateAccuracy(compareResult))
      if (calculateAccuracy(compareResult) < 55) {
        totalCoins.value = 0;
      } else {
        totalCoins.value = compareResult.reduce((coins, item) => {
          return item.flag === "true" ? coins + 5 : coins;
        }, 0);
      }
    } else {
      totalCoins.value = 0;
    }
    console.log("totalCoins: ", totalCoins.value);
    console.log("compareResult:", compareResult);
    let containsUnselected = compareResult.some((item) =>
      item.用户选择.includes("无")
    );
    // containsUnselected = false;
    // console.log("containsUnselected", containsUnselected);
    if (containsUnselected) {
      function notifyDataEmpty() {
        showDataEmpty.value = true;
        setTimeout(() => {
          showDataEmpty.value = false;
        }, 1500);
      }
      notifyDataEmpty();
      // showDialogSubmit.value = false;
      clickScroll();
    } else {
      // console.log("compareResult: ", compareResult);
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
            if (halfCount > 2) {
              return 0;
            }
          }
        }
        if (trueCount === compareResult.length) {
          return 1;
        }

        return halfCount <= 2 ? 0.5 : false;
      }
      const rate = checkFlags(compareResult);
      console.log("rate: ", rate);

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
        params.append("swipe", 0);
        params.append("type", 0);
        params.append("coins", totalCoins.value);

        // 更新Accountlog
        params.append("log", JSON.stringify(compareResult));
        params.append("title", titleData.value);
        params.append("username", username.value);
        params.append("alias", alias.value);
        params.append("mode", "普通");
        params.append("numberprev", 0);
        params.append("numbershowanswer", 0);
        params.append("numbertransparent", 0);
        params.append("numbertransparent", 0);
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
        params.append("type", "普通");
        params.append(
          "vocabulary",
          JSON.stringify(Array.from(uncertainVocabulary.value))
        );
        return await axios.post("words/", params).then((ret) => {
          return ret.data;
        });
      }

      // 开始加载
      // 创建一个超时的 Promise
      const timeoutPromise = new Promise(
        (_, reject) => setTimeout(() => reject(new Error("请求超时")), 6000) // 6秒超时
      );
      isLoading.value = true;
      startAnimation();

      console.log("compareResult", compareResult);
      if (compareResult.length == 0) {
        showFailToast("提交数据不能为空");
        isLoading.value = false;
        return;
      } else {
        // 如果 updateAccountlog 成功，继续执行其他操作
        const updateAccountPromise = updateAccountData();
        // console.log("accountDataResult: ", accountDataResult);

        let accountDataResult;
        try {
          accountDataResult = await Promise.race([
            updateAccountPromise,
            timeoutPromise,
          ]);
          accountDataResult2.value = accountDataResult;
          new_final_rate.value = accountDataResult["rate"];
          if (accountDataResult["message"] === "不能提交相同内容") {
            console.log("accountDataResult: ", accountDataResult);
            isLoading.value = false;
            showDialog({
              title: "恭喜！提交成功！",
              message: "跳转答案页",
              theme: "round-button",
              width: '360px',
            }).then(() => {
              activeWinningStreak.value =
                accountDataResult["today_record_count"];
              dailyWinningStreak.value =
                accountDataResult["daily_record_count"];
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
              width: '360px',
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
          let UncertainResult;
          console.log("uncertainVocabulary:", uncertainVocabulary.value);
          // console.log(accountDataResult.new_log_nid);
          try {
            if (uncertainVocabulary.value.size != 0) {
              await updateUncertain(accountDataResult.new_log_nid);
            }
          } catch (error) {
            console.log("更新不确定词汇时发生错误:", error);
          } // console.log('UncertainResult', UncertainResult);

          console.log("spellVocabulary:", spellVocabulary.value);

          // 如果所有操作都成功，处理结果
          isLoading.value = false;
          // console.log(accountDataResult);
          // console.log(rate);

          // 清楚store
          sessionStorage.removeItem("showAnswerMagic");
          sessionStorage.removeItem("showMagic");
          sessionStorage.removeItem("flagHelp");
          // 执行页面跳转等其他操作
          if (
            accountDataResult &&
            accountDataResult["message"] !== "不能提交相同内容"
          ) {
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
      }
    }
  } else if (action === "cancel") {
    showDialogSubmit.value = false;
  }
};

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

  console.log("selectedItems: ", selectedItems);
  // 将中文用户选择和选项答案合并
  resultDataTempt.value = mergeSynonymAndSelections(synonymsSelectedChinese);
};

// 购买功能

const showMagic = ref(false);
const showAnswerMagic = ref(false);
const popup = ref(null);
const yesornotShowAnswer = ref(false);
const isabledPurchase = ref(false);
const usercoinsStart = ref(0);
const usercoinsEnd = ref(0);
const rollingTextRef = ref(null);
const durationRolling = ref(1);
const priceMagic = ref(800);
const usercoins = ref(0);
const compareResultFalse = ref([]);
const overlayColor = ref("rgba(128, 128, 128, 0.6)"); // 设定默认颜色
const themeVars = {
  "--van-popup-background": "transparent",
};

// 获取用户金币
const getUserCoins = async () => {
  let params = new URLSearchParams();
  params.append("method", "getUserCoins");
  params.append("username", username.value);
  const response = await axios.post("words/", params);
  return response.data;
};
async function consumeMagic() {
  isLoading.value = true;
  let params = new URLSearchParams();
  params.append("method", "consumeMagic");
  params.append("username", username.value);
  params.append("priceMagic", priceMagic.value);
  params.append("type", "普通");
  params.append("account_data_nid", nid.value);
  return await axios.post("words/", params).then((ret) => {
    return ret.data;
  });
}
const purchaseMagic = async () => {
  if (yesornotShowAnswer.value) {
    showAnswerMagic.value = true;
  } else {
    showMagic.value = true;
    const res = await getUserCoins();
    flagHelp.value = false;
    usercoins.value = res["data_coins"][0]["coins"];
    usercoinsEnd.value = res["data_coins"][0]["coins"];
    await nextTick(); // 确保 DOM 更新完毕后再启动动画
    rollingTextRef.value.start();
  }
};
const handlePurchaseMagic = (action, done) => {
  if (action === "confirm" || action === "cancel") {
    done();
  }
};
const purchaseConfirm = async () => {
  // 合并答案和选项
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
  const allFlagsTrue = compareResult.every((item) => item.flag == "true");
  if (allFlagsTrue) {
    showAnimationShineHelpForGood();
    isabledPurchase.value = true;
    return;
  }
  // 计算金币
  totalCoins.value = compareResult.reduce((coins, item) => {
    return item.flag === "true" ? coins + 5 : coins;
  }, 0);
  console.log("totalCoins: ", totalCoins.value);

  // const containsUnselected = compareResult.some((item) =>
  //   item.用户选择.includes("无")
  // );
  // if (containsUnselected) {
  //   showFailToast("需要全部完成");
  //   return;
  // } else {
  if (usercoins.value < priceMagic.value) {
    showFailToast("余额不足");
    return;
  } else {
    compareResultFalse.value = compareResult.filter(
      (item) => item.flag != "true"
    );
    // 购买成功

    rollingTextRef.value.reset();
    const res = await consumeMagic();
    usercoinsEnd.value = res["coins"];
    await nextTick();
    rollingTextRef.value.start();
    usercoins.value = res;
    isLoading.value = false;
    isabledPurchase.value = true;
    yesornotShowAnswer.value = true;
    // console.log('compareResultFalse', compareResultFalse);
    setTimeout(() => {
      showAnswerMagic.value = true;
      showMagic.value = false;
    }, 2000);
  }
  // }
};

// 添加滚动功能
const myList = ref([]);
const setItemRef = (el, index) => {
  if (el) {
    myList.value[index] = el;
  }
};
const scrollToItem = (index) => {
  // 保留你原有的逻辑：如果是最后两个，展开底部面板
  if (index >= synonymsOptions.value.length - 2) {
    heightScroll.value = 65;
  }

  // 获取目标元素
  const item = myList.value[index];
  
  if (item) {
    // 方案 A：最简单推荐（自动找到中心位置）
    // block: 'center' 会把元素滚动到屏幕中间，'start' 会滚动到顶部
    item.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // 方案 B：如果你一定要精确控制 "向上偏移 50px" 且是对 .main-content 滚动
    /*
    const container = document.querySelector('.main-content'); // 获取右侧滚动容器
    if (container) {
      // 计算元素相对于容器的位置
      const top = item.offsetTop - 50; 
      container.scrollTo({
        top: top,
        behavior: 'smooth',
      });
    }
    */
  }
};
const clickScroll = () => {
  const indexNoEmpty = resultDataTempt.value.findIndex(
    (item) => item.用户选择[0] == "无"
  );
  if (indexNoEmpty !== -1) {
     scrollToItem(indexNoEmpty);
  } else {
     // 如果都做完了，可以选择滚动到第一个或者不操作
     // scrollToItem(0); 
  }
};

// 预览跳转功能
const selectedResults = ref({}); // 用于存储每个单词的选择结果
const showScroll = ref(true);
const lowerAnchor = 65; // 最低高度
const middleAnchor = Math.round(0.4 * window.innerHeight); // 中间高度
const anchorsScrolls = [
  lowerAnchor,
  middleAnchor,
  Math.round(0.65 * window.innerHeight),
];
const heightScroll = ref(lowerAnchor);
const closePanel = () => {
  if (heightScroll.value === lowerAnchor) {
    heightScroll.value = middleAnchor;
  } else {
    heightScroll.value = lowerAnchor;
  }
};
const buttonText = computed(() => {
  // 计算按钮文本
  return heightScroll.value === lowerAnchor ? "显示导航" : "关闭导航";
});
const buttonStyle = computed(() => {
  // 计算按钮样式
  return {
    marginBottom: "10px",
    fontWeight: "bold",
    color: heightScroll.value === lowerAnchor ? "green" : "red",
  };
});
// 手写模式
const handwriteInputs = ref({});
const handwriteAnswers = ref([]);

function saveHandwriteAnswer(index, serialNumber) {
  const input = (handwriteInputs.value[index] || "").trim();
  if (!input) return;

  const existing = handwriteAnswers.value.find(
    (ans) => ans.序号 === serialNumber
  );
  if (existing) {
    existing.英文 = input;
  } else {
    handwriteAnswers.value.push({ 序号: serialNumber, 英文: input });
  }
  console.log("handwriteAnswers: ", handwriteAnswers.value);
}

// 点击选项
const resultDataTempt = ref([]);
const selectedIndexes = ref({});
const completeCount = ref("0");
const uncertainVocabulary = ref(new Set());
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
    // console.log("uncertainVocabulary:", uncertainVocabulary.value);
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
  completeCount.value = resultDataTempt.value.reduce((count, item) => {
    if (item.用户选择[0] !== "无") {
      return count + 1;
    }
    return count;
  }, 0);

  // 判断是否超过一半的选项被选中
  const halfOptions = Math.ceil(synonymsOptions.value.length / 2);
  if (completeCount.value == halfOptions && flagHalfEncouragement.value) {
    flagHalfEncouragement.value = false;
    showAnimationShineEncouragement(); // 调用动画显示方法
  }
};

function isSelected(index, index2) {
  return selectedIndexes.value[`${index}-${index2}`];
}

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

// 场外支援
const flagHelp = ref(true);
const totalCoins = ref(0);
const helpOutside = () => {
  // flagHelp.value = true;

  if (flagHelp.value) {
    showConfirmDialog({
      title: "场外支援",
      theme: "round-button",
      message: "只有一次求助机会，确认使用吗？",
    }).then(() => {
      // 合并答案和选项
      mergedData.value = mergeAnswerAndSynonym();
      console.log("mergedData.value: ", mergedData.value);

      // 将用户选择转化为中文
      const synonymsSelectedChinese = convertSelections(
        synonymsSelected.value,
        synonymsOptions.value
      );
      console.log("synonymsSelectedChinese: ", synonymsSelectedChinese);

      // 将中文用户选择和选项答案合并
      const synonymAndSelections = mergeSynonymAndSelections(
        synonymsSelectedChinese
      );

      const hasNoneSelected = synonymAndSelections.some((item) =>
        item.用户选择.includes("无")
      );
      if (hasNoneSelected) {
        showFailToast("需要全部完成");
        return;
      }
      console.log("synonymAndSelections", synonymAndSelections);

      // 比对结果给出flag
      const compareResult = compareAndAddFlag(synonymAndSelections);
      console.log("compareResult: ", compareResult);

      // 计算金币
      function calculateAccuracy(compareResult) {
        const total = compareResult.length;
        const correct = compareResult.filter(
          (item) => item.flag === "true"
        ).length;
        return ((correct / total) * 100).toFixed(2);
      }

      if (isRewardEligible.value) {
        // console.log('calculateAccuracy', calculateAccuracy(compareResult));
        if (calculateAccuracy(compareResult) < 55) {
          totalCoins.value = 0;
        } else {
          totalCoins.value = compareResult.reduce((coins, item) => {
            return item.flag === "true" ? coins + 5 : coins;
          }, 0);
        }
      } else {
        totalCoins.value = 0;
      }
      console.log("totalCoins: ", totalCoins.value);

      const containsUnselected = compareResult.some((item) =>
        item.用户选择.includes("无")
      );
      if (containsUnselected) {
        showFailToast("需要全部完成");
        return;
      } else {
        const countFlags = compareResult.reduce(
          (acc, item) => {
            if (item.flag === "false") {
              acc.falseCount += 1;
            } else if (item.flag === "half") {
              acc.halfCount += 1;
            }
            return acc;
          },
          { falseCount: 0, halfCount: 0 }
        );
        // console.log(countFlags);
        if (countFlags.falseCount == 0 && countFlags.halfCount == 0) {
          showAnimationShineHelpForGood();
        } else {
          // showAnimationShineHelpForBad();
          helpforbadRef.value.show();
          showDialog({
            width: '360px',
            title: "再加油",
            theme: "round-button",
            message: `错误: ${countFlags.falseCount}\n半对：${countFlags.halfCount}`,
          }).then(() => {
            helpforbadRef.value.hide();
          });
        }
        flagHelp.value = false;
      }
    });
  } else {
    showDialog({
      message: "每次挑战只有一次机会！",
      width: '360px',
    });
  }
};
// 单词发音
const speakWord = (word) => {
  const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(
    word
  )}&type=1`;
  const audio = new Audio(url);
  audio.play().catch(() => {
    console.log("Fallback to SpeechSynthesis");
    let utterance;
    utterance = new SpeechSynthesisUtterance(word);
    if (!/[a-zA-Z]/.test(word)) {
      utterance.lang = "zh-CN";
    } else {
      utterance.lang = "en-US";
    }
    utterance.pitch = 0.5;
    window.speechSynthesis.speak(utterance);
  });
};

// 动画鼓励
const encouragementRef = ref(null);
const animationVisible = ref(false);

const helpforgoodRef = ref(null);
const animationVisible_help = ref(false);

const helpforbadRef = ref(null);
const flagHalfEncouragement = ref(true);

function showAnimationShineEncouragement() {
  const audio = new Audio(happyhalf);
  audio.play();
  if (encouragementRef.value.visible) {
    encouragementRef.value.hide();
  } else {
    encouragementRef.value.show();
  }
  animationVisible.value = !animationVisible.value;
}

function showAnimationShineHelpForGood() {
  if (helpforgoodRef.value.visible) {
    helpforgoodRef.value.hide();
  } else {
    helpforgoodRef.value.show();
  }
  animationVisible_help.value = !animationVisible_help.value;
}

// 连胜进度条
const shoWinningStreak = ref(false);
const activeWinningStreak = ref(0);
const dailyWinningStreak = ref(0);
const rate2 = ref(0);
const new_final_rate = ref(0);

const compareResult2 = ref("");
const accountDataResult2 = ref("");

const handleContinue = () => {
  // 用户点击继续按钮
  redirect(accountDataResult2.value);
};
const handleAutoClose = () => {
  // 8秒后自动关闭
};
const redirect = (accountDataResult) => {
  router.push({
    path: "/studentAccountAnswerPc",
    state: {
      uncertainResult: JSON.stringify(Array.from(uncertainVocabulary.value)),
      compareResult: JSON.stringify(compareResult2.value), // 注意这里需要用 .value
      userSelected: JSON.stringify(synonymsSelected.value),
      nid: nid.value,
      rate: accountDataResult.rate,
      halfTrue: rate2.value, // 注意这里需要用 .value
      newCoins: totalCoins.value,
      username: username.value,
      account_log_id: accountDataResult["new_log_nid"],
      spellVocabulary: JSON.stringify(spellVocabulary.value),
      lock_spell: lock_spell.value,
      complement: 1 - rate2.value, // 注意这里需要用 .value
      RateOrigin: RateOrigin.value,
      navTitle: navTitle.value,
    },
  });
};

const titleData = ref("");
const username = ref("");
const alias = ref("");
const submittoken = ref(null);
const isRewardEligible = ref(true);
const lock_spell = ref(false);
const spellVocabulary = ref([]);
const handlePageHide = (event) => {
  sessionStorage.setItem(
    "showAnswerMagic",
    JSON.stringify(showAnswerMagic.value)
  );
  sessionStorage.setItem("showMagic", JSON.stringify(showMagic.value));
  sessionStorage.setItem("flagHelp", JSON.stringify(flagHelp.value));
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
      width: '360px',
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
onBeforeUpdate(() => {
  myList.value = [];
});
onMounted(async () => {
  document.addEventListener("visibilitychange", handleVisibilityChange);
  // shoWinningStreak.value = true;
  // activeWinningStreak.value = 14;
  // dailyWinningStreak.value = 4;
  // rate2.value = 3;
  window.addEventListener("beforeunload", handleBeforeUnload);
  // 监测恶意刷新
  window.addEventListener("pagehide", handlePageHide);
  showAnswerMagic.value = JSON.parse(sessionStorage.getItem("showAnswerMagic"));
  if (showAnswerMagic.value == null) showAnswerMagic.value = false;
  showMagic.value = JSON.parse(sessionStorage.getItem("showMagic"));
  if (showMagic.value == null) showMagic.value = false;
  flagHelp.value = JSON.parse(sessionStorage.getItem("flagHelp"));
  if (flagHelp.value == null) {
    flagHelp.value = true;
  } else {
    showDialog({
      title: "警告",
      theme: "round-button",
      message: "监测到可能的恶意刷新\n场外支援被重置到刷新前状态",
      width: '360px',
    });
  }

  // 从history.state接收导航栏数据
  if (history.state) {
    navTitle.value = history.state.title || '';
    navUsername.value = history.state.username || ''
  }

  const data = JSON.parse(history.state.data);
  RateOrigin.value = history.state.RateOrigin;
  checkedNoneOfAbove.value = history.state.checkedNoneOfAbove;
  checkedSpell.value = history.state.checkedSpell;

  alias.value = data.alias;
  alias.value = data.alias;
  lock_spell.value = history.state.lock_spell;
  // console.log('lock_spell', lock_spell.value);
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

  // isRewardEligible.value = history.state.isRewardEligible;
  if (data.coins >= 2000) {
    isRewardEligible.value = false;
  }
  nid.value = history.state.nid;
  synonymsOptions.value = data.synonyms;
  answers.value = data.answers;
  titleData.value = data.title;
  username.value = data.username;
  submittoken.value = new Date().getTime();
  console.log("submittoken: ", submittoken.value);
  // console.log("username: ", username.value);
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
  console.log("synonymsOptions", synonymsOptions.value);
  console.log("answers", answers.value);
  // answers.value.forEach((item) => {
  //   if(item.英文 == "since") {
  //     console.log("英文：", item.英文);
  //     console.log("中文：", item.中文);
  //     console.log("正确答案：", item.正确答案);
  //   }
  // })
});
</script>

<template>
  <div class="student-account-item-pc">
    <!-- 导航栏 -->
    <nav class="top-nav">
      <div class="nav-left">
        <span class="nav-username">{{ navUsername }}</span>
      </div>
      <div class="nav-center">
        <span class="nav-title">{{ navTitle }}</span>
      </div>
    </nav>
    
    <!-- 最外层布局容器 -->
    <div class="layout-container">
    
    <!-- 左侧侧边栏 -->
    <aside class="side-bar">
      <div class="side-item status-box">
        <div class="label">进度</div>
        <div class="value">{{ `${completeCount}/${synonymsOptions.length}` }}</div>
      </div>
      
      <div class="side-btn-group">
        <div class="side-item action-btn" @click="purchaseMagic">
          <van-icon name="gem-o" size="20" />
          <span>购买</span>
        </div>
        
        <div class="side-item action-btn" @click="helpOutside">
          <van-icon name="friends-o" size="20" />
          <span>支援</span>
        </div>
        
        <div class="side-item action-btn submit-btn" @click="submitSelection">
          <van-icon name="success" size="20" />
          <span>提交</span>
        </div>
      </div>
    </aside>

    <!-- 右侧内容区域 -->
    <main class="main-content">
      <van-checkbox-group class="checkbox-container" v-model="synonymsSelected">
        <!-- Grid 布局容器 -->
        <div class="question-grid">
          <div
            v-for="(item, index) in synonymsOptions"
            :key="index"
            class="grid-item-card"
            :ref="(el) => setItemRef(el, index)" 
          >
            <!-- 卡片内容 -->
            <div class="card-header">
               <!-- 英文/标题部分 -->
               <div 
                 class="english-title" 
                 @click="item.排除 !== '手写' ? speakWord(item.英文) : null"
               >
                 <span class="index-num">{{ item.序号 }}.</span>
                 <span v-if="item.排除 !== '手写'" class="word-text">{{ item.英文 }}</span>
                 <span v-else class="word-text">{{ answers[index].中文 }}</span>
                 
                 <img
                    v-if="item.排除 !== '手写'"
                    src="../assets/speaker.png"
                    class="speaker-icon"
                  />
               </div>
               
               <!-- 选中标签展示 (Flying Tags) -->
               <div class="selected-tags-container">
                  <div
                    v-for="(selected, index2) in selectedItems"
                    v-show="selected.is_spell == true && selected.key.split('-')[0] == String(index)"
                    :key="index2"
                    class="mini-tag"
                    @click="removeSelected(index2)"
                  >
                    {{ selected.label }}
                  </div>
               </div>
            </div>

            <!-- 选项区域 -->
            <div class="card-body">
              <!-- 选择题模式 -->
              <div v-if="item.排除 !== '手写'">
                <div
                  v-for="(chinese, index2) in item.中文"
                  :key="index2"
                  class="option-item"
                  :class="{ 
                    'option-selected': isSelected(index, index2),
                    'option-disabled': isDisabled(index, index2)
                  }"
                  @click="!isDisabled(index, index2) && toggleCheckChinese(index, index2)"
                >
                  <div class="option-text">{{ chinese }}</div>
                  <van-checkbox
                    :name="`${index + 1}-${index2 + 1}`"
                    :disabled="isDisabled(index, index2)"
                    :ref="(el) => (checkboxRefs[`${index}-${index2}`] = el)"
                    class="mini-checkbox"
                    @click.stop
                  />
                </div>
              </div>

              <!-- 手写模式 -->
              <div v-else class="handwrite-area">
                <van-field
                  v-model="handwriteInputs[index]"
                  placeholder="拼写英文"
                  input-align="center"
                  class="handwrite-input"
                  @blur="saveHandwriteAnswer(index, item.序号)"
                />
              </div>
            </div>
          </div>
        </div>
      </van-checkbox-group>
      
      <!-- 底部占位，防止内容被遮挡 -->
      <div class="bottom-placeholder"></div>
    </main>

    <!-- --- 以下为弹窗组件，保持原逻辑不变 --- -->

    <!-- 提交数据弹窗 -->
    <van-dialog
      v-model:show="showDialogSubmit"
      title="确认提交吗？"
      :before-close="clickSubmitUser"
      show-cancel-button
    >
    </van-dialog>
    <van-notify v-model:show="showDataEmpty" type="warning">
      <span>试题未完成，不能提交</span>
    </van-notify>

    <!-- 购买魔法弹窗 -->
    <van-dialog
      v-model:show="showMagic"
      :title="`是否购买标识答案（${priceMagic}金币）？`"
      class="custom-dark-dialog-checkAnswer"
      :before-close="handlePurchaseMagic"
      :overlay="false"
    >
      <template #default>
        <div class="dialog-content">
          <p>标识错误单词，但不显示答案</p>
          账户剩余
          <van-rolling-text
            ref="rollingTextRef"
            :start-num="usercoinsStart"
            :target-num="usercoinsEnd"
            :auto-start="false"
            :duration="durationRolling"
          />
          金币
          <van-icon
            name="cross"
            class="close-icon-checkAnswer"
            @click="showMagic = false"
          />
        </div>
      </template>
      <template #footer>
        <div class="custom-button-checkAnswer-group">
          <van-button size="large" type="danger" plain hairline text="放弃" @click="showMagic = false" />
          <van-button size="large" type="primary" plain hairline :disabled="isabledPurchase" text="购买" @click="purchaseConfirm" />
        </div>
      </template>
    </van-dialog>

    <!-- 错误答案查看 Popup -->
    <van-config-provider :theme-vars="themeVars">
      <van-popup
        ref="popup"
        class="custom-popup"
        closeable
        v-model:show="showAnswerMagic"
        position="right"
        :style="{ width: '40%', height: '100%' }"
      >
        <div style="font-size: 18px; font-weight: 700; margin: 1rem">
          错误词汇
        </div>
        <van-cell-group inset>
            <div v-for="(item, index) in compareResultFalse" :key="index">
              <van-cell
                :title="item.排除 === '手写' ? item.序号 + '. ' + answers[index].中文 : item.序号 + '. ' + item.英文"
                :value="item.用户选择.join('，')"
                @click="scrollToItem(item.序号 - 1)"
                is-link
              />
            </div>
        </van-cell-group>
      </van-popup>
    </van-config-provider>

    <!-- 预览滚动面板 (保留但建议根据需要调整) -->
    <!-- <van-floating-panel
      v-model:height="heightScroll"
      :anchors="anchorsScrolls"
      v-show="showScroll"
      :content-draggable="false"
    >
      <van-button plain type="default" block @click="closePanel">{{ buttonText }}</van-button>
      <van-cell-group v-for="(item, index) in synonymsOptions" :key="index">
        <van-cell
          @click="scrollToItem(item.序号 - 1)"
          :title="item.序号 + '. ' + (item.排除 === '手写' ? answers[index].中文 : item.英文)"
          :style="{ color: selectedResults[index] && selectedResults[index].length > 0 ? 'red' : '' }"
        />
      </van-cell-group>
    </van-floating-panel> -->

    <!-- 辅助组件 -->
    <div class="progress" v-if="showProgress">
      <van-progress pivot-text="努力提交..." color="#f2826a" :percentage="percentage" />
    </div>
    <div class="encouragement-container">
      <encouragement ref="encouragementRef" />
    </div>
    <helpforgood ref="helpforgoodRef" />
    <helpforbad ref="helpforbadRef" />
    <submitloading v-if="isLoading" />
    
    <WinningStreakPopupPc
      v-model:show="shoWinningStreak"
      :active-step="activeWinningStreak"
      :daily-step="dailyWinningStreak"
      :rate-step="new_final_rate"
      :flag-theme="flagTheme"
      @continue="handleContinue"
      @auto-close="handleAutoClose"
    />
    </div>
  </div>
</template>

<style scoped>
/* --- 外层根元素 --- */
.student-account-item-pc {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

/* --- 导航栏样式 --- */
.top-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 50px;
  background-color: #fff;
  border-bottom: 1px solid #ebedf0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  z-index: 1000;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.nav-username {
  font-size: 14px;
  color: #323233;
  font-weight: 500;
}

.nav-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.nav-title {
  font-size: 16px;
  color: #323233;
  font-weight: 600;
}

/* 移动端适配 */
@media (max-width: 767px) {
  .top-nav {
    height: 44px;
    padding: 0 15px;
  }
  
  .nav-username
  {
    font-size: 12px;
  }
  
  .nav-title {
    font-size: 14px;
  }
  
  .layout-container {
    height: calc(100vh - 44px);
    margin-top: 44px;
  }
}

/* --- 核心布局样式 --- */
.layout-container {
  display: flex;
  height: calc(100vh - 50px); /* 减去导航栏高度 */
  width: 100%;
  overflow: hidden;
  background-color: #f7f8fa;
  margin-top: 50px; /* 为导航栏留出空间 */
}

/* 左侧侧边栏 */
.side-bar {
  width: 80px; /* 固定宽度 */
  flex-shrink: 0;
  background-color: #fff;
  border-right: 1px solid #ebedf0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 20px;
  z-index: 99;
  box-shadow: 2px 0 8px rgba(0,0,0,0.05);
}

.side-item {
  width: 100%;
  text-align: center;
  margin-bottom: 15px;
  cursor: pointer;
}

.status-box {
  margin-bottom: 30px;
  padding-bottom: 15px;
  border-bottom: 1px solid #f0f0f0;
}

.status-box .label {
  font-size: 12px;
  color: #969799;
}

.status-box .value {
  font-size: 16px;
  font-weight: bold;
  color: #1989fa;
}

.side-btn-group {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #646566;
  font-size: 14px;
  padding: 10px 0;
  transition: background-color 0.2s;
}

.action-btn:active {
  background-color: #f2f3f5;
}

.action-btn .van-icon {
  margin-bottom: 4px;
  color: #1989fa;
}

.submit-btn .van-icon {
  color: #07c160;
}

/* 右侧内容区 */
.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  position: relative;
}

.question-grid {
  display: grid;
  gap: 10px;
  padding-bottom: 60px;
}

/* 双列 Grid 布局 - 改为响应式 */
.question-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 10px;
  padding-bottom: 60px;
}

/* 响应式调整 */
@media screen and (min-width: 1600px) {
  /* 超大屏幕：3列 */
  .question-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
}

@media screen and (min-width: 1200px) and (max-width: 1599px) {
  /* 大屏幕：2列 */
  .question-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
}

@media screen and (min-width: 900px) and (max-width: 1199px) {
  /* 中等屏幕：2列，较小间距 */
  .question-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
}

@media screen and (max-width: 899px) {
  /* 小屏幕：1列 */
  .question-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  /* 同时调整卡片内部间距 */
  .card-header {
    padding: 6px 8px;
  }
  
  .card-body {
    padding: 4px;
  }
  
  .option-item {
    padding: 6px 5px;
    font-size: 12px;
  }
  
  .english-title {
    font-size: 14px;
  }
}

/* 极小屏幕额外优化 */
@media (max-width: 320px) {
  .question-grid {
    grid-template-columns: 1fr;
    gap: 6px;
  }
  
  .side-bar {
    width: 60px;
  }
  
  .main-content {
    padding: 5px;
  }
}

/* 单个题目卡片样式 */
.grid-item-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid #f0f0f0;
}

.card-header {
  padding: 8px 10px;
  background-color: #fafafa;
  border-bottom: 1px solid #eee;
}

.english-title {
  display: flex;
  align-items: center;
  font-weight: bold;
  font-size: 18px;
  margin-bottom: 4px;
  cursor: pointer;
  flex-wrap: wrap;
}

.index-num {
  margin-right: 4px;
  color: #323233;
}

.word-text {
  color: #323233;
  word-break: break-all; /* 防止长单词撑破布局 */
}

.speaker-icon {
  width: 14px;
  height: 14px;
  margin-left: 6px;
  opacity: 0.7;
}

/* 选项区域样式 */
.card-body {
  padding: 5px;
  flex: 1;
}

.option-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 6px;
  margin-bottom: 4px;
  border-radius: 4px;
  border: 1px solid transparent;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.option-item:last-child {
  margin-bottom: 0;
}

.option-text {
  flex: 1;
  margin-right: 5px;
  line-height: 1.4;
}

/* 选中状态样式 */
.option-selected {
  background-color: #e8f3ff;
  border-color: #a3d0fd;
  color: #1989fa;
  font-weight: 600;
}

.option-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 缩小 Checkbox 以适应 Grid */
.mini-checkbox {
  transform: scale(0.8); 
}

/* 手写输入框样式优化 */
.handwrite-area {
  padding: 10px 5px;
}

.handwrite-input {
  border: 1px solid #ebedf0;
  border-radius: 4px;
  padding: 5px;
}

/* 选中标签 (Flying Tags) 优化 */
.selected-tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.mini-tag {
  font-size: 10px;
  color: #fff;
  background-color: orange;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
}

/* --- 以下为原有样式保留或微调 --- */
.bottom-placeholder {
  height: 60px;
}

.progress {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 80%;
  z-index: 200;
}

/* 媒体查询：在极小屏幕下可能需要回退到单列 (可选) */
@media (max-width: 320px) {
  .question-grid {
    grid-template-columns: 1fr;
  }
  .side-bar {
    width: 60px;
  }
}

.encouragement-container {
  position: fixed;           
  top: 33%;             
  left: 100%;            
  z-index: 2000
}

</style>