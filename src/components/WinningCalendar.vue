<template>
  <transition name="calendar-fade">
    <div
      v-if="visible"
      class="custom-calendar-overlay"
      @click="handleOverlayClick"
    >
      <div class="custom-calendar" @click.stop>
        <!-- Header -->
        <div class="calendar-header">
          <div class="title-wrapper">
            <div class="title-row">
              <span class="calendar-title">
                {{ username }} {{ title
                }}{{ winningStreak > 0 ? `${winningStreak}天` : "" }}
              </span>
              <div class="header-actions">
                <button class="view-toggle-btn" @click="toggleView">
                  {{ showChart ? "📅" : "📊" }}
                </button>
                <span class="close-btn" @click="handleClose">✕</span>
              </div>
            </div>
            <span
              v-if="subtitle"
              class="calendar-subtitle"
              v-html="subtitle"
            ></span>
          </div>
        </div>

        <!-- Body -->
        <div ref="calendarBody" class="calendar-body">
          <!-- 日历视图 -->
          <div v-if="!showChart">
            <div
              v-for="monthData in calendarMonths"
              :key="monthData.title"
              class="month-section"
            >
              <div class="month-title">{{ monthData.title }}</div>

              <!-- 星期标题 -->
              <div class="weekday-header">
                <div class="weekday-cell">日</div>
                <div class="weekday-cell">一</div>
                <div class="weekday-cell">二</div>
                <div class="weekday-cell">三</div>
                <div class="weekday-cell">四</div>
                <div class="weekday-cell">五</div>
                <div class="weekday-cell">六</div>
              </div>

              <!-- 日期格子 -->
              <div class="days-grid">
                <div
                  v-for="(dayData, index) in monthData.days"
                  :key="index"
                  class="day-cell"
                  :class="{
                    empty: dayData.isEmpty,
                    'complete-week-1': dayData.completeState === 1,
                    'complete-week-2': dayData.completeState === 2,
                    today: dayData.isToday,
                    'has-flower': dayData.hasFlower,
                  }"
                  @click="!dayData.isEmpty && handleDateClick(dayData)"
                >
                  <span v-if="!dayData.isEmpty" class="day-number">
                    {{ dayData.day }}
                  </span>
                  <div v-if="dayData.hasFlower" class="flower-indicator">
                    {{ dayData.recordCount === 1 ? "🔺" : "🌸" }}
                  </div>
                  <div v-if="dayData.isToday" class="today-indicator"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- 折线图视图 -->
          <div v-else class="chart-view">
            <div class="chart-controls" style="margin-top: 8px;">
              <button
                class="month-btn recent-weeks-btn"
                :class="{ active: viewMode === 'recent4weeks' }"
                @click="viewMode = 'recent4weeks'"
              >
                近4周
              </button>
            </div>
            <div class="chart-controls">
              <button
                v-for="month in availableMonths"
                :key="month.value"
                class="month-btn"
                :class="{ active: selectedMonth === month.value && viewMode === 'month' }"
                @click="viewMode = 'month'; selectedMonth = month.value"
              >
                {{ month.label }}
              </button>
            </div>
            <div class="chart-container">
              <canvas ref="chartCanvas"></canvas>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="calendar-footer">
          <button class="confirm-btn" @click="handleClose">确认</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, watch, nextTick } from "vue";

// Props 定义
const props = defineProps({
  visible: { type: Boolean, default: false },
  winningStreak: { type: Number, default: 0 },
  completeWeeksData: { type: Array, default: () => [] },
  dailyData: { type: Object, default: () => ({}) },
  title: { type: String, default: "连胜" },
  username: { type: String, default: "" },
  subtitle: {
    type: String,
    default: "每周三次背诵可完成一周任务，6次完成金色",
  },
  monthsToShow: { type: Number, default: 3 },
});

// Emits
const emit = defineEmits(["update:visible", "close", "date-click"]);

// Refs
const calendarBody = ref(null);
const chartCanvas = ref(null);
const showChart = ref(false);
const selectedMonth = ref(0);
const viewMode = ref('recent4weeks'); // 'month' 或 'recent4weeks'，默认近4周
let chartInstance = null;

// 周状态映射
const completeWeekStates = computed(() => {
  const states = {};
  props.completeWeeksData.forEach((r) => {
    states[r.monday] = r.state || 0;
  });
  return states;
});

// 工具函数
const formatDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const getMondayOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

// 日历数据
const calendarMonths = computed(() => {
  const today = new Date();
  const months = [];
  for (let i = props.monthsToShow - 1; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const y = date.getFullYear();
    const m = date.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const days = [];
    for (let j = 0; j < firstDay; j++) days.push({ isEmpty: true });

    for (let day = 1; day <= daysInMonth; day++) {
      const cur = new Date(y, m, day);
      const dateString = formatDate(cur);
      const monday = formatDate(getMondayOfWeek(cur));
      const completeState = completeWeekStates.value[monday] || 0;
      const isToday = formatDate(today) === dateString;
      const recordCount = props.dailyData[dateString] || 0;
      days.push({
        date: cur,
        day,
        dateString,
        completeState,
        isToday,
        isEmpty: false,
        hasFlower: recordCount > 0,
        recordCount,
      });
    }

    months.push({ year: y, month: m + 1, title: `${y}年${m + 1}月`, days });
  }
  return months;
});

// 可选月份
const availableMonths = computed(() => {
  const today = new Date();
  const arr = [];
  for (let i = 0; i < props.monthsToShow; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    arr.push({ value: i, label: `${d.getFullYear()}年${d.getMonth() + 1}月` });
  }
  return arr;
});

// 折线图数据，按自然周（周一到周日）分组，支持月份或近4周视图
const prepareChartData = () => {
  const today = new Date();
  const todayMonday = getMondayOfWeek(today);

  let currentMonday, endDate;
  
  if (viewMode.value === 'recent4weeks') {
    // 近4周模式：从今天往前推3周（包括本周共4周）
    endDate = todayMonday;
    currentMonday = new Date(todayMonday);
    currentMonday.setDate(currentMonday.getDate() - 21); // 往前推3周
  } else {
    // 月份模式
    const target = new Date(
      today.getFullYear(),
      today.getMonth() - selectedMonth.value,
      1
    );
    const y = target.getFullYear();
    const m = target.getMonth();
    const firstDayOfMonth = new Date(y, m, 1);
    const lastDayOfMonth = new Date(y, m + 1, 0);

    // 找到包含该月第一天的周一
    currentMonday = getMondayOfWeek(firstDayOfMonth);

    // 确定结束日期：如果是当前月份，则到今天所在的周；否则到月末所在的周
    if (selectedMonth.value === 0) {
      // 当前月份，只显示到今天所在的周
      endDate = todayMonday;
    } else {
      // 历史月份，显示到月末所在的周一
      endDate = getMondayOfWeek(lastDayOfMonth);
    }
  }

  const weekData = [];
  let currentDate = new Date(currentMonday);

  // 遍历自然周
  while (currentDate <= endDate) {
    const weekStart = new Date(currentDate);
    const weekEnd = new Date(currentDate);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const week = { start: weekStart, data: 0, isTodayWeek: false };

    // 累加这一周的数据
    for (
      let d = new Date(weekStart);
      d <= weekEnd;
      d.setDate(d.getDate() + 1)
    ) {
      const dateStr = formatDate(d);
      week.data += props.dailyData[dateStr] || 0;
    }

    // 检查今天是否在这一周
    if (formatDate(todayMonday) === formatDate(weekStart)) {
      week.isTodayWeek = true;
    }

    // 格式化标签 "MM.DD-MM.DD"
    const startLabel = `${weekStart.getMonth() + 1}.${weekStart.getDate()}`;
    const endLabel = `${weekEnd.getMonth() + 1}.${weekEnd.getDate()}`;
    week.label = `${startLabel}-${endLabel}${week.isTodayWeek ? "(本周)" : ""}`;

    weekData.push(week);
    currentDate.setDate(currentDate.getDate() + 7);
  }

  const labels = weekData.map((w) => w.label);
  const data = weekData.map((w) => w.data);
  const todayWeek = weekData.findIndex((w) => w.isTodayWeek) + 1;

  return { labels, data, todayWeek };
};

// 绘制图表，优化为紧凑显示
const drawChart = () => {
  if (!chartCanvas.value) return;
  const ctx = chartCanvas.value.getContext("2d");
  const { labels, data, todayWeek } = prepareChartData();

  if (chartInstance) chartInstance.destroy();

  const pointColors = [];
  const pointRadii = [];
  const hoverRadii = [];
  for (let i = 0; i < labels.length; i++) {
    if (i + 1 === todayWeek) {
      pointColors.push("#ff6b6b");
      pointRadii.push(8);
      hoverRadii.push(10);
    } else {
      pointColors.push("#1989fa");
      pointRadii.push(6);
      hoverRadii.push(8);
    }
  }

  if (window.Chart) {
    chartInstance = new window.Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "每周记录次数",
            data,
            borderColor: "#1989fa",
            backgroundColor: "rgba(25,137,250,0.1)",
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            pointRadius: pointRadii,
            pointHoverRadius: hoverRadii,
            pointBackgroundColor: pointColors,
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: "top",
            labels: {
              font: { size: 12 },
            },
          },
          tooltip: {
            mode: "index",
            intersect: false,
            callbacks: {
              label: (ctx) => `记录次数: ${ctx.parsed.y}次`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, font: { size: 10 } },
            title: { display: true, text: "记录次数", font: { size: 12 } },
          },
          x: {
            ticks: {
              color: (ctx) =>
                ctx.index + 1 === todayWeek ? "#ff6b6b" : "#666",
              font: {
                size: 10,
                weight: (ctx) =>
                  ctx.index + 1 === todayWeek ? "bold" : "normal",
              },
              maxRotation: 45,
              minRotation: 45,
              autoSkip: false,
            },
          },
        },
      },
    });
  }
};

// 切换视图
const toggleView = () => {
  showChart.value = !showChart.value;
  if (showChart.value) {
    viewMode.value = 'recent4weeks';
    selectedMonth.value = 0;
    nextTick(() => {
      if (!window.Chart) {
        const s = document.createElement("script");
        s.src =
          "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js";
        s.onload = drawChart;
        document.head.appendChild(s);
      } else drawChart();
    });
  }
};

// 监听月份切换和视图模式切换
watch([selectedMonth, viewMode], () => {
  if (showChart.value) nextTick(drawChart);
});

// 打开时滚动到底部
watch(
  () => props.visible,
  (v) => {
    if (v) {
      showChart.value = false;
      nextTick(() => {
        setTimeout(() => {
          if (calendarBody.value)
            calendarBody.value.scrollTop = calendarBody.value.scrollHeight;
        }, 100);
      });
    }
  }
);

// 事件
const handleClose = () => {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
  emit("update:visible", false);
  emit("close");
};
const handleOverlayClick = (e) => {
  if (e.target === e.currentTarget) handleClose();
};
const handleDateClick = (d) => emit("date-click", d);
</script>

<style scoped>
.custom-calendar-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}
.custom-calendar {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 400px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
.calendar-header {
  padding: 16px 8px 16px 15px;
  border-bottom: 1px solid #eee;
}
.title-wrapper {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}
.calendar-title {
  font-size: 16px;
  font-weight: bold;
  color: #323233;
}
.calendar-subtitle {
  font-size: 12px;
  color: #576b95;
  background: #ecf5ff;
  padding: 2px 8px;
  border-radius: 10px;
  display: inline-block;
  align-self: flex-start;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin-left: auto;
}
.view-toggle-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: #f7f8fa;
  border-radius: 4px;
  cursor: pointer;
}
.close-btn {
  font-size: 18px;
  color: #969799;
  cursor: pointer;
  padding: 4px;
}
.calendar-body {
  padding: 0 12px 12px;
  overflow-y: auto;
  flex: 1;
}
.chart-view {
  padding: 16px 0;
}
.chart-controls {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  padding: 0 8px;
}
.month-btn {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ebedf0;
  background: white;
  border-radius: 4px;
  font-size: 9px;
  cursor: pointer;
}
.month-btn.active {
  background: #1989fa;
  color: white;
  border-color: #1989fa;
}
.recent-weeks-btn {
  width: 100%;
}
.chart-container {
  height: 280px;
  padding: 0 8px;
}
.month-section {
  margin-top: 16px;
}
.month-title {
  font-size: 14px;
  font-weight: bold;
  color: #323233;
  margin-bottom: 8px;
}
.weekday-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 4px;
}
.weekday-cell {
  text-align: center;
  font-size: 12px;
  color: #969799;
}
.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}
.day-cell {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  cursor: pointer;
  position: relative;
}
.day-cell.has-flower {
  background-color: rgba(255, 192, 203, 0.1);
}
.day-cell.complete-week-1 {
  background: linear-gradient(135deg, #fff9cc, #ffe680);
}
.day-cell.complete-week-2 {
  background: linear-gradient(135deg, #ffd700, #ffa500);
}
.day-cell.today {
  border: 1px solid #1989fa;
}
.day-number {
  font-size: 14px;
}
.flower-indicator {
  font-size: 10px;
  margin-top: 2px;
}
.today-indicator {
  position: absolute;
  bottom: 4px;
  width: 4px;
  height: 4px;
  background: #1989fa;
  border-radius: 50%;
}
.calendar-footer {
  padding: 12px 20px;
  border-top: 1px solid #eee;
}
.confirm-btn {
  width: 100%;
  padding: 12px;
  background: #1989fa;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
}
.calendar-fade-enter-active,
.calendar-fade-leave-active {
  transition: all 0.3s ease;
}
.calendar-fade-enter-from,
.calendar-fade-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}
</style>