<script setup>
import { watch, onMounted, ref, getCurrentInstance, onBeforeUpdate } from "vue";
import { showFailToast, showToast, showLoadingToast } from "vant";

import { useRouter } from "vue-router";
const router = useRouter();
const instance = getCurrentInstance();
const axios = instance.appContext.config.globalProperties.$ajax;
const title = ref("");

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
    // console.log("用户选择的内容:", synonymsSelected.value);

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
    console.log("containsUnselected", containsUnselected);

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
      // 跳转答案
      router.push({
        path: "/studentAccountAnswer",
        state: {
          compareResult: JSON.stringify(compareResult),
          userSelected: JSON.stringify(synonymsSelected.value),
          nid: nid.value
        },
      });
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

onMounted(async () => {
  const data = JSON.parse(history.state.data);
  nid.value = history.state.nid;
  synonymsOptions.value = data.synonyms;
  answers.value = data.answers;
  console.log(synonymsOptions);
});
</script>

<template>
  <div>
    <div class="nav-bar-container">
      <van-nav-bar
        title="学生题目"
        right-text="提交"
        :left-text="`点击：${completeCount}/${synonymsOptions.length}`"
        @click-right="submitSelection()"
        @click-left="clickScroll()"
      >
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
