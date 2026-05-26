<template>
  <div class="parent-container horizontal-layout">
    <!-- 顶部导航栏 -->
    <div class="nav-bar-container">
      <van-nav-bar :title="pageTitle">
        <template #left>
          <div class="username-display">{{ username }}</div>
        </template>
        <template #right>
          <div class="nav-bar-right">
            <span class="nav-button"
              >{{ completeCount }}/{{ synonymsOptions.length }}</span
            >
          </div>
        </template>
      </van-nav-bar>
    </div>

    <!-- 主内容区域：左右布局 -->
    <div class="main-content">
      <!-- 左侧：进度和按钮区域 -->
      <div class="left-panel">
        <div class="progress-section">
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
            class="encouragement-img"
          />
          <img
            v-if="showEncouragement2"
            :src="srcswipeEncouragement2"
            alt="鼓励动画"
            class="encouragement-img"
          />
        </div>

        <div class="control-section">
          <div class="button-group">
            <van-button
              type="success"
              @click="goToNext"
              size="large"
              block
              :disabled="isButtonDisabled"
              :style="{ backgroundColor: buttonColor }"
            >
              {{ textButtonNext }}
            </van-button>
          </div>

          <div class="button-group" style="margin-top: 30px">
            <van-button type="warning" @click="pauseSwipe" size="large" block>
              场外支援: {{ pauseBlackOverlay }}
            </van-button>
            <div
              v-if="isBroken"
              style="font-size: small; color: red; margin-top: 10px"
            >
              💔 消费增加 收益减半
            </div>
          </div>

          <div class="timer-section">
            <van-circle
              v-model:current-rate="currentRate"
              :rate="timerRate"
              :speed="0"
              stroke-width="120"
              layer-color="#ebedf0"
              :color="circleColor"
              size="80"
            />
            <div class="spell-hint">{{ showAnswerIsSpell }}</div>
          </div>
        </div>
      </div>

      <!-- 右侧：Swipe卡片区域 -->
      <div class="right-panel" ref="rightPanelRef">
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
                    <!-- 题目标题行 -->
                    <van-cell clickable class="bold-title2 border-cell">
                      <template #title>
                        <div v-if="item.排除 !== '试题'" class="title-row">
                          <div v-if="item.排除 !== '手写'">
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
                                style="
                                  font-size: 16px;
                                  font-weight: normal;
                                  color: gray;
                                "
                                >听音盲猜</span
                              >
                            </span>
                            <span v-else-if="isDictationItem(index)">
                              {{ item.英文 }}
                            </span>
                            <span v-else>{{ item.英文 }}</span>
                          </div>
                          <div v-else>
                            {{ item.序号 + ". " + answers[index].中文 }}
                          </div>
                          <div v-if="item.排除 !== '手写'" class="choice-flag">
                            {{ flagSingleOrMultiChoice }}
                          </div>
                        </div>
                        <div v-else class="title-row">
                          <div class="question-text">
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
                              🔊 <span style="color: gray">听音盲猜</span>
                            </span>
                            <span v-else-if="isDictationItem(index)">
                              {{ item.英文 }}
                            </span>
                            <span v-else>{{ item.英文 }}</span>
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
                            class="flying-tag"
                            @click="removeSelected(index2)"
                          >
                            {{ selected.label }}
                          </div>
                        </div>
                      </template>
                    </van-cell>

                    <!-- 默写输入区（单行） -->
                    <div v-if="isDictationItem(index)">
                      <div class="dictation-card">
                        <div class="dictation-line">
                          <span class="dictation-underline-label"></span>
                          <input
                            v-model="dictationInputs[item.序号]"
                            class="dictation-input"
                            type="text"
                            placeholder="请输入中文"
                          />
                        </div>
                      </div>
                    </div>
                    <!-- 手写区 -->
                    <div
                      v-else-if="item.排除 === '手写'"
                      class="handwrite-area"
                    >
                      <HandwriteKeyboard
                        v-model="handwriteInputs[index]"
                        placeholder="请拼写对应的英文"
                        :active="index === currentIndex && !showOverlay"
                        :bottom-offset="12"
                        :popup-left-offset="pcKeyboardLeftOffset"
                        :popup-right-offset="pcKeyboardRightOffset"
                        :reserve-space="false"
                      />
                    </div>
                    <!-- 选项区（普通/拼写/试题）-->
                    <div v-else>
                      <van-cell-group>
                        <van-cell
                          v-for="(chinese, index2) in item.中文"
                          :key="index2"
                          clickable
                          @click.stop="toggleCheckChinese(index, index2)"
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
                  </div>
                </van-cell-group>
              </van-checkbox-group>
            </div>
          </van-swipe-item>
        </van-swipe>
      </div>
    </div>

    <!-- 遮罩层（场外支援） -->
    <van-overlay :show="showOverlay" @click="continueSwipe">
      <div class="swipe-help-container">
        <swipeHelp ref="swipeHelpRef" />
      </div>
      <div class="space">
        <div class="space-buttons">
          <div class="coins-info">
            <div
              style="display: flex; align-items: center; white-space: nowrap"
            >
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
                  margin: 0 4px;
                "
              />
              金币：每次消费 {{ priceMagic }}
            </div>
            <div
              v-if="isBroken"
              style="display: flex; align-items: center; white-space: nowrap"
            >
              💔 消费增加
            </div>
          </div>

          <div v-show="showAnswerButton" class="button-container">
            <van-button
              type="warning"
              block
              @click.stop="gotoPreHelp(false)"
              icon="replay"
              class="custom-button"
            >
              回溯 🚗 + {{ numberPrev }}
            </van-button>
            <van-button
              icon="plus"
              type="warning"
              color="linear-gradient(to right, #FFD1B3, #FF6034)"
              class="custom-button-plus"
              @click.stop="purchaseMagic('gotoPre')"
            >
              购买
            </van-button>
          </div>
          <div class="button-description">回退到上一个单词</div>

          <div class="button-container">
            <van-button
              :disabled="disabledShowAnswer"
              type="success"
              block
              @click.stop="autoSelectAnswer(currentIndex, false)"
              icon="aim"
              class="custom-button"
            >
              点金 🎉 + {{ numberShowAnswer }}
            </van-button>
            <van-button
              icon="plus"
              type="warning"
              color="linear-gradient(to right, #A4E8C0, #0DC160)"
              class="custom-button-plus"
              @click.stop="purchaseMagic('autoSelect')"
            >
              购买
            </van-button>
          </div>
          <div class="button-description">随机赠送一个答案</div>

          <div class="button-container">
            <van-button
              type="primary"
              block
              :disabled="isButtonTransparentDisabled"
              @click.stop="transparentHelp(false)"
              icon="eye-o"
              class="custom-button"
            >
              透视 👓 + {{ numberTransparent }}
            </van-button>
            <van-button
              icon="plus"
              type="warning"
              color="linear-gradient(to right, #A3C9FA, #1A89FA)"
              class="custom-button-plus"
              @click.stop="purchaseMagic('transparent')"
            >
              购买
            </van-button>
          </div>
          <div class="button-description">时间被凝固</div>
        </div>
      </div>
    </van-overlay>

    <!-- 提交进度条 -->
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
    <LightningStrike ref="lightningRef" />
  </div>
</template>

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
import swipeHelp from "./swipeHelpPc.vue";
import submitloading from "./submitloading.vue";
import passiveMagic from "./passiveMagicPc.vue";
import passiveMagic2 from "./passiveMagic2Pc.vue";
import WinningStreakPopup from "./WinningStreakPopupPc.vue";
import LightningStrike from "./lighteningStrike.vue";
import HandwriteKeyboard from "./HandwriteKeyboard.vue";

import shouxieSrcGoatAndWolf from "../assets/test.gif";
import shouxieBears from "../assets/Boonie Bears/test.gif";
import woohooSound from "../assets/sound/woohoo.mp3";

import surpriseSound from "../assets/sound/surprise.mp3";
import thunderSound from "../assets/sound/thunder.mp3";
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
const writingwords_number = ref(0);
const dictationModeIndices = ref(new Set());
const dictationItems = ref([]);
const dictationInputs = ref({});

// ── 默写辅助函数 ──────────────────────────────────────────
const splitAnswers = (value) =>
  String(value || "")
    .split(/[；;，,、/|]/)
    .map((item) => item.trim())
    .filter(Boolean);

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[，。；！？、,.!?]/g, "");

const isPureEnglishWord = (value) =>
  /^[A-Za-z][A-Za-z\s'-]*$/.test(String(value || "").trim());

const hasOnlyChineseAnswers = (value) => {
  const parts = splitAnswers(value);
  return (
    parts.length > 0 &&
    parts.every(
      (part) => /[\u4e00-\u9fa5]/.test(part) && !/[a-zA-Z]/.test(part)
    )
  );
};

const isDictationItem = (index) => dictationModeIndices.value.has(index);

const getDictationExtraSeconds = (index) => {
  if (!isDictationItem(index)) return 0;
  const answerText =
    answers.value[index]?.正确答案 || answers.value[index]?.中文;
  const answerCount = Math.max(splitAnswers(answerText).length, 1);
  return 7 + Math.max(answerCount - 1, 0) * 3;
};

const getTotalDictationExtraSeconds = () =>
  Array.from(dictationModeIndices.value).reduce(
    (total, index) => total + getDictationExtraSeconds(index),
    0
  );

const buildDictationItems = () => {
  if (writingwords_number.value <= 0) {
    dictationModeIndices.value = new Set();
    dictationItems.value = [];
    dictationInputs.value = {};
    return;
  }

  const pool = answers.value
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
  dictationItems.value = shuffled.slice(
    0,
    Math.min(writingwords_number.value, shuffled.length)
  );
  dictationModeIndices.value = new Set(
    dictationItems.value.map((item) => item.index)
  );
  dictationInputs.value = Object.fromEntries(
    dictationItems.value.map((item) => [item.序号, ""])
  );
};

// ── AI 判分 ──────────────────────────────────────────────
const AI_JUDGE_TIMEOUT_MS = 8000;
const NETWORK_BUSY_TOAST_DURATION = 3000;

const fetchSemanticJudge = async (payload) => {
  const apiKey = "sk-b6b5d72093844ae4a244b285e246c115";
  const url = "https://api.deepseek.com/v1/chat/completions";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_JUDGE_TIMEOUT_MS);

  const systemPrompt = `你是一个严谨的英语老师。请判断学生的中文答案在语义上是否与标准答案一致，或者是否也是该英文单词合理的近义词/中文释义。
要求：
1. 允许合理的同义词、近义词。
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

const judgeWithAI = async (item, userInput) => {
  try {
    const res = await fetchSemanticJudge({
      word: item.英文,
      userAnswers: Array.isArray(userInput) ? userInput : [userInput],
      correctAnswers: splitAnswers(item.正确答案),
      sourceChinese: item.中文,
    });

    if (typeof res === "boolean") return res;
    if (typeof res?.correct === "boolean") return res.correct;
    if (typeof res?.result === "boolean") return res.result;
    return false;
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

const showNetworkBusyToast = () => {
  setTimeout(() => {
    showFailToast({
      message: "网络拥堵，判分超时，请重试",
      duration: NETWORK_BUSY_TOAST_DURATION,
    });
  }, 0);
};

const applyAiJudgeResult = async (compareResult) => {
  for (const item of compareResult) {
    if (item.默写 !== true || item.用户选择[0] === "无") continue;
    const semanticMatched = await judgeWithAI(item, item.用户选择);
    if (semanticMatched) {
      item.flag = "true";
    }
  }
};

const applyAiJudgeWithToast = async (compareResult) => {
  const needAiJudge = compareResult.some(
    (item) => item.默写 === true && item.用户选择[0] !== "无"
  );
  if (!needAiJudge) return true;

  const aiToast = showLoadingToast({
    message: "AI阅卷中...",
    duration: 0,
    forbidClick: true,
  });

  try {
    await runWithTimeout(
      applyAiJudgeResult(compareResult),
      AI_JUDGE_TIMEOUT_MS
    );
    aiToast.close();
    return true;
  } catch (error) {
    aiToast.close();
    showNetworkBusyToast();
    return false;
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
    obj["默写"] = dictationModeIndices.value.has(i);
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

  // 默写输入：获取字符串，分割后作为有效答案
  dictationItems.value.forEach((item) => {
    const raw = dictationInputs.value[item.序号] || "";
    const validInputs = splitAnswers(raw)
      .map((v) => v.trim())
      .filter(Boolean);
    if (validInputs.length > 0) {
      resultMap.set(item.序号, validInputs);
    }
  });

  return Array.from(resultMap, ([序号, 中文]) => ({ 序号, 中文 })).sort(
    (a, b) => a.序号 - b.序号
  );
};

const compareAndAddFlag = (dictArray) => {
  return dictArray.map((item) => {
    const { 答案, 用户选择, 正确答案, is_spell, 排除, 英文, 序号 } = item;

    // 默写题判分
    if (item.默写 === true) {
      const userInput = Array.isArray(用户选择) ? 用户选择 : [用户选择];
      const normalizedUser = userInput
        .flatMap((value) => splitAnswers(value))
        .map((v) => normalizeText(v))
        .filter(Boolean);
      const normalizedCorrect = splitAnswers(正确答案).map((v) =>
        normalizeText(v)
      );
      let flag = "false";
      if (
        normalizedUser.length > 0 &&
        normalizedCorrect.length > 0 &&
        normalizedUser.some((answer) => normalizedCorrect.includes(answer))
      ) {
        flag = "true";
      }
      return {
        ...item,
        用户选择: userInput,
        flag,
      };
    }

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
          if (cleanedInput && cleanedInput === cleanedTarget) {
            flag = "true";
          }
        }
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
        flag = 答案 == 用户选择 ? "true" : "half";
      }
    }

    return { ...item, flag };
  });
};

const swipeFlag = ref(0);
const totalCoins = ref(0);
const isBroken = ref(false);
const clickSubmitUser = async (action, done) => {
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
  compareResult = compareResult.map((item) => ({
    ...item,
    听力: listeningModeIndices.value.has(item.序号 - 1),
    默写: dictationModeIndices.value.has(item.序号 - 1),
  }));

  if (!(await applyAiJudgeWithToast(compareResult))) {
    isLoading.value = false;
    stopAnimation();
    return;
  }

  console.log("compareResult: ", compareResult);

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
        item["正确答案"] =
          correspondingResult.正确答案 !== undefined
            ? correspondingResult.正确答案
            : "无";
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
        return str.includes("；") || str.includes(",");
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
    const correct = compareResult.filter((item) => item.flag === "true").length;
    return ((correct / total) * 100).toFixed(2);
  }
  const rateAccuracy = calculateAccuracy(compareResult);
  if (isRewardEligible.value) {
    if (rateAccuracy < 70) {
      totalCoins.value = 0;
    } else {
      totalCoins.value = compareResult.reduce((coins, item) => {
        return item.flag === "true" ? coins + 10 : coins;
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

  function checkFlags(compareResult) {
    let halfCount = 0;
    let trueCount = 0;

    for (const item of compareResult) {
      if (item.flag !== "true" && item.flag !== "half") return 0;
      if (item.flag === "true") {
        trueCount++;
      } else if (item.flag === "half") {
        halfCount++;
        if (halfCount > 3) return 0;
      }
    }

    if (trueCount === compareResult.length) return 1.5;
    return halfCount <= 3 ? 0.5 : false;
  }
  let rate = checkFlags(compareResult);
  if(typeMode.value == 2 && rate == 1.5) {
    rate = 3;
  }

  const type = Number(remainingSeconds.value) == 8 ? 0 : 1;

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
    params.append("swipe", 1);
    params.append("type", typeMode.value);
    params.append("coins", totalCoins.value);
    params.append("swipe_status", swipe_status);
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
    params.append("complete_status", complete_status.value);
    params.append("earning_half", isBroken.value);
    params.append("listening_number", listening_number.value);
    params.append("writingwords_number", dictationModeIndices.value.size);
    params.append("data_words", JSON.stringify(spellVocabulary.value));
    params.append("lock_spell", lock_spell.value);

    return await axios.post("words/", params).then((ret) => ret.data);
  }

  async function updateUncertain(accountLogResult) {
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
    return await axios.post("words/", params).then((ret) => ret.data);
  }

  const newCoins = totalCoins.value;
  newCoins2.value = newCoins;

  isLoading.value = true;
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("请求超时")), 6000)
  );
  startAnimation();
  const updateAccountPromise = updateAccountData();

  let accountDataResult;
  try {
    accountDataResult = await Promise.race([
      updateAccountPromise,
      timeoutPromise,
    ]);
    accountDataResult2.value = accountDataResult;
    console.log("accountDataResult: ", accountDataResult);
    new_final_rate.value = accountDataResult.rate;
    if (accountDataResult["message"] === "不能提交相同内容") {
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
    if (error.message === "请求超时") {
      isLoading.value = false;
      stopAnimation();
      showDialog({
        title: "超时",
        message: "请求超时，请稍后再试。",
        theme: "round-button",
      }).then(() => {});
    } else {
      console.log("发生错误:", error.message);
    }
    return;
  } finally {
    let UncertainResult;
    try {
      if (uncertainVocabulary.value.size !== 0) {
        UncertainResult = await updateUncertain(accountDataResult?.new_log_nid);
      }
    } catch (error) {
      console.log("更新不确定词汇时发生错误:", error);
    }

    isLoading.value = false;
    sessionStorage.removeItem("numberShowAnswer");
    sessionStorage.removeItem("numberTransparent");
    sessionStorage.removeItem("numberPrev");
    sessionStorage.removeItem("pauseBlackOverlay");
    changeOverlayColor("rgba(128, 128, 128, 0.6)");

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
};

// 手写模式
const handwriteInputs = ref({});
const handwriteAnswers = ref([]);
// 点击选项
const resultDataTempt = ref([]);
const selectedIndexes = ref({});
const flagSingleOrMultiChoice = ref("单选");
const uncertainVocabulary = ref(new Set());

function addUncertain(index, content) {
  const uncertainItem =
    content === "回溯"
      ? synonymsOptions.value[index - 1].英文
      : synonymsOptions.value[index].英文;

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
  console.log("uncertainVocabulary: ", uncertainVocabulary.value);
}

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
  if (isDisabled(index, index2)) return;

  const key = `${index}-${index2}`;
  const checkboxRef = checkboxRefs.value[key];
  if (checkboxRef) checkboxRef.toggle();

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

      if (!updated) updatedTypes.push(content);
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
    if (removeIndex !== -1) selectedChineses.splice(removeIndex, 1);
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
          addedChinese += mergedChinese[i] === " " ? "  " : mergedChinese[i];
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

const submitFlag = ref(false);
function isSelectionTrue(currentSlideIndex) {
  if (isDictationItem(currentSlideIndex)) {
    const item = mergedData.value[currentSlideIndex];
    const raw = dictationInputs.value[item.序号] || "";
    const userAnswers = splitAnswers(raw)
      .map((v) => normalizeText(v))
      .filter(Boolean);
    const correctAnswers = splitAnswers(item.正确答案).map((v) =>
      normalizeText(v)
    );
    if (userAnswers.length === 0 || correctAnswers.length === 0) return false;
    return userAnswers.some((answer) => correctAnswers.includes(answer));
  }

  if (mergedData.value[currentSlideIndex]["is_spell"]) {
    const userSelection = resultDataTempt.value[currentSlideIndex]["用户选择"];
    const correctAnswer = mergedData.value[currentSlideIndex]["正确答案"];
    return userSelection.join("") === correctAnswer;
  } else if (mergedData.value[currentSlideIndex]["排除"] == "手写") {
    const userSelection = handwriteInputs.value[currentIndex.value];
    const correctAnswer = mergedData.value[currentSlideIndex]["英文"];
    const cleanString = (str) =>
      (str || "").toLowerCase().replace(/[^a-z]/g, "");
    const userInput = cleanString(userSelection);
    const target = cleanString(correctAnswer);
    return !!(userInput && target && userInput === target);
  } else {
    const userSelection = resultDataTempt.value[currentSlideIndex]["用户选择"];
    const correctAnswer = mergedData.value[currentSlideIndex]["答案"];
    const correctArray = correctAnswer
      .split(/；|,/)
      .map((s) => s.trim())
      .sort();
    const userArray = userSelection
      .join(",")
      .split(/；|,/)
      .map((s) => s.trim())
      .sort();
    return (
      correctArray.length === userArray.length &&
      correctArray.every((item) => userArray.includes(item))
    );
  }
}

const goToNext = () => {
  const currentSlideIndex = currentIndex.value;

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
  } else if (isDictationItem(currentSlideIndex)) {
    const item = mergedData.value[currentSlideIndex];
    const inputVal = dictationInputs.value[item.序号] || "";
    hasSelection = inputVal.trim() !== "";
  } else {
    hasSelection = currentSlideSelections.some(
      (key) => selectedIndexes.value[key]
    );
  }

  if (!hasSelection) {
    showFailToast("不能为空");
    return;
  }

  const areEqual = isSelectionTrue(currentSlideIndex);
  if (
    !areEqual &&
    flagPassiveMagic.value &&
    !isDictationItem(currentSlideIndex)
  ) {
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

  if (!isButtonDisabled.value) {
    const now = new Date().getTime();
    if (firstClickTime.value === null) {
      firstClickTime.value = now;
    } else {
      const interval =
        (now - (lastClickTime.value || firstClickTime.value)) / 1000;
      totalTimeInterval.value += interval;
    }
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
  const cached = audioCache.get(english);
  if (cached) {
    if (cached instanceof Blob) {
      const audioUrl = URL.createObjectURL(cached);
      const audio = new Audio(audioUrl);
      audio.currentTime = 0;
      audio.addEventListener("ended", () => URL.revokeObjectURL(audioUrl));
      audio.addEventListener("error", () => {
        URL.revokeObjectURL(audioUrl);
        fallbackSpeech(english);
      });
      audio.play().catch((err) => {
        URL.revokeObjectURL(audioUrl);
        fallbackSpeech(english);
      });
      return;
    }
    if (cached instanceof Audio) {
      cached.currentTime = 0;
      cached.play().catch(() => fallbackSpeech(english));
      return;
    }
  }

  if (window.preloadedAudioData && window.preloadedAudioData[english]) {
    try {
      const base64 = window.preloadedAudioData[english].data;
      const blob = base64ToBlob(base64, "audio/mpeg");
      audioCache.set(english, blob);
      return speakWord(english);
    } catch (err) {
      console.warn("base64 转换失败：", err);
    }
  }

  const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(
    english
  )}&type=1`;
  const audio = new Audio(url);
  audio.play().catch(() => {
    let utterance = new SpeechSynthesisUtterance(english);
    utterance.lang = /[a-zA-Z]/.test(english) ? "en-US" : "zh-CN";
    utterance.pitch = 0.5;
    setTimeout(() => window.speechSynthesis.speak(utterance), 800);
  });
};

const fallbackSpeech = (english) => {
  let utterance = new SpeechSynthesisUtterance(english);
  utterance.lang = "en-US";
  utterance.pitch = 0.5;
  window.speechSynthesis.speak(utterance);
};

// 提交进度条
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
  if (intervalId) clearInterval(intervalId);

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
const clickNumberPrev = ref(0);
const clickNumberShowAnswer = ref(0);
const clickNumberTransparent = ref(0);
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
  }
  pauseBlackOverlay.value -= 1;

  showAnswerButton.value = true;
  durationRolling.value = 2;
  rollingTextRef.value.reset();
  usercoinsStart.value = usercoins.value;

  if (swipeHelpRef.value) swipeHelpRef.value.show();
  showMagicStart.value = true;
  pause();
  isButtonTransparentDisabled.value = false;
  showOverlay.value = true;
  changeOverlayColor("#000000");
  if (currentIndex.value != 0) {
    overlayOpenTime.value = new Date().getTime();
  }
};
const continueSwipe = () => {
  if (overlayOpenTime.value !== null) {
    const now = new Date().getTime();
    const interval = (now - overlayOpenTime.value) / 1000;
    standardTimeInterval.value += interval;
  }
  showOverlay.value = false;
  if (currentIndex.value != 0) resume();
};

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
  return await axios.post("words/", params).then((ret) => ret.data);
}
const purchaseMagic = (buttonStyle) => {
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
        usercoinsEnd.value = res["coins"];
        await nextTick();
        rollingTextRef.value.start();
        await new Promise((resolve) => setTimeout(resolve, 3000));
        usercoins.value = res["coins"];
        isLoading.value = false;
        gotoPreHelp(true);
        numberPrev.value = 0;
      })
      .catch(() => {});
  }

  if (buttonStyle == "autoSelect") {
    if (complete_status.value == 1) {
      showToast("闪电⚡️模式下，无法赠送答案");
      return;
    }
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
          const timeDifferenceInSeconds = computed(() => {
            const now = new Date();
            return Math.floor(Math.abs(datePlusOneHour - now) / 1000);
          });
          const formattedTimeDifference = computed(() => {
            const totalSeconds = timeDifferenceInSeconds.value;
            return `${Math.floor(totalSeconds / 60)}分${totalSeconds % 60}秒`;
          });
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
          await nextTick();
          rollingTextRef.value.start();
          usercoins.value = res["coins"];
          isLoading.value = false;
          autoSelectAnswer(currentIndex.value, true);
          numberShowAnswer.value = 0;
        }
      })
      .catch(() => {});
  }

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
        usercoinsEnd.value = res["coins"];
        await nextTick();
        rollingTextRef.value.start();
        usercoins.value = res["coins"];
        isLoading.value = false;
        transparentHelp(true);
        numberTransparent.value = 0;
      })
      .catch(() => {});
  }
};

// 暂停功能
const pauseBlackOverlay = ref(5);
const numberShowAnswer = ref(2);
const disabledShowAnswer = ref(false);
const showAnswerButton = ref(true);
const showAnswerIsSpell = ref("");

const useShowAnswerOnce = (flag) => {
  numberShowAnswer.value -= 1;
  if (flag == false && numberShowAnswer.value <= 0) {
    disabledShowAnswer.value = true;
  }
  handleButtonClick("autoSelectAnswer");
  showAnswerButton.value = false;
  changeOverlayColor("rgba(128, 128, 128, 0.6)");
};

// 默写点金：直接填入正确答案
const applyDictationHelp = (index, flag, answerItem) => {
  const serialNumber = synonymsOptions.value[index].序号;
  const correctAnswers = splitAnswers(answerItem?.正确答案 || answerItem?.中文);
  if (correctAnswers.length === 0) return;

  dictationInputs.value[serialNumber] = correctAnswers.join("；");
  useShowAnswerOnce(flag);
};

const autoSelectAnswer = async (index, flag) => {
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
    showMagicStart.value = false;
    swipeHelpRef.value.hide();

    // 默写题点金
    if (isDictationItem(index)) {
      applyDictationHelp(index, flag, answerItem);
      return;
    }

    const correctAnswers = answerItem.中文.split("；");
    if (synonymsOptions.value[index]["is_spell"]) {
      function getRandomLetters(word) {
        const letters = word.split("");
        const result = [letters[0]];
        const totalToShow = Math.ceil((letters.length - 1) / 3);
        const indices = new Set();
        while (indices.size < totalToShow) {
          const randomIndex =
            Math.floor(Math.random() * (letters.length - 1)) + 1;
          indices.add(randomIndex);
        }
        for (let i = 1; i < letters.length; i++) {
          if (letters[i] === " ") {
            result.push("  ");
          } else if (indices.has(i)) {
            result.push(letters[i]);
          } else {
            result.push("()");
          }
        }
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
              showMagicStart.value = true;
            }, 6000);
          }
        }
      } else {
        showToast("已经全部显示");
        if (numberShowAnswer.value > 0) numberShowAnswer.value -= 1;
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
  showMagicStart.value = false;
  showAnswerButton.value = false;
  handleButtonClick("transparent");
  swipeHelpRef.value.hide();
  isButtonDisabled.value = false;
  numberTransparent.value -= 1;
  isButtonTransparentDisabled.value = true;
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

  if (
    !synonymsOptions.value[currentIndex.value - 1].is_spell &&
    synonymsOptions.value[currentIndex.value - 1].排除 !== "试题" &&
    synonymsOptions.value[currentIndex.value - 1].排除 !== "手写"
  ) {
    addUncertain(currentIndex.value, "回溯");
  }

  console.log("currentIndex: ", currentIndex.value);
  if (synonymsOptions.value[currentIndex.value - 1].排除 == "手写") {
    handwriteAnswers.value = handwriteAnswers.value.filter(
      (item) => Number(item.序号) !== Number(currentIndex.value)
    );
  }
  console.log("handwriteAnswers: ", handwriteAnswers.value);

  flagSingleOrMultiChoice.value = getSingeOrMultiChoice(currentIndex.value - 1);
  handleButtonClick("gotoPre");
  const now = new Date().getTime();
  const interval = (now - firstClickTime.value) / 1000;
  standardTimeInterval.value += interval;

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
  if (
    !synonymsOptions.value[currentIndex.value].is_spell &&
    synonymsOptions.value[currentIndex.value].排除 !== "试题" &&
    synonymsOptions.value[currentIndex.value].排除 !== "手写"
  ) {
    addUncertain(currentIndex.value, "被动魔法");
  }

  if (synonymsOptions.value[currentIndex.value].排除 == "手写") {
    handwriteAnswers.value = handwriteAnswers.value.filter(
      (item) => Number(item.序号) !== Number(currentIndex.value + 1)
    );
  }
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
const totalSlides = ref(25);
const isButtonDisabled = ref(false);
const remainingSeconds = ref(0);
const circleColor = ref("#1989fa");
const rightPanelRef = ref(null);
const pcKeyboardLeftOffset = ref(0);
const pcKeyboardRightOffset = ref(0);
const isHandwriteKeyboardVisible = computed(() => {
  return (
    synonymsOptions.value[currentIndex.value]?.排除 === "手写" &&
    !showOverlay.value
  );
});
let pcKeyboardResizeObserver = null;
const updatePcKeyboardOffsets = () => {
  const el = rightPanelRef.value;
  if (!el) {
    pcKeyboardLeftOffset.value = 0;
    pcKeyboardRightOffset.value = 0;
    return;
  }
  const rect = el.getBoundingClientRect();
  const viewportWidth =
    window.innerWidth || document.documentElement.clientWidth;
  pcKeyboardLeftOffset.value = Math.max(0, Math.floor(rect.left));
  pcKeyboardRightOffset.value = Math.max(
    0,
    Math.floor(viewportWidth - rect.right)
  );
};
watch(isHandwriteKeyboardVisible, () => {
  nextTick(updatePcKeyboardOffsets);
});

const textButtonNext = computed(() => {
  if (currentIndex.value === 0) return "开始";
  if (currentIndex.value === totalSlides.value - 1) return "提交";
  return "下一个";
});

const buttonColor = computed(() => {
  const ratio = currentIndex.value / (totalSlides.value - 1);
  const alpha = 0.5 + 0.5 * ratio;

  if (currentIndex.value === totalSlides.value - 1)
    return `rgba(0, 176, 155, 1)`;

  const green = 105 + Math.round(70 * (1 - ratio));
  return `rgba(0, ${green}, 0, ${alpha})`;
});

function getSingeOrMultiChoice(currentIndex) {
  if (isDictationItem(currentIndex)) return "默写";
  if (synonymsOptions.value[currentIndex]["is_spell"]) return "多选";

  const currentItem = answers.value[currentIndex];
  const chineseText = currentItem["中文"];
  const chineseTextArray = chineseText.split("；");
  return chineseTextArray.length === 1 ? "单选" : "多选";
}

const resetTimer = () => {
  pause();
  const now = new Date().getTime();
  const interval = (now - (lastClickTime.value || firstClickTime.value)) / 1000;
  totalTimeInterval.value += interval;

  setTimeout(() => {
    const areEqual = isSelectionTrue(currentIndex.value);
    if (
      !areEqual &&
      flagPassiveMagic.value &&
      !isDictationItem(currentIndex.value)
    ) {
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

        if (synonymsOptions.value[currentIndex.value].排除 == "手写") {
          const input = (
            handwriteInputs.value[currentIndex.value] || ""
          ).trim();
          handwriteAnswers.value.push({
            序号: mergedData.value[currentIndex.value]["序号"],
            英文: input,
          });
        }

        lastClickTime.value = now;
        currentRate.value = 100;
        timerRate.value = 100;
        completeCount.value = (parseInt(completeCount.value) + 1).toString();
        isButtonDisabled.value = false;
        resume();
      }, 0);
    } else {
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
  const currentWordIndex = currentIndex.value;
  const now = new Date().getTime();
  const interval = (now - (lastClickTime.value || firstClickTime.value)) / 1000;

  if (
    interval > 6 &&
    !executedWords.has(currentWordIndex) &&
    !synonymsOptions.value[currentWordIndex].is_spell &&
    synonymsOptions.value[currentWordIndex].排除 !== "试题" &&
    synonymsOptions.value[currentWordIndex].排除 !== "手写"
  ) {
    addUncertain(currentIndex.value, "超时");
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

const isOverHalf = computed(() => completeCount.value >= totalCount.value / 2);
const remainingCount = computed(() => totalCount.value - completeCount.value);

const progressColor = computed(() => {
  if (remainingCount.value <= 5) return "#FF3E00";
  if (isOverHalf.value) return "#DAA520";
  return "#1989fa";
});

const progressStyle = computed(() => ({
  width: "80%",
  margin: "0 auto",
  boxShadow: isOverHalf.value ? "0 0 8px 4px rgba(218, 165, 32, 0.6)" : "none",
  transition: "box-shadow 0.3s ease",
}));

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
    audio.play().catch((err) => console.warn("播放失败：", err));
    showEncouragement.value = true;
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
    audio.play().catch((err) => console.warn("播放失败：", err));
    showEncouragement2.value = true;
    setTimeout(() => {
      showEncouragement2.value = false;
    }, 1500);
  }
});
watch(currentIndex, () => {
  executedWords.clear();
});

const { pause, resume } = useIntervalFn(
  () => {
    if (currentRate.value > 0) {
      timerRate.value -= 100 / (autoplay2.value / 70);
      handleTimerRate();
      if (
        timerRate.value <= 20 &&
        currentIndex.value != totalSlides.value - 1
      ) {
        isButtonDisabled.value = true;
      }
    } else {
      pause();
      setTimeout(() => {
        resetTimer();
      }, 100);
    }
  },
  70,
  { immediate: false }
);

const currentHeight = ref("");
const rowMarginTop = ref(0);
const handleSwipeChange = (index) => {
  nextTick(() => {
    const el = swipeRef.value?.$el?.querySelector(
      `.van-swipe-item:nth-child(${index + 1}) .card`
    );
    if (el) currentHeight.value = el.offsetHeight;
  });

  if (!isExtended.value) {
    if (synonymsOptions.value[index].is_spell) {
      autoplay2.value = autoplayInit.value + 17000;
    } else if (isDictationItem(index)) {
      autoplay2.value =
        autoplayInit.value + getDictationExtraSeconds(index) * 1000;
    } else if (
      synonymsOptions.value[index].排除 === "试题" ||
      synonymsOptions.value[index].排除 === "手写"
    ) {
      autoplay2.value = autoplayInit.value + 27000;
    } else {
      autoplay2.value = autoplayInit.value;
    }
  } else {
    if (synonymsOptions.value[index].is_spell) {
      autoplay2.value = autoplayInit.value + 19000;
    } else if (isDictationItem(index)) {
      autoplay2.value =
        autoplayInit.value + (getDictationExtraSeconds(index) + 2) * 1000;
    } else if (
      synonymsOptions.value[index].排除 === "试题" ||
      synonymsOptions.value[index].排除 === "手写"
    ) {
      autoplay2.value = autoplayInit.value + 29000;
    } else {
      autoplay2.value = autoplayInit.value + 2000;
    }
    isExtended.value = false;
  }

  try {
    if (
      synonymsOptions.value[index]["排除"] !== "试题" &&
      synonymsOptions.value[index]["排除"] !== "手写"
    ) {
      const word = synonymsOptions.value[index]["英文"];
      if (completeCount.value === totalCount.value / 2) {
        setTimeout(() => speakWord(word), 2500);
      } else {
        speakWord(word);
      }
    }
  } catch (error) {
    console.error("Error speaking word:", error);
  }

  showAnswerIsSpell.value = "";
  currentIndex.value = index;
  currentRate.value = 100;
  timerRate.value = 100;
  pause();
  resume();
};

watch(overlayColor, (newColor) => {
  document.documentElement.style.setProperty(
    "--van-overlay-background",
    newColor
  );
});

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
  sessionStorage.setItem(
    "numberPauseBlackOverlay",
    JSON.stringify(pauseBlackOverlay.value)
  );
};

// 简单模式
const typeMode = ref(0);

// 连胜奖励
const shoWinningStreak = ref(false);
const activeWinningStreak = ref(0);
const dailyWinningStreak = ref(0);
const rate2 = ref(0);
const new_final_rate = ref(0);

const compareResult2 = ref("");
const accountDataResult2 = ref("");
const newCoins2 = ref("");

const handleContinue = () => redirect(accountDataResult2.value);
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
      newCoins: newCoins2.value,
      username: username.value,
      account_log_id: accountDataResult["new_log_nid"],
      spellVocabulary: JSON.stringify(spellVocabulary.value),
      lock_spell: lock_spell.value,
      complement: 1.5 - rate2.value,
      RateOrigin: RateOrigin.value,
      swipe_status: accountDataResult.swipe_status,
      isBroken: isBroken.value,
    },
  });
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
      router.push({ path: "/homepage" });
    });
    setTimeout(() => {
      router.push({ path: "/homepage" });
    }, 3000);
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
const pageTitle = ref("");

const complete_status = ref(0);
const lightningRef = ref(null);

const listening_number = ref(0);
const listeningModeIndices = ref(new Set());

onBeforeUnmount(() => {
  window.removeEventListener("pagehide", handlePageHide);
});
onUnmounted(() => {
  window.removeEventListener("beforeunload", handleBeforeUnload);
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  window.removeEventListener("resize", updatePcKeyboardOffsets);
  if (pcKeyboardResizeObserver) {
    pcKeyboardResizeObserver.disconnect();
    pcKeyboardResizeObserver = null;
  }
});
function handleBeforeUnload(event) {
  event.preventDefault();
  event.returnValue = "";
}
onMounted(async () => {
  window.addEventListener("resize", updatePcKeyboardOffsets);
  nextTick(() => {
    updatePcKeyboardOffsets();
    if (rightPanelRef.value && window.ResizeObserver) {
      pcKeyboardResizeObserver = new ResizeObserver(() => {
        updatePcKeyboardOffsets();
      });
      pcKeyboardResizeObserver.observe(rightPanelRef.value);
    }
  });
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
    if (el) currentHeight.value = el.offsetHeight;
  });
  RateOrigin.value = history.state.RateOrigin;
  pageTitle.value = history.state.title;
  flagPassiveMagic.value = passive_magic.value;
  console.log("flagPassiveMagic", flagPassiveMagic.value);

  window.addEventListener("pagehide", handlePageHide);
  pauseBlackOverlay.value = JSON.parse(
    sessionStorage.getItem("numberPauseBlackOverlay")
  );
  if (pauseBlackOverlay.value == null) pauseBlackOverlay.value = 5;
  console.log("pauseBlackOverlay.value: ", pauseBlackOverlay.value);

  complete_status.value = history.state.complete_status;
  // console.log("complete_status: ", complete_status.value);

  // 判断是否为简单模式
  typeMode.value = history.state?.type ?? 0;
  console.log("type.value: ", typeMode.value);

  let flagRefresh = false;
  if (pauseBlackOverlay.value) {
    if (complete_status.value == 1) {
      if (pauseBlackOverlay.value < 3) flagRefresh = true;
    } else if (complete_status.value == 0) {
      if (pauseBlackOverlay.value < 5) flagRefresh = true;
    }
  }
  console.log("flagRefresh: ", flagRefresh);

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
    checkedNoneOfAbove.value = history.state.checkedNoneOfAbove;
    checkedSpell.value = history.state.checkedSpell;
    const data = JSON.parse(history.state.data);

    autoplay2.value = history.state.autoplay2;
    autoplayInit.value = history.state.autoplay2;

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

    if (data.coins >= 2000) isRewardEligible.value = false;
    isBroken.value = history.state.isBroken;
    priceMagic.value = isBroken.value ? 800 : priceMagic.value;

    nid.value = history.state.nid;
    synonymsOptions.value = data.synonyms;

    console.log("synonymsOptions: ", synonymsOptions.value);
    const len = synonymsOptions.value[0]?.["中文"]?.length || 0;
    if (len === 7) rowMarginTop.value = 340;
    else if (len === 6) rowMarginTop.value = 310;
    else rowMarginTop.value = 340;

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
        if (answerItem) answerItem.正确答案 = answerItem.英文;
      }
    });
    console.log("answers: ", answers.value);

    titleData.value = data.title;
    listening_number.value = history.state.listening_number || 0;
    writingwords_number.value = history.state.writingwords_number || 0;
    console.log("listening_number: ", listening_number.value);
    console.log("writingwords_number: ", writingwords_number.value);

    const keywords = [
      "中考",
      "初中",
      "七年级",
      "八年级",
      "九年级",
      "小升初",
      "六年级",
    ];
    if (flagRefresh) {
      showDialog({
        title: "警告",
        theme: "round-button",
        message: "监测到可能的恶意刷新\n场外支援被重置到刷新前状态",
      });
      numberShowAnswer.value = JSON.parse(
        sessionStorage.getItem("numberShowAnswer")
      );
      numberTransparent.value = JSON.parse(
        sessionStorage.getItem("numberTransparent")
      );
      numberPrev.value = JSON.parse(sessionStorage.getItem("numberPrev"));
      pauseBlackOverlay.value = JSON.parse(
        sessionStorage.getItem("numberPauseBlackOverlay")
      );
      if (pauseBlackOverlay.value < 3) pauseBlackOverlay.value = 3;
    } else {
      if (complete_status.value) {
        console.log("正常进入，地狱模式");
        pauseBlackOverlay.value = 3;
        numberShowAnswer.value = 0;
        numberPrev.value = 1;
        numberTransparent.value = 1;
      } else {
        console.log("正常进入，普通模式");
        if (keywords.some((keyword) => titleData.value.includes(keyword))) {
          numberShowAnswer.value = 1;
          numberTransparent.value = 1;
          numberPrev.value = 1;
        }
        if (titleData.value.length <= 20) numberShowAnswer.value = 1;
      }
    }
    if (numberShowAnswer.value == 0) disabledShowAnswer.value = true;

    // numberShowAnswer.value = 20;
    username.value = data.username;
    submittoken.value = new Date().getTime();
    console.log("submittoken: ", submittoken.value);

    const trueCount_is_spell =
      synonymsOptions.value.filter((item) => item.is_spell === true).length ||
      0;

    flagSingleOrMultiChoice.value = getSingeOrMultiChoice(0);

    const getUserCoins = async () => {
      let params = new URLSearchParams();
      params.append("method", "getUserCoins");
      params.append("username", username.value);
      const response = await axios.post("words/", params);
      return response.data;
    };

    const res = await getUserCoins();
    usercoins.value = res["data_coins"][0]["coins"];
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

    // 听力模式随机池
    if (listening_number.value > 0) {
      const eligibleIndices = [];
      synonymsOptions.value.forEach((item, idx) => {
        if (item.排除 !== "手写" && !item.is_spell) {
          const hasAudio =
            audioCache.has(item.英文) ||
            (window.preloadedAudioData && window.preloadedAudioData[item.英文]);
          if (hasAudio) eligibleIndices.push(idx);
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

    // 默写模式（必须在听力之后）
    buildDictationItems();
    flagSingleOrMultiChoice.value = getSingeOrMultiChoice(0);

    // 如果第一题就是默写，调整初始计时
    if (isDictationItem(0)) {
      autoplay2.value = autoplayInit.value + getDictationExtraSeconds(0) * 1000;
      remainingSeconds.value = (autoplay2.value / 1000).toString();
    }

    standardTimeInterval.value =
      (totalSlides.value - 1) * (autoplayInit.value / 1000) +
      0.2 * totalSlides.value +
      trueCount_is_spell * 17000 +
      getTotalDictationExtraSeconds() +
      3;

    toast.close();

    await nextTick();
    rollingTextRef.value.start();

    if (complete_status.value) {
      lightningRef.value?.strike();
      const audiothunderSound = new Audio(thunderSound);
      audiothunderSound.play().catch((err) => console.warn("播放失败：", err));
    }
    setTimeout(() => {
      showOverlay.value = false;
    }, 1500);
  };

  initData();
});
</script>

<style scoped>
/* 样式保持原大屏版不变 */
html {
  touch-action: manipulation;
}

.horizontal-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.nav-bar-container {
  position: sticky;
  top: 0;
  z-index: 100;
  flex-shrink: 0;
}

.username-display {
  font-size: 16px;
  font-weight: 600;
  color: #323233;
}

.nav-bar-right {
  display: flex;
  align-items: center;
}

.nav-button {
  padding: 5px 10px;
  color: #1989fa;
  font-weight: 600;
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
  gap: 20px;
  padding: 20px;
}

.left-panel {
  width: 300px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
  justify-content: center;
}

.progress-section {
  position: relative;
}

.encouragement-img {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 400px;
  z-index: 1000;
  pointer-events: none;
}

.control-section {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.button-group {
  width: 95%;
  margin-left: 7px;
}

.timer-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
}

.spell-hint {
  font-size: 18px;
  color: #ff976a;
  font-weight: 700;
  text-align: center;
}

.right-panel {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: block;
}

.my-swipe {
  width: 100%;
  max-width: 800px;
  margin: 5vh auto 40px;
}

@media (orientation: portrait) and (min-width: 768px) {
  .my-swipe {
    margin-top: 21vh;
  }
}

.card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin: 0 auto;
}

.bold-title2 div {
  font-weight: 900;
  font-size: 26px;
  color: #1a89fa;
}

.title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.choice-flag {
  font-size: 17px;
  color: red;
}

.question-text {
  font-weight: 400;
  font-size: 14px;
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

.selected-cell {
  font-weight: bold;
  color: #1a89fa !important;
  background-color: #c0c6cc !important;
}

.selected-tags {
  min-height: 30px;
  display: flex;
  margin-bottom: -2px;
  margin-top: 2px;
}

.flying-tag {
  color: orange;
  font-size: smaller;
  padding: 0.2rem 0px 0.3rem 0px;
  white-space: pre;
  animation: fly-up 0.5s ease-out;
  cursor: pointer;
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

.handwrite-area {
  padding: 0.5rem 1rem;
}

/* 默写样式 */
.dictation-card {
  background: #fff;
  padding: 18px 18px 24px;
}

.dictation-line {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
}

.dictation-line:last-child {
  margin-bottom: 0;
}

.dictation-underline-label {
  width: 30px;
  height: 1px;
  background: #d9d9d9;
  flex: 0 0 auto;
}

.dictation-input {
  flex: 1;
  min-width: 0;
  border: none;
  border-bottom: 1px solid #dcdfe6;
  outline: none;
  padding: 9px 2px 10px;
  font-size: 16px;
  background: transparent;
  color: #222;
}

.dictation-input:focus {
  border-bottom-color: #1989fa;
}

/* 遮罩层 */
.overlay-container .van-overlay {
  display: flex;
  flex-direction: column;
  background-color: var(--van-overlay-background);
  justify-content: center;
  align-items: center;
}

.swipe-help-container {
  height: 46%;
  width: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
}

@media screen and (max-width: 1025px) {
  .swipe-help-container {
    height: 43%;
    width: 100%;
  }
}

@media screen and (max-width: 1024px) and (max-height: 768px) {
  .swipe-help-container {
    height: 48%;
    width: 100%;
  }
}

@media screen and (max-width: 768px) {
  .swipe-help-container {
    height: 40%;
    width: 100%;
  }
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
  width: 100%;
  align-items: center;
  justify-content: center;
}

.space-buttons {
  width: 40%;
  max-width: 450px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}

@media screen and (max-width: 820px) and (max-height: 1180px) and (orientation: portrait) {
  .space-buttons {
    width: 180%;
  }
}

.coins-info {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  color: gray;
  font-size: 12px;
}

.button-container {
  display: flex;
  width: 95%;
  align-items: center;
  margin-top: 10px;
}

.custom-button {
  width: 70%;
  height: 50px;
}

.custom-button-plus {
  font-size: 10px;
  width: 30%;
  height: 50px;
}

.button-description {
  font-size: 12px;
  color: white;
  margin-top: 3px;
  margin-bottom: 0px;
  text-align: center;
}

.progress {
  position: fixed;
  left: 50%;
  bottom: 25%;
  transform: translateX(-50%);
  width: 80%;
  z-index: 200;
}

.van-progress__pivot {
  white-space: nowrap !important;
}

@media (max-width: 767px) {
  .main-content {
    flex-direction: column;
    padding: 10px;
    overflow: hidden;
  }
  .left-panel {
    width: 100%;
    flex-direction: row;
    flex-wrap: wrap;
  }
  .progress-section {
    width: 100%;
  }
  .control-section {
    width: 100%;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: space-around;
  }
  .button-group {
    flex: 1;
    min-width: 45%;
  }
  .timer-section {
    width: 100%;
  }
}
</style>