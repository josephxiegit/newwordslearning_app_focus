<script setup>
import {
  watch,
  onMounted,
  ref,
  getCurrentInstance,
  onBeforeUpdate,
  computed,
} from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const instance = getCurrentInstance();
const axios = instance.appContext.config.globalProperties.$ajax;
const showData = ref([]);

// 计算flag为true的个数
const flagCounts = (showData) => {
  for (let i = 0; i < showData.length; i++) {
    let trueCounts = 0;
    let falseCounts = 0;
    let halfCounts = 0;
    for (let j = 0; j < showData[i].item_list.length; j++) {
      if (showData[i].item_list[j].flag === "true") {
        trueCounts += 1;
      } else if (showData[i].item_list[j].flag === "false") {
        falseCounts += 1;
      } else {
        halfCounts += 1;
      }
    }
    showData[i]["trueCounts"] = trueCounts;
    showData[i]["falseCounts"] = falseCounts;
    showData[i]["halfCounts"] = halfCounts;
  }
  return showData;
};
// 得到答案数组
const answerList = ref([]);
const getAnswerList = (originalData) => {
  const transformedData = [];

  // 假设每个item_list的结构和长度相同，使用第一个元素来初始化结构
  if (originalData.length > 0 && originalData[0].item_list.length > 0) {
    for (const item of originalData[0].item_list) {
      const newObj = {
        序号: item.序号,
        中文: item.中文,
        英文: item.英文,
        答案: item.答案,
        userObj: [],
      };

      for (const userData of originalData) {
        const userSelection = userData.item_list.find(
          (i) => i.序号 === item.序号
        );
        if (userSelection) {
          newObj.userObj.push({
            username: userData.username,
            用户选择: userSelection["用户选择"],
            flag: userSelection.flag,
          });
        }
      }

      transformedData.push(newObj);
    }
  }

  return transformedData;
};

// 后退到列表
const goback = () => {
  router.push({
    path: "/teacher",
  });
};
onMounted(async () => {
  let res = new Promise((resolve, reject) => {
    const data = JSON.parse(history.state.data); // 更改变量名以避免混淆
    console.log(data);
    resolve(data);
  });
  res
    .then((res) => {
      const updatedData = flagCounts(res); // 使用不同的变量名来接收处理后的数据
      showData.value = updatedData; // 正确地更新ref的.value属性
      console.log("showData", showData.value);
      return showData.value;
    })
    .then((showData) => {
      answerList.value = getAnswerList(showData);
      console.log("answerList", answerList.value);
    });
});

// 动画效果
const transitionName = computed(() => {
  // 根据实际路由路径来决定过渡效果
  // 这里只是一个示例，具体逻辑可以根据你的需要调整
  return router.path.startsWith("/teacher") ? "slide-left" : "slide-right";
});
</script>

<template>
  <div>
    <div class="nav-bar-container">
      <van-nav-bar
        title="教师统计列表"
        left-text="后退"
        @click-left="goback()"
      />
    </div>
    <!-- 显示统计 -->
    <div class="student_statics_card">
      <div class="student_statics_card_line title-row">
        <div>用户名</div>
        <div>数量</div>
        <div>正确</div>
        <div>半对</div>
        <div>错误</div>
      </div>
      <div v-for="(item, index) in showData" :key="index">
        <div class="student_statics_card_line">
          <div>{{ item.username }}</div>
          <div>{{ item.item_list.length }}</div>
          <div>{{ item.trueCounts }}</div>
          <div>{{ item.halfCounts }}</div>
          <div>{{ item.falseCounts }}</div>
        </div>
      </div>
    </div>
    <!-- 显示列表 -->
    <van-cell-group>
      <van-cell
        v-for="(item, index) in answerList"
        :key="index"
        class="group-cell"
      >
        <template #title>
          <!-- 英文和数字加粗加大字号 -->
          <div class="english-question">
            <strong>{{ item.序号 }}. {{ item.英文 }}</strong>
          </div>
          <!-- 显示中文，每一组词加粗上下边框 -->
          <div
            v-for="(chinese, index2) in item.中文"
            :key="index2"
            class="chinese-option"
            :class="{ 'correct-answer': item.答案.includes(chinese) }"
          >
            <van-cell>
              <template #title>
                <div class="title-container">
                  <div class="chinese-content">{{ chinese }}</div>
                  <!-- 如果是正确答案，在右侧显示绿色的钩 -->
                  <div v-if="item.答案.includes(chinese)" class="checkmark">
                    &#10003;
                  </div>
                </div>
              </template>
            </van-cell>
          </div>
          <!-- 显示不同用户的名字和答案 -->
          <van-cell
            v-for="(user, userIndex) in item.userObj"
            :key="`user-${userIndex}`"
            :class="`user-info ${user.flag}`"
          >
            <template #title>
              <div>{{ user.username }}: {{ user["用户选择"].join(", ") }}</div>
            </template>
          </van-cell>
        </template>
      </van-cell>
    </van-cell-group>
  </div>
</template>




<style>
.student_statics_card {
  margin: 10px 15px 10px 15px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); /* 轻微的阴影效果，让卡片有凸起的感觉 */
}

.student_statics_card_line {
  font-size: 12px;
  display: flex;
  justify-content: space-between;
  padding: 10px;
  background-color: #fff; /* 卡片背景色 */
  border-radius: 5px; /* 轻微的圆角效果 */
}

.title-row > div:not(:first-child) {
  text-align: right; /* 除了第一个div以外，其他标题右对齐 */
}

.student_statics_card_line > div {
  flex: 1; /* 确保所有子div平均分配空间，你可以根据需要调整flex值 */
}

/* 针对内容行第一列的特定样式 */
.student_statics_card_line:not(.title-row) > div:first-child {
  text-align: left; /* 内容行的第一列文本左对齐 */
}

/* 默认情况下，内容行的其他列右对齐（如果需要） */
.student_statics_card_line:not(.title-row) > div {
  text-align: right;
}

.english-question strong {
  font-size: 18px;
  font-weight: bold;
}

.chinese-option {
  border-top: 1px solid #eee;
  padding: 0px 0;
}

.chinese-content,
.van-cell {
  line-height: 1.4;
}

.user-info.true {
  --van-cell-text-color: green;
}

.user-info.half {
  --van-cell-text-color: orange;
}

.user-info.false {
  --van-cell-text-color: red;
}

.checkmark {
  color: green;
  font-size: 18px;
  position: absolute;
  right: 0;
  top: 20%;
}
.title-container {
  display: flex;
  align-items: center;
}
.group-cell {
  --van-cell-padding-vertical: 0;
  --van-cell-padding-horizontal: 0;
}
</style>
