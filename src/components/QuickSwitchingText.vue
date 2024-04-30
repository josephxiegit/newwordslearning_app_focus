<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  finalText: {
    type: String,
    default: ""
  },
  textList: {
    type: Array,
    default: () => []
  },
  switchingInterval: {
    type: Number,
    default: 60
  },
  duration: {
    type: Number,
    default: 1500
  }
});

let showIndex = props.textList.length > 0 ? 0 : -1;
let frameId = 0;
let startSwitchingTime = 0;
let prevShowTime = 0;
const showText = ref(showIndex === -1 ? props.finalText : props.textList[showIndex] || "");

const loop = () => {
  const now = new Date().getTime();
  if (now - startSwitchingTime >= props.duration) {
    showText.value = props.finalText;
    showIndex = -1;
    prevShowTime = now;
  } else if (now - prevShowTime >= props.switchingInterval) {
    let nextIndex = showIndex === -1 ? 0 : showIndex + 1;
    if (nextIndex >= props.textList.length) {
      nextIndex = 0;
    }
    showText.value = props.textList[nextIndex];
    showIndex = nextIndex;
    prevShowTime = now;
  }
  frameId = requestAnimationFrame(loop);
};

const start = () => {
  const now = new Date().getTime();
  startSwitchingTime = now;
  prevShowTime = now;
  frameId = requestAnimationFrame(loop);
};

const restart = () => {
  if (frameId) cancelAnimationFrame(frameId);
  showIndex = 0;
  showText.value = props.textList[0];
  start();
};
defineExpose({ restart });

onMounted(() => {
  start();
});

onUnmounted(() => {
  if (frameId) cancelAnimationFrame(frameId);
});
</script>

<template>
    <span>
      <template v-if="!!showText">
        <span v-for="(item, index) in showText" :key="index">{{ item }}</span>
      </template>
    </span>
  </template>