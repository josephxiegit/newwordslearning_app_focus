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
import {
  showSuccessToast,
  showFailToast,
  showLoadingToast,
  showConfirmDialog,
} from "vant";
const router = useRouter();
const instance = getCurrentInstance();
const axios = instance.appContext.config.globalProperties.$ajax;

const dataResult = ref([]);
const user = ref([]);
const originalData = ref([]);
// 数据同类单词分组
const groupedData = ref([]);
const groupItems = (originalData) => {
  const itemSignatureMap = new Map();

  originalData.forEach((entry) => {
    const signature = entry.item_list
      .map((item) => {
        // 对每个 item 的中文属性进行排序和字符串化，以保证唯一性
        const chineseSorted = item.中文.sort().join(",");
        // 将英文属性和排序后的中文属性结合作为唯一签名
        return `${item.英文}-${chineseSorted}`;
      })
      .join("|"); // 使用 | 分隔每个 item 的签名，以生成整个 item_list 的唯一签名

    if (!itemSignatureMap.has(signature)) {
      itemSignatureMap.set(signature, []);
    }
    itemSignatureMap.get(signature).push(entry);
  });

  groupedData.value = Array.from(itemSignatureMap.values());
};



// 统计true占比
function getStatiscTrue(item_list) {
  let totalTrue = item_list.length;
  let numberTrue = item_list.filter((item) => item.flag === "true").length;
  return numberTrue + " / " + totalTrue;
}

// 跳转明细
const findGroupIndex = (originalIndex) => {
  const targetItemList = originalData.value[originalIndex].item_list;
  function areItemListsEqual(list1, list2) {
    if (list1.length !== list2.length) return false;
    return list1.every((item, index) => {
      const item2 = list2[index];
      if (item.英文 !== item2.英文) return false;
      if (item.中文.length !== item2.中文.length) return false;
      // 假设中文数组的顺序也重要
      return item.中文.every((chinese, i) => chinese === item2.中文[i]);
    });
  }
  return groupedData.value.findIndex((group) =>
    group.some((item) => areItemListsEqual(item.item_list, targetItemList))
  );
};
const gotoTeacherList = (index) => {
  let res = new Promise((resolve, reject) => {
    const indexInGroupedData = findGroupIndex(index);

    resolve(groupedData.value[indexInGroupedData]);
  });
  res.then((res) => {
    console.log(res);
    router.push({
      path: "/teacherList",
      state: {
        data: JSON.stringify(res),
      },
    });
  });
};
async function queryData() {
  let params = new URLSearchParams();
  params.append("method", "queryTeacherData");
  return await axios.post("words/", params).then((ret) => {
    return ret.data;
  });
}
function getListData() {
  queryData()
    .then((res) => {
      originalData.value = [];
      for (let i = 0; i < res.length; i++) {
        const jsonString = res[i].item_list.replace(/'/g, '"');
        const trueRate = getStatiscTrue(JSON.parse(jsonString));
        originalData.value.push({
          create_time: res[i].create_time,
          item_list: JSON.parse(jsonString),
          nid: res[i].nid,
          username: res[i].username,
          trueRate: trueRate,
        });
      }
      console.log("originalData.value", originalData.value);

      return originalData.value;
    })
    .then((originalData) => {
      groupItems(originalData);
      // console.log("groupedData.value", groupedData.value);
      // console.log("groupedData.length", groupedData.value.length);
    });
}

// 多选删除
const isMultiSelectMode = ref(false);
const selectedItems = ref([]);
const toggleMultiSelectMode = () => {
  isMultiSelectMode.value = !isMultiSelectMode.value;
  if (!isMultiSelectMode.value) {
    // 清除所有选择
    selectedItems.value = [];
  }
};
const selectItem = (index) => {
  // 选中删除checkbox
  const selectedIndex = selectedItems.value.indexOf(index);
  if (selectedIndex !== -1) {
    selectedItems.value.splice(selectedIndex, 1);
  } else {
    selectedItems.value.push(index);
  }
};
const finishMultiSelect = () => {
  // 点击删除
  showConfirmDialog({
    title: "删除选项",
    message: "确认删除选项？",
  }).then(() => {
    console.log(
      "选中项：",
      selectedItems.value.map((index) => originalData.value[index].nid)
    );
    if (selectedItems.value.length == 0) {
      toggleMultiSelectMode();
    } else {
      async function DeleteData() {
        let params = new URLSearchParams();

        params.append("method", "deleteTeacherData");
        params.append(
          "nid_list",
          selectedItems.value.map((index) => originalData.value[index].nid)
        );
        return await axios.post("words/", params).then((ret) => {
          return ret.data;
        });
      }
      let res = new Promise((resolve, reject) => {
        const toast = showLoadingToast({
          message: "删除中...",
          forbidClick: true,
        });
        DeleteData().then((res) => {
          if (res == "ok") {
            resolve("ok");
          }
        });
      });
      res
        .then(() => {
          reloadPage();
          return "ok";
        })
        .then(() => {
          toast.clear();
        });
      // 切换回非多选模式
      toggleMultiSelectMode();
    }
  });
};

onMounted(async () => {
  const toast = showLoadingToast({
    message: "加载中...",
    forbidClick: true,
  });
  
  let res = new Promise((resolve, reject) => {
    getListData();
    resolve("ok");
  });
  res.then(() => {
    toast.clear();
  });
  // getListData();
});

// 刷新页面
const reloadPage = () => {
  let res = new Promise((resolve, reject) => {
    getListData();
    resolve("ok");
  });
  res.then(() => {
    showSuccessToast("刷新成功");
  });
};
</script>

<template>
  <div>
      <div class="nav-bar-container">
        <van-nav-bar
          title="教师统计"
          :right-text="isMultiSelectMode ? '删除' : '刷新'"
          :left-text="isMultiSelectMode ? '取消' : '多选'"
          @click-left="toggleMultiSelectMode"
          @click-right="isMultiSelectMode ? finishMultiSelect() : reloadPage()"
        />
      </div>

      <van-cell-group v-model="selectedItems">
        <div v-for="(item, index) in originalData" :key="index">
          <van-cell
            :title="`${item.item_list[0].英文} ${item.item_list[0].中文[0]}`"
            is-link
            :value="`用户：${item.username}`"
            :label="`${item.item_list.length}词 ｜ ${item.create_time.slice(
              0,
              10
            )}｜${item.trueRate}`"
            clickable
            @click="
              isMultiSelectMode ? selectItem(index) : gotoTeacherList(index)
            "
          >
            <template #right-icon>
              <van-checkbox
                v-if="isMultiSelectMode"
                :checked="selectedItems.includes(index)"
                @click.stop="selectItem(index)"
              />
            </template>
          </van-cell>
        </div>
      </van-cell-group>
   </div>
</template>




<style>
.nav-bar-container {
  position: sticky;
  top: 0;
  z-index: 100;
}
.van-cell {
  display: flex;
  align-items: center; /* 这会使所有子元素垂直居中 */
  justify-content: space-between; /* 这是为了在左侧和右侧保持间距，可根据需要调整 */
  border-bottom: 1px solid #ebedf0;
}
.van-checkbox {
  margin-left: 16px;
}

</style>
