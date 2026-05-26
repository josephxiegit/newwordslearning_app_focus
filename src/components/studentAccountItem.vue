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
  closeToast,
  Toast,
} from "vant";

import { useRouter } from "vue-router";
import encouragement from "./encouragement.vue";
import helpforgood from "./helpforgood.vue";
import helpforbad from "./helpforbad.vue";
import submitloading from "./submitloading.vue";
import WinningStreakPopup from "./WinningStreakPopup.vue";
import LightningStrike from "./lighteningStrike.vue";
import HandwriteKeyboard from "./HandwriteKeyboard.vue";

import happyhalf from "../assets/sound/happyhalf.mp3";
import thunderSound from "../assets/sound/thunder.mp3";

const flagTheme = inject("flagTheme");
const router = useRouter();
const instance = getCurrentInstance();
const axios = instance.appContext.config.globalProperties.$ajax;
const AI_JUDGE_TIMEOUT_MS = 8000;
const NETWORK_BUSY_TOAST_DURATION = 3000;
const title = ref("");
const isLoading = ref(false);

const synonymsOptions = ref([]);
const synonymsSelected = ref([]);
const answers = ref([]);
const checkboxRefs = ref([]);
const nid = ref("");
const customTranslateItems = ref([]);
const customTranslateInputs = ref({});
const customTranslateResult = ref([]);

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

// 判别是否是翻译题的辅助函数
const isCustomTranslate = (serialNumber) => {
  return customTranslateItems.value.some((item) => item.序号 === serialNumber);
};

// 提交按钮统一入口
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

  // === 恢复：注入大模型翻译题的填写内容 ===
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
        if (答案 == 用户选择) {
          flag = "true";
        } else {
          flag = "half";
        }
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

// 过滤包含英文的答案，防止抽到默写短语/语法题
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

// 前端直连大模型测试
const fetchSemanticJudge = async (payload) => {
  const apiKey = "sk-b6b5d72093844ae4a244b285e246c115";
  const url = "https://api.deepseek.com/v1/chat/completions";

  // 1. 创建一个中断控制器，并设定 8 秒后触发中断
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
      // 2. 将中断信号绑定给 fetch
      signal: controller.signal,
    });

    clearTimeout(timeoutId); // 如果成功返回，清除定时器
    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    clearTimeout(timeoutId);
    // 3. 拦截超时错误，并向上层抛出明确的异常
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
    // 4. 如果是网络或超时问题，继续抛出，绝不静默吞掉
    if (
      error.message === "AI_TIMEOUT" ||
      error.message === "AI_NETWORK_ERROR"
    ) {
      throw error;
    }
    return false; // 如果是代码解析报错等其他杂错，默认算错兜底
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
  return (
    customItem &&
    item.flag !== "true" &&
    item.用户选择[0] !== "无"
  );
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

    // ================== AI 判定拦截 ==================
    if (!(await applyAiJudgeWithToast(compareResult))) return;
    // ===============================================

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
        params.append("submittoken", submittoken.value);
        params.append("nid", nid.value);
        params.append("rate", rate);
        params.append("swipe", 0);
        params.append("type", typeMode.value);
        params.append("coins", totalCoins.value);
        params.append("swipe_status", swipe_status);

        params.append("log", JSON.stringify(compareResult));

        params.append("title", titleData.value);
        params.append("username", username.value);
        params.append("alias", alias.value);
        params.append("mode", "普通");
        params.append("numberprev", 0);
        params.append("numbershowanswer", 0);
        params.append("numbertransparent", 0);
        params.append("checkedNoneOfAbove", checkedNoneOfAbove.value);
        params.append("checkedSpell", checkedSpell.value);
        params.append("teacher_mark", timeDiff);
        params.append("complete_status", complete_status.value);
        params.append("earning_half", isBroken.value);
        params.append("listening_number", listening_number.value);
        params.append("writingwords_number", customTranslateItems.value.length);

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
            isLoading.value = false;
            showDialog({
              title: "恭喜！提交成功！",
              message: "跳转答案页",
              theme: "round-button",
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
            }).then(() => {
              return;
            });
          } else {
            console.log("发生错误:", error.message);
          }
          return;
        } finally {
          try {
            if (uncertainVocabulary.value.size != 0) {
              await updateUncertain(accountDataResult.new_log_nid);
            }
          } catch (error) {
            console.log("更新不确定词汇时发生错误:", error);
          }

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

  resultDataTempt.value = mergeSynonymAndSelections(synonymsSelectedChinese);
};

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
  let compareResult = compareAndAddFlag(synonymAndSelections);

  // ================== AI 判定拦截 (带无感缓存机制) ==================
  if (!(await applyAiJudgeWithToast(compareResult))) return;
  // ==========================================================

  // 检查是否全对
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

  // 余额判断与执行购买
  if (usercoins.value < priceMagic.value) {
    showFailToast("余额不足");
    return;
  } else {
    // 过滤出真正的错题
    compareResultFalse.value = compareResult.filter(
      (item) => item.flag != "true"
    );

    // 购买成功，更新余额动效
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

const myList = ref([]);
const setItemRef = (el) => {
  if (el) {
    myList.value.push(el);
  }
};
const scrollToItem = (index) => {
  if (index >= synonymsOptions.value.length - 2) {
    heightScroll.value = 65;
  }
  if (myList.value[index]) {
    const item = myList.value[index];
    const top = item.getBoundingClientRect().top + window.scrollY - 50;
    window.scrollTo({
      top: top,
      behavior: "smooth",
    });
  }
};
const clickScroll = () => {
  const indexNoEmpty = resultDataTempt.value.findIndex(
    (item) => item.用户选择[0] == "无"
  );
  scrollToItem(indexNoEmpty);
};

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

const handwriteInputs = ref({});
const handwriteAnswers = ref([]);
const activeHandwriteIndex = ref(null);
const handwriteAreaRefs = ref({});

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
}

function handleHandwriteInput(index, serialNumber, value) {
  handwriteInputs.value[index] = value;
  saveHandwriteAnswer(index, serialNumber);
}

function showHandwriteKeyboard(index) {
  activeHandwriteIndex.value = index;
  nextTick(() => {
    const el = handwriteAreaRefs.value[index];
    if (el) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  });
}

function handleDocumentPointerDown(event) {
  if (activeHandwriteIndex.value === null) {
    return;
  }

  const target = event.target;
  const activeArea = handwriteAreaRefs.value[activeHandwriteIndex.value];
  if (activeArea?.contains(target)) {
    return;
  }
  if (target?.closest?.(".keyboard-popup")) {
    return;
  }

  activeHandwriteIndex.value = null;
}

// 供翻译输入框触发进度条更新使用
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
  markWordSoundBusy(900);

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

const flagHelp = ref(true);
const totalCoins = ref(0);
const isBroken = ref(false);
const helpOutside = () => {
  if (flagHelp.value) {
    if (complete_status.value == 1) {
      showFailToast("闪电⚡️不支持支援");
      return;
    }
    showConfirmDialog({
      title: "场外支援",
      theme: "round-button",
      message: "只有一次求助机会，确认使用吗？",
    }).then(async () => {
      // ⚠️ 注意这里加了 async
      mergedData.value = mergeAnswerAndSynonym();
      const synonymsSelectedChinese = convertSelections(
        synonymsSelected.value,
        synonymsOptions.value
      );
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

      let compareResult = compareAndAddFlag(synonymAndSelections);

      // ================== AI 判定拦截 (场外支援前置) ==================
      if (!(await applyAiJudgeWithToast(compareResult))) return;
      // =============================================================

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
    });
  }
};
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
    path: "/studentAccountAnswer",
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
onMounted(async () => {
  document.addEventListener("pointerdown", handleDocumentPointerDown);
  window.addEventListener("beforeunload", handleBeforeUnload);
  window.addEventListener("pagehide", handlePageHide);
  // 切换退出警告
  document.addEventListener("visibilitychange", handleVisibilityChange);

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
    });
  }

  complete_status.value = history.state.complete_status;
  // complete_status.value = 0;

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
  // writingwords_number.value = 10;
  console.log('writingwords_number: ', writingwords_number.value);

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
    });
  }

  if (data.coins >= 2000) {
    isRewardEligible.value = false;
  }
  isBroken.value = history.state.isBroken;

  priceMagic.value = isBroken.value ? 1000 : priceMagic.value;
  nid.value = history.state.nid;
  synonymsOptions.value = data.synonyms;
  answers.value = data.answers;
  titleData.value = data.title;
  username.value = data.username;
  submittoken.value = new Date().getTime();

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
  let params = new URLSearchParams();
  params.append("method", "getAudioList");
  params.append("word_list", JSON.stringify(answerSheetProList));
  try {
    const response = await axios.post("words/", params);

    if (response.data.success && response.data.audio_data) {
      Object.entries(response.data.audio_data).forEach(([word, obj]) => {
        try {
          const blob = base64ToBlob(obj.data, "audio/mpeg");
          audioCache.set(word, blob);
        } catch (err) {
          console.warn(`音频转换失败: ${word}`, err);
        }
      });
    }
  } catch (err) {
    console.error("音频加载失败", err);
  } finally {
    if (listening_number.value > 0) {
      const eligibleIndices = [];
      synonymsOptions.value.forEach((item, idx) => {
        if (
          item.排除 !== "手写" &&
          !item.is_spell &&
          !isCustomTranslate(item.序号)
        ) {
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

  toast.close();
});
</script>

<template>
  <div>
    <div class="nav-bar-container">
      <van-nav-bar
        :left-text="`${completeCount}/${synonymsOptions.length}`"
        fixed
      >
        <template #left>
          <div class="nav-bar-left">
            <span class="nav-button-left">
              {{ `${completeCount}/${synonymsOptions.length}` }}
            </span>
            <span
              class="nav-button-left"
              style="margin-left: 7px"
              @click="purchaseMagic"
            >
              购买
            </span>
            <span
              v-if="isBroken"
              style="color: gray; margin-left: 5px; margin-top: 0.2rem"
            >
              💔 心碎中
            </span>
            <span class="timer-wrap" v-if="complete_status == 1">
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
            </span>
          </div>
        </template>
        <template #right>
          <div class="nav-bar-right">
            <span class="nav-button-right" @click="helpOutside">
              场外支援
            </span>
            <span class="nav-button-right" @click="submitSelection">
              提交
            </span>
          </div>
        </template>
      </van-nav-bar>
    </div>

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

    <!-- 购买魔法部分 -->
    <div>
      <div>
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
                style="
                  --van-rolling-text-color: gray;
                  --van-rolling-text-item-width: 10px;
                  --van-rolling-text-font-size: 12px;
                  --van-rolling-text-gap: -2px;
                "
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
                class="custom-button-checkAnswer"
                @click="showMagic = false"
              />
              <van-button
                size="large"
                type="primary"
                plain
                hairline
                :disabled="isabledPurchase"
                text="购买"
                class="custom-button-checkAnswer"
                @click="purchaseConfirm"
              />
            </div>
          </template>
        </van-dialog>
      </div>
      <div>
        <van-config-provider :theme-vars="themeVars">
          <van-popup
            ref="popup"
            class="custom-popup"
            closeable
            v-model:show="showAnswerMagic"
            position="bottom"
            :style="{ height: '50%' }"
          >
            <div style="font-size: 18px; font-weight: 700; margin: 1rem">
              错误词汇
            </div>
            <van-cell-group
              inset
              style="margin-top: 0.5rem; margin-left: -0.2rem"
            >
              <van-cell-group>
                <div v-for="(item, index) in compareResultFalse" :key="index">
                  <van-cell
                    :value="item.用户选择.join('，')"
                    @click="scrollToItem(item.序号 - 1)"
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
                        <span v-else style="margin-left: 4px">{{
                          item.英文
                        }}</span>
                      </div>
                    </template>
                  </van-cell>
                </div>
              </van-cell-group>
            </van-cell-group>
          </van-popup>
        </van-config-provider>
      </div>
    </div>

    <!-- 预览滚动 -->
    <van-floating-panel
      v-model:height="heightScroll"
      :anchors="anchorsScrolls"
      v-show="showScroll"
      :content-draggable="false"
    >
      <van-button
        plain
        type="default"
        block
        style="margin-bottom: 0px; font-weight: bold; height: 6%"
        :style="buttonStyle"
        @click="closePanel"
        >{{ buttonText }}</van-button
      >
      <van-cell
        title="上拉增大导航"
        value="点击跳转"
        style="color: blue; font-weight: bold"
      />
      <van-cell-group v-for="(item, index) in synonymsOptions" :key="index">
        <van-cell
          @click="scrollToItem(item.序号 - 1)"
          is-link
          :title="
            item.排除 === '手写'
              ? item.序号 + '. ' + answers[index].中文
              : listeningModeIndices.has(index)
              ? item.序号 + '. 🔊 听音盲猜'
              : isCustomTranslate(item.序号)
              ? item.序号 + '. ' + (answers[index]?.英文 || item.英文)
              : item.序号 + '. ' + item.英文
          "
          size="large"
          :style="{
            color:
              /* 颜色标红逻辑：如果是默写题且填了内容，或者是普通题且选了选项 */
              (isCustomTranslate(item.序号) &&
                getTranslateInputValue(item.序号)) ||
              (!isCustomTranslate(item.序号) &&
                selectedResults[index] &&
                selectedResults[index].length > 0)
                ? 'red'
                : '',
          }"
        >
          <template #default>
            <!-- 1. 默写/翻译题：显示用户在输入框里填写的内容 -->
            <span v-if="isCustomTranslate(item.序号)">
              {{ getTranslateInputValue(item.序号) }}
            </span>
            <!-- 2. 普通选择题：显示点击选中的中文选项 -->
            <span
              v-else-if="
                selectedResults[index] && selectedResults[index].length
              "
            >
              {{ selectedResults[index].join("; ") }}
            </span>
          </template>
        </van-cell>
      </van-cell-group>
    </van-floating-panel>

    <!-- 主题列表单词 -->
    <van-checkbox-group class="checkbox-container" v-model="synonymsSelected">
      <van-cell-group>
        <div
          v-for="(item, index) in synonymsOptions"
          :key="index"
          class="custom-cell-group"
          :ref="setItemRef"
        >
          <!-- 单词表头：显示英文或发音图标 -->
          <van-cell clickable class="bold-title border-cell">
            <template #title>
              <div
                v-if="item.排除 !== '手写'"
                style="display: flex; align-items: center"
                @click="speakWord(item.英文)"
              >
                <div
                  v-if="item.排除 !== '试题'"
                  style="
                    line-height: 1;
                    height: 24px;
                    display: flex;
                    align-items: center;
                  "
                >
                  {{ item.序号 + ". " }}
                  <span
                    v-if="listeningModeIndices.has(index)"
                    @click.stop="speakWord(item.英文)"
                    style="
                      display: inline-block;
                      padding: 2px 8px;
                      background: #f0f0f0;
                      border-radius: 12px;
                      cursor: pointer;
                      user-select: none;
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
                    style="display: flex; align-items: center"
                  >
                    {{ answers[index]?.英文 || item.英文 }}
                    <img
                      src="../assets/speaker.png"
                      style="
                        width: 12px;
                        height: auto;
                        margin-left: 0.5rem;
                        margin-top: 0.1rem;
                      "
                    />
                  </span>
                  <span v-else style="display: flex; align-items: center">
                    {{ item.英文 }}
                    <img
                      src="../assets/speaker.png"
                      style="
                        width: 12px;
                        height: auto;
                        margin-left: 0.5rem;
                        margin-top: 0.1rem;
                      "
                    />
                  </span>
                </div>
                <div
                  v-else
                  style="
                    font-weight: 400;
                    font-size: 15px;
                    line-height: 1.5;
                    height: 48px;
                    display: flex;
                    align-items: center;
                    margin: 0.3rem 0 0.3rem 0;
                  "
                >
                  {{ item.序号 + ". " }}
                  <span
                    v-if="listeningModeIndices.has(index)"
                    @click.stop="speakWord(item.英文)"
                    style="
                      display: inline-block;
                      padding: 2px 8px;
                      background: #f0f0f0;
                      border-radius: 12px;
                      cursor: pointer;
                      user-select: none;
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
                    style="display: flex; align-items: center"
                  >
                    {{ answers[index]?.英文 || item.英文 }}
                    <img
                      src="../assets/speaker.png"
                      style="
                        width: 12px;
                        height: auto;
                        margin-left: 0.5rem;
                        margin-top: 0.1rem;
                      "
                    />
                  </span>
                  <span v-else style="display: flex; align-items: center">
                    {{ item.英文 }}
                    <img
                      src="../assets/speaker.png"
                      style="
                        width: 12px;
                        height: auto;
                        margin-left: 0.5rem;
                        margin-top: 0.1rem;
                      "
                    />
                  </span>
                </div>

                <div
                  class="selected-tags"
                  style="
                    margin-left: 20px;
                    line-height: 1;
                    height: 24px;
                    display: flex;
                    align-items: center;
                  "
                >
                  <div
                    v-for="(selected, index2) in selectedItems"
                    v-show="
                      selected.is_spell == true &&
                      selected.key.split('-')[0] == String(index)
                    "
                    :key="index2"
                    style="color: orange"
                    class="flying-tag"
                    @click="removeSelected(index2)"
                    :style="{
                      padding: '0px 0px 0.3rem 0px',
                      'white-space': 'pre',
                    }"
                  >
                    {{ selected.label }}
                  </div>
                </div>
              </div>
              <div
                v-else
                style="
                  line-height: 1;
                  height: 24px;
                  display: flex;
                  align-items: center;
                "
              >
                {{ item.序号 + ". " + answers[index].中文 }}
              </div>
            </template>
          </van-cell>

          <!-- 1. 翻译题 UI (如果是被抽中的2题) -->
          <div
            v-if="isCustomTranslate(item.序号)"
            class="translate-card-inline"
          >
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

          <!-- 2. 原本的中文选项 UI (不是翻译题且不是手写) -->
          <div v-else-if="item.排除 !== '手写'">
            <van-cell-group>
              <van-cell
                v-for="(chinese, index2) in item.中文"
                :key="index2"
                clickable
                @click="toggleCheckChinese(index, index2)"
                :class="isSelected(index, index2) ? 'selected-cell' : ''"
                class="chinese-cell"
              >
                <template #title>
                  <div style="text-align: left">{{ chinese }}</div>
                </template>
                <template #right-icon>
                  <van-checkbox
                    :name="`${index + 1}-${index2 + 1}`"
                    :disabled="isDisabled(index, index2)"
                    :ref="(el) => (checkboxRefs[`${index}-${index2}`] = el)"
                    @click.stop.prevent="toggleCheckChinese(index, index2)"
                  />
                </template>
              </van-cell>
            </van-cell-group>
          </div>

          <!-- 3. 原本的手写题 UI -->
          <div
            v-else
            class="handwrite-area"
            :ref="(el) => (handwriteAreaRefs[index] = el)"
            style="padding: 0.5rem 1rem"
            @click.stop="showHandwriteKeyboard(index)"
          >
            <HandwriteKeyboard
              :model-value="handwriteInputs[index] || ''"
              placeholder="请拼写对应的英文"
              :active="activeHandwriteIndex === index"
              :bottom-offset="heightScroll"
              @click="showHandwriteKeyboard(index)"
              @update:model-value="
                (value) => handleHandwriteInput(index, item.序号, value)
              "
            />
          </div>
        </div>
      </van-cell-group>
    </van-checkbox-group>

    <div class="progress" v-if="showProgress">
      <van-progress
        pivot-text="努力提交..."
        color="#f2826a"
        :percentage="percentage"
      />
    </div>
    <div class="bottom-placeholder"></div>
    <encouragement ref="encouragementRef" />
    <helpforgood ref="helpforgoodRef" />
    <helpforbad ref="helpforbadRef" />
    <submitloading v-if="isLoading" />

    <WinningStreakPopup
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
</template>

<style scoped>
.custom-popup + .van-overlay {
  transition: background-color 0.3s;
}

.checkbox-container {
  width: 100%;
  margin: 0 auto;
  margin-top: 42px;
}

/* 整合进列表内的翻译卡片样式 */
.translate-card-inline {
  background: #fff;
  padding: 16px 16px 20px 16px;
  border-bottom: 0.5px solid #eee;
}

.translate-tip {
  color: #999;
  font-size: 14px;
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
  font-size: 16px;
  background: transparent;
  color: #222;
}
.translate-input:focus {
  border-bottom-color: #1989fa;
}

@media (min-width: 431px) {
  .checkbox-container {
    width: 90%;
    box-shadow: -5px 0 8px rgba(0, 0, 0, 0.2), 5px 0 8px rgba(0, 0, 0, 0.2);
    padding: 10px;
  }
}
.bottom-placeholder {
  height: 80px;
}

.selected-cell {
  font-weight: bold;
  color: #1a89fa !important;
  background-color: #c0c6cc !important;
}

.bold-title div {
  font-weight: bold;
  font-size: large;
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
.wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
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
.nav-bar-right nav-bar-left {
  display: flex;
  align-items: center;
}
.nav-button-right {
  margin-left: 10px;
  padding: 5px 5px;
  margin-top: 4px;
  color: #208bfa;
  cursor: pointer;
  user-select: none;
}

.nav-bar-left {
  display: flex;
  align-items: center;
}

.nav-button-left {
  color: #208bfa;
  cursor: pointer;
  user-select: none;
  margin-top: 7px;
}

.progress {
  position: fixed;
  left: 50%;
  bottom: 25%;
  transform: translateX(-50%);
  width: 80%;
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
