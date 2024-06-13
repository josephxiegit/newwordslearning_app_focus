<script setup>
import {
  watch,
  onMounted,
  ref,
  getCurrentInstance,
  onBeforeUpdate,
  computed,
} from "vue";
import {
  showFailToast,
  showDialog,
  showConfirmDialog,
  showLoadingToast,
  showToast,
} from "vant";

import { useRouter } from "vue-router";
import encouragement from "./encouragement.vue";
import helpforgood from "./helpforgood.vue";
import helpforbad from "./helpforbad.vue";
import submitloading from "./submitloading.vue";
const router = useRouter();
const instance = getCurrentInstance();
const axios = instance.appContext.config.globalProperties.$ajax;
const title = ref("");
const isLoading = ref(false);

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
const clickSubmitUser = (action, done) => {
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

    // 将中文用户选择和选项答案合并
    const synonymAndSelections = mergeSynonymAndSelections(
      synonymsSelectedChinese
    );

    // 比对结果给出flag
    const compareResult = compareAndAddFlag(synonymAndSelections);

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

      async function updateAccountData() {
        // 更新attempt和rate
        let params = new URLSearchParams();
        params.append("method", "updateUserData");
        params.append("nid", nid.value);
        params.append("rate", rate);
        params.append("swipe", 0);
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
        params.append("mode", "普通");
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
    }
  } else {
    // 如果用户点击取消或遮罩层，直接关闭对话框
    showDialogSubmit.value = false;
  }
};

// 添加滚动功能
const myList = ref([]);
const setItemRef = (el) => {
  if (el) {
    myList.value.push(el);
  }
};
const scrollToItem = (index) => {
  // 检查是否点击的是列表中的最后两个选项
  if (index >= synonymsOptions.value.length - 2) {
    heightScroll.value = 65;
  }
  if (myList.value[index]) {
    const item = myList.value[index];
    const top = item.getBoundingClientRect().top + window.scrollY - 50; // 获取元素的顶部位置并向上偏移10px
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

// 点击选项
const resultDataTempt = ref([]);
const selectedIndexes = ref({});
const completeCount = ref("0");
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
  completeCount.value = resultDataTempt.value.reduce((count, item) => {
    if (item.用户选择[0] !== "无") {
      return count + 1;
    }
    return count;
  }, 0);
  // console.log("completeCount: ", completeCount.value);

  // 判断是否超过一半的选项被选中
  const halfOptions = synonymsOptions.value.length / 2;
  // console.log("halfOptions: ", halfOptions);
  if (completeCount.value == halfOptions) {
    showAnimationShineEncouragement(); // 调用动画显示方法
  }
};
function isSelected(index, index2) {
  return selectedIndexes.value[`${index}-${index2}`];
}

// 场外支援
const flagHelp = ref(true);
const helpOutside = () => {
  if (flagHelp.value) {
    showConfirmDialog({
      title: "场外支援",
      theme: "round-button",
      message: "只有一次求助机会，确认使用吗？",
    }).then(() => {
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
          // showDialog({
          //   title: "恭喜，全对了",
          //   theme: "round-button",
          //   message: "可以提交答案了！",
          // });
          showAnimationShineHelpForGood();
        } else {
          // showAnimationShineHelpForBad();
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

// 动画鼓励
const encouragementRef = ref(null);
const animationVisible = ref(false);

const helpforgoodRef = ref(null);
const animationVisible_help = ref(false);

const helpforbadRef = ref(null);
const animationVisible_help2 = ref(false);

function showAnimationShineEncouragement() {
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

const titleData = ref("");
const username = ref("");
const alias = ref("");
onMounted(async () => {
  const data = JSON.parse(history.state.data);
  // console.log('data: ', data);
  alias.value = data.alias;
  nid.value = history.state.nid;
  synonymsOptions.value = data.synonyms;
  answers.value = data.answers;
  titleData.value = data.title;
  username.value = data.username;
  console.log("username: ", username.value);

  console.log(synonymsOptions.value);
});
</script>

<template>
  <div>
    <div class="nav-bar-container">
      <van-nav-bar
        title="学生题目"
        :left-text="`${completeCount}/${synonymsOptions.length}`"
      >
        <template #right>
          <div class="nav-bar-right">
            <span class="nav-button" @click="helpOutside"> 场外支援 </span>
            <span class="nav-button" @click="submitSelection"> 提交 </span>
          </div>
        </template>
      </van-nav-bar>
    </div>

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
          :title="item.序号 + '. ' + item.英文"
          size="large"
          :style="{
            color:
              selectedResults[index] && selectedResults[index].length > 0
                ? 'red'
                : '',
          }"
        >
          <template #default>
            <span
              v-if="selectedResults[index] && selectedResults[index].length"
              >{{ selectedResults[index].join("; ") }}</span
            >
          </template>
        </van-cell>
      </van-cell-group>
    </van-floating-panel>

    <!-- 显示列表单词 -->
    <van-checkbox-group class="checkbox-container" v-model="synonymsSelected">
      <van-cell-group>
        <div
          v-for="(item, index) in synonymsOptions"
          :key="index"
          class="custom-cell-group"
          :ref="setItemRef"
        >
          <!-- 显示英文单词和序号，加粗显示 -->
          <van-cell clickable class="bold-title border-cell">
            <template #title>
              <div>{{ item.序号 + ". " + item.英文 }}</div>
            </template>
          </van-cell>

          <!-- 显示对应的中文选项 -->
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
                  :ref="(el) => (checkboxRefs[`${index}-${index2}`] = el)"
                  @click.stop.prevent="toggleCheckChinese(index, index2)"
                />
              </template>
            </van-cell>
          </van-cell-group>
        </div>
      </van-cell-group>
    </van-checkbox-group>
    <div class="bottom-placeholder"></div>
    <encouragement ref="encouragementRef" />
    <helpforgood ref="helpforgoodRef" />
    <helpforbad ref="helpforbadRef" />
    <submitloading v-if="isLoading" />
  </div>
</template>




<style>
.checkbox-container {
  width: 100%;
  margin: 0 auto;
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
  font-weight: bold; /* 加粗英文和序号 */
  font-size: large;
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
.wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%; /* 确保wrapper高度充满父容器 */
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
  color: #208BFA;
  cursor: pointer;
  user-select: none;
}
</style>
