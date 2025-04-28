<script setup>
import {
  watch,
  onMounted,
  ref,
  getCurrentInstance,
  computed,
  nextTick,
  onBeforeUnmount,
  inject,
  reactive,
} from "vue";
import {
  showFailToast,
  showDialog,
  showConfirmDialog,
  showLoadingToast,
  showSuccessToast,
  showToast,
  Divider,
} from "vant";

import { useRouter } from "vue-router";
import dailyAnimation from "./dailyAnimation.vue";
import chineseMeaningSrcGoatAndWolf from "../assets/chinese_meaning.png";
import chineseMeaningSrcBears from "../assets/Boonie Bears/chinese_meaning.png";
const flagTheme = inject("flagTheme");
const router = useRouter();
const instance = getCurrentInstance();
const axios = instance.appContext.config.globalProperties.$ajax;
import loading from "./loading.vue";
const isLoading = ref(false);

const synonymsOptions = ref([]);
const synonymsSelected = ref([]);
const checkboxRefs = ref([]);

const speakWord = (english, answer) => {
  // 发音
  try {
    let utterance;
    utterance = new SpeechSynthesisUtterance(english);
    if (!/[a-zA-Z]/.test(english)) {
      utterance.lang = "zh-CN";
    } else {
      utterance.lang = "en-US";
    }
    window.speechSynthesis.speak(utterance);
  } catch (error) {
    console.error("Error speaking word:", error);
  }
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

// 点击选项
const resultDataTempt = ref([]);
const selectedIndexes = ref({});
const flagSingleOrMultiChoice = ref("单选");
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

const closeMeaning = () => {
  meaningShow.value = false;
  startAnimation();
};

const goToNext = async () => {
  // 获取当前轮播图的索引
  const currentSlideIndex = currentIndex.value;
  // console.log("selectedIndexes:", selectedIndexes.value);
  // console.log("currentSlideIndex:", currentSlideIndex);
  // 检查当前轮播图中的选中项
  const currentSlideSelections = Object.keys(selectedIndexes.value).filter(
    (key) => key.startsWith(`${String(currentSlideIndex)}-`)
  );
  // console.log("currentSlideSelections:", currentSlideSelections);
  const hasSelection = currentSlideSelections.some(
    (key) => selectedIndexes.value[key]
  );

  if (!hasSelection) {
    showFailToast("不能为空哦");
    return;
  }

  if (!isButtonDisabled.value) {
    if (buttonText.value == "显示答案") {
      // 显示答案
      answerShow.value = true;
      buttonText.value = "下一个";
      buttonTextType.value = "warning";
      isCheckboxDisabled.value = true;
      // 判断对错
      const userSelection =
        resultDataTempt.value[currentSlideIndex]["用户选择"];
      const correctAnswer = synonymsOptions.value[currentSlideIndex]["答案"];

      const correctArray = correctAnswer
        .split(/；|,/)
        .map((item) => item.trim())
        .sort();
      // console.log("correctArray", correctArray);
      // const userArray = userSelection.sort();
      const userArray = userSelection
        .join(",")
        .split(/；|,/)
        .map((item) => item.trim())
        .sort();
      // console.log("userArray", userArray);
      // const areEqual =
      //   JSON.stringify(userArray) === JSON.stringify(correctArray);
      const areEqual =
        correctArray.length === userArray.length &&
        correctArray.every((item) => userArray.includes(item));
      if (areEqual) {
        flagChoose.value = true;
        textColor.value = "green";
      } else {
        mistakesList.value.push(resultDataTempt.value[currentSlideIndex]);
        // console.log("mistakesList:", mistakesList.value);

        getVocabularyMeaning();
        flagChoose.value = false;
        textColor.value = "red";
      }
      if (currentIndex.value === totalSlides.value - 1) {
        buttonText.value = "任务完成";
        buttonTextType.value = "danger";
      }
    } else {
      // 进入下一个单词
      submitList.value.push(resultDataTempt.value[currentSlideIndex]);
      if (currentIndex.value < totalSlides.value - 1) {
        flagSingleOrMultiChoice.value = getSingeOrMultiChoice(
          currentIndex.value + 1
        );
        completeCount.value = (parseInt(completeCount.value) + 1).toString();
        swipeRef.value.next();
        buttonTextType.value = "success";
        isCheckboxDisabled.value = false;
        answerShow.value = false;
        buttonText.value = "显示答案";
        console.log("resultDataTempt: ", resultDataTempt.value);
        speakWord(
          synonymsOptions.value[currentIndex.value + 1].英文,
          synonymsOptions.value[currentIndex.value + 1].正确答案
        );
      } else {
        // 到达最后一个轮播图，执行提交函数
        // console.log("cartCount:", cartCount.value)
        showSuccessToast("恭喜！💎数量增加+2");
        if (cartCount.value == 0) {
          router.push({
            path: "/studentAccountList",
            state: {
              username: username.value,
              data: basicPreExam.value,
            },
          });
          updateAccountLog();
          // console.log("提交");
          // console.log("submitList:", submitList.value);
        } else {
          if(!localStorage.getItem("dailyAnimation")) {
            showAnimation_true();
            localStorage.setItem("dailyAnimation", "true")
          }
          
          synonymsOptions.value = mistakesList.value;
          function shuffleArray(array) {
            for (let i = array.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [array[i], array[j]] = [array[j], array[i]]; // 交换元素
            }
            return array;
          }
          synonymsOptions.value.forEach((item, index) => {
            item.序号 = index + 1;
            item.中文 = shuffleArray([...item.中文]); // 使用扩展运算符创建副本，避免直接修改原始数组
          });
          completeCount.value = 0;
          isCheckboxDisabled.value = false;
          selectedItems.value = [];
          speakWord(
            synonymsOptions.value[0].英文,
            synonymsOptions.value[0].正确答案
          );
          flagSingleOrMultiChoice.value = getSingeOrMultiChoice(0);
          answerShow.value = false;
          selectedIndexes.value = {};
          synonymsSelected.value = [];
          buttonText.value = "显示答案";
          buttonTextType.value = "success";
          currentIndex.value = 0;
          totalSlides.value = synonymsOptions.value.length;
          mistakesList.value = [];
          cartCount.value = 0;

          nextTick(() => {
            if (swipeRef.value) {
              swipeRef.value.swipeTo(0);
            }
          });
        }
      }
    }
  }
};

// 购物车
const mistakesList = ref([]);
const submitList = ref([]);
const cartIcon = ref(null); // 购物车图标的引用
const showAnimation = ref(false); // 控制动画显示
const animationStyle = reactive({
  left: "50vw", // 初始水平位置（屏幕中间）
  top: "50vh", // 初始垂直位置（屏幕中间）
  transform: "translate(-50%, -50%)", // 居中显示
});
const cartCount = ref(0); // 购物车数量

const startAnimation = () => {
  cartCount.value++; // 增加购物车数量
  showAnimation.value = true; // 显示动画元素

  // 获取起点和终点位置
  const startX = window.innerWidth / 2;
  const startY = window.innerHeight / 4;
  const cartRect = cartIcon.value.$el.getBoundingClientRect();
  const endX = cartRect.left + cartRect.width / 2;
  const endY = cartRect.top + cartRect.height / 2;

  // 定义动画参数
  const duration = 500; // 动画持续时间，1.5秒
  let startTime = null;
  const height = -150; // 抛物线最高点向上偏移（负值表示向上抛高）

  // 缓动函数
  const easeOutQuad = (t) => t * (2 - t); // ease-out for ascent
  const easeInQuad = (t) => t * t; // ease-in for descent

  // 动画函数
  const animate = (timestamp) => {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    let t = elapsed / duration;
    if (t >= 1) {
      // 动画结束
      showAnimation.value = false;
      animationStyle.left = "50vw";
      animationStyle.top = "50vh";
      animationStyle.transform = "translate(-50%, -50%)";
      return;
    }

    // 调整 t 以实现非匀速动画
    if (t < 0.5) {
      t = easeOutQuad(t * 2) / 2; // 前半段缓动
    } else {
      t = 0.5 + easeInQuad((t - 0.5) * 2) / 2; // 后半段缓动
    }

    // 计算抛物线路径
    const x = startX + (endX - startX) * t;
    const y = startY + (endY - startY) * t + height * t * (1 - t); // 抛物线公式

    // 更新动画元素位置
    animationStyle.left = `${x}px`;
    animationStyle.top = `${y}px`;
    animationStyle.transform = "translate(-50%, -50%)";

    // 继续下一帧
    requestAnimationFrame(animate);
  };

  // 开始动画
  requestAnimationFrame(animate);
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
      // console.log("meaningData", meaningData.value);
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
};
async function updateAccountLog() {
  let params = new URLSearchParams();
  params.append("method", "updateAccountLog");
  params.append("username", username.value);
  params.append("submittoken", submittoken.value);
  params.append("account_id_list", account_id_list.value);
  params.append("flagReview", "周常任务");
  // params.append("log", JSON.stringify(resultDataTempt.value));
  params.append("log", JSON.stringify(submitList.value));
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

onMounted(async () => {
  localStorage.removeItem("dailyAnimation");
  if (flagTheme.value == 1) {
    srcTheme.value = chineseMeaningSrcGoatAndWolf;
  }
  if (flagTheme.value == 2) {
    srcTheme.value = chineseMeaningSrcBears;
  }
  const initData = async () => {
    // 初始化数据
    synonymsOptions.value = JSON.parse(history.state.data);
    // synonymsOptions.value = JSON.parse(history.state.data).slice(0, 3);
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

    submittoken.value = new Date().getTime();
    // console.log("submittoken: ", submittoken.value);

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
    speakWord(synonymsOptions.value[0].英文, synonymsOptions.value[0].正确答案);
    flagSingleOrMultiChoice.value = getSingeOrMultiChoice(0);
  };

  // 调用初始化函数
  initData();
  flagSingleOrMultiChoice.value = getSingeOrMultiChoice(0)
});
</script>

<template>
  <div class="parent-container">
    <div class="nav-bar-container">
      <van-nav-bar
        title="一起来复习"
        :left-text="`${completeCount}/${synonymsOptions.length}`"
      >
      </van-nav-bar>
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
                          style="
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                          "
                        >
                          <div>{{ item.序号 + ". " + item.英文 }}</div>
                          <div style="font-size: 13px; color: red">
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
                          :style="{
                            marginTop: '0.6rem',
                            marginBottom: '0.1rem',
                            minHeight: answerShow ? 'auto' : '15px',
                          }"
                        >
                          <div class="flying-tag" v-if="answerShow">
                            <div
                              v-if="flagChoose"
                              :style="{
                                fontSize: '15px',
                                color: textColor,
                              }"
                            >
                              恭喜！{{ item.正确答案 }}
                            </div>
                            <div
                              v-else
                              :style="{
                                fontSize: '15px',
                                color: textColor,
                              }"
                            >
                              写错了！{{ item.正确答案 }}
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
                            :disabled="isCheckboxDisabled"
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

    <!-- 购物车 -->
    <van-row>
      <van-col span="8" offset="16" style="margin-top: -40px">
        <van-badge :content="cartCount">
          <van-icon
            ref="cartIcon"
            name="cart-o"
            color="#1989fa"
            size="2.5rem"
          />
        </van-badge>
      </van-col>
    </van-row>
    <div
      v-if="showAnimation"
      class="animated-item"
      :style="animationStyle"
    ></div>

    <van-row class="my-swipe-container" style="position: relative">
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
    </van-row>

    <!-- vocabulary meaning -->
    <van-popup
      position="top"
      :style="{ height: '50%' }"
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

      <van-button
        block
        type="primary"
        @click="closeMeaning"
        style="margin-top: 1rem"
      >
        关闭
      </van-button>
    </van-popup>

    <dailyAnimation ref="preExamAnimationRef"/>
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
/* 购物车 */
.animated-item {
  position: fixed;
  width: 20px;
  height: 20px;
  background: red; /* 绿色小球 */
  border-radius: 50%;
  z-index: 999; /* 确保在其他元素之上 */
}
</style>
