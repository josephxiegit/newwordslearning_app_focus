<script setup>
import {
  watch,
  onMounted,
  ref,
  getCurrentInstance,
  onBeforeUpdate,
} from "vue";
import { showFailToast, showToast } from 'vant';

import { useRouter } from "vue-router";
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
          console.log(1111);
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
const toggleCheckChinese = (index, index2) => {
  const checkboxRef = checkboxRefs.value[`${index}-${index2}`];
  if (checkboxRef) {
    checkboxRef.toggle(); // 直接调用复选框的 toggle 方法
  }
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
};

// 点击题目
const showTitleDialog = ref(false);
const passwordTeacher = ref("");
const titleClickHandler = () => {
  showTitleDialog.value = true;
}
const clickTitleDialog = (action, done) => {
  // 输入用户名后，确认提交
  if (action === "confirm") {
    if (passwordTeacher.value.trim()) {
      // 如果用户名有效，这里可以执行提交逻辑
      console.log("提交教师密码：", passwordTeacher.value);
      if(passwordTeacher.value == "ss1234567890") {
        router.push({
          path: "/teacher",
        });
      } else {
        showFailToast('密码错误');
      }
    } else {
      showFailToast('密码不能为空');
    }
  } else {
    // 如果用户点击取消或遮罩层，直接关闭对话框
    showTitleDialog.value = false;
  }
};

// 地狱模式
const onClick = () => {
      showToast('地狱无限模式，等待上线...');
};


onMounted(async () => {
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
    >
      <van-field v-model="passwordTeacher" type="password" placeholder="请输入密码" />
    </van-dialog>

    <van-floating-bubble
      axis="xy"
      magnetic="x"
      icon="chat" 
      @click="onClick" 
    />

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

    <!-- 显示列表单词 -->
    <van-checkbox-group v-model="synonymsSelected">
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
              class="chinese-cell"
            >
              <template #title>
                <div style="text-align: left">{{ chinese }}</div>
              </template>
              <template #right-icon>
                <van-checkbox
                  :name="`${index + 1}-${index2 + 1}`"
                  :ref="(el) => (checkboxRefs[`${index}-${index2}`] = el)"
                  @click.stop
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
</style>
