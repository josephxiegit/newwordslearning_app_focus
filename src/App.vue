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

// --- 进入强力锁定模式 (禁止下拉) ---
const enterKioskMode = () => {
  // 1. 原有的屏幕固定 (保留)
  if (window.cordova && window.cordova.plugins && window.cordova.plugins.screenPinning) {
    window.cordova.plugins.screenPinning.enterPinning();
  }

  // 2. 【新增】强制开启沉浸式黏性模式 (Immersive Sticky)
  if (window.AndroidFullScreen) {
    // 这种模式下，系统栏是隐藏的。
    // 用户必须在边缘用力滑才能唤出，而且唤出的是半透明层，很难点击内容，几秒后自动消失。
    window.AndroidFullScreen.immersiveMode(
      () => console.log('沉浸模式已激活'),
      (err) => console.error('沉浸模式失败', err)
    );
  }
};

// --- 退出模式 (先解锁，再跳转) ---
const exitKioskMode = () => {
  showToast('正在解锁系统...');

  // A. 先尝试解除屏幕固定
  if (window.cordova && window.cordova.plugins && window.cordova.plugins.screenPinning) {
    window.cordova.plugins.screenPinning.exitPinning(
      () => {
        // 解锁成功后，再跳转系统设置
        console.log('屏幕固定已解除');
        jumpToSystemSettings();
      },
      (err) => {
        // 即使解锁报错，也尝试强行跳转
        console.error('解除固定失败', err);
        jumpToSystemSettings();
      }
    );
  } else {
    // 如果没有插件，直接跳转
    jumpToSystemSettings();
  }
};

// --- 抽离出来的跳转逻辑 ---
const openSystemSettings = () => {
  showToast('正在打开系统设置...');
  // 切换回小米桌面的命令
  if (window.cordova && window.cordova.plugins && window.cordova.plugins.intentShim) {
      window.cordova.plugins.intentShim.startActivity(
          { action: "android.settings.HOME_SETTINGS" },
          () => {},
          () => {
               // 备选方案
               window.cordova.plugins.intentShim.startActivity({ action: "android.settings.SETTINGS" });
          }
      );
  } else {
      // 如果没有 intent 插件，尝试用 ADB 之前用的 set-home 指令是没法在 JS 里运行的
      // 只能提示用户
      alert("请手动去设置里切换桌面");
  }
};

const jumpToSystemSettings = () => {
  // 这里使用你之前安装的 intent 插件打开设置
  if (window.plugins && window.plugins.intentShim) {
      window.plugins.intentShim.startActivity(
          { action: "android.settings.HOME_SETTINGS" }, // 跳转到默认桌面设置
          () => {},
          () => {
              // 备选：如果跳不到桌面设置，就跳普通设置
              window.plugins.intentShim.startActivity({ action: "android.settings.SETTINGS" });
          }
      );
  } else {
      alert("请手动去设置里切换桌面");
  }
};

// 进入强力锁定 (禁止下拉)
const enterScreenPinning = () => {
  if (window.cordova && window.cordova.plugins && window.cordova.plugins.screenPinning) {
    window.cordova.plugins.screenPinning.enterPinning(
      () => console.log('屏幕固定成功：下拉菜单已禁用'),
      (err) => console.error('屏幕固定失败 (可能是首次运行需授权)', err)
    );
  }
};

onMounted(() => {
  document.addEventListener('deviceready', () => {
    // 1. 拦截按键
    document.addEventListener('backbutton', onBackKeyDown, false);
    
    // 2. 【关键】App 启动就立刻开启屏幕固定（禁止下拉）
    enterScreenPinning();
    
    // 为了防止 App 从后台切回来时状态栏又出来了，加一个监听
    document.addEventListener('resume', enterKioskMode, false);
    
  }, false);
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
    document.removeEventListener('resume', enterKioskMode);
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

<!-- <template>
  <div class="app-container">
    <router-view v-slot="{ Component }" :key="$route.fullPath">
      <transition :name="transitionName">
        <keep-alive>
          <component :is="Component" class="transitionBody" />
        </keep-alive>
      </transition>
    </router-view>
  </div>
</template>

<script setup>
import { onMounted, ref, computed, onUnmounted, getCurrentInstance } from "vue";
import { useRoute, useRouter } from "vue-router";
import { showToast, showDialog } from 'vant'; 
import 'vant/es/toast/style';
import 'vant/es/dialog/style';

const instance = getCurrentInstance();
const axios = instance.appContext.config.globalProperties.$ajax;
const route = useRoute();
const router = useRouter();

// 路由过渡动画
const transitionName = computed(() => {
  return route.path.startsWith('/teacher') ? 'slide-left' : 'slide-right';
});

// ==========================================
// 1. 三指点击重启逻辑 (新增功能)
//    当页面卡死时，三指同时按屏幕可触发软重启
// ==========================================
const isRestartDialogShowing = ref(false);

const handleGlobalTouch = (e) => {
  // 检测屏幕上是否同时按下了 3 根手指
  if (e.touches.length === 3) {
    showRestartConfirm();
  }
};

const showRestartConfirm = () => {
  if (isRestartDialogShowing.value) return;
  isRestartDialogShowing.value = true;

  showDialog({
    title: '系统维护',
    message: '检测到三指操作，是否重新启动应用？\n(用于解决页面卡死问题)',
    showCancelButton: true,
    confirmButtonText: '重启',
    zIndex: 99999
  }).then(() => {
    performRestart();
    isRestartDialogShowing.value = false;
  }).catch(() => {
    isRestartDialogShowing.value = false;
  });
};

const performRestart = () => {
  showToast('正在重启...');
  setTimeout(() => {
    if (navigator.app && navigator.app.exitApp) {
      // Kiosk模式下，退出App会被系统立即重启，实现“软重启”
      navigator.app.exitApp();
    } else {
      window.location.reload();
    }
  }, 500);
};

// ==========================================
// 2. 核心锁定逻辑 (合并了你之前的两个函数)
//    禁止下拉菜单 + 禁止多任务上滑
// ==========================================
const enterKioskMode = () => {
  // 1. Screen Pinning (物理防下拉/防多任务)
  if (window.cordova && window.cordova.plugins && window.cordova.plugins.screenPinning) {
    window.cordova.plugins.screenPinning.enterPinning(
      () => console.log('屏幕固定成功'),
      (err) => console.error('屏幕固定失败', err)
    );
  }

  // 2. Immersive Sticky (隐藏状态栏辅助)
  if (window.AndroidFullScreen) {
    window.AndroidFullScreen.immersiveMode(
      () => console.log('沉浸模式已激活'),
      (err) => console.error('沉浸模式失败', err)
    );
  }
};

// ==========================================
// 3. 极光推送逻辑 (保留原逻辑)
// ==========================================
const initJPush = () => {
  if (!window.JPush) return;

  try {
    window.JPush.init();
    window.JPush.setDebugMode(false); // 发布模式建议关闭Debug

    window.JPush.getRegistrationID((rId) => {
      console.log('【JPush】设备注册ID:', rId);
      // TODO: 调用API保存 rId
    });

    document.addEventListener('jpush.openNotification', (event) => {
      let extras = event.extras || {}; 
      if (extras.targetPath) {
         router.push(extras.targetPath);
      }
    }, false);

    document.addEventListener('jpush.receiveNotification', (event) => {
      console.log('【JPush】前台收到消息:', event);
    }, false);

  } catch (error) {
    console.error('【JPush】初始化失败:', error);
  }
};

// ==========================================
// 4. 全局事件拦截 (保留原逻辑)
// ==========================================
const preventAll = (e) => {
  const target = e.target;
  const tagName = target.tagName;
  
  // 允许输入框操作
  if (tagName === 'INPUT' || tagName === 'TEXTAREA' || target.contentEditable === 'true') {
    return true; 
  }
  
  e.preventDefault();
  e.stopPropagation();
  return false;
}

const onBackKeyDown = (e) => {
  e.preventDefault();
  // 保持静默，不提示退出
};

// ==========================================
// 生命周期挂载
// ==========================================
onMounted(() => {
  document.addEventListener('deviceready', () => {
    // 1. 初始化极光
    initJPush();
    
    // 2. 拦截物理返回键
    document.addEventListener('backbutton', onBackKeyDown, false);
    
    // 3. 启动锁定模式
    enterKioskMode();
    
    // 4. 从后台切回时再次锁定 (双保险)
    document.addEventListener('resume', enterKioskMode, false);
    
  }, false);

  // 监听三指点击 (用于重启)
  document.addEventListener('touchstart', handleGlobalTouch, { passive: true });

  // 网页端行为拦截
  document.addEventListener('contextmenu', preventAll, { passive: false, capture: true });
  document.addEventListener('dragstart', preventAll, { passive: false, capture: true });
  document.addEventListener('selectstart', preventAll, { passive: false, capture: true });
  
  window._globalPreventAll = preventAll;
  
  console.log('App初始化完成：列表滚动已修复，三指重启已启用');
})

onUnmounted(() => {
  // 清理所有监听
  document.removeEventListener('touchstart', handleGlobalTouch);
  
  if (window._globalPreventAll) {
    document.removeEventListener('contextmenu', window._globalPreventAll, { capture: true });
    document.removeEventListener('dragstart', window._globalPreventAll, { capture: true });
    document.removeEventListener('selectstart', window._globalPreventAll, { capture: true });
    document.removeEventListener('backbutton', onBackKeyDown);
    document.removeEventListener('resume', enterKioskMode);
    delete window._globalPreventAll;
  }
})
</script>

<style>
/* --- 1. 容器样式 --- */
.app-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden; /* 锁住外层，防止整个页面被拖动 */
  background-color: #f7f8fa; /* 给个背景色防止白屏 */
}

/* --- 2. 核心修复：内容滚动区域 --- */
/* 这里是页面真正的内容容器 */
.transitionBody {
  position: absolute;
  width: 100%;
  height: 100%;
  
  /* 【关键修复】强制允许垂直滚动 */
  overflow-y: auto !important;
  -webkit-overflow-scrolling: touch; /* iOS 平滑滚动 */
  
  /* 【关键修复】告诉浏览器这个区域允许单指垂直操作 */
  touch-action: pan-y !important;
  
  /* 确保位置正确 */
  top: 0;
  left: 0;
  z-index: 10; /* 保证内容在最上层 */
  
  /* 底部安全距离，防止滑到底部被挡住 */
  padding-bottom: 20px; 
  box-sizing: border-box;
}

/* --- 3. 全局禁用样式 (防误触基础) --- */
* {
  /* 禁止选中文字 */
  -webkit-user-select: none !important;
  -moz-user-select: none !important;
  -ms-user-select: none !important;
  user-select: none !important;
  
  /* 禁止长按弹出菜单 (复制/粘贴/搜索) */
  -webkit-touch-callout: none !important;
  
  /* 去除点击高亮 */
  -webkit-tap-highlight-color: transparent !important;
}

/* 锁定 html 和 body，禁止橡皮筋效果 */
html, 
body, 
#app {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden !important; /* 核心：禁止 body 滚动 */
  position: fixed; /* 锁死 body */
}

/* --- 4. 例外：允许输入框操作 --- */
input, 
textarea, 
[contenteditable="true"],
.selectable {
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  -ms-user-select: text !important;
  user-select: text !important;
  -webkit-touch-callout: default !important;
  /* 输入框允许默认手势 */
  touch-action: auto !important; 
}
</style>
 -->

