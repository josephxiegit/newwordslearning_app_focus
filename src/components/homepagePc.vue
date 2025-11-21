<script setup>
import {
  watch,
  onMounted,
  ref,
  getCurrentInstance,
  onBeforeUpdate,
  computed,
  onUnmounted,
  inject,
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
import loading from "./loading.vue";
import QuickSwitchingText from "./QuickSwitchingText.vue";

const flagTheme = inject("flagTheme");
const router = useRouter();
const instance = getCurrentInstance();
const axios = instance.appContext.config.globalProperties.$ajax;
const title = ref("");
const isLoading = ref(false);

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
            // Base64.encode(passwordTeacher.value)
            passwordTeacher.value
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
const missyouFlag = ref(false);
const missDays = ref(2);
const userAccount = ref("");
const passwordAccount = ref("");
const showHell = () => {
  showAccountPop.value = true;
};
async function submitAccountData() {
  let params = new URLSearchParams();
  params.append("method", "getUserData");
  params.append("user", userAccount.value);

  params.append("password", passwordAccount.value);

  return await axios.post("words/", params).then((ret) => {
    return ret.data;
  });
}
const submitAccount = () => {
  // isLoading.value = true;
  if (passwordAccount.value.trim() && userAccount.value.trim()) {
    submitAccountData().then((res) => {
      console.log("res: ", res);
      if (res == "用户名不存在") {
        showFailToast("用户名不存在");
        setTimeout(() => {
          showToast({
            message: "提示：姓名全拼音全小写，如：张三：zhangsan",
            duration: 0,
            closeOnClick: true,
          });
        }, 1500);
        return;
      } else if (res == "密码错误") {
        showFailToast("密码错误");
        return;
      } else if (res.status == false) {
        showFailToast("用户暂时冻结");
        return;
      } else {
        // 主题选择
        localStorage.setItem("theme_name", res.theme.theme_name);
        if (res.theme.theme_name == "喜羊羊与灰太狼") {
          flagTheme.value = 1;
        }
        if (res.theme.theme_name == "熊出没") {
          flagTheme.value = 2;
        }

        async function missTask() {
          let params = new URLSearchParams();
          params.append("method", "missTask");
          params.append("user", userAccount.value);
          return await axios.post("words/", params).then((ret) => {
            return ret.data;
          });
        }

        async function userTestUpdate() {
          let params = new URLSearchParams();
          params.append("method", "userTestUpdate");
          return await axios.post("words/", params).then((ret) => {
            return ret.data;
          });
        }

        async function executeTasks() {
          // try {
          // 先执行 missTask
          // isLoading.value = true;
          const res_miss = await missTask();
          if (res_miss.message != "无") {
            missyouFlag.value = true;
            missDays.value = res_miss.message;
            console.log("missDays.value: ", missDays.value);
          }

          // 然后执行后续逻辑
          if (userAccount.value == "user" || userAccount.value == "teacher") {
            await userTestUpdate();
            router.push({
              path: "/studentAccountList",
              state: {
                data: JSON.stringify(res),
                missyouflag: missyouFlag.value,
                missDays: missDays.value,
              },
            });
          } else {
            const userData = {
              username: userAccount.value.trim(),
              password: passwordAccount.value.trim(),
            };
            const now = new Date();
            const expirationDate = new Date(
              now.getTime() + 7 * 24 * 60 * 60 * 1000
            );
            localStorage.setItem("userData", JSON.stringify(userData));
            localStorage.setItem(
              "expirationDate",
              expirationDate.toISOString()
            );
            isLoading.value = false;
            router.push({
              path: "/studentAccountList",
              state: {
                data: JSON.stringify(res),
                missyouflag: missyouFlag.value,
                missDays: missDays.value,
              },
            });
          }
          // } catch (error) {
          //   console.error("Error executing tasks:", error);
          // }
        }
        executeTasks();
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

const gotoParent = () => {
  showToast({
    message: "平板/电脑暂不支持",
    duration: 0,
    closeOnClick: true,
  });
  // router.push({
  //   path: "/viewersHomepage",
  // });
};

onMounted(async () => {
  const expirationDate = localStorage.getItem("expirationDate");
  // console.log("expirationDate: ", expirationDate);
  if (expirationDate) {
    const now = new Date();
    const expiration = new Date(expirationDate);
    if (now >= expiration) {
      localStorage.removeItem("userData");
      localStorage.removeItem("expirationDate");
    } else {
      let res = new Promise((resolve, reject) => {
        const userData = JSON.parse(localStorage.getItem("userData"));
        console.log("userData: ", userData);
        userAccount.value = userData["username"];
        passwordAccount.value = userData["password"];
        resolve("ok");
      });
      res.then(() => {
        submitAccountData().then((res) => {
          console.log("res: ", res);
          router.push({
            path: "/studentAccountList",
            state: {
              data: JSON.stringify(res),
            },
          });
        });
      });
    }
  } else {
    userAccount.value = "";
    passwordAccount.value = "";
  }

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
      // console.log(ret.data);
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
    <van-popup
      v-model:show="showAccountPop"
      position="bottom"
      :style="{ height: '100%' }"
      :overlay-style="{ backgroundColor: 'rgba(0, 0, 0, 1)' }"
      class="account-popup"
    >
      <div class="popup-content-container">
        <div class="popup-grid-layout" >
          <div class="popup-left-column">
            <div class="typing-container">
              <div ref="pRef" class="content"></div>
            </div>
            <div class="logo-container">
              <div
                class="logo logo-large"
                data-text="♠ Designed by xie ♠"
              >
                ♠ Designed by xie ♠
              </div>
            </div>
          </div>

          <div class="popup-right-column">
            <div class="login-box">
              <van-cell-group inset style="margin-top: 20px">
                <div
                  style="
                    display: flex;
                    margin: 20px;
                    justify-content: space-between;
                  "
                >
                  <div class="login-title">请输入账户名和密码</div>
                  <div class="parent-link-button" @click="gotoParent()">
                    前往家长版
                  </div>
                </div>
                <van-field
                  v-model="userAccount"
                  label="用户"
                  placeholder="请输入用户名"
                  size="normal"
                  class="large-field"
                />
                <van-field
                  v-model="passwordAccount"
                  type="password"
                  label="密码"
                  placeholder="请输入密码"
                  size="normal"
                  class="large-field"
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
                  @click="showAccountPop = false"
                  >关闭</van-button
                >
              </div>
              <div class="test-user-container">
                <div>
                  <van-button
                    type="warning"
                    plain
                    @click="pushUserTest"
                    size="normal"
                    class="test-user-button"
                    >点击体验</van-button
                  >
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
/* ---------------------------------------------------- */
/* --- 修复滑块和高度溢出问题 --- */

/* 1. 全局设置视口高度和 box-sizing，并隐藏可能因组件溢出的横向滑块 */
html, body {
  height: 100%;
  overflow-x: hidden; /* 隐藏横向滚动条 */
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; /* 设置全局字体 */
}

/* 2. 确保 box-sizing: border-box 生效，防止 padding 导致尺寸溢出 */
* {
  box-sizing: border-box;
}

/* 3. 移除不必要的 100% 高度，让内容自然流动 */
.popup-content-container {
  height: 100%;
  padding: 20px;
}

/* 4. 调整 .popup-grid-layout 的高度，但仍需确保父级容器能约束它 */
.popup-grid-layout {
  min-height: 100%; /* 确保它至少占满视口高度 */
  display: flex;
  flex-direction: column;
}

/* ---------------------------------------------------- */
/* --- 移动设备和默认样式 (Mobile First) --- */

.typing-container {
  height: 70px; /* 固定高度，防止内容消失时布局抖动 */
  display: flex;
  align-items: center;
  justify-content: center;
}

.content {
  font-size: 28px;
  margin: 0;
}

@media (min-width: 431px) and (max-width: 767px) {
  .content {
    margin-top: 0;
  }
}

/* --- Logo 核心样式修正 --- */

.logo {
  font-size: 40px;
  font-family: "SourceHanSansCN-Bold", -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-weight: 700;
  color: #222;
  position: relative;
  bottom: auto;
  width: 100%;
  text-align: center;
  display: flex;
  justify-content: center;
  overflow: hidden;
}

.logo-large {
  font-size: 18px;
  position: relative;
  bottom: auto;
}

.logo::after {
  content: attr(data-text);
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-image: linear-gradient(
    to right,
    rgb(236, 72, 153),
    rgb(239, 68, 68),
    rgb(234, 179, 8)
  );
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  clip-path: ellipse(60px 60px at 50% 50%);
  animation: move 5s linear infinite;
  white-space: nowrap;
}
.logo-large::after {
  clip-path: ellipse(
    80px 80px at 50% 50%
  );
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

/* --- 列表和通用样式 --- */

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
  cursor: pointer;
}

.chinese-cell:last-of-type {
  border-bottom: none;
}

.wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  /* height: 100%; <--- 移除此行，让内容高度由内部元素决定 */
}

.nav-bar-container {
  position: sticky;
  top: 0;
  z-index: 100;
}

/* --- 账户登录弹窗样式 --- */

.account-popup {
  background-color: white !important;
}

/* popup-content-container 高度已在顶部修复 */

/* popup-grid-layout 高度已在顶部修复 */

/* 左侧栏：内容堆叠 (打字动画在上，Logo在下) */
.popup-left-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center; /* 改为居中，更稳定 */
  flex-grow: 1;
  position: relative;
  padding: 20px 0; /* 简化内边距 */
}

.logo-container {
  /* 固定定位，不受上方内容变化影响 */
  position: relative;
  bottom: auto;
  width: 100%;
  margin-top: 30px; /* 改为固定间距，避免使用vh单位导致的跳动 */
  text-align: center;
}

/* 右侧栏：登录表单 (移动端固定在底部) */
.popup-right-column {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  padding: 10px 0;
}

.login-box {
  background-color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 10px;
}

/* 登录表单元素大小 */
.login-title {
  font-weight: 700;
  font-size: 16px;
  font-family: inherit; /* 确保字体继承 */
}

.parent-link-button {
  font-size: 13px;
  border-radius: 3px;
  padding: 5px 8px;
  color: white;
  background-color: rgb(47, 255, 134);
  margin-top: 0;
  cursor: pointer;
  font-family: inherit; /* 确保继承父元素字体 */
}

.large-field :deep(.van-field__label),
.large-field :deep(.van-field__control) {
  font-size: 16px;
}
:deep(.van-button) {
  font-size: 16px;
  margin-bottom: 10px;
}
.test-user-container {
  display: flex;
  justify-content: flex-end;
  width: 94%;
  margin: 5px 5px 10px 10px;
}

/* --- 桌面端布局 (min-width: 768px) --- */

@media (min-width: 768px) {
  .popup-grid-layout {
    flex-direction: row; /* 左右布局 */
    gap: 40px;
    align-items: center;
    justify-content: center;
    max-width: 900px;
    margin: 0 auto;
  }

  .popup-left-column {
    flex-basis: 50%; /* 左侧占 50% */
  }

  .popup-right-column {
    flex-basis: 50%; /* 右侧占 50% */
    position: relative; /* 移除固定定位 */
    bottom: auto;
    width: auto;
    height: auto; /* 移除可能导致溢出的固定高度 */
    /* 垂直居中登录框 */
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .login-box {
    width: 100%;
    max-width: 400px;
  }

  .logo-container {
    margin-top: 40px; /* 桌面端使用固定间距，避免跳动 */
  }

  /* 桌面端内容字体加大 */
  .typing-container {
    height: 20px; /* 桌面端更大的固定高度 */
  }
  
  .content {
    font-size: 42px;
  }
}
</style>