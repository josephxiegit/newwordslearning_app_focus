<script setup>
import { watch, onMounted, ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getCurrentInstance } from "vue";

const instance = getCurrentInstance();
const axios = instance.appContext.config.globalProperties.$ajax;
const route = useRoute();
const router = useRouter();
const transitionName = computed(() => {
  // 根据实际路由路径来决定过渡效果
  // console.log(route.path.startsWith('/teacher') ? 'slide-left' : 'slide-right')
  return route.path.startsWith('/teacher') ? 'slide-left' : 'slide-right';
});
</script>

<template>
  <transition :name="transitionName">
    <keep-alive>
      <router-view v-slot="{ Component }">
        <component :is="Component" class="transitionBody" />
      </router-view>
    </keep-alive>
  </transition>
</template>




<style>
/* .transitionBody {
  position: absolute;
  width: 100%;
  transition: all 0.4s ease;
}

.slide-left-enter {
  opacity: 0;
  -webkit-transform: translate(100%, 0);
  transform: translate(100%, 0);
}
.slide-right-leave-to,
.slide-right-leave-active {
  display: none;
}
.slide-left-leave-active {
  opacity: 0;
  -webkit-transform: translate(-100%, 0);
  transform: translate(-100%, 0);
}

.slide-right-enter-from,
.slide-left-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
.slide-left-enter-from,
.slide-right-leave-to {
  opacity: 0;
  transform: translateX(-100%);
}
.slide-right-enter-active,
.slide-right-leave-active,
.slide-left-enter-active,
.slide-left-leave-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
  opacity: 1;
  transform: translateX(0);
} */
</style>
