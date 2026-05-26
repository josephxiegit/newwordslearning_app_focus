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
import LightningStrike from "./lighteningStrike.vue";
// ✅ 新增：复用手写键盘组件
import HandwriteKeyboard from "./HandwriteKeyboard.vue";

import happyhalf from "../assets/sound/happyhalf.mp3";
import thunderSound from "../assets/sound/thunder.mp3";

const flagTheme = inject("flagTheme");
const router = useRouter();
const instance = getCurrentInstance();
const axios = instance.appContext.config.globalProperties.$ajax;
const AI_JUDGE_TIMEOUT_MS = 8000;
const NETWORK_BUSY_TOAST_DURATION = 3000;
const isLoading = ref(false);

// 导航栏数据
const navTitle = ref("");
const navUsername = ref("");

const synonymsOptions = ref([]);
const synonymsSelected = ref([]);
const answers = ref([]);
const checkboxRefs = ref([]);
const nid = ref("");
const customTranslateItems = ref([]);
const customTranslateInputs = ref({});

// 听力模式
const listening_number = ref(0);
const listeningModeIndices = ref(new Set());

// 默写模式
const writingwords_number = ref(0);
const writingwordsModeIndices = ref(new Set());

// 提交按钮
const showDialogSubmit = ref(false);
const mergedData = ref([]);
const showDataEmpty = ref(false);

const isCustomTranslate = (serialNumber) => {
  return customTranslateItems.value.some((item) => item.序号 === serialNumber);
};

const submitSelection = () => {
  if (complete_status.value == true || complete_status.value == 1) {
    clickSubmitUser("confirm", () => {}, true);
  } else {
    showDialogSubmit.value = true;
  }
};
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
  return newList;
};
const convertSelections = (synonymsSelected, synonymsOptions) => {
  const resultMap = new Map();

  synonymsOptions.forEach((option) => {
    resultMap.set(option.序号, ["无"]);
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
  if (handwriteAnswers.value.length > 0) {
    handwriteAnswers.value.forEach(({ 序号, 英文 }) => {
      if (!英文?.trim()) return;
      const current = resultMap.get(序号);
      if (current && !current.includes(英文)) {
        if (current.length === 1 && current[0] === "无") {
          resultMap.set(序号, [英文]);
        } else {
          resultMap.get(序号).push(英文);
        }
      }
    });
  }

  if (customTranslateItems.value.length > 0) {
    customTranslateItems.value.forEach(({ 序号 }) => {
      const input = getTranslateInputValue(序号);
      if (input) {
        resultMap.set(序号, [input]);
      }
    });
  }

  return Array.from(resultMap, ([序号, 中文]) => ({ 序号, 中文 })).sort(
    (a, b) => a.序号 - b.序号
  );
};

const compareAndAddFlag = (dictArray) => {
  return dictArray.map((item) => {
    const { 答案, 用户选择, 正确答案, is_spell, 排除, 英文 } = item;

    const normalize = (str) =>
      str
        .replace(/；/g, ",")
        .replace(/，/g, ",")
        .split(",")
        .map((s) => s.trim());

    const answerArray = normalize(答案).sort();
    const correctAnswerArray = 正确答案 ? normalize(正确答案).sort() : [];
    const userSelectionArray = normalize(用户选择.join(",")).sort();

    let flag = "false";

    if (is_spell) {
      const userSelectionString = 用户选择.join("").replace(/\s/g, "");
      const correctAnswerString = 正确答案.replace(/\s/g, "");
      flag = userSelectionString === correctAnswerString ? "true" : "false";
    } else if (排除 == "手写") {
      const cleanString = (str) =>
        (str || "").toLowerCase().replace(/[^a-z]/g, "");
      const userInput = cleanString(用户选择[0]);
      const target = cleanString(英文);
      flag = userInput && target && userInput === target ? "true" : "false";
    } else {
      if (
        userSelectionArray.join(",") === answerArray.join(",") ||
        (correctAnswerArray.length &&
          userSelectionArray.join(",") === correctAnswerArray.join(","))
      ) {
        flag = "true";
      } else if (
        答案 === "以上都不对" &&
        correctAnswerArray.length &&
        userSelectionArray.join(",") === correctAnswerArray.join(",")
      ) {
        flag = "true";
      } else if (answerArray.some((ans) => userSelectionArray.includes(ans))) {
        flag = 答案 == 用户选择 ? "true" : "half";
      }
    }
    return { ...item, flag };
  });
};

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[，。；！？、,.!?]/g, "");

const splitAnswers = (value) =>
  String(value || "")
    .split(/[；;，,、/|]/)
    .map((item) => item.trim())
    .filter(Boolean);

const getTranslateInputValue = (serialNumber) => {
  const inputs = customTranslateInputs.value[serialNumber];
  return Array.isArray(inputs) ? (inputs[0] || "").trim() : "";
};

const isPureEnglishWord = (value) =>
  /^[A-Za-z][A-Za-z\s'-]*$/.test(String(value || "").trim());

const hasOnlyChineseAnswers = (value) => {
  const parts = splitAnswers(value);
  return (
    parts.length > 0 &&
    parts.every((part) => /[\u4e00-\u9fa5]/.test(part) && !/[a-zA-Z]/.test(part))
  );
};

const buildCustomTranslateItems = () => {
  if (writingwords_number.value <= 0) {
    customTranslateItems.value = [];
    customTranslateInputs.value = {};
    writingwordsModeIndices.value = new Set();
    return;
  }

  const pool = (answers.value || [])
    .map((item, index) => ({
      index,
      序号: item?.序号 ?? index + 1,
      英文: item?.英文 || "",
      正确答案: item?.正确答案 || item?.中文 || "",
      中文: item?.中文 || "",
    }))
    .filter((item) => {
      const isEngWord = isPureEnglishWord(item.英文);
      const isChineseAnswer = hasOnlyChineseAnswers(item.正确答案);
      const isNotHandwrite = synonymsOptions.value[item.index]?.排除 !== "手写";
      const isNotListening = !listeningModeIndices.value.has(item.index);
      return isEngWord && isChineseAnswer && isNotHandwrite && isNotListening;
    });

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  customTranslateItems.value = shuffled.slice(
    0,
    Math.min(writingwords_number.value, shuffled.length)
  );
  writingwordsModeIndices.value = new Set(
    customTranslateItems.value.map((item) => item.index)
  );
  customTranslateInputs.value = Object.fromEntries(
    customTranslateItems.value.map((item) => [item.序号, [""]])
  );
};

const fetchSemanticJudge = async (payload) => {
  const apiKey = "sk-b6b5d72093844ae4a244b285e246c115";
  const url = "https://api.deepseek.com/v1/chat/completions";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_JUDGE_TIMEOUT_MS);

  const systemPrompt = `你是一个严谨的英语老师。请判断学生的中文答案在语义上是否与标准答案一致，或者是否也是该英文单词合理的近义词/中文释义。
要求：
1. 允许合理的同义词、近义词（如“漂亮”与“美丽”）。
2. 多字、漏字但核心意思不变，算正确。
3. 词性完全错误或意思跑偏，算错误。
必须输出纯 JSON 格式：{"correct": true} 或 {"correct": false}，不要包含任何其他字符。`;

  const userContent = `单词: ${payload.word}
语境提示: ${payload.sourceChinese}
标准答案: ${payload.correctAnswers.join(", ")}
学生输入的答案: ${payload.userAnswers.join(", ")}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        temperature: 0.1,
        max_tokens: 15,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("AI_TIMEOUT");
    }
    console.error("前端直连大模型报错:", error);
    throw new Error("AI_NETWORK_ERROR");
  }
};

const aiValidationCache = ref({});

const judgeWithAI = async (item, userInput) => {
  const singleUserInput = Array.isArray(userInput)
    ? userInput[0] || ""
    : userInput;
  const cacheKey = `${item.英文}-${singleUserInput}`;
  if (aiValidationCache.value[cacheKey] !== undefined) {
    return aiValidationCache.value[cacheKey];
  }

  try {
    const res = await fetchSemanticJudge({
      word: item.英文,
      userAnswers: [singleUserInput],
      correctAnswers: splitAnswers(item.正确答案),
      sourceChinese: item.中文,
    });

    let isCorrect = false;
    if (typeof res === "boolean") isCorrect = res;
    else if (typeof res?.correct === "boolean") isCorrect = res.correct;
    else if (typeof res?.result === "boolean") isCorrect = res.result;

    aiValidationCache.value[cacheKey] = isCorrect;
    return isCorrect;
  } catch (error) {
    if (
      error.message === "AI_TIMEOUT" ||
      error.message === "AI_NETWORK_ERROR"
    ) {
      throw error;
    }
    return false;
  }
};

const runWithTimeout = (promise, timeoutMs) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("AI_TIMEOUT")), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
};

const shouldUseAiJudge = (item) => {
  const customItem = customTranslateItems.value.find(
    (c) => c.序号 === item.序号
  );
  return customItem && item.flag !== "true" && item.用户选择[0] !== "无";
};

const hasPendingAiJudge = (compareResult) =>
  compareResult.some((item) => {
    const customItem = customTranslateItems.value.find(
      (c) => c.序号 === item.序号
    );
    if (!shouldUseAiJudge(item)) return false;

    const cacheKey = `${customItem.英文}-${item.用户选择[0] || ""}`;
    return aiValidationCache.value[cacheKey] === undefined;
  });

const applyAiJudgeResult = async (compareResult) => {
  for (let i = 0; i < compareResult.length; i++) {
    const resItem = compareResult[i];
    if (!shouldUseAiJudge(resItem)) continue;

    const customItem = customTranslateItems.value.find(
      (c) => c.序号 === resItem.序号
    );
    const semanticMatched = await judgeWithAI(customItem, resItem.用户选择);
    if (semanticMatched) {
      resItem.flag = "true";
    }
  }
};

const showNetworkBusyToast = () => {
  setTimeout(() => {
    showFailToast({
      message: "网络拥堵，判分超时，请重试",
      duration: NETWORK_BUSY_TOAST_DURATION,
    });
  }, 0);
};

const applyAiJudgeWithToast = async (compareResult) => {
  if (customTranslateItems.value.length === 0) return true;

  const aiToast = hasPendingAiJudge(compareResult)
    ? showLoadingToast({
        message: "AI阅卷中...",
        duration: 0,
        forbidClick: true,
      })
    : null;

  try {
    await runWithTimeout(
      applyAiJudgeResult(compareResult),
      AI_JUDGE_TIMEOUT_MS
    );
    if (aiToast) aiToast.close();
    return true;
  } catch (error) {
    if (aiToast) aiToast.close();
    showNetworkBusyToast();
    return false;
  }
};

const clickSubmitUser = async (action, done) => {
  if (complete_status.value == 1) {
    action = "confirm";
  }
  if (action === "confirm") {
    showDialogSubmit.value = false;
    mergedData.value = mergeAnswerAndSynonym();

    const synonymsSelectedChinese = convertSelections(
      synonymsSelected.value,
      synonymsOptions.value
    );
    const synonymAndSelections = mergeSynonymAndSelections(
      synonymsSelectedChinese
    );
    let compareResult = compareAndAddFlag(synonymAndSelections);

    if (!(await applyAiJudgeWithToast(compareResult))) return;

    function handleUncertain(uncertainVocabulary, compareResult) {
      let uncertainVocabularyMap = new Map(
        [...uncertainVocabulary].map((item) => [item.英文, item])
      );

      compareResult.forEach((result) => {
        if (result.flag !== "true") {
          if (uncertainVocabularyMap.has(result.英文)) {
            uncertainVocabularyMap.delete(result.英文);
          }
        }
      });

      let updatedUncertainVocabulary = new Set();
      uncertainVocabularyMap.forEach((item, key) => {
        let correspondingResult = compareResult.find(
          (result) => result.英文 === key
        );
        if (correspondingResult) {
          item["答案"] = correspondingResult.答案;
          if (correspondingResult.正确答案 !== undefined) {
            item["正确答案"] = correspondingResult.正确答案;
          } else {
            item["正确答案"] = "无";
          }
        }
        updatedUncertainVocabulary.add(item);
      });

      return updatedUncertainVocabulary;
    }
    uncertainVocabulary.value = handleUncertain(
      uncertainVocabulary.value,
      compareResult
    );

    if (!lock_spell.value) {
      function getSpellVocabulary(compareResult, uncertainVocabulary) {
        const spellVocabularyResult = [];
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
          if (
            item.flag !== "true" &&
            !addedEnglishSet.has(english) &&
            !isPhrase(english) &&
            typeof correctAnswer === "string" &&
            !containsChineseSemicolon(correctAnswer) &&
            isPureEnglish(english)
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

        return spellVocabularyResult;
      }
      spellVocabulary.value = getSpellVocabulary(
        compareResult,
        uncertainVocabulary.value
      );
    } else {
      spellVocabulary.value = spellVocabulary.value;
    }

    function calculateAccuracy(compareResult) {
      const total = compareResult.length;
      const correct = compareResult.filter(
        (item) => item.flag === "true"
      ).length;
      return ((correct / total) * 100).toFixed(2);
    }
    const rateAccuracy = calculateAccuracy(compareResult);
    if (isRewardEligible.value) {
      if (rateAccuracy < 70) {
        totalCoins.value = 0;
      } else {
        totalCoins.value = compareResult.reduce((coins, item) => {
          return item.flag === "true" ? coins + 5 : coins;
        }, 0);
        if (isBroken.value) {
          totalCoins.value = Math.floor(totalCoins.value * 0.5);
        }
      }
    } else {
      totalCoins.value = 0;
    }

    let swipe_status;
    if (complete_status.value == 1) {
      swipe_status = rateAccuracy < 83 ? 0 : 1;
    } else {
      swipe_status = rateAccuracy < 81 ? 0 : 1;
    }

    console.log("totalCoins: ", totalCoins.value);
    console.log("compareResult:", compareResult);
    let containsUnselected = compareResult.some((item) =>
      item.用户选择.includes("无")
    );
    if (
      containsUnselected &&
      complete_status.value !== true &&
      complete_status.value !== 1
    ) {
      function notifyDataEmpty() {
        showDataEmpty.value = true;
        setTimeout(() => {
          showDataEmpty.value = false;
        }, 1500);
      }
      notifyDataEmpty();
      clickScroll();
    } else {
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
      compareResult = compareResult.map((item) => ({
        ...item,
        听力: listeningModeIndices.value.has(item.序号 - 1),
        默写: writingwordsModeIndices.value.has(item.序号 - 1),
      }));
      let rate = checkFlags(compareResult);
      if(typeMode.value == 2 && rate == 1) {
        rate = 3;
      }

      compareResult2.value = compareResult;
      rate2.value = rate;

      const timeDiff = submittoken.value ? Date.now() - submittoken.value : 0;

      // 简单模式
      if(typeMode.value == 2) {
        swipe_status = 1;
      }

      async function updateAccountData() {
        let params = new URLSearchParams();
        params.append("method", "updateUserData");
        // 更新AccountData
        params.append("submittoken", submittoken.value);
        params.append("nid", nid.value);
        params.append("rate", rate);
        params.append("swipe", 0);
        params.append("type", typeMode.value);
        params.append("coins", totalCoins.value);
        params.append("swipe_status", swipe_status);

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
        params.append("complete_status", complete_status.value);
        params.append("earning_half", isBroken.value);
        params.append("listening_number", listening_number.value);
        params.append("writingwords_number", customTranslateItems.value.length);

        // 更新spell vocabulary
        params.append("data_words", JSON.stringify(spellVocabulary.value));
        params.append("lock_spell", lock_spell.value);
        return await axios.post("words/", params).then((ret) => {
          return ret.data;
        });
      }

      async function updateUncertain(accountLogResult) {
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

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("请求超时")), 6000)
      );
      isLoading.value = true;
      startAnimation();

      console.log("compareResult", compareResult);
      if (compareResult.length == 0) {
        showFailToast("提交数据不能为空");
        isLoading.value = false;
        return;
      } else {
        const updateAccountPromise = updateAccountData();

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
              width: "360px",
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
          if (error.message === "请求超时") {
            isLoading.value = false;
            stopAnimation();
            showDialog({
              title: "超时",
              message: "请求超时，请稍后再试。",
              theme: "round-button",
              width: "360px",
            }).then(() => {
              return;
            });
          } else {
            console.log("发生错误:", error.message);
          }
          return;
        } finally {
          let UncertainResult;
          console.log("uncertainVocabulary:", uncertainVocabulary.value);
          try {
            if (uncertainVocabulary.value.size != 0) {
              await updateUncertain(accountDataResult.new_log_nid);
            }
          } catch (error) {
            console.log("更新不确定词汇时发生错误:", error);
          }

          console.log("spellVocabulary:", spellVocabulary.value);

          isLoading.value = false;

          sessionStorage.removeItem("showAnswerMagic");
          sessionStorage.removeItem("showMagic");
          sessionStorage.removeItem("flagHelp");
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

  selectedItems.value.splice(index, 1);

  if (checkboxRefs.value[selectedItem.key]) {
    checkboxRefs.value[selectedItem.key].toggle();
  }

  selectedIndexes.value[selectedItem.key] = false;
  const removeChinese = synonymsOptions.value[i].中文[j];
  const removeIndex = selectedResults.value[i].indexOf(removeChinese);

  if (removeIndex !== -1) {
    selectedResults.value[i].splice(removeIndex, 1);
  }

  mergedData.value = mergeAnswerAndSynonym();

  const synonymsSelectedChinese = convertSelections(
    synonymsSelected.value,
    synonymsOptions.value
  );

  console.log("selectedItems: ", selectedItems);
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
const overlayColor = ref("rgba(128, 128, 128, 0.6)");
const themeVars = {
  "--van-popup-background": "transparent",
};

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
  if (complete_status.value == 1) {
    showFailToast("闪电⚡️不支持购买");
    return;
  }
  if (yesornotShowAnswer.value) {
    showAnswerMagic.value = true;
  } else {
    showMagic.value = true;
    const res = await getUserCoins();
    flagHelp.value = false;
    usercoins.value = res["data_coins"][0]["coins"];
    usercoinsEnd.value = res["data_coins"][0]["coins"];
    await nextTick();
    rollingTextRef.value.start();
  }
};
const handlePurchaseMagic = (action, done) => {
  if (action === "confirm" || action === "cancel") {
    done();
  }
};
const purchaseConfirm = async () => {
  mergedData.value = mergeAnswerAndSynonym();

  const synonymsSelectedChinese = convertSelections(
    synonymsSelected.value,
    synonymsOptions.value
  );

  const synonymAndSelections = mergeSynonymAndSelections(
    synonymsSelectedChinese
  );

  const compareResult = compareAndAddFlag(synonymAndSelections);

  if (!(await applyAiJudgeWithToast(compareResult))) return;

  console.log("compareResult: ", compareResult);
  const allFlagsTrue = compareResult.every((item) => item.flag == "true");
  if (allFlagsTrue) {
    showAnimationShineHelpForGood();
    isabledPurchase.value = true;
    return;
  }
  totalCoins.value = compareResult.reduce((coins, item) => {
    return item.flag === "true" ? coins + 5 : coins;
  }, 0);
  console.log("totalCoins: ", totalCoins.value);

  if (usercoins.value < priceMagic.value) {
    showFailToast("余额不足");
    return;
  } else {
    compareResultFalse.value = compareResult.filter(
      (item) => item.flag != "true"
    );

    rollingTextRef.value.reset();
    const res = await consumeMagic();
    usercoinsEnd.value = res["coins"];
    await nextTick();
    rollingTextRef.value.start();
    usercoins.value = res;
    isLoading.value = false;
    isabledPurchase.value = true;
    yesornotShowAnswer.value = true;
    setTimeout(() => {
      showAnswerMagic.value = true;
      showMagic.value = false;
    }, 2000);
  }
};

// 添加滚动功能
const myList = ref([]);
const setItemRef = (el, index) => {
  if (el) {
    myList.value[index] = el;
  }
};
const scrollToItem = (index) => {
  if (index >= synonymsOptions.value.length - 2) {
    heightScroll.value = 65;
  }

  const item = myList.value[index];
  if (item) {
    item.scrollIntoView({ behavior: "smooth", block: "center" });
  }
};
const clickScroll = () => {
  const indexNoEmpty = resultDataTempt.value.findIndex(
    (item) => item.用户选择[0] == "无"
  );
  if (indexNoEmpty !== -1) {
    scrollToItem(indexNoEmpty);
  }
};

// 预览跳转功能
const selectedResults = ref({});
const showScroll = ref(true);
const lowerAnchor = 65;
const middleAnchor = Math.round(0.4 * window.innerHeight);
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
  return heightScroll.value === lowerAnchor ? "显示导航" : "关闭导航";
});
const buttonStyle = computed(() => {
  return {
    marginBottom: "10px",
    fontWeight: "bold",
    color: heightScroll.value === lowerAnchor ? "green" : "red",
  };
});

// ✅ 手写键盘相关（与手机版对齐）
const handwriteInputs = ref({});
const handwriteAnswers = ref([]);
const activeHandwriteIndex = ref(null); // ✅ 新增
const handwriteAreaRefs = ref({}); // ✅ 新增
const sidebarWidth = ref(80);

// ✅ 修复：补充清空时移除记录的逻辑（与手机版对齐）
function saveHandwriteAnswer(index, serialNumber) {
  const input = (handwriteInputs.value[index] || "").trim();
  if (!input) {
    handwriteAnswers.value = handwriteAnswers.value.filter(
      (ans) => ans.序号 !== serialNumber
    );
    return;
  }

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

// ✅ 新增：键盘输入时同步更新
function handleHandwriteInput(index, serialNumber, value) {
  handwriteInputs.value[index] = value;
  saveHandwriteAnswer(index, serialNumber);
}

// ✅ 新增：激活对应手写格的键盘
function showHandwriteKeyboard(index) {
  activeHandwriteIndex.value = index;
  nextTick(() => {
    const el = handwriteAreaRefs.value[index];
    if (el) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  });
}

// ✅ 新增：点击键盘和手写区以外的地方收起键盘
function handleDocumentPointerDown(event) {
  if (activeHandwriteIndex.value === null) return;
  const target = event.target;
  const activeArea = handwriteAreaRefs.value[activeHandwriteIndex.value];
  if (activeArea?.contains(target)) return;
  if (target?.closest?.(".keyboard-popup")) return;
  activeHandwriteIndex.value = null;
}

const onTranslateInput = () => {
  mergedData.value = mergeAnswerAndSynonym();
  const synonymsSelectedChinese = convertSelections(
    synonymsSelected.value,
    synonymsOptions.value
  );
  resultDataTempt.value = mergeSynonymAndSelections(synonymsSelectedChinese);
  completeCount.value = resultDataTempt.value.reduce((count, item) => {
    if (item.用户选择[0] !== "无") {
      return count + 1;
    }
    return count;
  }, 0);

  const halfOptions = Math.ceil(synonymsOptions.value.length / 2);
  if (completeCount.value == halfOptions && flagHalfEncouragement.value) {
    flagHalfEncouragement.value = false;
    playEncourageWhenSafe(() => showAnimationShineEncouragement());
  }
};

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

const speakCooldownMap = ref(new Map());
const SPEAK_COOLDOWN_MS = 3000;

function speakWithCooldown(english) {
  const word = (english || "").trim();
  if (!word) return;

  const now = Date.now();
  const lastTime = speakCooldownMap.value.get(word) || 0;
  if (now - lastTime < SPEAK_COOLDOWN_MS) return;

  speakCooldownMap.value.set(word, now);
  speakWord(word);
}
const wordSoundBusyUntil = ref(0);

function markWordSoundBusy(ms = 900) {
  wordSoundBusyUntil.value = Date.now() + ms;
}

function playEncourageWhenSafe(fn) {
  const waitMs = Math.max(0, wordSoundBusyUntil.value - Date.now());
  setTimeout(fn, waitMs + 120);
}
const toggleCheckChinese = (index, index2) => {
  if (isDisabled(index, index2)) {
    return;
  }
  const english = synonymsOptions.value[index]?.英文;
  speakWithCooldown(english);
  markWordSoundBusy();

  const key = `${index}-${index2}`;
  const checkboxRef = checkboxRefs.value[key];
  if (checkboxRef) {
    checkboxRef.toggle();
  }

  const wasSelected = selectedIndexes.value[key];
  selectedIndexes.value[key] = !wasSelected;

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
      const types = exists.type.split(",");
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
            return `${content}+1`;
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

  const selectedChineses = selectedResults.value[index] || [];
  const currentChinese = synonymsOptions.value[index].中文[index2];
  const is_spell_selectedItems = synonymsOptions.value[index].is_spell;
  if (selectedIndexes.value[key]) {
    selectedChineses.push(currentChinese);
  } else {
    const removeIndex = selectedChineses.indexOf(currentChinese);
    if (removeIndex !== -1) {
      selectedChineses.splice(removeIndex, 1);
    }
  }
  selectedResults.value[index] = selectedChineses;
  let mergedChinese = selectedChineses.join("");

  const answerEnglish = answers.value[index]?.英文;

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
  completeCount.value = resultDataTempt.value.reduce((count, item) => {
    if (item.用户选择[0] !== "无") {
      return count + 1;
    }
    return count;
  }, 0);

  const halfOptions = Math.ceil(synonymsOptions.value.length / 2);
  if (completeCount.value == halfOptions && flagHalfEncouragement.value) {
    flagHalfEncouragement.value = false;
    playEncourageWhenSafe(() => showAnimationShineEncouragement());
  }
};

function isSelected(index, index2) {
  return selectedIndexes.value[`${index}-${index2}`];
}

// 提交进度条
const lightningRef = ref(null);
const complete_status = ref(0);
const percentage = ref(100);
const showProgress = ref(false);
let intervalId = null;
const stopAnimation = () => {
  clearInterval(intervalId);
  intervalId = null;
  showProgress.value = false;
  percentage.value = 0;
};
const startAnimation = () => {
  if (intervalId) {
    clearInterval(intervalId);
  }

  showProgress.value = true;
  percentage.value = 100;

  const duration = 6000;
  const step = 100 / (duration / 50);

  intervalId = setInterval(() => {
    if (percentage.value > 0) {
      percentage.value = Math.max(0, percentage.value - step);
    } else {
      percentage.value = 0;
      clearInterval(intervalId);
      showProgress.value = false;
    }
  }, 50);
};

// 场外支援
const flagHelp = ref(true);
const totalCoins = ref(0);
const isBroken = ref(false);
const helpOutside = () => {
  if (complete_status.value == 1) {
    showFailToast("闪电⚡️不支持支援");
    return;
  }

  if (flagHelp.value) {
    showConfirmDialog({
      title: "场外支援",
      theme: "round-button",
      message: "只有一次求助机会，确认使用吗？",
    }).then(async () => {
      mergedData.value = mergeAnswerAndSynonym();
      console.log("mergedData.value: ", mergedData.value);

      const synonymsSelectedChinese = convertSelections(
        synonymsSelected.value,
        synonymsOptions.value
      );
      console.log("synonymsSelectedChinese: ", synonymsSelectedChinese);

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

      const compareResult = compareAndAddFlag(synonymAndSelections);
      if (!(await applyAiJudgeWithToast(compareResult))) return;
      console.log("compareResult: ", compareResult);

      function calculateAccuracy(compareResult) {
        const total = compareResult.length;
        const correct = compareResult.filter(
          (item) => item.flag === "true"
        ).length;
        return ((correct / total) * 100).toFixed(2);
      }

      if (isRewardEligible.value) {
        if (calculateAccuracy(compareResult) < 70) {
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
        if (countFlags.falseCount == 0 && countFlags.halfCount == 0) {
          showAnimationShineHelpForGood();
        } else {
          helpforbadRef.value.show();
          showDialog({
            width: "360px",
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
      width: "360px",
    });
  }
};

// 单词发音
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

const currentAudioRef = ref(null);
const currentSpeakTimeoutRef = ref(null);

function stopSpeak() {
  const curr = currentAudioRef.value;
  if (curr?.audio) {
    try {
      curr.audio.pause();
      curr.audio.currentTime = 0;
    } catch (e) {}
  }
  if (typeof curr?.cleanup === "function") {
    try {
      curr.cleanup();
    } catch (e) {}
  }
  currentAudioRef.value = null;

  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }

  if (currentSpeakTimeoutRef.value) {
    clearTimeout(currentSpeakTimeoutRef.value);
    currentSpeakTimeoutRef.value = null;
  }
}

function playAudioAsCurrent(audio, objectUrl = null) {
  stopSpeak();

  const cleanup = () => {
    try {
      audio.onended = null;
      audio.onerror = null;
    } catch (e) {}
    if (objectUrl) {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch (e) {}
    }
  };

  currentAudioRef.value = { audio, objectUrl, cleanup };

  audio.onended = () => {
    if (currentAudioRef.value?.audio === audio) {
      cleanup();
      currentAudioRef.value = null;
    } else {
      cleanup();
    }
  };

  audio.onerror = () => {
    if (currentAudioRef.value?.audio === audio) {
      cleanup();
      currentAudioRef.value = null;
    } else {
      cleanup();
    }
  };

  return audio.play();
}

const speakWord = async (english) => {
  const word = (english || "").trim();
  if (!word) return;

  stopSpeak();

  const cached = audioCache.get(word);

  if (cached instanceof Blob) {
    const audioUrl = URL.createObjectURL(cached);
    const audio = new Audio(audioUrl);
    audio.currentTime = 0;

    try {
      await playAudioAsCurrent(audio, audioUrl);
      return;
    } catch (err) {
      try {
        URL.revokeObjectURL(audioUrl);
      } catch (e) {}
      console.warn("播放被拒（缓存 Blob），将继续尝试有道：", err);
    }
  }

  if (cached instanceof Audio) {
    const src = cached.src;
    const audio = new Audio(src);
    audio.currentTime = 0;

    try {
      await playAudioAsCurrent(audio, null);
      return;
    } catch (err) {
      console.warn("播放失败（Audio cache -> clone），将继续尝试有道：", err);
    }
  }

  if (window.preloadedAudioData && window.preloadedAudioData[word]) {
    try {
      const base64 = window.preloadedAudioData[word].data;
      const blob = base64ToBlob(base64, "audio/mpeg");
      audioCache.set(word, blob);
      return speakWord(word);
    } catch (err) {
      console.warn("base64 转换失败，将继续尝试有道：", err);
    }
  }

  const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(
    word
  )}&type=1`;

  const audio = new Audio(url);
  audio.currentTime = 0;

  try {
    await playAudioAsCurrent(audio, null);
    return;
  } catch (err) {
    console.warn("有道播放失败，按策略静默：", err);

    if (currentSpeakTimeoutRef.value) {
      clearTimeout(currentSpeakTimeoutRef.value);
      currentSpeakTimeoutRef.value = null;
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    return;
  }
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

// 简单模式
const typeMode = ref(0);

// 连胜进度条
const shoWinningStreak = ref(false);
const activeWinningStreak = ref(0);
const dailyWinningStreak = ref(0);
const rate2 = ref(0);
const new_final_rate = ref(0);

const compareResult2 = ref("");
const accountDataResult2 = ref("");

const handleContinue = () => {
  redirect(accountDataResult2.value);
};
const handleAutoClose = () => {};
const redirect = (accountDataResult) => {
  router.push({
    path: "/studentAccountAnswerPc",
    state: {
      uncertainResult: JSON.stringify(Array.from(uncertainVocabulary.value)),
      compareResult: JSON.stringify(compareResult2.value),
      userSelected: JSON.stringify(synonymsSelected.value),
      nid: nid.value,
      rate: accountDataResult.rate,
      halfTrue: rate2.value,
      newCoins: totalCoins.value,
      username: username.value,
      account_log_id: accountDataResult["new_log_nid"],
      spellVocabulary: JSON.stringify(spellVocabulary.value),
      lock_spell: lock_spell.value,
      complement: 1 - rate2.value,
      RateOrigin: RateOrigin.value,
      navTitle: navTitle.value,
      swipe_status: accountDataResult.swipe_status,
      isBroken: isBroken.value,
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
  } else {
    console.log("用户回到了页面");
    showDialog({
      title: "警告",
      message: "中途退出，重新背诵",
      theme: "round-button",
      width: "360px",
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
  }
};
const checkedNoneOfAbove = ref(false);
const checkedSpell = ref(false);
const RateOrigin = ref(0);

// 圆环进度条闪电地狱
const DURATION = ref(0);
const currentRate = ref(100);
const timerRate = ref(100);
const remainingSeconds = ref("倒计时");

let timer = null;
let elapsed = 0;

function startTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  let totalDuration = 0;
  synonymsOptions.value
    .filter((item) => item.type !== "排除")
    .forEach((item) => {
      if (item.type === "试题" || item.type === "手写") {
        totalDuration += 20;
      } else if (item.is_spell !== undefined) {
        totalDuration += 10;
      } else {
        totalDuration += 6;
      }
    });
  totalDuration += writingwordsModeIndices.value.size * 5;
  DURATION.value = totalDuration;
  console.log("DURATION", DURATION.value);

  elapsed = 0;
  currentRate.value = 100;
  remainingSeconds.value = DURATION.value;

  timer = setInterval(() => {
    elapsed += 100;
    currentRate.value = Math.max(
      0,
      100 - (elapsed / (DURATION.value * 1000)) * 100
    );
    remainingSeconds.value = Math.ceil(
      (DURATION.value * 1000 - elapsed) / 1000
    );
    if (elapsed >= DURATION.value * 1000) {
      clearInterval(timer);
      timer = null;
      remainingSeconds.value = 0;
      clickSubmitUser("confirm", () => {});
    }
  }, 100);
}

onBeforeUnmount(() => {
  window.removeEventListener("pagehide", handlePageHide);
  // ✅ 新增：移除键盘关闭监听
  document.removeEventListener("pointerdown", handleDocumentPointerDown);
});
onUnmounted(() => {
  clearInterval(timer);
  window.removeEventListener("beforeunload", handleBeforeUnload);
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  stopSpeak();
});
function handleBeforeUnload(event) {
  event.preventDefault();
  event.returnValue = "";
}
onBeforeUpdate(() => {
  myList.value = [];
});
onMounted(async () => {
  // ✅ 新增：注册键盘关闭监听
  document.addEventListener("pointerdown", handleDocumentPointerDown);

  window.addEventListener("beforeunload", handleBeforeUnload);
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
      width: "360px",
    });
  }

  if (history.state) {
    navTitle.value = history.state.title || "";
    navUsername.value = history.state.username || "";
  }

  complete_status.value = history.state.complete_status;
  // console.log("complete_status: ", complete_status.value);

  // 判断是否为简单模式
  typeMode.value = history.state?.type ?? 0;
  console.log("type.value: ", typeMode.value);

  const data = JSON.parse(history.state.data);
  RateOrigin.value = history.state.RateOrigin;
  checkedNoneOfAbove.value = history.state.checkedNoneOfAbove;
  checkedSpell.value = history.state.checkedSpell;

  alias.value = data.alias;
  listening_number.value = history.state.listening_number || 0;
  writingwords_number.value = history.state.writingwords_number || 0;
  console.log("listening_number: ", listening_number.value);

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
  isBroken.value = history.state.isBroken;
  console.log("isBroken.value: ", isBroken.value);
  priceMagic.value = isBroken.value ? 1000 : priceMagic.value;
  nid.value = history.state.nid;
  synonymsOptions.value = data.synonyms;
  answers.value = data.answers;
  titleData.value = data.title;
  username.value = data.username;
  submittoken.value = new Date().getTime();
  console.log("submittoken: ", submittoken.value);
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
  const toast = showLoadingToast({
    duration: 0,
    forbidClick: true,
    message: "加载音频...",
    loadingType: "spinner",
  });

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
    Object.entries(response.data.audio_data).forEach(([word, obj]) => {
      try {
        const blob = base64ToBlob(obj.data, "audio/mpeg");
        audioCache.set(word, blob);
      } catch (err) {
        console.warn(`音频转换失败: ${word}`, err);
      } finally {
        if (complete_status.value == 1) {
          lightningRef.value?.strike();
          const audiothunderSound = new Audio(thunderSound);
          audiothunderSound.play().catch((err) => {
            console.warn("播放失败：", err);
          });
          setTimeout(() => {
            startTimer();
          }, 2500);
        }
      }
    });

    if (response.data.failed_words && response.data.failed_words.length > 0) {
      const failedList = response.data.failed_words.join("，");
    }
  }

  if (listening_number.value > 0) {
    const eligibleIndices = [];
    synonymsOptions.value.forEach((item, idx) => {
      if (item.排除 !== "手写" && !item.is_spell && !isCustomTranslate(item.序号)) {
        const hasAudio =
          audioCache.has(item.英文) ||
          (window.preloadedAudioData && window.preloadedAudioData[item.英文]);
        if (hasAudio) {
          eligibleIndices.push(idx);
        }
      }
    });

    for (let i = eligibleIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [eligibleIndices[i], eligibleIndices[j]] = [
        eligibleIndices[j],
        eligibleIndices[i],
      ];
    }

    const countToSelect = Math.min(
      listening_number.value,
      eligibleIndices.length
    );
    const selectedIndices = eligibleIndices.slice(0, countToSelect);
    listeningModeIndices.value = new Set(selectedIndices);
  }

  buildCustomTranslateItems();

  toast.close();
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
          <div class="value">
            {{ `${completeCount}/${synonymsOptions.length}` }}
          </div>
        </div>

        <div class="side-btn-group">
          <div class="side-item action-btn" @click="purchaseMagic">
            <van-icon name="gem-o" size="20" />
            <span>购买</span>
            <span
              v-if="isBroken"
              style="color: gray; margin-left: 5px; margin-top: 0.2rem"
            >
              💔 心碎中
            </span>
          </div>

          <div class="side-item action-btn" @click="helpOutside">
            <van-icon name="friends-o" size="20" />
            <span>支援</span>
          </div>

          <div class="timer-wrap" v-if="complete_status == 1">
            <van-circle
              v-model:current-rate="currentRate"
              :rate="timerRate"
              :speed="0"
              stroke-width="100"
              layer-color="#ebedf0"
              size="18"
              class="time-circle"
            />
            <span class="countdown-text">
              {{ remainingSeconds }}
            </span>
          </div>

          <div class="side-item action-btn submit-btn" @click="submitSelection">
            <van-icon name="success" size="20" />
            <span>提交</span>
          </div>
        </div>
      </aside>

      <!-- 右侧内容区域 -->
      <main class="main-content">
        <van-checkbox-group
          class="checkbox-container"
          v-model="synonymsSelected"
        >
          <div class="question-grid">
            <div
              v-for="(item, index) in synonymsOptions"
              :key="index"
              class="grid-item-card"
              :ref="(el) => setItemRef(el, index)"
            >
              <div class="card-header">
                <div class="english-title">
                  <span class="index-num">{{ item.序号 }}.</span>

                  <span v-if="item.排除 === '手写'" class="word-text">
                    {{ answers[index].中文 }}
                  </span>

                  <span
                    v-else-if="listeningModeIndices.has(index)"
                    @click.stop="speakWord(item.英文)"
                    style="
                      display: inline-block;
                      padding: 2px 8px;
                      background: #f0f0f0;
                      border-radius: 12px;
                      user-select: none;
                      margin-left: 4px;
                    "
                  >
                    🔊
                    <span
                      style="font-size: 14px; font-weight: normal; color: gray"
                      >听音盲猜</span
                    >
                  </span>

                  <span
                    v-else-if="isCustomTranslate(item.序号)"
                    class="word-text"
                    @click.stop="speakWord(answers[index]?.英文 || item.英文)"
                    style="display: flex; align-items: center"
                  >
                    {{ answers[index]?.英文 || item.英文 }}
                    <img src="../assets/speaker.png" class="speaker-icon" />
                  </span>

                  <span
                    v-else
                    class="word-text"
                    @click.stop="speakWord(item.英文)"
                    style="display: flex; align-items: center"
                  >
                    {{ item.英文 }}
                    <img src="../assets/speaker.png" class="speaker-icon" />
                  </span>
                </div>

                <div class="selected-tags-container">
                  <div
                    v-for="(selected, index2) in selectedItems"
                    v-show="
                      selected.is_spell == true &&
                      selected.key.split('-')[0] == String(index)
                    "
                    :key="index2"
                    class="mini-tag"
                    @click="removeSelected(index2)"
                  >
                    {{ selected.label }}
                  </div>
                </div>
              </div>

              <div class="card-body">
                <div v-if="isCustomTranslate(item.序号)" class="translate-card-inline">
                  <div class="translate-tip">请翻译并填写该词的中文释义</div>
                  <div class="translate-lines">
                    <span class="translate-line">
                      <input
                        v-model="customTranslateInputs[item.序号][0]"
                        class="translate-input"
                        type="text"
                        placeholder="请输入中文"
                        @input="onTranslateInput"
                      />
                    </span>
                  </div>
                </div>

                <!-- 选择题模式 -->
                <div v-else-if="item.排除 !== '手写'">
                  <div
                    v-for="(chinese, index2) in item.中文"
                    :key="index2"
                    class="option-item"
                    :class="{
                      'option-selected': isSelected(index, index2),
                      'option-disabled': isDisabled(index, index2),
                    }"
                    @click="
                      !isDisabled(index, index2) &&
                        toggleCheckChinese(index, index2)
                    "
                  >
                    <div class="option-text">{{ chinese }}</div>
                    <van-checkbox
                      :name="`${index + 1}-${index2 + 1}`"
                      :disabled="isDisabled(index, index2)"
                      :ref="(el) => (checkboxRefs[`${index}-${index2}`] = el)"
                      class="mini-checkbox"
                      @click.stop
                      @click="
                        !isDisabled(index, index2) &&
                          toggleCheckChinese(index, index2)
                      "
                    />
                  </div>
                </div>

                <!-- ✅ 手写模式：替换为 HandwriteKeyboard -->
                <div
                  v-else
                  class="handwrite-area"
                  :ref="(el) => (handwriteAreaRefs[index] = el)"
                  @click.stop="showHandwriteKeyboard(index)"
                >
                  <HandwriteKeyboard
                    :model-value="handwriteInputs[index] || ''"
                    placeholder="请拼写对应的英文"
                    :active="activeHandwriteIndex === index"
                    :bottom-offset="0"
                    :popup-left-offset="sidebarWidth"
                    :reserve-space="false"
                    @click="showHandwriteKeyboard(index)"
                    @update:model-value="
                      (value) => handleHandwriteInput(index, item.序号, value)
                    "
                  />
                </div>
              </div>
            </div>
          </div>
        </van-checkbox-group>

        <div class="bottom-placeholder"></div>
      </main>

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
        class="custom-dark-dialog-checkAnswer"
        :before-close="handlePurchaseMagic"
        :overlay="false"
      >
        <template #title>
          <div class="dialog-main-title">
            是否购买标识答案（{{ priceMagic }}金币）？
          </div>
          <div v-if="isBroken" style="color: red">💔 心碎收费</div>
        </template>
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
            <van-button
              size="large"
              type="danger"
              plain
              hairline
              text="放弃"
              @click="showMagic = false"
            />
            <van-button
              size="large"
              type="primary"
              plain
              hairline
              :disabled="isabledPurchase"
              text="购买"
              @click="purchaseConfirm"
            />
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
                :value="item.用户选择.join('，')"
                @click="
                  scrollToItem(item.序号 - 1);
                  speakWord(item.英文);
                "
                is-link
              >
                <template #title>
                  <div v-if="item.排除 === '手写'">
                    {{ item.序号 + ". " + answers[item.序号 - 1].中文 }}
                  </div>
                  <div v-else style="display: flex; align-items: center">
                    {{ item.序号 + ". " }}
                    <span
                      v-if="listeningModeIndices.has(item.序号 - 1)"
                      style="
                        display: inline-block;
                        padding: 2px 8px;
                        background: #f0f0f0;
                        border-radius: 12px;
                        user-select: none;
                        margin-left: 4px;
                      "
                    >
                      🔊
                      <span
                        style="
                          font-size: 14px;
                          font-weight: normal;
                          color: gray;
                        "
                        >听音盲猜</span
                      >
                    </span>
                    <span v-else style="margin-left: 4px">{{ item.英文 }}</span>
                  </div>
                </template>
              </van-cell>
            </div>
          </van-cell-group>
        </van-popup>
      </van-config-provider>

      <!-- 辅助组件 -->
      <div class="progress" v-if="showProgress">
        <van-progress
          pivot-text="努力提交..."
          color="#f2826a"
          :percentage="percentage"
        />
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
      <LightningStrike ref="lightningRef" />
    </div>
  </div>
</template>

<style scoped>
/* --- 外层根元素 --- */
.student-account-item-pc {
  width: 100%;
  height: 100dvh;
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
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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

  .nav-username {
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
  height: calc(100dvh - 50px);
  width: 100%;
  overflow: hidden;
  background-color: #f7f8fa;
  margin-top: 50px;
}

/* 左侧侧边栏 */
.side-bar {
  width: 80px;
  flex-shrink: 0;
  background-color: #fff;
  border-right: 1px solid #ebedf0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 20px;
  z-index: 99;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
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

/* 响应式 Grid */
.question-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 10px;
  padding-bottom: 60px;
}

@media screen and (min-width: 1600px) {
  .question-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
}

@media screen and (min-width: 1200px) and (max-width: 1599px) {
  .question-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
}

@media screen and (min-width: 900px) and (max-width: 1199px) {
  .question-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
}

@media screen and (max-width: 899px) {
  .question-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }

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

/* 单个题目卡片 */
.grid-item-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
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
  word-break: break-all;
}

.speaker-icon {
  width: 14px;
  height: 14px;
  margin-left: 6px;
  opacity: 0.7;
}

.card-body {
  padding: 5px;
  flex: 1;
}

.translate-card-inline {
  background: #fff;
  padding: 8px 6px 6px;
}

.translate-tip {
  color: #999;
  font-size: 13px;
  margin-bottom: 8px;
}

.translate-lines {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.translate-line {
  display: block;
}

.translate-input {
  width: 100%;
  border: none;
  border-bottom: 1px solid #dcdfe6;
  outline: none;
  padding: 8px 2px 10px;
  font-size: 15px;
  background: transparent;
  color: #222;
}

.translate-input:focus {
  border-bottom-color: #1989fa;
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

.mini-checkbox {
  transform: scale(0.8);
}

/* ✅ 手写区：紧凑显示，键盘弹出不撑高卡片 */
.handwrite-area {
  padding: 6px 8px;
  cursor: pointer;
  min-height: 52px;
}

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

.bottom-placeholder {
  height: 350px;
}

.progress {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 80%;
  z-index: 200;
}

.encouragement-container {
  position: fixed;
  top: 33%;
  left: 100%;
  z-index: 2000;
}

.time-circle {
  margin-left: 15px;
  margin-top: 5px;
}

.timer-wrap {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.countdown-text {
  font-size: 12px;
  font-weight: bold;
  color: #ee0a24;
  line-height: 1;
  white-space: nowrap;
  margin-top: 8px;
}
</style>
