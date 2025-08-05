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
  Divider,
  showSuccessToast,
} from "vant";

import { useRouter } from "vue-router";
import preExamAnimation from "./preExam.vue";
import chineseMeaningSrcGoatAndWolf from "../assets/chinese_meaning.png";
import chineseMeaningSrcBears from "../assets/Boonie Bears/chinese_meaning.png";
import successSound from "../assets/sound/success.mp3";
import turnfailSound from "../assets/sound/turnfail.mp3";
import woohooSound from "../assets/sound/woohoo.mp3";
import swipeEncouragementSrcGoatAndWolf from "../assets/swipeEncouragement.gif";
import swipeEncouragementSrcGoatAndWolf2 from "../assets/swipeEncouragement2.gif";
import swipeEncouragementBears from "../assets/Boonie Bears/swipeEncouragement.gif";
import swipeEncouragementBears2 from "../assets/Boonie Bears/swipeEncouragement2.gif";
const flagTheme = inject("flagTheme");
const router = useRouter();
const instance = getCurrentInstance();
const axios = instance.appContext.config.globalProperties.$ajax;
import loading from "./loading.vue";
const isLoading = ref(false);

const synonymsOptions = ref([]);
const synonymsSelected = ref([]);
const checkboxRefs = ref([]);

// 全局导航
const popNavshow = ref(false);
const gridMeaningshow = ref(false);
const gridChinese = ref("");
const gridEnglish = ref("");
const gridException = ref("");

const shownavWords = () => {
  if (currentIndex.value == 0) {
    showFailToast("第二个词显示导航");
    return;
  }
  popNavshow.value = true;
};
const showGridMeaning = (index) => {
  gridChinese.value = synonymsOptions.value[index]["正确答案"];
  // console.log('synonymsOptions: ', synonymsOptions.value);
  gridEnglish.value = synonymsOptions.value[index]["英文"];
  gridException.value = synonymsOptions.value[index]["排除"];
  gridMeaningshow.value = true;
  speakWordEnglish(gridEnglish.value, gridChinese.value);
};
const speakWord = (english, answer) => {
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
    window.speechSynthesis.speak(utterance);
  });
};

const speakWordEnglish = (english, answer) => {
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
      utterance.lang = "zh-CN";
    } else {
      utterance = new SpeechSynthesisUtterance(english);
      utterance.lang = "en-US";
    }
    window.speechSynthesis.speak(utterance);
  });
};

const isTextOverflow = (text) => {
  // 创建一个测试元素
  const testElement = document.createElement("span");
  testElement.style.visibility = "hidden";
  testElement.style.whiteSpace = "nowrap";
  testElement.innerText = text;
  document.body.appendChild(testElement);

  // 获取元素的宽度
  const isOverflowing = testElement.offsetWidth > 100; // 替换为你的期望宽度
  document.body.removeChild(testElement);

  return isOverflowing;
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

  // 将中文用户选择和选项答案合并
  resultDataTempt.value = mergeSynonymAndSelections(synonymsSelectedChinese);
};

// 提交按钮
const mergedData = ref([]);

const mergeSynonymAndSelections = (synonymsSelectedChinese) => {
  return mergedData.value.map((item) => {
    const 用户选择 = synonymsSelectedChinese[item.序号 - 1]?.中文 || [];
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
    obj["答案"] = synonymsOptions.value[i].答案;
    obj["正确答案"] = synonymsOptions.value[i].正确答案;
    obj["type"] = synonymsOptions.value[i].type;
    obj["排除"] = synonymsOptions.value[i].排除;
    newList.push(obj);
  }
  // console.log("newList: ", newList);
  return newList;
};
const convertSelections = (synonymsSelected, synonymsOptions) => {
  // console.log('synonymsOptions: ', synonymsOptions);
  // console.log('synonymsSelected: ', synonymsSelected);
  const resultMap = new Map();

  synonymsOptions.forEach((option) => {
    resultMap.set(option.序号, ["无"]); // 初始标记为“无”
  });
  // console.log('synonymsOptions: ', synonymsOptions);

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

const clickSubmitUser = async (action, done) => {
  // 直接提交
  mergedData.value = mergeAnswerAndSynonym();

  // 将用户选择转化为中文
  const synonymsSelectedChinese = convertSelections(
    synonymsSelected.value,
    synonymsOptions.value
  );
  // console.log("synonymsSelectedChinese", synonymsSelectedChinese);
  // 将中文用户选择和选项答案合并
  const synonymAndSelections = mergeSynonymAndSelections(
    synonymsSelectedChinese
  );
  console.log("synonymAndSelections", synonymAndSelections);
  console.log("username", username.value);
  console.log("basicPreExam", basicPreExam.value);
  showSuccessToast({
    duration: 4000,
    closeOnClick: true,
    closeOnClickOverlay: true,
    message: "恭喜！💎数量增加+1",
  });
  router.push({
    path: "/studentAccountList",
    state: {
      username: username.value,
      data: basicPreExam.value,
    },
  });
};

// 手写模式
const handwriteInputs = ref({});
const handwriteDisabled = ref(false);
const handwriteAnswers = ref([]);

// 点击选项
const resultDataTempt = ref([]);
const selectedIndexes = ref({});
const flagSingleOrMultiChoice = ref("单选");
const uncertainVocabulary = ref(new Set());
const flagChoose = ref(true);

let originalChinese = "";
const toggleCheckChinese = (index, index2) => {
  if (isCheckboxDisabled.value) return;
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
  // const answerEnglish = answers.value[index]?.英文;
  const answerEnglish = synonymsOptions.value[index]?.答案;
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
  mergedData.value = mergeAnswerAndSynonym();
  // 将用户选择转化为中文
  const synonymsSelectedChinese = convertSelections(
    synonymsSelected.value,
    synonymsOptions.value
  );

  // 将中文用户选择和选项答案合并
  resultDataTempt.value = mergeSynonymAndSelections(synonymsSelectedChinese);

  // completeCount.value = resultDataTempt.value.reduce((count, item) => {
  //   if (item.用户选择[0] !== "无") {
  //     return count + 1;
  //   }
  //   return count;
  // }, 0);
};
function isSelected(index, index2) {
  return selectedIndexes.value[`${index}-${index2}`];
}
const countdownMeaningClose = ref(5);
const isDisabledMeaningClose = ref(true);
const buttonTextMeaningClose = ref(`关闭 (${countdownMeaningClose.value}s)`);

const closeMeaning = () => {
  meaningShow.value = false;
};
let interval;
const startCountdown = () => {
  clearInterval(interval);
  countdownMeaningClose.value = 5; // 555555
  // countdownMeaningClose.value = 0;
  isDisabledMeaningClose.value = true;
  buttonTextMeaningClose.value = `${countdownMeaningClose.value}`;
  interval = setInterval(() => {
    if (countdownMeaningClose.value > 1) {
      countdownMeaningClose.value -= 1;
      buttonTextMeaningClose.value = `关闭 (${countdownMeaningClose.value}s)`;
    } else {
      clearInterval(interval); // 清除定时器
      isDisabledMeaningClose.value = false; // 启用按钮
      buttonTextMeaningClose.value = "关闭"; // 更新按钮文本
    }
  }, 1000); // 每秒更新一次
};

const correctCount = ref(0);
const rewardColor = ref("");
const goToNext = async () => {
  // 获取当前轮播图的索引
  const currentSlideIndex = currentIndex.value;

  // 检查当前轮播图中的选中项
  const currentSlideSelections = Object.keys(selectedIndexes.value).filter(
    (key) => key.startsWith(`${currentSlideIndex}-`)
  );
  // 第一个可能是手写
  if (
    currentSlideIndex == 0 &&
    (!mergedData.value || Object.keys(mergedData.value).length === 0)
  ) {
    mergedData.value = mergeAnswerAndSynonym();
  }

  const hasSelection = currentSlideSelections.some(
    (key) => selectedIndexes.value[key]
  );
  if (synonymsOptions.value[currentSlideIndex]["排除"] == "手写") {
    const input = (handwriteInputs.value[currentSlideIndex] || "").trim();
    if (!input) {
      showFailToast("不能为空");
      return;
    }
    handwriteAnswers.value.push({
      序号: mergedData.value[currentSlideIndex]["序号"],
      英文: input,
    });

    // console.log('handwriteAnswers: ', handwriteAnswers.value);
  } else {
    if (!hasSelection) {
      showFailToast("不能为空哦");
      return;
    }
  }

  if (!isButtonDisabled.value) {
    if (buttonText.value == "显示答案") {
      // 显示答案
      answerShow.value = true;
      buttonText.value = "下一个";
      buttonTextType.value = "warning";
      isCheckboxDisabled.value = true;
      handwriteDisabled.value = true;
      // 判断对错
      let areEqual = false;
      if (synonymsOptions.value[currentSlideIndex]["排除"] == "手写") {
        const userSelection = handwriteInputs.value[currentSlideIndex];
        console.log("userSelection: ", userSelection);
        const correctAnswer = synonymsOptions.value[currentSlideIndex]["英文"];
        const cleanString = (str) =>
          (str || "").toLowerCase().replace(/[^a-z]/g, "");
        const userInput = cleanString(userSelection);
        const target = cleanString(correctAnswer);
        if (userInput && target && userInput === target) {
          areEqual = true;
        } else {
          areEqual = false;
        }
      } else {
        const userSelection =
          resultDataTempt.value[currentSlideIndex]["用户选择"];
        const correctAnswer = synonymsOptions.value[currentSlideIndex]["答案"];

        const correctArray = correctAnswer
          .split(/；|,/)
          .map((item) => item.trim())
          .sort();
        const userArray = userSelection
          .join(",")
          .split(/；|,/)
          .map((item) => item.trim())
          .sort();

        areEqual =
          correctArray.length === userArray.length &&
          correctArray.every((item) => userArray.includes(item));
      }

      if (areEqual) {
        correctCount.value += 1;
        // console.log("correctCount: ", correctCount.value);

        if (
          (correctCount.value === 5 || correctCount.value === 10) &&
          !encouragementShown.value[correctCount.value]
        ) {
          encouragementShown.value[correctCount.value] = true;

          // 设置文字
          pivotText.value = `对${correctCount.value}个了`;

          // 播放鼓励音效，并在成功/失败后显示对应动画
          const audio = new Audio(woohooSound);
          audio
            .play()
            .then(() => {
              // 播放成功后显示动画
              if (correctCount.value === 10) {
                showEncouragement2.value = true;
                setTimeout(() => {
                  showEncouragement2.value = false;
                }, 1500);
              } else {
                showEncouragement.value = true;
                setTimeout(() => {
                  showEncouragement.value = false;
                }, 1500);
              }
            })
            .catch((err) => {
              console.warn("鼓励音效播放失败：", err);
              // 播放失败也照样显示动画
              if (correctCount.value === 10) {
                showEncouragement2.value = true;
                setTimeout(() => {
                  showEncouragement2.value = false;
                }, 1500);
              } else {
                showEncouragement.value = true;
                setTimeout(() => {
                  showEncouragement.value = false;
                }, 1500);
              }
            });

          // 清除 pivot 显示
          setTimeout(() => {
            pivotText.value = "";
          }, 3000);

          // ✅ 设置奖励颜色（只设置一次）
          if (correctCount.value === 5) {
            rewardColor.value = "#DAA520"; // 深金色
          } else if (correctCount.value === 10) {
            rewardColor.value = "#FF3E00"; // 金红色
          }
        }

        const audioSuccessPage = new Audio(successSound);
        audioSuccessPage.play().catch((err) => {
          console.warn("播放失败：", err);
        });
        flagChoose.value = true;
        textColor.value = "green";
      } else {
        const audioFailPage = new Audio(turnfailSound);
        audioFailPage.play().catch((err) => {
          console.warn("播放失败：", err);
        });
        getVocabularyMeaning();
        startCountdown();
        flagChoose.value = false;
        textColor.value = "red";
      }
      if (currentIndex.value === totalSlides.value - 1) {
        buttonText.value = "下一步";
        buttonTextType.value = "danger";
      }
      showAnimation_true();
    } else {
      // 进入下一个单词

      if (currentIndex.value < totalSlides.value - 1) {
        if (isButtonDisabled.value) return; // 如果正在动画中则直接返回
        isButtonDisabled.value = true;

        swipeRef.value.next();
        flagSingleOrMultiChoice.value = getSingeOrMultiChoice(
          currentIndex.value + 1
        );
        completeCount.value = (parseInt(completeCount.value) + 1).toString();

        buttonTextType.value = "success";
        isCheckboxDisabled.value = false;
        handwriteDisabled.value = false;
        answerShow.value = false;
        buttonText.value = "显示答案";
        console.log("resultDataTempt: ", resultDataTempt.value);
        if (
          synonymsOptions.value[currentIndex.value + 1]["排除"] !== "试题" &&
          synonymsOptions.value[currentIndex.value + 1]["排除"] !== "手写"
        ) {
          speakWord(
            synonymsOptions.value[currentIndex.value + 1].英文,
            synonymsOptions.value[currentIndex.value + 1].正确答案
          );
        }
        try {
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          console.error("动画执行出错:", error);
        } finally {
          isButtonDisabled.value = false; // 动画结束后启用按钮
        }
      } else {
        // 到达最后一个轮播图，执行提交函数
        function compareAndAddFlag(dictArray) {
          return dictArray.map((item) => {
            const { 排除, 英文, 序号 } = item;

            if (排除 === "手写") {
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

                  item.用户选择 = [answerObj.英文];
                  item.匹配结果 = cleanedInput === cleanedTarget;
                }
              }
            }
            return item;
          });
        }

        resultDataTempt.value = compareAndAddFlag(resultDataTempt.value);
        // console.log('resultDataTempt.value: ', resultDataTempt.value);
        updateAccountLog();
        popNavshow.value = true;
      }
    }
  }
};

// 显示中文答案
const meaningShow = ref(false);
const meaningTitle = ref("");
const meaningData = ref({
  高考: { 英文: "", 中文: "" },
  教材: [{ 中文: "", 模块: "", 教材: "" }],
});
const meaning_answer = ref("");

const getVocabularyMeaning = () => {
  const word = resultDataTempt.value[currentIndex.value].英文;
  meaning_answer.value = resultDataTempt.value[currentIndex.value].正确答案;
  async function getWordMeaning() {
    // 查询单词含义
    let params = new URLSearchParams();
    params.append("method", "getTextbookMeaning");
    params.append("word", word);
    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }
  setTimeout(() => {
    isLoading.value = true;
  }, 800);
  getWordMeaning()
    .then((res) => {
      // console.log("res", res);
      const sortOrder = [
        "七上",
        "七下",
        "八上",
        "八下",
        "九上",
        "九下",
        "必修一",
        "必修二",
        "必修三",
        "选修一",
        "选修二",
        "选修三",
        "选修四",
      ];
      res["教材"].sort((a, b) => {
        return sortOrder.indexOf(a.教材) - sortOrder.indexOf(b.教材);
      });
      meaningTitle.value = word;
      if (res["教材"] == []) {
        meaningData.value["教材"] = ["无"];
      } else {
        meaningData.value["教材"] = res["教材"];
      }

      if (Object.keys(res["高考"]).length === 0) {
        meaningData.value["高考"]["中文"] = "无";
      } else {
        meaningData.value["高考"]["中文"] = res["高考"]["中文"];
        meaningData.value["高考"]["英文"] = res["高考"]["英文"];
      }
      console.log("meaningData", meaningData.value);
    })
    .then((res) => {
      setTimeout(() => {
        isLoading.value = false;
      }, 800);
      meaningShow.value = true;
    })
    .catch((err) => {
      closeToast();
      showFailToast("查询失败");
    });
};

// 动画喜洋洋
const preExamAnimationRef = ref(null);
function showAnimation_true() {
  preExamAnimationRef.value.show();
}

const swipeRef = ref(null);
const completeCount = ref("1");
const currentIndex = ref(0);
const totalSlides = ref(25); // 假设总共有5个轮播图项
const isButtonDisabled = ref(false);

// 显示答案
const answerShow = ref(false);
const buttonText = ref("显示答案");
const buttonTextType = ref("success");
const isCheckboxDisabled = ref(false);
const textColor = ref("lightblue");

function getSingeOrMultiChoice(currentIndex) {
  if (synonymsOptions.value[currentIndex]["is_spell"]) {
    return "多选";
  }
  // 获取当前项的中文字段
  const chineseText = synonymsOptions.value[currentIndex]["答案"];
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

const handleSwipeChange = (index) => {
  currentIndex.value = index;
  nextTick(() => {
    const el = swipeRef.value?.$el?.querySelector(
      `.van-swipe-item:nth-child(${index + 1}) .card`
    );
    if (el) {
      currentHeight.value = el.offsetHeight;
      // console.log('当前 swipe-item 高度：', currentHeight.value);
    }
  });
};
async function updateAccountLog() {
  let params = new URLSearchParams();
  params.append("method", "updateAccountLog");
  params.append("username", username.value);
  params.append("submittoken", submittoken.value);
  params.append("account_id_list", account_id_list.value);
  params.append("log", JSON.stringify(resultDataTempt.value));
  return await axios.post("words/", params).then((ret) => {
    return ret.data;
  });
}
const selectedResults = ref({});
const submittoken = ref("");
const username = ref("");
const basicPreExam = ref("");
const account_id_list = ref("");
const srcTheme = ref("");

// 做题进度
const srcswipeEncouragement = ref("");
const srcswipeEncouragement2 = ref("");
const pivotText = ref("");
const encouragementShown = ref({ 5: false, 10: false });
const progressPercentage = computed(() => {
  if (synonymsOptions.value.length === 0) return 0;
  return Math.round((completeCount.value / synonymsOptions.value.length) * 100);
});

const progressColor = computed(() => {
  return rewardColor.value || "#1989fa"; // 优先用奖励色，未触发时蓝色
});

const progressStyle = computed(() => {
  if (rewardColor.value) {
    return {
      width: "80%",
      margin: "0 auto",
      boxShadow: `0 0 8px 4px ${rewardColor.value}88`, // 发光（加透明度）
      transition: "box-shadow 0.3s ease",
    };
  } else {
    return {
      width: "80%",
      margin: "0 auto",
      boxShadow: "none",
      transition: "box-shadow 0.3s ease",
    };
  }
});
const pivotFontStyle = computed(() => {
  return {
    whiteSpace: "nowrap",
    fontSize: "14px",
    fontWeight: "bold",
  };
});

const showEncouragement = ref(false);
const showEncouragement2 = ref(false);

onBeforeUnmount(async () => {
  clearInterval(interval);
  // 在页面离开时执行的逻辑
  isLoading.value = true;
  isLoading.value = false;
  window.removeEventListener("beforeunload", handleBeforeUnload);
  // console.log("监测到离开");
});
const handleBeforeUnload = (event) => {
  // 在页面刷新时执行的逻辑
  console.log("监测到刷新");
  isLoading.value = true;
  isLoading.value = false;
  event.preventDefault();
  event.returnValue = ""; // 旧浏览器支持
};
onUnmounted(() => {
  window.removeEventListener("beforeunload", handleBeforeUnload);
});
const currentHeight = ref("");
onMounted(async () => {
  nextTick(() => {
    const el = swipeRef.value?.$el?.querySelector(
      ".van-swipe-item:nth-child(1) .card"
    );
    if (el) {
      currentHeight.value = el.offsetHeight;
      // console.log('初始第一个 item 高度：', currentHeight.value);
    }
  });
  if (flagTheme.value == 1) {
    srcTheme.value = chineseMeaningSrcGoatAndWolf;
    srcswipeEncouragement.value = swipeEncouragementSrcGoatAndWolf;
    srcswipeEncouragement2.value = swipeEncouragementSrcGoatAndWolf2;
  }
  if (flagTheme.value == 2) {
    srcTheme.value = chineseMeaningSrcBears;
    srcswipeEncouragement.value = swipeEncouragementBears;
    srcswipeEncouragement2.value = swipeEncouragementBears2;
  }
  window.addEventListener("beforeunload", handleBeforeUnload);
  const initData = async () => {
    // 初始化数据
    synonymsOptions.value = JSON.parse(history.state.data);
    // synonymsOptions.value = JSON.parse(history.state.data)
    //   .reverse()
    //   .slice(0, 5);
    // synonymsOptions.value = [JSON.parse(history.state.data).reverse()[0]];
    console.log("synonymsOptions: ", synonymsOptions.value);

    synonymsOptions.value.forEach((item) => {
      // Check if the answer is '以上都不对'
      if (item["答案"] === "以上都不对") {
        // Split the correct answer into terms for comparison
        const correctAnswerArray = item["正确答案"]
          .split(/；|,/)
          .map((term) => term.trim())
          .sort();
        // console.log('correctAnswerArray', correctAnswerArray);

        for (let chineseText of item["中文"]) {
          let splitChineseText =
            chineseText.includes(",") || chineseText.includes(";")
              ? chineseText
                  .split(/；|,/)
                  .map((term) => term.trim())
                  .sort()
              : [chineseText.trim()];
          // console.log('splitChineseText', splitChineseText);
          const isMatch =
            splitChineseText.length === correctAnswerArray.length &&
            splitChineseText.every((term) => correctAnswerArray.includes(term));

          if (isMatch) {
            // console.log("item", item);
            item["答案"] = item["用户选择"].join(",");
          }
        }
      }
    });

    basicPreExam.value = history.state.basicPreExam;
    totalSlides.value = synonymsOptions.value.length;
    console.log("totalSlides: ", totalSlides.value);

    submittoken.value = new Date().getTime();
    console.log("submittoken: ", submittoken.value);

    username.value = history.state.username;
    account_id_list.value = history.state.account_id_list;

    synonymsOptions.value.forEach((item, index) => {
      item.序号 = index + 1;
    });

    resultDataTempt.value = synonymsOptions.value.map((item) => {
      return {
        ...item,
        用户选择: ["无"],
      };
    });

    // synonymsOptions.value = resultDataTempt.value;
    console.log("synonymsOptions: ", synonymsOptions.value);
    console.log("resultDataTempt: ", resultDataTempt.value);
    // speakWord(synonymsOptions.value[0].英文, synonymsOptions.value[0].正确答案);
    if (
      synonymsOptions.value[0]["排除"] !== "试题" &&
      synonymsOptions.value[0]["排除"] !== "手写"
    ) {
      speakWord(
        synonymsOptions.value[0].英文,
        synonymsOptions.value[0].正确答案
      );
    }
    flagSingleOrMultiChoice.value = getSingeOrMultiChoice(0);
  };

  // 调用初始化函数
  initData();
  flagSingleOrMultiChoice.value = getSingeOrMultiChoice(0);
});
</script>

<template>
  <div class="parent-container">
    <div class="nav-bar-container">
      <van-nav-bar
        title="一起来复习"
        :left-text="`${completeCount}/${synonymsOptions.length}`"
        right-text="导航"
        @click-right="shownavWords"
      >
      </van-nav-bar>
    </div>

    <!-- 做题进度 -->
    <div style="margin-top: 3vh">
      <van-progress
        :pivot-text="pivotText"
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

    <!-- 单词主体 -->
    <van-row justify="center">
      <van-col span="24" style="margin-top: -20px">
        <van-swipe
          class="my-swipe"
          :show-indicators="false"
          :loop="false"
          @change="handleSwipeChange"
          ref="swipeRef"
          :touchable="false"
          style="height: 420px"
          vertical
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
                    <van-cell
                      clickable
                      class="bold-title2 border-cell"
                      @click="speakWord(item.英文, item.正确答案)"
                    >
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
                            <div>{{ item.序号 + ". " + item.正确答案 }}</div>
                          </div>
                          <div
                            v-if="item.排除 !== '手写'"
                            style="font-size: 13px; color: red"
                          >
                            {{ flagSingleOrMultiChoice }}
                            <img
                              src="../assets/speaker.png"
                              style="
                                width: 12px;
                                height: auto;
                                margin-left: 0.2rem;
                                margin-top: 0rem;
                              "
                            />
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
                        </div>

                        <div
                          :style="{
                            marginTop: '0.6rem',
                            marginBottom: '0.1rem',
                            minHeight: answerShow ? 'auto' : '15px',
                          }"
                        >
                          <div class="flying-tag" v-if="answerShow">
                            <div
                              :style="{
                                fontSize: '15px',
                                color: textColor,
                              }"
                            >
                              {{ flagChoose ? "恭喜！" : "写错了！" }}
                              {{
                                item.排除 === "手写" ? item.英文 : item.正确答案
                              }}
                            </div>
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
                              @click.stop.prevent="
                                toggleCheckChinese(index, index2)
                              "
                              :ref="
                                (el) =>
                                  (checkboxRefs[`${index}-${index2}`] = el)
                              "
                              :disabled="isCheckboxDisabled"
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
                        :disabled="handwriteDisabled"
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

    <!-- 按钮 -->
    <van-row
      class="my-swipe-container"
      style="position: relative"
      :style="{ marginTop: currentHeight - 360 + 'px' }"
    >
      <van-col span="2"></van-col>
      <van-col span="14">
        <van-button
          :type="buttonTextType"
          @click="goToNext"
          size="large"
          :disabled="isButtonDisabled"
          >{{ buttonText }}</van-button
        >
      </van-col>
      <van-col span="2"></van-col>
      <preExamAnimation ref="preExamAnimationRef" :flagChoose="flagChoose" />
    </van-row>

    <!-- grid显示 -->
    <van-popup
      position="bottom"
      :style="{ height: '80%' }"
      v-model:show="popNavshow"
      style="padding: 1rem"
      closeable
    >
      <div style="display: flex">
        <div
          style="
            font-weight: 700;
            font-size: 25px;
            color: black;
            margin-bottom: 1rem;
          "
        >
          全局背诵
        </div>
        <div
          style="
            font-size: 12px;
            color: red;
            font-weight: 700;
            margin-top: 0.8rem;
            margin-left: 0.5rem;
          "
        >
          带有 🔍 可以点击显示中文和发音
        </div>
      </div>
      <van-button
        v-if="currentIndex == totalSlides - 1"
        block
        type="danger"
        @click="clickSubmitUser"
        >结束复习</van-button
      >
      <van-grid
        style="margin-top: 0.5rem"
        :column-num="4"
        clickable
        icon-size="14px"
      >
        <van-grid-item
          v-for="(item, index) in resultDataTempt"
          :key="index"
          :text="item.英文"
          class="grid-item-text"
          :icon="item['用户选择'].includes('无') ? null : 'search'"
          :class="{
            'small-font': isTextOverflow(item.英文),
            'gray-background': !item['用户选择'].includes('无'),
            'not-clickable': item['用户选择'].includes('无'),
          }"
          @click="
            !['无'].includes(item['用户选择']) ? showGridMeaning(index) : null
          "
        />
      </van-grid>
    </van-popup>

    <!-- grid中文查询 -->
    <van-dialog
      v-model:show="gridMeaningshow"
      round-button
      theme="round-button"
    >
      <template #title>
        <div
          style="display: flex; justify-content: center"
          @click="speakWordEnglish(gridEnglish, gridChinese)"
        >
          <div v-if="gridException != '试题'" style="font-size: 21px">
            {{ gridEnglish }}
            <img
              src="../assets/speaker.png"
              style="width: 12px; height: auto"
            />
          </div>
          <div
            v-else
            style="font-size: 14px; padding-left: 0.5rem; padding-right: 0.5rem"
          >
            {{ gridEnglish }}
            <img
              src="../assets/speaker.png"
              style="width: 12px; height: auto"
            />
          </div>
        </div>
      </template>
      <div style="display: flex">
        <img
          :src="srcTheme"
          style="
            width: 40px;
            height: auto;
            margin-right: rem;
            margin-left: 1.5rem;
            margin-top: 0.5rem;
          "
        />

        <div style="margin-left: 1rem; font-size: smaller; margin-top: 1.1rem">
          {{ gridChinese }}
        </div>
      </div>
    </van-dialog>

    <!-- vocabulary meaning -->
    <van-popup
      position="bottom"
      :style="{ height: '90%' }"
      v-model:show="meaningShow"
      style="padding: 1rem"
      :close-on-click-overlay="false"
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
      <div
        style="
          margin: -0.5rem 0 0.5rem -0.5rem;
          color: #fa6b83;
          font-weight: 700;
          font-size: 18px;
        "
      >
        <van-icon name="good-job" /> {{ meaning_answer }}
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
      </div>
      <div style="white-space: pre-wrap; font-size: 14px">
        {{ meaningData["高考"]["中文"] }}
      </div>
      <van-button
        block
        :disabled="isDisabledMeaningClose"
        type="primary"
        @click="closeMeaning"
        style="margin-top: 1rem"
      >
        {{ buttonTextMeaningClose }}
      </van-button>
    </van-popup>

    <loading v-if="isLoading" />
  </div>
</template>




<style scope>
html {
  touch-action: manipulation; /* 禁用双击缩放 */
}
.my-swipe {
  margin-top: 30px;
}

/* .block {
  width: 120px;
  height: 120px;
  background-color: #fff;
} */

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
  font-weight: 900;
  font-size: 22px;
  color: #1a89fa;
}

.border-cell {
  border-top: 4px solid #eee;
}

.custom-cell-group:not(:last-child) {
  margin-bottom: 10px;
}

.chinese-cell {
  border-bottom: 0.5px solid #eee;
}

.chinese-cell:last-of-type {
  border-bottom: none; /* 移除最后一个中文选项的分割线 */
}

/* .block {
  display: inline-block;
  width: 22px;
  color: #fff;
  font-size: 12px;
  text-align: center;
  background-color: #ee0a24;
} */
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

/* .block {
  display: inline-block;
  width: 22px;
  color: #fff;
  font-size: 12px;
  text-align: center;
  background-color: #1989fa;
  height: 20px;
} */
.flying-tag {
  animation: fly-up 0.5s ease-out;
  display: flex;
  justify-content: space-between;
}

.small-font {
  font-size: 12px; /* 调整为你需要的大小 */
}

.gray-background {
  background-color: gray; /* 背景颜色 */
}

.not-clickable {
  pointer-events: none; /* 禁止点击 */
  background-color: transparent; /* 背景保持透明 */
}

.glow-text {
  color: #ffd700 !important;
  text-shadow: 0 0 6px #ffd700, 0 0 12px #ffa500;
  transition: all 0.3s ease;
}
</style>
