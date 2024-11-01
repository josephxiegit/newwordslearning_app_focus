<script setup>
import {
  watch,
  onMounted,
  ref,
  getCurrentInstance,
  computed,
  nextTick,
  onBeforeUnmount,
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
import TestAnimation from "./test.vue";
const router = useRouter();
const instance = getCurrentInstance();
const axios = instance.appContext.config.globalProperties.$ajax;
const isLoading = ref(false);

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
  return dictArray.map((item) => {
    const { 答案, 用户选择, 正确答案, is_spell } = item;

    // 统一处理分隔符，将所有中文分号和逗号替换为英文逗号，然后进行分割和修整
    const normalize = (str) =>
      str
        .replace(/；/g, ",")
        .replace(/，/g, ",")
        .split(",")
        .map((s) => s.trim());

    const answerArray = normalize(答案).sort();
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
        flag = "half";
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
  // totalTimeInterval.value = 180;
  if (totalTimeInterval.value > standardTimeInterval.value + 5) {
    showDialog({
      title: "抱歉",
      message: "检测到可能的作弊行为，请重新登陆",
      theme: "round-button",
    }).then(() => {
      router.push({
        path: "/homepage",
      });
      return;
    });
  } else {
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
    if (!lock_spell.value) {
      function getSpellVocabulary(compareResult, uncertainVocabulary) {
        const spellVocabularyResult = []; // 这里使用局部变量，避免混淆
        const addedEnglishSet = new Set();
        const chineseCharacterRegex = /[\u4e00-\u9fa5]/;

        function isPhrase(text) {
          return /\s|,|\/|\./.test(text);
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

          if (
            item.flag !== "true" &&
            !addedEnglishSet.has(english) &&
            !isPhrase(english)
          ) {
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
            !isPhrase(english)
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

    console.log("spellVocabulary", spellVocabulary.value);

    // 计算金币
    if (isRewardEligible) {
      totalCoins.value = compareResult.reduce((coins, item) => {
        return item.flag === "true" ? coins + 2 : coins;
      }, 0);
    } else {
      totalCoins.value = 0;
    }

    function checkFlags(compareResult) {
      console.log("compareResult", compareResult);
      let trueCount = 0;

      for (const item of compareResult) {
        if (item.flag !== "true" && item.flag !== "half") {
          continue;
        }
        if (item.flag === "true") {
          trueCount++;
        }
      }
      return parseFloat((trueCount / compareResult.length).toFixed(2));
    }

    const rate = checkFlags(compareResult);
    console.log("rate: ", rate);

    async function updateAccountData() {
      // 更新attempt和rate
      let params = new URLSearchParams();
      params.append("method", "updateUserData");
      params.append("submittoken", submittoken.value);
      params.append("nid", nid.value);
      params.append("rate", rate);
      params.append("type", 3);
      params.append("swipe", 0);
      params.append("coins", totalCoins.value);

      // 更新Accountlog
      params.append("log", JSON.stringify(compareResult));
      params.append("title", titleData.value);
      params.append("username", username.value);
      params.append("alias", alias.value);
      params.append("mode", "考试");
      params.append("numberprev", clickNumberPrev.value);
      params.append("numbershowanswer", clickNumberShowAnswer.value);
      params.append("numbertransparent", clickNumberTransparent.value);

      // 更新spell vocabulary
      params.append("data_words", JSON.stringify(spellVocabulary.value));
      params.append("lock_spell", lock_spell.value);
      return await axios.post("words/", params).then((ret) => {
        return ret.data;
      });
    }

    // async function updateAccountlog(account_data_nid) {
    //   // 结果存储到日志
    //   let params = new URLSearchParams();
    //   params.append("method", "updateUserlog");
    //   params.append("log", JSON.stringify(compareResult));
    //   params.append("title", titleData.value);
    //   params.append("username", username.value);
    //   params.append("alias", alias.value);
    //   params.append("mode", "考试");
    //   params.append("numberprev", clickNumberPrev.value);
    //   params.append("numbershowanswer", clickNumberShowAnswer.value);
    //   params.append("numbertransparent", clickNumberTransparent.value);
    //   params.append("coins", totalCoins.value);
    //   params.append("submittoken", submittoken.value);
    //   params.append("account_data_nid", account_data_nid);
    //   return await axios.post("words/", params).then((ret) => {
    //     return ret.data.accountLogResult;
    //   });
    // }

    // async function updateUser() {
    //   // 结果存储到日志
    //   let params = new URLSearchParams();
    //   params.append("method", "updateUserCoins");
    //   params.append("username", username.value);
    //   params.append("coins", totalCoins.value);
    //   return await axios.post("words/", params).then((ret) => {
    //     return ret.data;
    //   });
    // }

    async function updateUncertain(accountLogResult) {
      // 延迟库
      let params = new URLSearchParams();
      params.append("method", "updateUncertain");
      params.append("username", username.value);
      params.append("account_data_nid", nid.value);
      params.append("new_log_nid", accountLogResult);
      params.append("type", "考试");
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
    console.log("newCoins: ", newCoins);

    isLoading.value = true;
    const redirectTimeout = setTimeout(() => {
      isLoading.value = false; // 先停止加载状态

      showDialog({
        title: "网络延迟",
        message: "请重新登陆，上次答题将会正常提交",
        theme: "round-button",
      }).then(() => {
        router.push("/homepage");
      });
    }, 20000);

    function redirect() {
      clearTimeout(redirectTimeout);
      router.push({
        path: "/studentAccountAnswer",
        state: {
          uncertainResult: JSON.stringify(
            Array.from(uncertainVocabulary.value)
          ),
          compareResult: JSON.stringify(compareResult),
          userSelected: JSON.stringify(synonymsSelected.value),
          nid: nid.value,
          rate: accountDataResult.rate,
          halfTrue: rate,
          newCoins: newCoins,
          username: username.value,
          account_log_id: accountDataResult["new_log_nid"],
          spellVocabulary: JSON.stringify(spellVocabulary.value),
          lock_spell: lock_spell.value,
        },
      });
    }
    // 如果 updateAccountlog 成功，继续执行其他操作
    const accountDataResult = await updateAccountData();
    if (
      accountDataResult === "不能提交相同内容" &&
      sessionStorage.getItem("testFreshFlag") == true
    ) {
      isLoading.value = false;
      showDialog({
        title: "错误",
        message: "数据已提交，点击跳转答案页",
        theme: "round-button",
      }).then(() => {
        redirect();
      });

      return;
    }

    let UncertainResult;
    if (uncertainVocabulary.value.size != 0) {
      UncertainResult = await updateUncertain(accountDataResult.new_log_nid);
    }

    // 如果所有操作都成功，处理结果
    isLoading.value = false;

    // 清楚store
    sessionStorage.removeItem("numberShowAnswer");
    sessionStorage.removeItem("numberTransparent");
    sessionStorage.removeItem("numberPrev");
    changeOverlayColor("rgba(128, 128, 128, 0.6)");
    redirect();

    isLoading.value = false;
  }
};

// 点击选项
const resultDataTempt = ref([]);
const selectedIndexes = ref({});
const flagSingleOrMultiChoice = ref("单选");
const uncertainVocabulary = ref(new Set());

// 用于存储点击时间戳的 ref
const firstClickTime = ref(null);
const lastClickTime = ref(null);
const totalTimeInterval = ref(0);
const standardTimeInterval = ref(0);

let originalChinese = "";
const toggleCheckChinese = (index, index2) => {
  const key = `${index}-${index2}`;
  const checkboxRef = checkboxRefs.value[key];
  if (checkboxRef) {
    checkboxRef.toggle();
  }

  // 捕捉用户是否取消了选项
  const wasSelected = selectedIndexes.value[key]; // 之前的状态
  selectedIndexes.value[key] = !wasSelected; // 切换状态

  if (wasSelected && !synonymsOptions.value[index].is_spell) {
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
  completeCount.value = resultDataTempt.value.reduce((count, item) => {
    if (item.用户选择[0] !== "无") {
      return count + 1;
    }
    return count;
  }, 0);
};
function isSelected(index, index2) {
  return selectedIndexes.value[`${index}-${index2}`];
}
const submitFlag = ref(false);
const goToNext = () => {
  // 获取当前轮播图的索引
  const currentSlideIndex = currentIndex.value;

  // 检查当前轮播图中的选中项
  const currentSlideSelections = Object.keys(selectedIndexes.value).filter(
    (key) => key.startsWith(`${currentSlideIndex}-`)
  );

  const hasSelection = currentSlideSelections.some(
    (key) => selectedIndexes.value[key]
  );

  if (!hasSelection) {
    showFailToast("不能为空");
    return; // 如果没有选中项，直接返回，不进行后续操作
  }

  // 计算时间间隔和迟疑库
  const now = new Date().getTime();
  if (firstClickTime.value === null) {
    // 记录第一次点击的时间戳
    firstClickTime.value = now;
  } else {
    // 计算点击间隔
    const interval =
      (now - (lastClickTime.value || firstClickTime.value)) / 1000;
    totalTimeInterval.value += interval;
    function addToUncertainVocabulary(interval) {
      // 根据时间间隔获取 typeLabel
      let typeLabel = "";
      if (interval > 8) {
        typeLabel = "8秒";
      } else if (interval > 6) {
        typeLabel = "6秒";
      }

      if (typeLabel) {
        const uncertainItem = synonymsOptions.value[currentSlideIndex].英文;
        let exists = Array.from(uncertainVocabulary.value).find((vocab) => {
          return vocab.英文 === uncertainItem;
        });

        if (exists) {
          // 如果存在相同的 '英文' 项，则在 type 中添加时间标签
          const typeArray = exists.type.split(",");
          if (!typeArray.includes(typeLabel)) {
            typeArray.push(typeLabel);
            exists.type = typeArray.join(",");
          }
        } else {
          // 如果不存在相同的 '英文' 项，则添加新字典
          uncertainVocabulary.value.add({
            英文: uncertainItem,
            type: typeLabel,
          });
        }
      }
    }

    // 调用示例
    addToUncertainVocabulary(interval);
    // console.log("uncertainVocabulary: ", uncertainVocabulary.value);
  }
  // 更新最后一次点击的时间戳
  lastClickTime.value = now;

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
      // console.log(
      //   "Time interval between clicks:",
      //   totalTimeInterval.value,
      //   "s"
      // );
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
  // if (overlayOpenTime.value !== null) {
  //   const now = new Date().getTime();
  //   const interval = (now - overlayOpenTime.value) / 1000; // 计算时间间隔（秒）
  //   standardTimeInterval.value += interval;
  //   // console.log("Interval time:", interval.toFixed(2), "seconds");
  //   console.log(
  //     "standardTimeInterval:",
  //     standardTimeInterval.value.toFixed(2),
  //     "s"
  //   );
  // }
  // showOverlay.value = false;
  // if (currentIndex.value != 0) {
  //   resume();
  // }
};
// 场外支援

// 购买魔法
const priceMagic = ref(350);

async function consumeMagic() {
  isLoading.value = true;
  let params = new URLSearchParams();
  params.append("method", "consumeMagic");
  params.append("username", username.value);
  params.append("priceMagic", priceMagic.value);
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

        const res = await consumeMagic();

        // 更新 usercoinsEnd 并确保 DOM 已更新后触发动画
        usercoinsEnd.value = res;
        await nextTick();
        rollingTextRef.value.start();

        // 等待动画完成
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // 更新 usercoins
        usercoins.value = res;
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

        const res = await consumeMagic();

        // 更新 usercoinsEnd 并确保 DOM 已更新后触发动画
        usercoinsEnd.value = res;
        await nextTick();
        rollingTextRef.value.start();

        // 更新 usercoins
        usercoins.value = res;
        isLoading.value = false;
        autoSelectAnswer(currentIndex.value, true);
        numberShowAnswer.value = 0;
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

        const res = await consumeMagic();

        // 更新 usercoinsEnd 并确保 DOM 已更新后触发动画
        usercoinsEnd.value = res;
        await nextTick();
        rollingTextRef.value.start();

        // 更新 usercoins
        usercoins.value = res;
        isLoading.value = false;
        transparentHelp(true);
        numberTransparent.value = 0;
      })
      .catch(() => {
        // on cancel
      });
  }
};
// 魔法赠送答案
const numberShowAnswer = ref(2);
const disabledShowAnswer = ref(false);
const showAnswerButton = ref(true);
const showAnswerIsSpell = ref("");
const autoSelectAnswer = (index, flag) => {
  if (flag == false && numberShowAnswer.value <= 0) {
    showToast("次数为0，无法使用");
    return;
  }
  const answerItem = answers.value.find(
    (item) => item.序号 === synonymsOptions.value[index].序号
  );
  if (answerItem) {
    showMagicStart.value = false; // 隐藏魔法启动，变小字体
    swipeHelpRef.value.hide();
    const correctAnswers = answerItem.中文.split("；");
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
        toggleCheckChinese(index, index2);
        changeOverlayColor("rgba(128, 128, 128, 0.6)");
        handleButtonClick("autoSelectAnswer");
        if (!isButtonTransparentDisabled.value) {
          setTimeout(() => {
            swipeHelpRef.value.show();
            changeOverlayColor("#000000");
            showMagicStart.value = true; // 恢复魔法启动，变回字体
          }, 6000);
        }
      }
    } else {
      // console.log("No available answers to select.");
      showToast("已经全部显示");
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
  if (flag == false && numberTransparent.value <= 0) {
    showToast("次数为0，无法透视");
    return;
  }
  if (currentIndex.value == 0) {
    showFailToast("无需透视");
    return;
  }
  showMagicStart.value = false; // 隐藏魔法启动
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

// 倒计时
const countDownTime = ref(30 * 60 * 60 * 1000);
const onFinishCountDown = () => {
  clickSubmitUser();
};

// 动画喜洋洋
const testAnimationRef = ref(null);
function showAnimationTest() {
  testAnimationRef.value.show();

  // setTimeout(() => {
  //   testAnimationRef.value.hide();
  // }, 4000);
}

// 计时器
const timerRate = ref(0);
const autoplay2 = ref(10000);
const currentRate = ref(100);
const swipeRef = ref(null);
const completeCount = ref("1");
const currentIndex = ref(0);
const totalSlides = ref(25); // 假设总共有5个轮播图项
const isButtonDisabled = ref(false);
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
    if (currentIndex.value < totalSlides.value - 1) {
      swipeRef.value.next();
      setTimeout(() => {
        flagSingleOrMultiChoice.value = getSingeOrMultiChoice(
          currentIndex.value + 1
        );

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

      clickSubmitUser();
    }
  }, 0);
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
        isButtonDisabled.value = false; // 禁用按钮
      }
    } else {
      resetTimer();
    }
  },
  70,
  { immediate: false }
);
const handleSwipeChange = (index) => {
  showAnswerIsSpell.value = "";
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
  sessionStorage.setItem("testFreshFlag", true);
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
const coinsFlag = ref(true);
onBeforeUnmount(() => {
  window.removeEventListener("pagehide", handlePageHide);
});
onMounted(async () => {
  showAnimationTest();
  // 监测恶意刷新
  window.addEventListener("pagehide", handlePageHide);
  // 监测恶意刷新
  console.log(sessionStorage.getItem("testFreshFlag"));
  if (sessionStorage.getItem("testFreshFlag") == "true") {
    showDialog({
      title: "抱歉",
      message: "检测到可能的作弊行为，请重新登陆",
      theme: "round-button",
    }).then(() => {
      router.push({
        path: "/",
      });
    });
  }
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

  currentRate.value = 100;
  timerRate.value = 100;
  isLoading.value = true;
  document.documentElement.style.setProperty(
    "--van-overlay-background",
    overlayColor.value
  );

  const initData = async () => {
    try {
      // 初始化数据
      const data = JSON.parse(history.state.data);
      console.log("data: ", data);

      totalSlides.value = data.answers.length;
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
      titleData.value = data.title;

      // console.log("titleData: ", titleData.value);

      username.value = data.username;

      submittoken.value = new Date().getTime();
      // console.log("submittoken: ", submittoken.value);
      // console.log("totalSlides", totalSlides.value);
      // console.log("autoplay2", autoplay2.value);
      const trueCount_is_spell =
        synonymsOptions.value.filter((item) => item.is_spell === true).length ||
        0;
      standardTimeInterval.value =
        totalSlides.value * (autoplay2.value / 1000) +
        0.2 * totalSlides.value +
        trueCount_is_spell * 17000 +
        3;
      console.log("standardTimeInterval: ", standardTimeInterval.value);

      flagSingleOrMultiChoice.value = getSingeOrMultiChoice(0);
      // 初始化计时器
      countDownTime.value = answers.value.length * 10 * 1000;
      // countDownTime.value = 8 * 1000;
      // console.log(countDownTime.value);

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

      isLoading.value = false;

      // 启动滚动文字动画
      await nextTick(); // 确保 DOM 更新完毕后再启动动画
      // rollingTextRef.value.start();

      // 在动画启动后隐藏覆盖层
      setTimeout(() => {
        showOverlay.value = false;
      }, 1500);
    } catch (error) {
      console.error("Error initializing data:", error);
    }
  };
  // 调用初始化函数
  initData();
});
</script>

<template>
  <div class="parent-container">
    <div class="nav-bar-container">
      <van-nav-bar
        title="考试现场"
        :left-text="`${completeCount}/${synonymsOptions.length}`"
      >
      </van-nav-bar>
    </div>
    <van-row justify="center" style="margin-top: 30px; height: 13px">
      <van-count-down
        :time="countDownTime"
        format="mm 分 ss 秒"
        @finish="onFinishCountDown"
      >
        <template #default="timeData">
          <span class="colon">提交倒计时：</span>
          <span class="block">{{ timeData.minutes }}</span>
          <span class="colon">:</span>
          <span class="block">{{ timeData.seconds }}</span>
        </template>
      </van-count-down>
    </van-row>
    <van-row justify="center">
      <van-col span="23" style="margin-top: -20px">
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
              <van-checkbox-group
                class="checkbox-container"
                v-model="synonymsSelected"
                ref="checkboxRefs"
              >
                <van-cell-group>
                  <div class="custom-cell-group">
                    <van-cell clickable class="bold-title2 border-cell">
                      <template #title>
                        <div
                          style="
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                          "
                        >
                          <div>{{ item.序号 + ". " + item.英文 }}</div>
                          <div style="font-size: 13px; color: red">
                            {{ flagSingleOrMultiChoice }}
                          </div>
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
                            @click.stop.prevent="
                              toggleCheckChinese(index, index2)
                            "
                            :ref="
                              (el) => (checkboxRefs[`${index}-${index2}`] = el)
                            "
                          />
                        </template>
                      </van-cell>
                    </van-cell-group>
                  </div>
                </van-cell-group>
              </van-checkbox-group>
            </div>
          </van-swipe-item>
        </van-swipe>
      </van-col>
    </van-row>

    <van-row class="my-swipe-container" style="position: relative">
      <van-col span="2"></van-col>
      <van-col span="14">
        <van-button
          type="warning"
          @click="goToNext"
          size="large"
          class="left-button"
          :disabled="isButtonDisabled"
          >{{ textButtonNext }}</van-button
        >
      </van-col>
      <van-col span="2"></van-col>
      <testAnimation ref="testAnimationRef" />
    </van-row>

    <submitloading v-if="isLoading" />
  </div>
</template>




<style scope>
html {
  touch-action: manipulation; /* 禁用双击缩放 */
}
.my-swipe {
  margin-top: 30px;
}

.overlay-container > .van-overlay {
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
  margin-top: 10px;
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

.colon {
  display: inline-block;
  margin: 0 4px;
  color: #1989fa;
  height: 12px;
}
.block {
  display: inline-block;
  width: 22px;
  color: #fff;
  font-size: 12px;
  text-align: center;
  background-color: #1989fa;
  height: 20px;
}
</style>
