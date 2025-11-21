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

onMounted(() => {
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