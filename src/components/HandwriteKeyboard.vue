<script setup>
import { computed, ref, watch } from "vue";

const props = defineProps({
  modelValue: {
    type: String,
    default: "",
  },
  placeholder: {
    type: String,
    default: "请拼写对应的英文",
  },
  maxLength: {
    type: Number,
    default: 40,
  },
  initialLayout: {
    type: String,
    default: "full",
  },
  active: {
    type: Boolean,
    default: true,
  },
  bottomOffset: {
    type: Number,
    default: 128,
  },
  popupLeftOffset: {
    type: Number,
    default: 0,
  },
  popupRightOffset: {
    type: Number,
    default: 0,
  },
  reserveSpace: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(["update:modelValue"]);

const layout = ref(props.initialLayout === "nine" ? "nine" : "full");
const cursorIndex = ref((props.modelValue || "").length);
const selectedIndex = ref(null);
const activeNineKey = ref(null);
const keyboardOpen = ref(true);

const fullRows = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

const nineKeys = [
  { digit: "1", letters: [] },
  { digit: "2", letters: ["a", "b", "c"] },
  { digit: "3", letters: ["d", "e", "f"] },
  { digit: "4", letters: ["g", "h", "i"] },
  { digit: "5", letters: ["j", "k", "l"] },
  { digit: "6", letters: ["m", "n", "o"] },
  { digit: "7", letters: ["p", "q", "r", "s"] },
  { digit: "8", letters: ["t", "u", "v"] },
  { digit: "9", letters: ["w", "x", "y", "z"] },
];

const displayValue = computed(() => props.modelValue || "");
const valueChars = computed(() => displayValue.value.split(""));
const activeNineLetters = computed(() => activeNineKey.value?.letters || []);
const showKeyboard = computed(() => props.active && keyboardOpen.value);
const keyboardStyle = computed(() => {
  return {
    "--keyboard-bottom-offset": `${Math.max(0, props.bottomOffset)}px`,
    "--keyboard-left-offset": `${Math.max(0, props.popupLeftOffset)}px`,
    "--keyboard-right-offset": `${Math.max(0, props.popupRightOffset)}px`,
  };
});

watch(
  displayValue,
  (value) => {
    if (cursorIndex.value > value.length) {
      cursorIndex.value = value.length;
    }
    if (selectedIndex.value !== null && selectedIndex.value >= value.length) {
      selectedIndex.value = null;
    }
  },
  { immediate: true }
);

watch(
  () => props.active,
  (active) => {
    if (active) {
      keyboardOpen.value = true;
    } else {
      activeNineKey.value = null;
      selectedIndex.value = null;
    }
  }
);

const clampCursor = (index) => {
  return Math.max(0, Math.min(index, displayValue.value.length));
};

const sanitizeLetters = (value) => {
  return String(value)
    .replace(/[^a-zA-Z ]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
};

const emitValue = (value) => {
  emit("update:modelValue", value);
};

const setLayout = (nextLayout) => {
  layout.value = nextLayout;
  activeNineKey.value = null;
};

const setCursor = (index) => {
  keyboardOpen.value = true;
  cursorIndex.value = clampCursor(index);
  selectedIndex.value = null;
};

const selectChar = (index) => {
  keyboardOpen.value = true;
  selectedIndex.value = index;
  cursorIndex.value = index + 1;
};

const insertLetters = (value) => {
  const letters = sanitizeLetters(value);
  if (!letters) {
    return;
  }

  const current = displayValue.value;
  if (selectedIndex.value !== null) {
    const index = Math.max(0, Math.min(selectedIndex.value, current.length - 1));
    const allowedLength = props.maxLength - current.length + 1;
    const text = letters.slice(0, Math.max(0, allowedLength));
    if (!text) {
      return;
    }

    emitValue(current.slice(0, index) + text + current.slice(index + 1));
    cursorIndex.value = index + text.length;
    selectedIndex.value = null;
    return;
  }

  const allowedLength = props.maxLength - current.length;
  const text = letters.slice(0, Math.max(0, allowedLength));
  if (!text) {
    return;
  }

  const index = clampCursor(cursorIndex.value);
  emitValue(current.slice(0, index) + text + current.slice(index));
  cursorIndex.value = index + text.length;
};

const deleteSelectedOrBefore = () => {
  const current = displayValue.value;
  if (selectedIndex.value !== null) {
    const index = Math.max(0, Math.min(selectedIndex.value, current.length - 1));
    emitValue(current.slice(0, index) + current.slice(index + 1));
    cursorIndex.value = index;
    selectedIndex.value = null;
    return;
  }

  const index = clampCursor(cursorIndex.value);
  if (index === 0) {
    return;
  }

  emitValue(current.slice(0, index - 1) + current.slice(index));
  cursorIndex.value = index - 1;
};

const clearValue = () => {
  emitValue("");
  cursorIndex.value = 0;
  selectedIndex.value = null;
};

const closeKeyboard = () => {
  keyboardOpen.value = false;
  selectedIndex.value = null;
  activeNineKey.value = null;
};

const moveCursor = (step) => {
  setCursor(cursorIndex.value + step);
};

const selectNineKey = (key) => {
  if (!key.letters.length) {
    return;
  }

  activeNineKey.value =
    activeNineKey.value?.digit === key.digit ? null : key;
};
</script>

<template>
  <div class="handwrite-keyboard" @click.stop>
    <div class="handwrite-display" role="textbox" aria-readonly="true">
      <div class="display-label">拼写结果</div>
      <div class="display-content" @click="setCursor(displayValue.length)">
        <span v-if="!displayValue" class="placeholder">
          {{ placeholder }}
        </span>
        <template v-else>
          <span class="word-editor">
            <button
              type="button"
              class="cursor-hit"
              :class="{ active: cursorIndex === 0 && selectedIndex === null }"
              @click.stop="setCursor(0)"
            />
            <template
              v-for="(letter, index) in valueChars"
              :key="`${letter}-${index}`"
            >
              <button
                type="button"
                class="letter-token"
                :class="{ selected: selectedIndex === index }"
                @click.stop="selectChar(index)"
              >
                {{ letter }}
              </button>
              <button
                type="button"
                class="cursor-hit"
                :class="{
                  active: cursorIndex === index + 1 && selectedIndex === null,
                }"
                @click.stop="setCursor(index + 1)"
              />
            </template>
          </span>
        </template>
      </div>
    </div>

    <div
      v-if="showKeyboard && reserveSpace"
      class="keyboard-spacer"
      :style="keyboardStyle"
    />

    <Teleport to="body">
      <div
        v-if="showKeyboard"
        class="keyboard-popup"
        :style="keyboardStyle"
        @click.stop
      >
        <div class="keyboard-shell">
          <div class="layout-tabs" role="tablist">
            <button
              type="button"
              class="layout-tab"
              :class="{ active: layout === 'full' }"
              @click="setLayout('full')"
            >
              全键盘
            </button>
            <button
              type="button"
              class="layout-tab"
              :class="{ active: layout === 'nine' }"
              @click="setLayout('nine')"
            >
              9键
            </button>
          </div>

          <div v-if="layout === 'full'" class="full-keyboard">
            <div
              v-for="row in fullRows"
              :key="row.join('')"
              class="keyboard-row"
              :style="{ '--key-count': row.length }"
            >
              <button
                v-for="letter in row"
                :key="letter"
                type="button"
                class="key-button"
                @click="insertLetters(letter)"
              >
                {{ letter }}
              </button>
            </div>
            <div class="space-row">
              <button
                type="button"
                class="key-button space-button"
                @click="insertLetters(' ')"
              >
                空格
              </button>
            </div>
          </div>

          <div v-else class="nine-keyboard">
            <div v-if="activeNineLetters.length" class="candidate-row">
              <button
                v-for="letter in activeNineLetters"
                :key="letter"
                type="button"
                class="candidate-button"
                @click="insertLetters(letter)"
              >
                {{ letter }}
              </button>
            </div>
            <div class="nine-grid">
              <button
                v-for="key in nineKeys"
                :key="key.digit"
                type="button"
                class="nine-button"
                :class="{ active: activeNineKey?.digit === key.digit }"
                :disabled="!key.letters.length"
                @click="selectNineKey(key)"
              >
                <span class="nine-digit">{{ key.digit }}</span>
                <span class="nine-letters">{{ key.letters.join("") }}</span>
              </button>
            </div>
          </div>

          <div class="keyboard-controls">
            <button type="button" class="control-button" @click="moveCursor(-1)">
              左移
            </button>
            <button type="button" class="control-button" @click="moveCursor(1)">
              右移
            </button>
            <button type="button" class="control-button" @click="insertLetters(' ')">
              空格
            </button>
            <button
              type="button"
              class="control-button"
              @click="deleteSelectedOrBefore"
            >
              退格
            </button>
            <button type="button" class="control-button danger" @click="clearValue">
              清空
            </button>
            <button type="button" class="control-button done" @click="closeKeyboard">
              完成
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.handwrite-keyboard {
  --keyboard-panel-height: 336px;
  --keyboard-bottom-offset: 128px;
  --keyboard-left-offset: 0px;
  --keyboard-right-offset: 0px;
  width: 100%;
  color: #323233;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
}

.handwrite-keyboard button {
  border: 0;
  font: inherit;
  -webkit-tap-highlight-color: transparent;
}

.handwrite-display {
  border-bottom: 1px solid #ccc;
  padding-bottom: 8px;
  background: #fff;
}

.display-label {
  margin-bottom: 5px;
  font-size: 12px;
  color: #969799;
}

.display-content {
  min-height: 44px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  padding: 4px 0;
}

.placeholder {
  color: #c8c9cc;
  font-size: 14px;
}

.word-editor {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  max-width: 100%;
  min-height: 36px;
  padding: 2px 0;
  border-radius: 6px;
  background: #f7fbff;
}

.letter-token {
  min-width: 0;
  height: 34px;
  padding: 0 1px;
  border-radius: 3px;
  background: transparent;
  color: #1a89fa;
  font-size: 24px;
  font-weight: 700;
  line-height: 34px;
}

.letter-token.selected {
  background: #ff976a;
  color: #fff;
}

.cursor-hit {
  width: 3px;
  height: 34px;
  background: transparent;
  padding: 0;
  position: relative;
}

.cursor-hit.active::after {
  content: "";
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 1px;
  width: 2px;
  border-radius: 1px;
  background: #1989fa;
}

.keyboard-spacer {
  height: calc(
    var(--keyboard-panel-height) + var(--keyboard-bottom-offset) +
      env(safe-area-inset-bottom)
  );
}

.keyboard-popup {
  position: fixed;
  right: var(--keyboard-right-offset);
  bottom: calc(var(--keyboard-bottom-offset) + env(safe-area-inset-bottom));
  left: var(--keyboard-left-offset);
  z-index: 99;
  max-height: calc(
    100dvh - var(--keyboard-bottom-offset) - env(safe-area-inset-bottom) - 12px
  );
  overflow-y: auto;
  padding: 8px 0 10px;
  border-radius: 8px 8px 0 0;
  background: #f7f8fa;
  box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.14);
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
}

.keyboard-shell {
  width: min(100%, 640px);
  margin: 0 auto;
  padding: 0 14px;
  box-sizing: border-box;
}

.layout-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 8px;
}

.layout-tab {
  height: 34px;
  border-radius: 6px;
  background: #fff;
  color: #646566;
  font-size: 14px;
  box-shadow: inset 0 0 0 1px #ebedf0;
}

.layout-tab.active {
  background: #1989fa;
  color: #fff;
  font-weight: 700;
}

.keyboard-row {
  display: grid;
  grid-template-columns: repeat(var(--key-count), minmax(0, 1fr));
  gap: 6px;
  margin-top: 7px;
}

.space-row {
  display: grid;
  grid-template-columns: 1fr;
  margin: 7px 52px 0;
}

.key-button,
.candidate-button,
.nine-button,
.control-button {
  min-height: 42px;
  border-radius: 6px;
  background: #fff;
  box-shadow: inset 0 0 0 1px #ebedf0;
}

.space-button {
  min-height: 38px;
  color: #646566;
}

.key-button,
.candidate-button {
  color: #323233;
  font-size: 17px;
  font-weight: 700;
}

.key-button:active,
.candidate-button:active,
.nine-button:active,
.control-button:active {
  background: #e6f2ff;
}

.candidate-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
  margin-bottom: 8px;
}

.nine-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px 8px;
}

.nine-button {
  min-height: 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  color: #323233;
}

.nine-button.active {
  background: #e6f2ff;
  box-shadow: inset 0 0 0 1px #1989fa;
}

.nine-button:disabled {
  color: #c8c9cc;
  background: #f7f8fa;
}

.nine-digit {
  font-size: 14px;
  font-weight: 700;
}

.nine-letters {
  min-height: 14px;
  font-size: 12px;
  letter-spacing: 0;
}

.keyboard-controls {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 6px;
  margin-top: 9px;
}

.control-button {
  color: #646566;
  font-size: 14px;
}

.control-button.danger {
  color: #ee0a24;
}

.control-button.done {
  background: #1989fa;
  color: #fff;
  font-weight: 700;
}

@media (max-height: 680px) {
  .keyboard-popup {
    padding-top: 6px;
    padding-bottom: 8px;
  }

  .layout-tabs {
    margin-bottom: 6px;
  }

  .layout-tab {
    height: 30px;
  }

  .keyboard-row {
    gap: 4px;
    margin-top: 5px;
  }

  .space-row {
    margin-top: 5px;
  }

  .key-button,
  .candidate-button,
  .control-button {
    min-height: 36px;
  }

  .nine-button {
    min-height: 42px;
  }

  .keyboard-controls {
    margin-top: 6px;
  }
}
</style>
