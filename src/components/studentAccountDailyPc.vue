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
import preExamAnimation from "./preExam.vue";
import dailyAnimation from "./dailyAnimation.vue";
import WinningStreakPopup from "./WinningStreakPopup.vue";
import chineseMeaningSrcGoatAndWolf from "../assets/chinese_meaning.png";
import chineseMeaningSrcBears from "../assets/Boonie Bears/chinese_meaning.png";
import successSound from "../assets/sound/success.mp3";
import turnfailSound from "../assets/sound/turnfail.mp3";
import woohooSound from "../assets/sound/woohoo.mp3";
import swipeEncouragementSrcGoatAndWolf from "../assets/swipeEncouragement.gif";
import swipeEncouragementSrcGoatAndWolf2 from "../assets/swipeEncouragement2.gif";
import swipeEncouragementBears from "../assets/Boonie Bears/swipeEncouragement.gif";
import swipeEncouragementBears2 from "../assets/Boonie Bears/swipeEncouragement2.gif";
import loading from "./loading.vue";

const flagTheme = inject("flagTheme");
const router = useRouter();
const instance = getCurrentInstance();
const axios = instance.appContext.config.globalProperties.$ajax;

const isLoading = ref(false);

const synonymsOptions = ref([]);
const synonymsSelected = ref([]);
const checkboxRefs = ref([]);

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
const speakWord = (english, answer) => {
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
      return speakWord(english, answer); // 再次调用，走缓存逻辑
    } catch (err) {
      console.warn("base64 转换失败：", err);
    }
  }

  // 3) 从 item 对象查找（你原来的逻辑）
  const word = /[a-zA-Z]/.test(english) ? english : answer;
  const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(
    word
  )}&type=1`;
  const audio = new Audio(url);
  audio.play().catch(() => {
    console.log("Fallback to SpeechSynthesis");
    fallbackSpeech(english, answer);
  });
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
  );
};

// 手写模式
const handwriteInputs = ref({});
const handwriteDisabled = ref(false);
const handwriteAnswers = ref([]);

// 点击选项
const resultDataTempt = ref([]);
const selectedIndexes = ref({});
const flagSingleOrMultiChoice = ref("单选");
const flagChoose = ref(true);
const flagChoose2 = ref(true);

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

  // 累积选中的选项转换为字符串
  let mergedChinese = selectedChineses.join("");

  const answerEnglish = synonymsOptions.value[index]?.答案;

  let addedChinese = "";
  const containsSpace = answerEnglish.includes(" ");
  const containsChinese = /[\u4e00-\u9fa5]/.test(answerEnglish);

  if (containsSpace && !containsChinese) {
    if (answerEnglish && mergedChinese.length <= answerEnglish.length) {
      let spacedChinese = "";
      let chineseIndex = 0;

      for (let i = 0; i < answerEnglish.length; i++) {
        if (answerEnglish[i] === " ") {
          spacedChinese += " ";
        } else {
          spacedChinese += mergedChinese[chineseIndex] || "";
          chineseIndex++;
        }
      }

      mergedChinese = spacedChinese.trim();
      let originalIndex = 0;

      for (let i = 0; i < mergedChinese.length; i++) {
        if (
          originalIndex >= originalChinese.length ||
          mergedChinese[i] !== originalChinese[originalIndex]
        ) {
          if (mergedChinese[i] === " ") {
            addedChinese += "  ";
          } else {
            addedChinese += mergedChinese[i];
          }
        } else {
          originalIndex++;
        }
      }
    }
    const existingItemIndex = selectedItems.value.findIndex(
      (item) => item.key === key
    );
    if (selectedIndexes.value[key]) {
      if (existingItemIndex !== -1) {
        selectedItems.value[existingItemIndex].label = mergedChinese;
      } else {
        selectedItems.value.push({
          label: addedChinese,
          key: key,
          is_spell: is_spell_selectedItems,
        });
      }
    } else {
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
        selectedItems.value[existingItemIndex].label = mergedChinese;
      } else {
        selectedItems.value.push({
          label: currentChinese,
          key: key,
          is_spell: is_spell_selectedItems,
        });
      }
    } else {
      selectedItems.value = selectedItems.value.filter(
        (item) => item.key !== key
      );
    }
  }
  originalChinese = mergedChinese;
  mergedData.value = mergeAnswerAndSynonym();
  const synonymsSelectedChinese = convertSelections(
    synonymsSelected.value,
    synonymsOptions.value
  );
  resultDataTempt.value = mergeSynonymAndSelections(synonymsSelectedChinese);
};

function isSelected(index, index2) {
  return selectedIndexes.value[`${index}-${index2}`];
}

const closeMeaning = () => {
  meaningShow.value = false;
  startAnimation();
};

const countdownMeaningClose = ref(5);
const isDisabledMeaningClose = ref(true);
const buttonTextMeaningClose = ref(`关闭 (${countdownMeaningClose.value}s)`);
let interval;
const startCountdown = () => {
  clearInterval(interval);
  countdownMeaningClose.value = 5;
  isDisabledMeaningClose.value = true;
  buttonTextMeaningClose.value = `${countdownMeaningClose.value}`;
  interval = setInterval(() => {
    if (countdownMeaningClose.value > 1) {
      countdownMeaningClose.value -= 1;
      buttonTextMeaningClose.value = `关闭 (${countdownMeaningClose.value}s)`;
    } else {
      clearInterval(interval);
      isDisabledMeaningClose.value = false;
      buttonTextMeaningClose.value = "关闭";
    }
  }, 1000);
};

const correctCount = ref(0);
const rewardColor = ref("");
const goToNext = async () => {
  const currentSlideIndex = currentIndex.value;

  if (
    currentSlideIndex == 0 &&
    (!mergedData.value || Object.keys(mergedData.value).length === 0)
  ) {
    mergedData.value = mergeAnswerAndSynonym();
  }

  const currentSlideSelections = Object.keys(selectedIndexes.value).filter(
    (key) => key.startsWith(`${String(currentSlideIndex)}-`)
  );
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
        flagChoose2.value = true;
        correctCount.value += 1;

        if (
          (correctCount.value === 5 || correctCount.value === 10) &&
          !encouragementShown.value[correctCount.value]
        ) {
          encouragementShown.value[correctCount.value] = true;

          pivotText.value = `对${correctCount.value}个了`;

          const audio = new Audio(woohooSound);
          audio
            .play()
            .then(() => {
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

          setTimeout(() => {
            pivotText.value = "";
          }, 3000);

          if (correctCount.value === 5) {
            rewardColor.value = "#DAA520";
          } else if (correctCount.value === 10) {
            rewardColor.value = "#FF3E00";
          }
        }

        const audioSuccessPage = new Audio(successSound);
        audioSuccessPage.play().catch((err) => {
          console.warn("播放失败：", err);
        });
        flagChoose.value = true;
        textColor.value = "green";
      } else {
        flagChoose2.value = false;
        const audioFailPage = new Audio(turnfailSound);
        audioFailPage.play().catch((err) => {
          console.warn("播放失败：", err);
        });
        mistakesList.value.push(resultDataTempt.value[currentSlideIndex]);

        getVocabularyMeaning();
        startCountdown();
        flagChoose.value = false;
        textColor.value = "red";
      }
      showAnimation_true2();
      if (currentIndex.value === totalSlides.value - 1) {
        buttonText.value = "任务完成";
        buttonTextType.value = "danger";
      }
    } else {
      // 进入下一个单词
      submitList.value.push(resultDataTempt.value[currentSlideIndex]);
      if (currentIndex.value < totalSlides.value - 1) {
        if (isButtonDisabled.value) return;
        isButtonDisabled.value = true;
        swipeRef.value.next();
        flagSingleOrMultiChoice.value = getSingeOrMultiChoice(
          currentIndex.value + 1
        );
        completeCount.value = (parseInt(completeCount.value) + 1).toString();

        buttonTextType.value = "success";
        isCheckboxDisabled.value = false;
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
          isButtonDisabled.value = false;
        }
      } else {
        if (cartCount.value == 0) {
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
          submitList.value = compareAndAddFlag(submitList.value);

          isLoading.value = true;
          try {
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error("请求超时")), 8000);
            });

            const response = await Promise.race([
              updateAccountLog(),
              timeoutPromise,
            ]);

            activeWinningStreak.value = response["today_record_count"];
            dailyWinningStreak.value = response["daily_record_count"];
          } catch (error) {
            if (error.message === "请求超时") {
              console.log("请求超时，请重试");
              showFailToast("网络错误请重试");
              isLoading.value = false;
              return;
            } else {
              console.error("请求失败:", error);
            }
          } finally {
            isLoading.value = false;
          }
          const message =
            reviewRequired.value === 1
              ? "恭喜！💎数量增加+1"
              : "恭喜！💎数量增加+2";

          setTimeout(() => {
            showSuccessToast(message);
          }, 1000);
          if (
            (activeWinningStreak.value > 6 && dailyWinningStreak.value > 2) ||
            activeWinningStreak.value == undefined
          ) {
            redirect();
          } else {
            shoWinningStreak.value = true;
          }
        } else {
          if (!localStorage.getItem("dailyAnimation")) {
            showAnimation_true();
            localStorage.setItem("dailyAnimation", "true");
          }

          synonymsOptions.value = mistakesList.value;
          function shuffleArray(array) {
            for (let i = array.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
          }
          synonymsOptions.value.forEach((item, index) => {
            item.序号 = index + 1;
            item.中文 = shuffleArray([...item.中文]);
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
const cartIcon = ref(null);
const showAnimation = ref(false);
const animationStyle = reactive({
  left: "50vw",
  top: "50vh",
  transform: "translate(-50%, -50%)",
});
const cartCount = ref(0);

const startAnimation = () => {
  cartCount.value++;
  showAnimation.value = true;

  const startX = window.innerWidth / 2;
  const startY = window.innerHeight / 4;
  const cartRect = cartIcon.value.$el.getBoundingClientRect();
  const endX = cartRect.left + cartRect.width / 2;
  const endY = cartRect.top + cartRect.height / 2;

  const duration = 500;
  let startTime = null;
  const height = -150;

  const easeOutQuad = (t) => t * (2 - t);
  const easeInQuad = (t) => t * t;

  const animate = (timestamp) => {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    let t = elapsed / duration;
    if (t >= 1) {
      showAnimation.value = false;
      animationStyle.left = "50vw";
      animationStyle.top = "50vh";
      animationStyle.transform = "translate(-50%, -50%)";
      return;
    }

    if (t < 0.5) {
      t = easeOutQuad(t * 2) / 2;
    } else {
      t = 0.5 + easeInQuad((t - 0.5) * 2) / 2;
    }

    const x = startX + (endX - startX) * t;
    const y = startY + (endY - startY) * t + height * t * (1 - t);

    animationStyle.left = `${x}px`;
    animationStyle.top = `${y}px`;
    animationStyle.transform = "translate(-50%, -50%)";

    requestAnimationFrame(animate);
  };

  requestAnimationFrame(animate);
};

// 显示中文答案
const meaningShow = ref(false);
const meaningTitle = ref("");
const meaningData = ref({
  高考: { 英文: "", 中文: "" },
  教材: [{ 中文: "", 模块: "", 教材: "" }],
});
const typeXiti = ref("");
const meaning_answer = ref("");

const getVocabularyMeaning = () => {
  const word = resultDataTempt.value[currentIndex.value].英文;
  typeXiti.value = resultDataTempt.value[currentIndex.value].排除;
  console.log("typeXiti: ", typeXiti.value);
  meaning_answer.value = resultDataTempt.value[currentIndex.value].正确答案;
  async function getWordMeaning() {
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
    })
    .then((res) => {
      setTimeout(() => {
        isLoading.value = false;
      }, 800);
      meaningShow.value = true;
    })
    .catch((err) => {
      // closeToast(); // Note: closeToast not imported in script provided, removed to avoid error or use showFailToast
      showFailToast("查询失败");
    });
};

// 动画喜洋洋
const preExamAnimationRef = ref(null);
const preExamAnimationRef2 = ref(null);
function showAnimation_true() {
  preExamAnimationRef.value.show();
}
function showAnimation_true2() {
  preExamAnimationRef2.value.show();
}

const swipeRef = ref(null);
const completeCount = ref("1");
const currentIndex = ref(0);
const totalSlides = ref(25);
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
  const chineseText = synonymsOptions.value[currentIndex]["答案"];
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
const currentHeight = ref("");
const handleSwipeChange = (index) => {
  currentIndex.value = index;
  nextTick(() => {
    const el = swipeRef.value?.$el?.querySelector(
      `.van-swipe-item:nth-child(${index + 1}) .card`
    );
    if (el) {
      currentHeight.value = el.offsetHeight;
    }
  });
};
async function updateAccountLog() {
  let params = new URLSearchParams();
  params.append("method", "updateAccountLog");
  params.append("username", username.value);
  params.append("submittoken", submittoken.value);
  params.append("account_id_list", account_id_list.value);
  params.append("flagReview", "复习任务");
  params.append("reviewRequired", reviewRequired.value);
  params.append("log", JSON.stringify(submitList.value));
  return await axios.post("words/", params).then((ret) => {
    return ret.data;
  });
}

// 做题进度
const srcswipeEncouragement = ref("");
const srcswipeEncouragement2 = ref("");
const pivotText = ref("");
const encouragementShown = ref({ 5: false, 10: false });
const totalCount = computed(() => synonymsOptions.value.length);
const progressPercentage = computed(() => {
  if (synonymsOptions.value.length === 0) return 0;
  return Math.round((completeCount.value / synonymsOptions.value.length) * 100);
});

const progressColor = computed(() => {
  return rewardColor.value || "#1989fa";
});

const progressStyle = computed(() => {
  if (rewardColor.value) {
    return {
      width: "80%",
      margin: "0 auto",
      boxShadow: `0 0 8px 4px ${rewardColor.value}88`,
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

// 连胜纪录
const shoWinningStreak = ref(false);
const activeWinningStreak = ref(0);
const dailyWinningStreak = ref(0);
const new_final_rate = ref(3);

const handleContinue = () => {
  redirect();
};
const handleAutoClose = () => {};
const redirect = () => {
  router.push({
    path: "/studentAccountListPc",
    state: {
      username: username.value,
      data: basicPreExam.value,
      reviewRequired: reviewRequired.value,
    },
  });
};

onUnmounted(() => {
  window.removeEventListener("beforeunload", handleBeforeUnload);
});
function handleBeforeUnload(event) {
  event.preventDefault();
  event.returnValue = "";
}
const selectedResults = ref({});
const submittoken = ref("");
const username = ref("");
const navTitle = ref("");
const basicPreExam = ref("");
const reviewRequired = ref(1);
const account_id_list = ref("");
const srcTheme = ref("");

onMounted(async () => {
  window.addEventListener("beforeunload", handleBeforeUnload);
  nextTick(() => {
    const el = swipeRef.value?.$el?.querySelector(
      ".van-swipe-item:nth-child(1) .card"
    );
    if (el) {
      currentHeight.value = el.offsetHeight;
    }
  });
  localStorage.removeItem("dailyAnimation");
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
  const toast = showLoadingToast({
    duration: 0,
    forbidClick: true,
    message: "加载音频...",
    loadingType: "spinner",
  });
  const initData = async () => {
    synonymsOptions.value = JSON.parse(history.state.data);
    console.log("history.state: ", history.state);

    synonymsOptions.value.forEach((item) => {
      if (item["答案"] === "以上都不对") {
        const correctAnswerArray = item["正确答案"]
          .split(/；|,/)
          .map((term) => term.trim())
          .sort();

        for (let chineseText of item["中文"]) {
          let splitChineseText =
            chineseText.includes(",") || chineseText.includes(";")
              ? chineseText
                  .split(/；|,/)
                  .map((term) => term.trim())
                  .sort()
              : [chineseText.trim()];
          const isMatch =
            splitChineseText.length === correctAnswerArray.length &&
            splitChineseText.every((term) => correctAnswerArray.includes(term));

          if (isMatch) {
            item["答案"] = item["用户选择"].join(",");
          }
        }
      }
    });

    basicPreExam.value = history.state.basicPreExam;
    reviewRequired.value = history.state.reviewRequired;
    totalSlides.value = synonymsOptions.value.length;

    submittoken.value = new Date().getTime();
    console.log("submittoken: ", submittoken.value);

    username.value = history.state.username;
    navTitle.value = history.state.navTitle || "一起来复习";
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

    if (
      synonymsOptions.value[currentIndex.value + 1]["排除"] !== "试题" &&
      synonymsOptions.value[currentIndex.value + 1]["排除"] !== "手写"
    ) {
      speakWord(
        synonymsOptions.value[0].英文,
        synonymsOptions.value[0].正确答案
      );
    }
    flagSingleOrMultiChoice.value = getSingeOrMultiChoice(0);
    let params = new URLSearchParams();
    params.append("method", "getAudioList");
    params.append("word_list", JSON.stringify(resultDataTempt.value));
    const response = await axios.post("words/", params);
    console.log("response: ", response.data);
    if (response.data.success && response.data.audio_data) {
      Object.entries(response.data.audio_data).forEach(([word, obj]) => {
        try {
          const blob = base64ToBlob(obj.data, "audio/mpeg");
          audioCache.set(word, blob);
        } catch (err) {
          console.warn(`音频转换失败: ${word}`, err);
        }
      });

      if (response.data.failed_words && response.data.failed_words.length > 0) {
        const failedList = response.data.failed_words.join("，");
        showConfirmDialog({
          theme: "round-button",
          title: "音频加载失败",
          message: `以下单词的音频未能加载：\n${failedList}`,
          confirmButtonText: "知道了",
        }).catch(() => {});
      }
    }
    toast.close();
  };

  initData();
  flagSingleOrMultiChoice.value = getSingeOrMultiChoice(0);
});
</script>

<template>
  <!-- 新增顶级包裹 div -->
  <div class="app-root">
    <!-- 新增顶部导航栏 -->
    <div class="top-nav-header">
      <div class="nav-left-content">{{ username }}</div>
      <div class="nav-center-content">{{ navTitle }}</div>
      <div class="nav-right-placeholder"></div>
      <!-- 占位，确保flex布局下标题居中（如果不用绝对定位） -->
    </div>

    <!-- 原有的主布局容器，现在包裹在app-root内 -->
    <div class="parent-container layout-container">
      <!-- 布局：左侧面板 (控制区/进度/按钮) -->
      <div class="control-panel">
        <div class="custom-info-bar">
          <div class="info-left-text">
            {{ completeCount }} / {{ synonymsOptions.length }}
          </div>
          <div class="info-right-title">一起来复习</div>
        </div>

        <!-- 做题进度 -->
        <div class="progress-wrapper">
          <van-progress
            :pivot-text="pivotText"
            :color="progressColor"
            :percentage="progressPercentage"
            :style="progressStyle"
            :pivot-style="pivotFontStyle"
          />

          <!-- 鼓励动画 (Fixed定位，不受容器限制) -->
          <img
            v-if="showEncouragement"
            :src="srcswipeEncouragement"
            alt="鼓励动画"
            class="encouragement-gif"
          />
          <img
            v-if="showEncouragement2"
            :src="srcswipeEncouragement2"
            alt="鼓励动画"
            class="encouragement-gif"
          />
        </div>

        <!-- 底部按钮区 (在横屏时移入左侧面板) -->
        <div class="button-container">
          <van-button
            :type="buttonTextType"
            @click="goToNext"
            block
            size="large"
            :disabled="isButtonDisabled"
            class="action-button"
            >{{ buttonText }}</van-button
          >
        </div>
      </div>

      <!-- 布局：右侧面板 (卡片/购物车) -->
      <div class="card-panel">
        <div class="swipe-wrapper">
          <van-swipe
            class="my-swipe"
            :show-indicators="false"
            :loop="false"
            @change="handleSwipeChange"
            ref="swipeRef"
            :touchable="false"
          >
            <van-swipe-item
              v-for="(item, index) in synonymsOptions"
              :key="index"
            >
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
                                v-if="flagChoose"
                                :style="{
                                  fontSize: '15px',
                                  color: textColor,
                                }"
                              >
                                {{ flagChoose ? "恭喜！" : "写错了！" }}
                                {{
                                  item.排除 === "手写"
                                    ? item.英文
                                    : item.正确答案
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
        </div>

        <!-- 购物车 (移动到右侧卡片面板内) -->
        <div class="cart-wrapper">
          <van-badge :content="cartCount">
            <van-icon
              ref="cartIcon"
              name="cart-o"
              color="#1989fa"
              size="2.5rem"
            />
          </van-badge>
        </div>
      </div>

      <!-- 动画元素 (独立层级) -->
      <div
        v-if="showAnimation"
        class="animated-item"
        :style="animationStyle"
      ></div>

      <!-- vocabulary meaning -->
      <van-popup
        position="right"
        :style="{ width: '40%', height: '100%' }"
        v-model:show="meaningShow"
        style="padding: 1rem"
        :close-on-click-overlay="false"
      >
        <!-- Popup 内容保持不变 -->
        <div
          v-if="typeXiti != '试题'"
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
          v-else
          style="
            font-weight: 400;
            font-size: 17px;
            color: red;
            margin-bottom: 2rem;
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
          :disabled="isDisabledMeaningClose"
          type="primary"
          @click="closeMeaning"
          style="margin-top: 1rem"
        >
          {{ buttonTextMeaningClose }}
        </van-button>
      </van-popup>

      <dailyAnimation ref="preExamAnimationRef" />
      <preExamAnimation ref="preExamAnimationRef2" :flagChoose="flagChoose2" />
      <loading v-if="isLoading" />
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
  </div>
</template>

<script>
// 用于在setup外补充一些计算属性或逻辑，如果需要的话
// 但此处因为已经用了 script setup，这部分主要为了解决 cartWrapperStyle 在 script setup 中未定义的问题
// 由于 script setup 中不好直接写 data/methods 混合，我将在下面的 computed 中补充 cartWrapperStyle 逻辑
</script>

<style scope>
html {
  touch-action: manipulation; /* 禁用双击缩放 */
  height: 100%;
  overflow: hidden; /* 防止整个页面滚动 */
}

body {
  height: 100%;
  margin: 0;
}

/* --- 新增的顶级样式 --- */

.app-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  background-color: #f7f8fa;
}

.top-nav-header {
  flex-shrink: 0; /* 防止被压缩 */
  height: 46px; /* 标准导航栏高度 */
  background-color: white;
  border-bottom: 1px solid #ebedf0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  font-weight: bold;
  color: #000; /* 黑体字 */
  position: relative;
  z-index: 200;
}

.nav-left-content {
  /* 左侧用户名 */
  font-size: 14px;
}

.nav-center-content {
  /* 中间标题 - 使用绝对定位居中 */
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 16px;
  white-space: nowrap;
}

/* --- 修改后的容器样式 --- */

/* 原 layout-container 现在作为子 flex 项目 */
.layout-container {
  width: 100%;
  /* 核心修改：flex: 1 让它占满剩余空间 */
  flex: 1;
  min-height: 0; /* 防止 flex item 内容溢出导致撑大容器 */
  background-color: #f7f8fa;
  overflow: hidden; /* 内部管理滚动条 */
}

.nav-bar-container {
  position: sticky;
  top: 0;
  z-index: 100;
}

.progress-wrapper {
  margin-top: 3vh;
  position: relative;
}

.encouragement-gif {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 75vw;
  max-width: 400px;
  z-index: 1000;
  pointer-events: none;
}

.my-swipe {
  /* margin-top: 30px; Removed to handle via flex/grid */
  height: auto;
  min-height: 1px;
}

.card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  padding: 10px 20px;
  margin: 10px auto;
  width: calc(90% - 40px);
}

/* 默认竖屏模式 (Portrait) */
@media (orientation: portrait) {
  .layout-container {
    display: block;
    overflow-y: auto;
  }

  .control-panel {
    width: 100%;
    background-color: #fff;
    border-right: none;
    border-bottom: 1px solid #ebedf0;

    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center; /* 关键：改为 center 让子元素默认水平居中 */

    /* 增加底部内边距，确保下方有呼吸感 */
    padding: 20px 20px 30px 20px;

    height: auto;
    position: relative;
  }

  /* 1. 针对进度条区域：增加底部间距 */
  .progress-wrapper {
    width: 100%; /* 进度条本身还是占满容器宽度的 */
    margin-top: 20px; /* 顶部间距 */
    margin-bottom: 40px; /* 核心修改：大幅增加底部间距，把按钮推开 */
  }

  .card-panel {
    display: block;
    padding-bottom: 50px;
  }

  .my-swipe {
    margin-top: 10px;
  }

  /* 2. 针对按钮区域：限制宽度 */
  .button-container {
    margin-top: 0; /* 由上方元素的 margin-bottom 控制间距 */

    /* 核心修改：宽度限制 */
    width: 80%; /* 默认占屏幕宽度的 80% */
    max-width: 320px; /* 最大不超过 320px，防止在平板竖屏时太宽 */

    /* 居中显示 */
    margin-left: auto;
    margin-right: auto;

    display: flex;
    justify-content: center;
  }

  .cart-wrapper {
    position: fixed;
    right: 20px;
    bottom: 100px;
    z-index: 99;
  }
}

/* 横屏模式 (Landscape) */
@media (orientation: landscape) {
  .layout-container {
    display: flex;
    flex-direction: row;
    height: 100%; /* 占满 flex: 1 的高度 */
    overflow: hidden;
  }

  /* --- 左侧面板 --- */
  .control-panel {
    width: 30%;
    min-width: 250px;
    background-color: #fff;
    border-right: 1px solid #ebedf0;

    display: flex;
    flex-direction: column;

    /* 1. 让内容在"剩余空间"里居中 */
    justify-content: center;
    align-items: stretch;

    /* 2. 核心修改在这里！！！ */
    /* 注意：因为有了顶部导航，这里的 30vh 可能会让内容偏上，可以适当调整 */
    padding: 20px 30px 30vh 30px;

    box-sizing: border-box;
    height: 100%; /* 占满父容器 */
    position: relative;
    overflow-y: auto;
  }

  /* 让导航标题跟随整体布局 */
  .nav-bar-container {
    position: static;
    margin-bottom: 10px;
    text-align: center;
  }

  .nav-bar-container .van-nav-bar {
    background-color: transparent;
  }
  .nav-bar-container .van-nav-bar::after {
    border-bottom: none;
  }

  .progress-wrapper {
    margin-top: 10px;
    margin-bottom: 20px;
    width: 100%;
  }

  .button-container {
    /* 按钮紧跟在进度条下面，不要推到底部 */
    margin-top: 10px;
    margin-bottom: 0;
    width: 100%;
  }

  /* --- 右侧面板 --- */
  .card-panel {
    width: 70%;
    height: 100%; /* 占满父容器 */
    overflow-y: auto;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f7f8fa;
  }

  .swipe-wrapper {
    width: 100%;
    max-width: 600px;
  }

  .my-swipe {
    margin-top: 0;
    padding: 20px 0;
  }

  .cart-wrapper {
    position: absolute;
    right: 30px;
    bottom: 30px;
    z-index: 99;
  }
}

/* 其他保留的样式 */
.selected-cell {
  font-weight: bold;
  color: #1a89fa !important;
  background-color: #c0c6cc !important;
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
  border-bottom: none;
}

.nav-button {
  margin-left: 10px;
  padding: 5px 5px;
  margin-top: 4px;
  color: #208bfa;
  cursor: pointer;
  user-select: none;
}

.flying-tag {
  animation: fly-up 0.5s ease-out;
  display: flex;
  justify-content: space-between;
}

.small-font {
  font-size: 12px;
}

.gray-background {
  background-color: gray;
}

.not-clickable {
  pointer-events: none;
  background-color: transparent;
}

/* 购物车小球动画 */
.animated-item {
  position: fixed;
  width: 20px;
  height: 20px;
  background: red;
  border-radius: 50%;
  z-index: 999;
}

.custom-info-bar {
  display: flex;
  justify-content: space-between; /* 关键：左右两端对齐，中间留白 */
  align-items: center;
  width: 85%;       /* 占满父容器宽度 */
  height: 40px;      /* 给一个合适的高度 */
  margin-bottom: 10px;
  font-size: 16px;
}

.info-left-text {
  color: #1989fa;    /* 保持 Vant 风格的蓝色 */
  font-weight: 500;
  white-space: nowrap; /* 防止数字换行 */
}

.info-right-title {
  font-weight: bold;
  color: #323233;
  white-space: nowrap; /* 防止标题换行 */
}
</style>