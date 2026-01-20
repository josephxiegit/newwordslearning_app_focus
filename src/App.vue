<script setup>
import { watch, onMounted, ref, computed, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getCurrentInstance } from "vue";

const instance = getCurrentInstance();
const axios = instance.appContext.config.globalProperties.$ajax;
const route = useRoute();
const router = useRouter();
const transitionName = computed(() => {
  return route.path.startsWith('/teacher') ? 'slide-left' : 'slide-right';
});

// 统一的阻止函数
const preventAll = (e) => {
  // 检查是否是输入框，如果是则不阻止
  const target = e.target;
  const tagName = target.tagName;
  
  if (tagName === 'INPUT' || tagName === 'TEXTAREA' || target.contentEditable === 'true') {
    return true; // 允许输入框的默认行为
  }
  
  e.preventDefault();
  e.stopPropagation();
  return false;
}

// 极光推送
const initJPush = () => {
  // 必须确保 window.JPush 存在
  if (!window.JPush) return;

  try {
    // 1. 初始化 SDK
    window.JPush.init();
    window.JPush.setDebugMode(true); // 测试阶段开启 Debug，发布时关闭

    // 2. 获取 RegistrationID (非常重要)
    // 这里的 rId 是极光给这台手机生成的唯一ID
    window.JPush.getRegistrationID((rId) => {
      console.log('【JPush】设备注册ID:', rId);
      // TODO: 这里务必写代码，调用你的后端API，把 rId 和当前登录的用户ID传给后端保存
      // api.updateDeviceToken({ userId: '当前用户', pushId: rId });
    });

    // 3. 监听：用户点击了通知栏消息
    document.addEventListener('jpush.openNotification', (event) => {
      console.log('【JPush】用户点击了通知:', event);
      
      // 解析后端传来的自定义参数 (假设后端传了 { target: 'message_page' })
      // 注意：不同平台的 extras 结构可能略有不同，建议打印 event 看看结构
      let extras = event.extras || {}; 
      
      // 示例：跳转到消息页面
      if (extras.targetPath) {
         router.push(extras.targetPath);
      }
    }, false);

    // 4. 监听：应用在前台时收到消息 (可选，前台时不弹窗，只显示小红点等)
    document.addEventListener('jpush.receiveNotification', (event) => {
      console.log('【JPush】前台收到消息:', event);
    }, false);

  } catch (error) {
    console.error('【JPush】初始化失败:', error);
  }
};

// 专注模式
const onBackKeyDown = (e) => {
  // 核心：阻止默认的退出行为
  e.preventDefault();
  showToast('当前是专注模式，无法退出'); // 或者这里什么都不写，静默失败
};

onMounted(() => {
  document.addEventListener('deviceready', initJPush, false);
  document.addEventListener('deviceready', () => {
    document.addEventListener('backbutton', onBackKeyDown, false);
  }, false);
  // 使用 capture: true 确保事件在捕获阶段就被拦截
  document.addEventListener('contextmenu', preventAll, { passive: false, capture: true });
  document.addEventListener('dragstart', preventAll, { passive: false, capture: true });
  document.addEventListener('selectstart', preventAll, { passive: false, capture: true });
  
  // 存储引用以便清理
  window._globalPreventAll = preventAll;
  
  console.log('全局禁用长按和选择已启用');
})

onUnmounted(() => {
  if (window._globalPreventAll) {
    document.removeEventListener('contextmenu', window._globalPreventAll, { capture: true });
    document.removeEventListener('dragstart', window._globalPreventAll, { capture: true });
    document.removeEventListener('selectstart', window._globalPreventAll, { capture: true });
    document.removeEventListener('backbutton', onBackKeyDown);
    delete window._globalPreventAll;
  }
})
</script>

<template>
  <div>
    <router-view v-slot="{ Component }" :key="$route.fullPath">
      <transition :name="transitionName">
        <keep-alive>
          <component :is="Component" class="transitionBody" />
        </keep-alive>
      </transition>
    </router-view>
  </div>
</template>

<style>
/* 全局禁用文字选择和长按菜单 - 使用 !important 确保优先级 */
* {
  -webkit-user-select: none !important;
  -moz-user-select: none !important;
  -ms-user-select: none !important;
  user-select: none !important;
  -webkit-touch-callout: none !important;
  -webkit-tap-highlight-color: transparent !important;
}

html, 
body, 
#app {
  -webkit-user-select: none !important;
  -moz-user-select: none !important;
  -ms-user-select: none !important;
  user-select: none !important;
  -webkit-touch-callout: none !important;
}

/* 允许输入框选择文字 - 必须用 !important 覆盖全局设置 */
input, 
textarea, 
[contenteditable="true"],
.selectable {
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  -ms-user-select: text !important;
  user-select: text !important;
  -webkit-touch-callout: default !important;
}
</style>