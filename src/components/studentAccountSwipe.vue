<script setup>
import {
  watch,
  onMounted,
  ref,
  getCurrentInstance,
  onBeforeUpdate,
  computed,
  nextTick,
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
// import encouragement from "./encouragement.vue";
import swipeHelp from "./swipeHelp.vue";
import submitloading from "./submitloading.vue";
const router = useRouter();
const instance = getCurrentInstance();
const axios = instance.appContext.config.globalProperties.$ajax;
const isLoading = ref(false);

const synonymsOptions = ref([]);
const synonymsSelected = ref([]);
const answers = ref([]);
const checkboxRefs = ref([]);
const nid = ref("");

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
    obj["答案"] = answers.value[i].中文;
    newList.push(obj);
  }
  console.log("newList: ", newList);
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
    const { 答案, 用户选择 } = item;

    // 分割答案，如果有"；"则按"；"分割，否则作为单个元素的数组
    const 答案数组 = 答案.includes("；") ? 答案.split("；") : [答案];

    // 计算匹配情况
    let flag = "false"; // 默认为没有匹配
    if (
      答案数组.length === 用户选择.length &&
      答案数组.every((ans) => 用户选择.includes(ans))
    ) {
      // 完全匹配：答案数组与用户选择数组长度相同且元素完全相同
      flag = "true";
    } else if (答案数组.some((ans) => 用户选择.includes(ans))) {
      // 部分匹配：用户选择数组至少包含一个答案数组中的元素
      flag = "half";
    }
    // 如果既不是完全匹配也不是部分匹配，则flag保持为"false"

    return {
      ...item,
      flag,
    };
  });
};
const swipeFlag = ref(0);
const clickSubmitUser = (action, done) => {
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
      swipeFlag.value = 1;
      return 1.5;
    }
    if(halfCount <= 3)swipeFlag.value = 1;
    return halfCount <= 3 ? 0.5 : false;
  }
  const rate = checkFlags(compareResult);

  // console.log("rate: ", rate);

  async function updateAccountData() {
    // 更新attempt和rate
    let params = new URLSearchParams();
    params.append("method", "updateUserData");
    params.append("nid", nid.value);
    params.append("rate", rate);
    params.append("swipe", swipeFlag.value);
    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }

  async function updateAccountlog() {
    // 结果存储到日志
    let params = new URLSearchParams();
    params.append("method", "updateUserlog");
    params.append("log", JSON.stringify(compareResult));
    params.append("title", titleData.value);
    params.append("username", username.value);
    params.append("alias", alias.value);
    params.append("mode", "游戏");
    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }
  isLoading.value = true;
  if (compareResult.length == 0) {
    showFailToast("提交数据不能为空");
    return;
  } else {
    function timeoutPromise(ms, promise) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error("Request timed out"));
        }, ms);

        promise
          .then((value) => {
            clearTimeout(timer);
            resolve(value);
          })
          .catch((error) => {
            clearTimeout(timer);
            reject(error);
          });
      });
    }

    Promise.race([
      timeoutPromise(
        15000,
        Promise.all([updateAccountData(), updateAccountlog()])
      ),
    ])
      .then((results) => {
        const accountDataResult = results[0]; // updateAccountData 的结果
        const accountLogResult = results[1]; // updateAccountlog 的结果
        console.log(accountDataResult);
        console.log(accountLogResult);
        // showLoadingToast.close;
        isLoading.value = false;
        return accountDataResult;
      })
      .then((accountDataResult) => {
        // 执行页面跳转
        router.push({
          path: "/studentAccountAnswer",
          state: {
            compareResult: JSON.stringify(compareResult),
            userSelected: JSON.stringify(synonymsSelected.value),
            nid: nid.value,
            rate: accountDataResult.rate,
            halfTrue: rate,
          },
        });
      })
      .catch((error) => {
        console.error("An error occurred:", error);
        if (error.message === "Request timed out") {
          // 处理超时情况
          // 通知后端取消操作
          fetch("/cancelOperation", {
            method: "POST",
            body: JSON.stringify({ operation: "updateUserlog" }),
            headers: {
              "Content-Type": "application/json",
            },
          });
          isLoading.value = false;
          showFailToast("网络超时");
        } else {
          // 处理其他错误
          isLoading.value = false;
          // showFailToast("提交失败");
        }
      });
  }
};

// 点击选项
const resultDataTempt = ref([]);
const selectedIndexes = ref({});
const flagSingleOrMultiChoice = ref("单选");
const toggleCheckChinese = (index, index2) => {
  const key = `${index}-${index2}`;
  const checkboxRef = checkboxRefs.value[key];
  if (checkboxRef) {
    checkboxRef.toggle();
  }
  selectedIndexes.value[key] = !selectedIndexes.value[key];

  // 更新选择结果
  const selectedChineses = selectedResults.value[index] || [];
  if (selectedIndexes.value[key]) {
    selectedChineses.push(synonymsOptions.value[index].中文[index2]);
  } else {
    const removeIndex = selectedChineses.indexOf(
      synonymsOptions.value[index].中文[index2]
    );
    selectedChineses.splice(removeIndex, 1);
  }
  selectedResults.value[index] = selectedChineses;

  // 合并答案和选项
  mergedData.value = mergeAnswerAndSynonym();
  // console.log("合并答案和选项：", mergedData.value);

  // 将用户选择转化为中文
  const synonymsSelectedChinese = convertSelections(
    synonymsSelected.value,
    synonymsOptions.value
  );
  // console.log("synonymsSelectedChinese", synonymsSelectedChinese);

  // 将中文用户选择和选项答案合并
  resultDataTempt.value = mergeSynonymAndSelections(synonymsSelectedChinese);
  // console.log("synonymAndSelections", synonymAndSelections);
};
function isSelected(index, index2) {
  return selectedIndexes.value[`${index}-${index2}`];
}
const goToNext = () => {
  if (!isButtonDisabled.value) {
    if (currentIndex.value < totalSlides.value - 1) {
      flagSingleOrMultiChoice.value = getSingeOrMultiChoice(currentIndex.value);
      completeCount.value = (parseInt(completeCount.value) + 1).toString();
      swipeRef.value.next();
      currentRate.value = 100;
      timerRate.value = 100;
    } else {
      // 到达最后一个轮播图，执行提交函数
      clickSubmitUser();
    }
  }
};

// 场外支援；暂停功能
const showOverlay = ref(true);
const pauseSwipe = () => {
  if (swipeHelpRef.value) {
    swipeHelpRef.value.show();
  }
  showMagicStart.value = true;
  continueFontSize.value = 18;
  textOpacity.value = 1;
  pause();
  isButtonTransparentDisabled.value = false;
  showOverlay.value = true;
  changeOverlayColor("#000000");
};
const continueSwipe = () => {
  showOverlay.value = false;
  // currentRate.value = 100;
  // timerRate.value = 100;
  if (currentIndex.value != 0) {
    resume();
  }
};
// 场外支援
// 魔法赠送答案
const numberShowAnswer = ref(3);
const autoSelectAnswer = (index) => {
  if (numberShowAnswer.value > 0) {
    const answerItem = answers.value.find(
      (item) => item.序号 === synonymsOptions.value[index].序号
    );
    if (answerItem) {
      showMagicStart.value = false;  // 隐藏魔法启动，变小字体
      continueFontSize.value = 13;
      textOpacity.value = 0.2;
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
          if (!isButtonTransparentDisabled.value) {
            setTimeout(() => {
              swipeHelpRef.value.show();
              changeOverlayColor("#000000");
              showMagicStart.value = true;  // 恢复魔法启动，变回字体
              continueFontSize.value = 18;
              textOpacity.value = 1;
            }, 5000);
          }
        }
      } else {
        console.log("No available answers to select.");
        showToast("已经全部显示");
      }
    }
  } else {
    showFailToast("无法显示");
  }
};
// 透视功能
const overlayColor = ref("#000000");
const isButtonTransparentDisabled = ref(false);
const numberTransparent = ref(3);
const showMagicStart = ref(true);
const continueFontSize = ref(18);
const textOpacity = ref(1);

const changeOverlayColor = (color) => {
  overlayColor.value = color;
};

const transparentHelp = () => {
  if (numberTransparent.value == 0) {
    showFailToast("无法透视");
  }
  if (currentIndex.value == 0) {
    showFailToast("无需透视");
    return;
  }
  if (numberTransparent.value > 0) {
    showMagicStart.value = false;  // 隐藏魔法启动，变小字体
    continueFontSize.value = 13;
    textOpacity.value = 0.2;

    swipeHelpRef.value.hide();
    isButtonDisabled.value = false; // 下一个按钮变为可以点选
    numberTransparent.value -= 1; // 透视数字减1
    isButtonTransparentDisabled.value = true; // 一次场外支援只能透视一次
    currentRate.value = 100;
    timerRate.value = 100;
  }
  changeOverlayColor("rgba(128, 128, 128, 0.6)");
};
// 回溯功能
const numberPrev = ref(3);
const gotoPreHelp = () => {
  if (currentIndex.value == 0 || numberPrev.value == 0) {
    showFailToast("无法回溯");
  }

  if (numberPrev.value > 0 && currentIndex.value > 0) {
    swipeHelpRef.value.hide();
    completeCount.value = (parseInt(completeCount.value) - 1).toString();
    isButtonDisabled.value = false;
    swipeRef.value.prev();
    showOverlay.value = false;
    numberPrev.value -= 1;
  }
};

// 动画场外支援
const swipeHelpRef = ref(null);
const animationVisible = ref(false);

// 计时器
const timerRate = ref(0);
const autoplay2 = ref(7000);
const currentRate = ref(100);
const swipeRef = ref(null);
const completeCount = ref("1");
const currentIndex = ref(0);
const totalSlides = ref(25); // 假设总共有5个轮播图项
const isButtonDisabled = ref(false);
// 使用computed计算属性来确定按钮的文本
const textButtonNext = computed(() => {
  if (currentIndex.value === 0) {
    return '开始';
  } else if (currentIndex.value === totalSlides.value - 1) {
    return '提交';
  } else {
    return '下一个';
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
  // 假设 answers.value 是一个包含所有项的数组
  const currentItem = answers.value[currentIndex];

  // 获取当前项的中文字段
  const chineseText = currentItem["中文"];

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
  setTimeout(() => {
    if (currentIndex.value < totalSlides.value - 1) {
      swipeRef.value.next();
      setTimeout(() => {
        flagSingleOrMultiChoice.value = getSingeOrMultiChoice(
          currentIndex.value
        );
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
  }, 0);
};
const { pause, resume } = useIntervalFn(
  () => {
    if (currentRate.value > 0) {
      timerRate.value -= 100 / (autoplay2.value / 70);
      if (timerRate.value <= 20) {
        isButtonDisabled.value = true; // 禁用按钮
      }
    } else {
      resetTimer();
    }
  },
  70,
  { immediate: false }
);
const handleSwipeChange = (index) => {
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
const titleData = ref("");
const username = ref("");
const alias = ref("");
const selectedResults = ref({});
const handleVisibilityChange = () => {
  if (document.hidden) {
    console.log("Browser tab is in the background");
    location.reload();
    // 执行你的函数
  } else {
    console.log("Browser tab is in the foreground");
    // 可选地处理标签页返回前台的情况
  }
};
onMounted(async () => {
  currentRate.value = 100;
  timerRate.value = 100;
  document.addEventListener("visibilitychange", handleVisibilityChange);
  document.documentElement.style.setProperty(
    "--van-overlay-background",
    overlayColor.value
  );

  let res = new Promise((resolve, reject) => {
    const data = JSON.parse(history.state.data);
    totalSlides.value = data.answers.length;
    alias.value = data.alias;
    nid.value = history.state.nid;
    synonymsOptions.value = data.synonyms;
    answers.value = data.answers;
    console.log("answers: ", answers.value);
    titleData.value = data.title;
    username.value = data.username;
    resolve("ok");
  });
  res.then(() => {
    flagSingleOrMultiChoice.value = getSingeOrMultiChoice(0);
  }).then(() => {
    setTimeout(() => {
      showOverlay.value = false;
    }, 1500); 
    
  })
});
</script>

<template>
  <div class="parent-container">
    <div class="nav-bar-container">
      <van-nav-bar
        title="学生题目"
        :left-text="`${completeCount}/${synonymsOptions.length}`"
      >
      </van-nav-bar>
    </div>

    <!-- 暂停遮罩层 -->
    <van-overlay :show="showOverlay" z-index="100" class="overlay container">
      <div style="height: 40%">
        <swipeHelp ref="swipeHelpRef" />
      </div>
      <div class="space">
        
        <div class="space text" @click="continueSwipe()" style="">
          <div v-show="showMagicStart">魔法启动</div>
          <div style="font-size: 18px;color: darkred" :style="{ fontSize: continueFontSize + 'px', color: 'rgba(139, 0, 0, ' + textOpacity + ')' }">点击继续</div>
        </div>
        <div class="space buttons">
          <van-button
            type="warning"
            block
            @click.stop="gotoPreHelp"
            icon="replay"
            style="width: 95%"
            >回溯 🚗 + {{ numberPrev }}</van-button
          >
          <div style="font-size: 10px;color: wheat;margin-top: 3PX;">回退到上一个单词</div>
          <van-button
            style="width: 95%; margin-top: 10px;"
            type="success"
            block
            @click.stop="autoSelectAnswer(currentIndex)"
            icon="aim"
            >点金 🎉 + {{ numberShowAnswer }}</van-button
          >
          <div style="font-size: 10px;color: wheat;margin-top: 3PX;">随机赠送一个答案</div>
          <van-button
            style="width: 95%; margin-top: 10px"
            type="primary"
            block
            :disabled="isButtonTransparentDisabled"
            @click.stop="transparentHelp"
            icon="eye-o"
            >透视 👓 + {{ numberTransparent }}</van-button
          >
          <div style="font-size: 10px;color: wheat;margin-top: 3PX;margin-bottom: 30px;">时间被凝固</div>
        </div>
      </div>
    </van-overlay>

    <van-row justify="center">
      <van-col span="23" style="margin-top: -10px;">
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

    <van-row
      class="my-swipe-container"
      justify="space-between"
      style="margin-top: 20px"
    >
      <van-col span="20" offset="2">
        <van-row justify="">
          <van-col span="6">
            <van-button
              type="success"
              @click="goToNext"
              size="normal"
              class="left-button"
              :disabled="isButtonDisabled"
              :style="{ backgroundColor: buttonColor }"
              style="width: 87.5px"
              >{{ textButtonNext }}</van-button
            >
          </van-col>
          <van-col span="2" offset="14">
            <van-circle
              v-model:current-rate="currentRate"
              :rate="timerRate"
              :speed="0"
              stroke-width="120"
              layer-color="#ebedf0"
              color="red"
              size="50"
              class="timer-circle"
            >
            </van-circle>
          </van-col>
        </van-row>
        <van-row style="margin-top: 20px">
          <van-col span="7" offset="">
            <van-button
              type="warning"
              @click="pauseSwipe"
              size="normal"
              class=""
              >场外支援</van-button
            >
          </van-col>
        </van-row>
      </van-col>
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
.overlay container {
  display: flex;
  flex-direction: column;
  background-color: var(--van-overlay-background);
  justify-content: center;
  /* align-items: flex-end */
}
.space {
  height: 25%;
  font-size: 30px;
  font-weight: 700;
  color: #ee0a24;
  margin-top: auto;
  display: flex;
  flex-direction: column;
  width: 100%;
  align-items: center;

}
.space buttons {
  margin: auto;
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
  margin: 10px 20px;
  width: calc(90% - 40px); /* Adjust the width according to the margin */
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
</style>
