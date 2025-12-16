<template>
  <div style="flex: 1; display: flex; flex-direction: column; align-items: flex-start; width: 95%; height: 85%; overflow: hidden;">
    <div style="padding: 10px; font-size: 14px; font-weight: bold; color: #333; display: flex; align-items: center; gap: 10px; width: 100%;">
      <span>近四周多用户数据对比</span>
      <van-button
        type="primary"
        @click="exitMomentScatter"
        style="padding: 5px 15px; height: auto; margin-right: auto"
        size="small"
        plain
      >
        关闭
      </van-button>
    </div>
    <div style="flex: 1; width: 100%; height: 100%; overflow: hidden; display: flex;">
      <canvas
        ref="chartCanvas"
        style="width: 100%; height: 100%; display: block;"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';

const props = defineProps({
  multiUserChartDataList: {
    type: Array,
    required: true
  }
});

const emit = defineEmits(['close']);

const chartCanvas = ref(null);

// 获取最近4周的周分组数据
const getWeeklyGroupData = () => {
  const today = new Date(2025, 11, 10); // 12月10日
  
  // 计算4周前的日期
  const fourWeeksAgo = new Date(today);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  // 生成4个周时间段
  const weeks = [];
  for (let i = 3; i >= 0; i--) {
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() - i * 7);
    
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 6);

    weeks.push({
      startDate,
      endDate,
      label: `${startDate.getMonth() + 1}.${startDate.getDate()}-${endDate.getMonth() + 1}.${endDate.getDate()}`
    });
  }

  // 计算每个用户在每周的合计数据
  const weeklyData = weeks.map((week, weekIndex) => {
    const userCounts = props.multiUserChartDataList.map(user => {
      let total = 0;
      const dailyData = user.dailyData || {};
      
      Object.entries(dailyData).forEach(([dateStr, count]) => {
        const date = new Date(dateStr);
        if (date >= week.startDate && date <= week.endDate) {
          total += count;
        }
      });

      return {
        username: user.username,
        total: total
      };
    });

    return {
      label: week.label,
      users: userCounts
    };
  });

  return weeklyData;
};

const drawChart = () => {
  if (!chartCanvas.value) return;

  const canvas = chartCanvas.value;
  const container = canvas.parentElement;

  // 强制重新获取容器的最新尺寸
  const dpr = window.devicePixelRatio || 1;
  const rect = container.getBoundingClientRect();

  // 重新设置 canvas 尺寸（这会清空之前的内容）
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = rect.width + "px";
  canvas.style.height = rect.height + "px";

  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  const weeklyData = getWeeklyGroupData();

  // 找出最大值
  let maxCount = 0;
  weeklyData.forEach(week => {
    week.users.forEach(user => {
      if (user.total > maxCount) maxCount = user.total;
    });
  });
  maxCount = Math.max(maxCount + 5, 30);

  const padding = { top: 30, right: 20, bottom: 120, left: 60 };
  const chartWidth = rect.width - padding.left - padding.right;
  const chartHeight = rect.height - padding.top - padding.bottom;

  // 清空画布
  ctx.clearRect(0, 0, rect.width, rect.height);

  // 绘制渐变背景
  const bgGradient = ctx.createLinearGradient(
    0,
    padding.top,
    0,
    rect.height - padding.bottom
  );
  bgGradient.addColorStop(0, "rgba(25, 137, 250, 0.05)");
  bgGradient.addColorStop(1, "rgba(25, 137, 250, 0.01)");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(padding.left, padding.top, chartWidth, chartHeight);

  // 绘制Y轴网格线和刻度
  ctx.strokeStyle = "rgba(0, 0, 0, 0.08)";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#999";
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial';
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  for (let i = 0; i <= 5; i++) {
    const y = padding.top + (chartHeight / 5) * i;
    const value = Math.round(maxCount - (maxCount / 5) * i);

    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(rect.width - padding.right, y);
    ctx.stroke();

    ctx.fillText(value.toString(), padding.left - 10, y);
  }

  // 绘制X轴
  ctx.strokeStyle = "rgba(0, 0, 0, 0.15)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding.left, rect.height - padding.bottom);
  ctx.lineTo(rect.width - padding.right, rect.height - padding.bottom);
  ctx.stroke();

  const weekCount = weeklyData.length;
  const userCount = props.multiUserChartDataList.length;
  const groupSpacing = chartWidth / weekCount;
  const barWidth = (groupSpacing * 0.7) / userCount;

  const colors = [
    "rgba(59, 130, 246, 0.85)",    // 蓝色
    "rgba(239, 68, 68, 0.85)",     // 红色
    "rgba(16, 185, 129, 0.85)",    // 绿色
    "rgba(251, 146, 60, 0.85)",    // 橙色
    "rgba(168, 85, 247, 0.85)"     // 紫色
  ];

  // 绘制柱状图
  weeklyData.forEach((week, weekIndex) => {
    week.users.forEach((user, userIndex) => {
      if (user.total === 0) return;

      const barHeight = (user.total / maxCount) * chartHeight;
      const groupX = padding.left + groupSpacing * weekIndex;
      const offsetX = (groupSpacing * 0.7 - barWidth * userCount) / 2;
      const x = groupX + offsetX + barWidth * userIndex;
      const y = rect.height - padding.bottom - barHeight;

      // 绘制柱子渐变
      const barGradient = ctx.createLinearGradient(
        x,
        y,
        x,
        rect.height - padding.bottom
      );
      barGradient.addColorStop(0, colors[userIndex % colors.length]);
      barGradient.addColorStop(1, colors[userIndex % colors.length].replace('0.85', '0.65'));

      ctx.fillStyle = barGradient;
      ctx.strokeStyle = colors[userIndex % colors.length].replace('0.85', '1');
      ctx.lineWidth = 1.5;

      // 绘制圆角矩形柱子
      ctx.beginPath();
      const radius = 4;
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + barWidth - radius, y);
      ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
      ctx.lineTo(x + barWidth, rect.height - padding.bottom);
      ctx.lineTo(x, rect.height - padding.bottom);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 绘制柱子内的数值标签
      ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial';
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      if (barHeight > 25) {
        ctx.fillText(user.total.toString(), x + barWidth / 2, y + 6);
      }
    });

    // 绘制周时间标签（横向显示）
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial';
    ctx.fillStyle = "#333";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(week.label, padding.left + groupSpacing * weekIndex + groupSpacing / 2, rect.height - padding.bottom + 15);
  });

  // 绘制图例 - 用户标识
  const legendStartX = padding.left;
  let legendY = rect.height - padding.bottom + 50;
  ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial';
  
  ctx.fillStyle = "#333";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("用户：", legendStartX, legendY);
  
  let currentX = legendStartX + 60;
  const legendItemSpacing = 180;

  props.multiUserChartDataList.forEach((user, index) => {
    if (currentX > rect.width - padding.right - 100) {
      currentX = legendStartX;
      legendY += 25;
    }
    
    // 绘制颜色方块
    ctx.fillStyle = colors[index % colors.length];
    ctx.fillRect(currentX, legendY - 7, 14, 14);
    
    // 绘制用户名
    ctx.fillStyle = "#333";
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial';
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(user.username, currentX + 20, legendY);
    
    currentX += legendItemSpacing;
  });
};

const exitMomentScatter = () => {
  emit('close');
};

watch(
  () => props.multiUserChartDataList,
  () => {
    drawChart();
  },
  { deep: true }
);

onMounted(() => {
  // 初始绘制
  setTimeout(() => {
    drawChart();
  }, 100);

  // 监听窗口变化
  const handleResize = () => {
    drawChart();
  };
  window.addEventListener('resize', handleResize);

  return () => {
    window.removeEventListener('resize', handleResize);
  };
});
</script>