<script setup>
  import { watch, onMounted, ref, getCurrentInstance, onBeforeUpdate, computed } from 'vue';

  const instance = getCurrentInstance();
  const axios = instance.appContext.config.globalProperties.$ajax;
  const title = ref('');

  const synonymsOptions = ref([]);
  const synonymsSelected = ref([]);
  const answers = ref([]);
  const checkboxRefs = ref([]);
  const showGetWords = ref(false);


  // 提交按钮
  const showDialogSubmit = ref(false);
  const userName = ref('');
  const showUserEmpty = ref(false);

  const submitSelection = () => {
    // 右上角提交
      showDialogSubmit.value = true;
      
  };
  const clickSubmitUser = (action, done) => {
    // 输入用户名后，确认提交
    if (action === 'confirm') {
      if (userName.value.trim()) {
        // 如果用户名有效，这里可以执行提交逻辑
        console.log('提交用户名：', userName.value);
        console.log('用户选择的内容:', synonymsSelected.value);
        
        console.log("最终结果：", result);

        
      } else {
        // 如果用户名无效，可以提示用户且不关闭对话框
        showUserEmpty.value = true;
      }
    } else {
      // 如果用户点击取消或遮罩层，直接关闭对话框
      showDialogSubmit.value = false;
    }
  }

  const result = computed(() => {
    return answers.value.map(answer => {
        const chineseItems = answer.中文.split('；');
        const selectedIndexes = synonymsSelected.value
          .filter(sel => parseInt(sel.split('-')[0]) === answer.序号)
          .map(sel => parseInt(sel.split('-')[1]) - 1);

        let flag = 'false';
        const userSelectedItems = [];

        if (selectedIndexes.length > 0) {
          selectedIndexes.forEach(index => {
            if (chineseItems[index] !== undefined) {
              userSelectedItems.push(chineseItems[index]);
              flag = 'half'; // 默认为半选中状态，如果后续发现全选中，则会更新此状态
            }
          });

          if (userSelectedItems.length === chineseItems.length) {
            flag = 'true'; // 所有选项都被选中
          }
        }

        // 构建并返回更新后的对象
        return {
          ...answer,
          flag,
          "userselect": userSelectedItems.join('；') // 用户选择的中文选项
        };
    });  
  });




  // 点击选项
  const toggleCheckChinese = (index, index2) => {
    const checkboxRef = checkboxRefs.value[`${index}-${index2}`];
    if (checkboxRef) {
      checkboxRef.toggle(); // 直接调用复选框的 toggle 方法
    }
  };

  onBeforeUpdate(() => {
    checkboxRefs.value = [];
  });


  onMounted(async () => {

      async function queryLogout(){
        let params = new URLSearchParams();
        params.append('method', 'queryData');
        return await axios.post('words/', params).then( (ret) => {
          console.log(ret.data);
          title.value = ret.data.title[0]["题目"];
          synonymsOptions.value = ret.data.synonyms;
          answers.value = ret.data.answers;
          showGetWords.value = false;
          return ret.data;
        })
      }
      showGetWords.value = true;
      queryLogout();
      
  });

</script>

<template>
    <div>

    
    <van-nav-bar
        :title="title"
        right-text="提交"
        @click-right="submitSelection()"
      />
      
      <!-- 加载数据遮罩层 -->
      <van-overlay :show="showGetWords">
        <div class="wrapper" @click.stop>
          <van-loading size="24px" v-show="showGetWords" color="#1989fa">加载中...</van-loading>
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

      <!-- 显示列表单词 -->
      <van-checkbox-group v-model="synonymsSelected">
      <van-cell-group>
        <div 
          v-for="(item, index) in synonymsOptions" 
          :key="index"
          class="custom-cell-group"
        >
          <!-- 显示英文单词和序号，加粗显示 -->
          <van-cell 
            clickable 
            class="bold-title border-cell"
          >
            <template #title>
              <div>{{ item.序号 + '. ' + item.英文 }}</div>
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
                <div style="text-align: left;">{{ chinese }}</div>
              </template>
              <template #right-icon>
                <van-checkbox
                  :name="`${index + 1}-${index2 + 1}`"
                  :ref="el => checkboxRefs[`${index}-${index2}`] = el"
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
</style>
