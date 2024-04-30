<script setup>
import {
  watch,
  onMounted,
  ref,
  getCurrentInstance,
  onBeforeUpdate,
  computed,
  onUnmounted,
} from "vue";
import Typed from "typed.js";

import {
  showFailToast,
  showToast,
  showLoadingToast,
  showDialog,
  showSuccessToast,
} from "vant";
import { Base64 } from "js-base64";
import { useRouter } from "vue-router";
import QuickSwitchingText from "./QuickSwitchingText.vue";
const router = useRouter();
const instance = getCurrentInstance();
const axios = instance.appContext.config.globalProperties.$ajax;
const title = ref("");

const synonymsOptions = ref([]);
const synonymsSelected = ref([]);
const answers = ref([]);
const checkboxRefs = ref([]);
const showGetWords = ref(false);

// 提交按钮
const showDialogSubmit = ref(false);
const userName = ref("");
const mergedData = ref([]);
const showUserEmpty = ref(false);
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

    // 使用 Set 进行去重和比较，便于操作
    const answersSet = new Set(答案);
    const userChoicesSet = new Set(用户选择);

    // 检查是否完全匹配
    const isExactMatch =
      用户选择.length === 答案.length &&
      用户选择.every((choice) => answersSet.has(choice));

    // 检查是否有部分匹配
    const isPartialMatch =
      用户选择.some((choice) => answersSet.has(choice)) && !isExactMatch;

    // 根据比对结果设置flag属性
    let flag = "false"; // 默认为false
    if (isExactMatch) {
      flag = "true";
    } else if (isPartialMatch) {
      flag = "half";
    }

    return {
      ...item,
      flag,
    };
  });
};
const clickSubmitUser = (action, done) => {
  // 输入用户名后，确认提交
  if (action === "confirm") {
    if (userName.value.trim()) {
      // 如果用户名有效，这里可以执行提交逻辑
      console.log("提交用户名：", userName.value);
      console.log("用户选择的内容:", synonymsSelected.value);
      // console.log('答案:', answers.value);

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
      const synonymAndSelections = mergeSynonymAndSelections(
        synonymsSelectedChinese
      );
      // console.log("synonymAndSelections", synonymAndSelections);

      // 比对结果给出flag
      const compareResult = compareAndAddFlag(synonymAndSelections);
      // console.log("compareResult", compareResult);

      const containsUnselected = compareResult.some((item) =>
        item.用户选择.includes("无")
      );
      // console.log("containsUnselected", containsUnselected);

      if (containsUnselected) {
        function notifyDataEmpty() {
          showDataEmpty.value = true;
          setTimeout(() => {
            showDataEmpty.value = false;
          }, 1500);
        }
        notifyDataEmpty();
        showDialogSubmit.value = false;
        clickScroll();
      } else {
        async function submitData() {
          let params = new URLSearchParams();
          params.append("method", "updateData");
          params.append("data", JSON.stringify(compareResult));
          params.append("username", userName.value);
          return await axios.post("words/", params).then((ret) => {
            console.log(ret.data);
            return ret.data;
          });
        }
        submitData();
        // 跳转答案
        router.push({
          path: "/studentAnswer",
          state: {
            compareResult: JSON.stringify(compareResult),
            user: userName.value,
            userSelected: JSON.stringify(synonymsSelected.value),
          },
        });
      }
    } else {
      // 如果用户名无效，可以提示用户且不关闭对话框
      function notifyUserEmpty() {
        showUserEmpty.value = true;
        setTimeout(() => {
          showUserEmpty.value = false;
        }, 3000);
      }
      notifyUserEmpty();
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

// 点击选项
const resultDataTempt = ref([]);
const completeCount = ref("0");
const selectedIndexes = ref({});
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
// 点击题目
const showTitleDialog = ref(false);
const passwordTeacher = ref("");
const titleClickHandler = () => {
  showTitleDialog.value = true;
};

const clickTitleDialog = (action, done) => {
  // 输入用户名后，确认提交
  if (action === "confirm") {
    if (passwordTeacher.value.trim()) {
      async function verifyTeacherPassword() {
        let params = new URLSearchParams();
        params.append("method", "verifyTeacherPassword");
        params.append("password", passwordTeacher.value.trim());
        return await axios.post("words/", params).then((ret) => {
          return ret.data;
        });
      }
      verifyTeacherPassword().then((res) => {
        // console.log("res: ", res);
        if (res == "ok") {
          localStorage.setItem(
            "teacherPassword",
            Base64.encode(passwordTeacher.value)
          );
          showSuccessToast("密码正确");
        } else {
          showFailToast("密码错误");
          localStorage.removeItem("teacherPassword");
        }
      });
    } else {
      showFailToast("密码不能为空");
    }
  } else {
    // 如果用户点击取消或遮罩层，直接关闭对话框
    showTitleDialog.value = false;
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

// 地狱模式
const showAccountPop = ref(true);
const userAccount = ref("");
const passwordAccount = ref("");
const showHell = () => {
  showAccountPop.value = true;
};
const submitAccount = () => {
  async function submitAccountData() {
    let params = new URLSearchParams();
    params.append("method", "getUserData");
    params.append("user", userAccount.value);
    params.append("password", passwordAccount.value);
    return await axios.post("words/", params).then((ret) => {
      // console.log(ret.data);
      return ret.data;
    });
  }

  if (passwordAccount.value.trim() && userAccount.value.trim()) {
    submitAccountData().then((res) => {
      if (res == "用户名不存在") {
        showFailToast("用户名不存在");
      } else if (res == "密码错误") {
        showFailToast("密码错误");
      } else {
        showDialog({
          title: "做题须知",
          theme: "round-button",
          messageAlign: "left",
          message:
            "\n1. 选择任务列表中的任务。\n\n2. 从六个选项中选择一个或多个你认为正确的答案。提交你的答案后，系统会显示正确答案，确认无误后请点击继续。\n\n3. 完全正确的试卷将获得一个星星，收集满三颗星星即视为任务完成。",
        });

        async function userTestUpdate() {
          let params = new URLSearchParams();
          params.append("method", "userTestUpdate");
          return await axios.post("words/", params).then((ret) => {
            return ret.data;
          });
        }
        if (userAccount.value == "user" || userAccount.value == "teacher") {
          userTestUpdate().then(() => {
            router.push({
              path: "/studentAccountList",
              state: {
                data: JSON.stringify(res),
              },
            });
          });
        } else {
          router.push({
            path: "/studentAccountList",
            state: {
              data: JSON.stringify(res),
            },
          });
        }
      }
    });
  } else {
    showFailToast("账号密码不能为空");
  }
};
const pushUserTest = () => {
  let res = new Promise((resolve, reject) => {
    userAccount.value = "user";
    passwordAccount.value = "password";
    resolve("ok");
  });
  res.then((res) => {
    submitAccount();
  });
};

const typed = ref(null);
const pRef = ref(null);
const showSwitchingText = ref(false);
const typedContainer = ref(null);
const quickSwitchingTextRef = ref(null);
const wordList = [
  "有趣",
  "有料",
  "高效",
  "上瘾",
  "一词多义",
  "天津定制",
  "课堂同步",
  "私人定制",
  "个性化单词",
  "高考3500",
  "天津3500",
  "外研社专属",
  "天津英语",
  "中考英语",
  "高考英语",
];
onMounted(async () => {
  // await nextTick();
  // const options = {
  //   strings: ["每天10分钟", "扫码背单词"],
  //   typeSpeed: 140,
  //   backSpeed: 60,
  //   showCursor: false,
  //   onComplete: () => {
  //     // 动画结束后等待1.5秒然后显示词汇切换动画
  //     setTimeout(() => {
  //       showSwitchingText.value = true;
  //       quickSwitchingTextRef.value?.restart();
  //     }, 1500);
  //   },
  //   onStringTyped: (arrayPos, self) => {
  //     // 当"每天10分钟"动画结束后，立即开始显示词汇切换动画
  //     if (arrayPos === 0) {
  //       showSwitchingText.value = true;
  //       quickSwitchingTextRef.value?.restart();
  //       // 并让下一个动画立刻开始 所以设置打字速度为0
  //       self.options.typeSpeed = 140;
  //       self.options.backSpeed = 60;
  //     } else if (arrayPos === 1) {
  //       // 当"扫码背单词"动画结束后，暂停1.5秒再启动"每天10分钟"动画和词汇切换动画
  //       self.options.typeSpeed = 140;
  //       self.options.backSpeed = 60;
  //       showSwitchingText.value = true;
  //     }
  //     setTimeout(() => {
  //       self.reset();
  //     }, 3000);
  //   },
  // };
  // new Typed(typedContainer.value, options);

  // 开场动画
  const options = {
    strings: ["每天10分钟", "扫码背单词"],
    typeSpeed: 140, // 第一个字符串的打字速度
    backSpeed: 60, // 默认退格速度
    showCursor: false,
    onComplete: (self) => {
      setTimeout(() => {
        self.reset();
        self.start();
      }, 1500); // 动画结束后等待3秒重置并重新开始
    },
    onStringTyped: (arrayPos, self) => {
      // arrayPos 是当前字符串的索引，self 是 Typed 实例
      if (arrayPos === 0) {
        // 第一个字符串打完后设置第二个字符串的速度
        self.options.typeSpeed = 120; // 第二个字符串的打字速度
        self.options.backSpeed = 50; // 第二个字符串的退格速度
      } else if (arrayPos === 1) {
        // 第二个字符串打完后恢复第一个字符串的速度和退格速度
        self.options.typeSpeed = 140;
        self.options.backSpeed = 60;
      }
    },
  };
  typed.value = new Typed(pRef.value, options);
  async function queryLogout() {
    let params = new URLSearchParams();
    params.append("method", "queryData");
    return await axios.post("words/", params).then((ret) => {
      // console.log(ret.data);
      title.value = ret.data.title[0]["题目"];
      synonymsOptions.value = ret.data.synonyms;
      answers.value = ret.data.answers;
      answers.value.forEach((entry) => {
        // 单选变为多选
        entry.中文 = entry.中文.split("；");
      });
      showGetWords.value = false;
      console.log(ret.data);
      return ret.data;
    });
  }

  showGetWords.value = true;
  queryLogout();
});
onUnmounted(() => {
  // typed?.destroy();
});
</script>

<template>
  <div>
    <div class="nav-bar-container">
      <van-nav-bar
        right-text="提交"
        :left-text="`点击：${completeCount}/${synonymsOptions.length}`"
        @click-right="submitSelection()"
        @click-left="clickScroll()"
      >
        <template #title>
          <div @click="titleClickHandler">{{ title }}</div>
        </template>
      </van-nav-bar>
    </div>
    <van-dialog
      v-model:show="showTitleDialog"
      title="输入密码"
      :before-close="clickTitleDialog"
      show-cancel-button
      style="margin-bottom: 2rem"
    >
      <van-field
        v-model="passwordTeacher"
        type="password"
        placeholder="请输入密码"
      />
    </van-dialog>

    <!-- 地狱模式 -->
    <van-floating-bubble axis="xy" magnetic="x" icon="chat" @click="showHell" />

    <van-popup
      closeable
      v-model:show="showAccountPop"
      position="bottom"
      :style="{ height: '100%' }"
      :overlay-style="{ backgroundColor: 'rgba(0, 0, 0, 1)' }"
    >
      
        <!-- 滚动动画 -->
        <!-- <QuickSwitchingText 
          class="content" 
          style="
            font-size: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-top: 40%;
          "
          finalText="扫码背单词" :textList="wordList" :duration="1900" ref="quickSwitchingTextRef" /> -->
        <!-- 打字动画 -->
        <div
          ref="pRef"
          style="
            font-size: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-top: 40%;
          "
        ></div>

        <!-- <div>
          <div style="font-size: 40px; margin-top: 40%">
            <!-- 打字动画 -->
            <!-- <div
              v-if="!showSwitchingText"
              ref="typedContainer"
              style="
                display: flex;
                align-items: center;
                justify-content: center;
              "
            ></div> -->
            <!-- 多词切换动画 -->
            <!-- <QuickSwitchingText
              v-else
              ref="quickSwitchingTextRef"
              class="content"
              finalText="扫码背单词"
              :duration="1900"
              :textList="wordList"
              style="
                display: flex;
                align-items: center;
                justify-content: center;
              "
            /> -->
          
        
      

        <!-- designed by xie -->
        <div
          class="logo"
          data-text="♠ Designed by xie ♠"
          style="margin-top: 60%"
        >
          ♠ Designed by xie ♠
        </div>

        <div style="position: fixed; bottom: 0; width: 100%">
          <van-cell-group inset style="margin-top: 80px">
            <div style="font-weight: 700; font-size: 20; margin: 20px">
              请输入账户名和密码
            </div>
            <van-field
              v-model="userAccount"
              label="用户"
              placeholder="请输入用户名"
            />
            <van-field
              v-model="passwordAccount"
              type="password"
              label="密码"
              placeholder="请输入密码"
            />
          </van-cell-group>
          <div style="margin: 10px">
            <van-button type="success" plain block @click="submitAccount"
              >提交</van-button
            >
            <van-button
              type="primary"
              plain
              block
              @click="showAccountPop == false"
              >关闭</van-button
            >
          </div>
          <div
            style="
              display: flex;
              justify-content: flex-end;
              width: 96%;
              margin-top: 5%;
              margin-bottom: 5%;
            "
          >
            <div>
              <van-button
                type="warning"
                plain
                @click="pushUserTest"
                size="normal"
                style="margin-top: 5%; margin-bottom: 5%"
                >点击体验</van-button
              >
            </div>
          </div>
        </div>
    </van-popup>

    <!-- 加载数据遮罩层 -->
    <van-overlay :show="showGetWords">
      <div class="wrapper" @click.stop>
        <van-loading size="24px" v-show="showGetWords" color="#1989fa"
          >加载中...</van-loading
        >
      </div>
    </van-overlay>

    <!-- 提交数据弹窗 -->
    <van-dialog
      v-model:show="showDialogSubmit"
      title="输入姓名"
      :before-close="clickSubmitUser"
      show-cancel-button
    >
      <van-field v-model="userName" placeholder="请输入姓名" />
    </van-dialog>
    <van-notify v-model:show="showUserEmpty" type="success">
      <span>用户名不能为空</span>
    </van-notify>
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
    <van-checkbox-group v-model="synonymsSelected" style="margin-bottom: 80px">
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
  </div>
</template>




<style>
.logo {
  font-size: 20px;
  font-family: "SourceHanSansCN-Bold" !important;
  font-weight: 700;
  color: #222;
  position: fixed;
  bottom: 60%;
  width: 100%;
  text-align: center; /* 水平居中文本 */
  /* display: flex; */
  justify-content: center; /* Flexbox 水平居中所有内容 */
  overflow: hidden; /* 防止超出内容影响布局 */
}

.logo::after {
  content: attr(data-text);
  position: absolute;
  top: 50%; /* 修改为垂直居中 */
  left: 50%; /* 水平居中 */
  transform: translate(-50%, -50%); /* 使用 translate 调整精确位置 */
  background-image: linear-gradient(
    to right,
    rgb(236, 72, 153),
    rgb(239, 68, 68),
    rgb(234, 179, 8)
  );
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  clip-path: ellipse(60px 60px at 50% 50%); /* 初始位置调整为中心 */
  animation: move 5s linear infinite;
  white-space: nowrap; /* 防止文本折行 */
}

@keyframes move {
  0%,
  100% {
    clip-path: ellipse(60px 60px at 0% 50%);
  }
  50% {
    clip-path: ellipse(60px 60px at 100% 50%);
  }
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
  cursor: pointer;
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
/* .content span {
  font-size: 50px;
  font-weight: bold;
} */
</style>
