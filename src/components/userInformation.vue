<script setup>
import { onMounted, ref, getCurrentInstance, computed, inject } from "vue";
import "vant/lib/index.css"; // 确保引入样式
import userinfor1 from "../assets/userinfor1.png";
import attemptPurchase from "../assets/attemptPurchase.png";
import profileUsershop from "../assets/Boonie Bears/profile_usershop.png";
import profileUsershopPassiveMagic from "../assets/usershop_passive_magic.png";
import shopPreviewPro from "../assets/shop_preview_pro.png";
import profileRemoveBarrage from "../assets/barrage.png";
import viewPurchase from "../assets/viewPurchase.png";
import { useRouter } from "vue-router";
import loading from "./loading.vue";
import {
  showFailToast,
  showToast,
  showConfirmDialog,
  showDialog,
  Toast,
  closeToast,
  showLoadingToast,
  showSuccessToast,
} from "vant";
import { useRoute } from "vue-router";
import toggleTheme from "./toggleTheme.vue";
const route = useRoute();
const instance = getCurrentInstance();
const axios = instance.appContext.config.globalProperties.$ajax;
const router = useRouter();

// 返回首页
const gobackHomepage = () => {
  localStorage.removeItem("userData");
  localStorage.removeItem("expirationDate");
  router.push({
    path: "/homepage",
  });
};

// 显示订单
const showOrderList = ref(false);
const orderList = ref([]);
const loadingOrderList = ref(false);
const finishedOrderList = ref(false);
const pageIndexOrderList = ref(0);
const getOrderListData = () => {
  orderList.value = [];
  pageIndexOrderList.value = 0;
  finishedOrderList.value = false;
  loadingOrderList.value = false;
  onLoadOrderList();
};
function formatDateString(dateString) {
  const date = new Date(dateString);

  const year = date.getFullYear();
  const month = date.getMonth() + 1; // getMonth() 返回的月份是从0开始的
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();

  return `${year}年${month.toString().padStart(2, "0")}月${day
    .toString()
    .padStart(2, "0")}日${hours}时${minutes}分`;
}
function processData(res) {
  return res
    .map((item) => {
      const { nid, user_id, create_time, type, coins, account_data__title } =
        item;
      const formattedCreateTime = formatDateString(create_time); // 使用新变量存储格式化后的日期
      const title = account_data__title?.split(".")[0] || "";
      return {
        nid,
        user_id,
        create_time: formattedCreateTime,
        type,
        coins,
        title,
      };
    })
    .filter((item) => item !== null);
}
const onLoadOrderList = async () => {
  if (loadingOrderList.value || finishedOrderList.value) {
    return;
  }

  const params = new URLSearchParams();
  params.append("method", "getOrderListByUser");
  params.append("username", username.value);
  params.append("page", pageIndexOrderList.value + 1); // 请求下一页的数据
  params.append("page_size", 20); // 每页数据大小

  const response = await axios.post("words/", params);
  let moreDataOrderList = response.data.data;
  moreDataOrderList = processData(moreDataOrderList);
  orderList.value.push(...moreDataOrderList);
  console.log("moreDataOrderList: ", moreDataOrderList);
  pageIndexOrderList.value++;
  finishedOrderList.value = !response.data.has_more;

  loadingOrderList.value = false;
  return orderList.value;
};
const clickOrderList = () => {
  showOrderList.value = true;
  getOrderListData();
};

// 购买列表
const isLoading = ref(false);
const priceBears = ref(20000);
const pricePassiveMagic = ref(25000);
const priceRemoveBarrage = ref(1200);
const pricePreviewPro = ref(1200);
const priceStar = ref(1000);
const priceAttempt = ref(800);
const priceView = ref(800);
const showPurchaseList = ref(false);
const showSkinBoonieBear = ref(false);
const methodPurchase = ref(null);
const getPurchaseList = (method) => {
  if (method == "弹幕消除") {
    showRemoveBarrage.value = true;
  } else if (method == "不灭意志") {
    showPassiveMagic.value = true;
  } else if (method == "皮肤购买") {
    showSkinBoonieBear.value = true;
  } else if (method == "预习次数") {
    showPreviewPro.value = true;
  } else {
    showPurchaseList.value = true;
    methodPurchase.value = method;
  }
};
const confirmPurchase = (index) => {
  let rate = originalData.value[index]["rate"];
  // priceStar.value = rate >= 2 ? 4500 : rate >= 1.5 ? 8000 : 0;
  priceStar.value = rate >= 2.5 ? 1000 : 
                  rate >= 2 ? 4500 : 
                  rate >= 1.5 ? 8000 : 0;
  // console.log("priceStar: ", priceStar.value);
  if (originalData.value[index]["rate"] < 1.5) {
    showToast("至少拥有1.5颗星星");
    return;
  }
  if (methodPurchase.value == "购买星星") {
    showConfirmDialog({
      title: `${originalData.value[index]["title"]}`,
      message: `现有星星数：${originalData.value[index]["rate"]}\n确认花费${priceStar.value}金币再购买一个星星吗？`,
    }).then(async () => {
      console.log(originalData.value[index]);
      if (usercoins.value < priceStar.value) {
        showFailToast("金币不足");
        return;
      }

      isLoading.value = true;
      try {
        const params = new URLSearchParams({
          method: "purchaseStar",
          nid: originalData.value[index]["nid"],
          priceStar: priceStar.value,
          username: originalData.value[index]["username"],
        });

        const response = await axios.post("words/", params);
        console.log("res: ", response.data);

        const userCoinsResponse = await getUserCoins();
        usercoins.value = userCoinsResponse["data_coins"][0]["coins"];

        originalData.value = [];
        loadingOriginalData.value = false;
        finishedOriginalData.value = false;
        await onLoadOriginalData();

        showPurchaseList.value = false;
        showSuccessToast("购买成功");
      } catch (error) {
        console.error("Error purchasing star:", error);
      } finally {
        isLoading.value = false;
      }
    });
  }

  if (methodPurchase.value == "消除尝试") {
    showConfirmDialog({
      title: `${originalData.value[index]["title"]}`,
      message: `现有尝试次数：${originalData.value[index]["attempt"]}\n确认花费${priceAttempt.value}金币消除一次尝试吗？`,
    }).then(async () => {
      if (usercoins.value < priceAttempt.value) {
        showFailToast("金币不足");
        return;
      }
      isLoading.value = true;
      try {
        console.log(originalData.value[index]);
        const params = new URLSearchParams({
          method: "purchaseAttempt",
          nid: originalData.value[index]["nid"],
          priceAttempt: priceAttempt.value,
          username: originalData.value[index]["username"],
        });

        const response = await axios.post("words/", params);
        // console.log("res: ", response.data);
        if (response.data == "ok") {
          const userCoinsResponse = await getUserCoins();
          usercoins.value = userCoinsResponse["data_coins"][0]["coins"];
          originalData.value = [];
          loadingOriginalData.value = false;
          finishedOriginalData.value = false;
          await onLoadOriginalData();
          showPurchaseList.value = false;
          showSuccessToast("购买成功");
        } else {
          // showFailToast("购买失败");
          showDialog({
            title: "失败提示",
            theme: "round-button",
            message: "尝试次数为了0或者等于星星数时，不能消除尝试次数",
          });
        }
      } catch (error) {
        console.error("Error purchasing star:", error);
      } finally {
        isLoading.value = false;
      }
    });
  }

  if (methodPurchase.value == "消除查看") {
    showConfirmDialog({
      title: `${originalData.value[index]["title"]}`,
      message: `现有答案查看次数：${originalData.value[index]["view"]}\n确认花费${priceView.value}金币消除一次答案查看吗？`,
    }).then(async () => {
      if (usercoins.value < priceView.value) {
        showFailToast("金币不足");
        return;
      }
      isLoading.value = true;
      try {
        console.log(originalData.value[index]);
        const params = new URLSearchParams({
          method: "purchaseView",
          nid: originalData.value[index]["nid"],
          priceView: priceView.value,
          username: originalData.value[index]["username"],
        });

        const response = await axios.post("words/", params);
        // console.log("res: ", response.data);
        if (response.data == "ok") {
          const userCoinsResponse = await getUserCoins();
          usercoins.value = userCoinsResponse["data_coins"][0]["coins"];
          originalData.value = [];
          loadingOriginalData.value = false;
          finishedOriginalData.value = false;
          await onLoadOriginalData();
          showPurchaseList.value = false;

          showSuccessToast("购买成功");
        } else {
          // showFailToast("购买失败");
          showDialog({
            title: "失败提示",
            theme: "round-button",
            message: "答案查看次数为了0，不能消除",
          });
        }
      } catch (error) {
        console.error("Error purchasing star:", error);
      } finally {
        isLoading.value = false;
      }
    });
  }
};

// 加载数据
const originalData = ref([]);
const loadingOriginalData = ref(false);
const finishedOriginalData = ref(false);
const pageIndexOriginalData = ref(0);
const processedTitle = (title) => {
  return title.split(".")[0];
};
const showRatePlus = computed(() => {
  return originalData.value.map((item) => item.rate > 3);
});
const formattedRate = (rate) => {
  // 检查是否为整数
  if (Number.isInteger(rate)) {
    return rate - 3;
  } else {
    // 保留一位小数
    return (rate - 3).toFixed(1);
  }
};
// 分页加载
const onLoadOriginalData = async (title = "全部") => {
  // console.log("title: ", title);
  // console.log('finishedOriginalData.value: ', finishedOriginalData.value);
  // console.log('loadingOriginalData.value: ', loadingOriginalData.value);
  if (loadingOriginalData.value || finishedOriginalData.value) {
    return;
  }
  loadingOriginalData.value = true;
  isLoading.value = true;
  try {
    const params = new URLSearchParams();
    params.append("method", "getUserDataPage");
    params.append("alias", title);
    params.append("user", username.value);
    params.append("page", pageIndexOriginalData.value + 1); // 请求下一页的数据
    params.append("page_size", 20); // 每页数据大小

    const response = await axios.post("words/", params);
    let moreData = response.data.data;

    moreData = moreData.map((item) => {
      const progress = Math.min(Math.floor((item.coins / 2000) * 100), 100);
      return { ...item, progressPercentage: progress };
    });
    console.log("moreData: ", moreData);
    if (moreData.length) {
      moreData.sort(
        (a, b) => new Date(b.create_time) - new Date(a.create_time)
      );
      moreData.forEach((item) => {
        const answers = JSON.parse(item.answers);
        const synonyms = JSON.parse(item.synonyms);
        // 解析日期并格式化
        const date = new Date(item.create_time);
        const viewDate = new Date(item.view_time);
        const formatter = new Intl.DateTimeFormat("zh-CN", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "numeric",
          hour12: false,
        });
        const formattedCreateTime = formatter.format(date);
        const formattedViewTime = formatter.format(viewDate);
        const newItem = {
          ...item,
          answers: answers,
          synonyms: synonyms,
          create_time: formattedCreateTime,
          view_time: formattedViewTime,
        };
        originalData.value.push(newItem);
      });
      pageIndexOriginalData.value++;
    }
    finishedOriginalData.value = !response.data.has_more;
  } catch (error) {
    console.error("Failed to fetch data:", error);
  }
  loadingOriginalData.value = false;
  isLoading.value = false;

  return originalData.value;
};

// 获得用户金币
async function getUserCoins() {
  let params = new URLSearchParams();
  params.append("method", "getUserCoins");
  params.append("username", username.value);
  return await axios.post("words/", params).then((ret) => {
    return ret.data;
  });
}
const username = ref(route.query.param);
const usercoins = ref("");
const userdiamonds = ref("");
const userflowers = ref("");

// 主题选择
const showTheme = ref(false);
const valueTheme = ref("");
const allThemes = [{ name: "喜羊羊与灰太狼" }, { name: "熊出没" }];
const actionsTheme = [];
const flagTheme = inject("flagTheme");
const toggleThemeRef = ref(null);
const animationVisible = ref(false);

function showToggleTheme() {
  if (toggleThemeRef.value.visible) {
    toggleThemeRef.value.hide();
  } else {
    toggleThemeRef.value.show();
  }
  animationVisible.value = !animationVisible.value;
}
const onSelectTheme = (item) => {
  // console.log("item: ", item.name);
  if (valueTheme.value === item.name) {
    console.log("主题未发生变化，退出方法");
    return;
  }
  valueTheme.value = item.name;
  showTheme.value = false;
  loadingOrderList.value = true;
  async function reviseUserTheme() {
    let params = new URLSearchParams();
    params.append("method", "reviseUserTheme");
    params.append("username", username.value);
    params.append("theme_name", item.name);
    return await axios.post("words/", params).then((ret) => {
      return ret.data;
    });
  }

  reviseUserTheme()
    .then((res) => {
      // console.log("res", res);
      flagTheme.value = res.theme_nid;
      localStorage.setItem("theme_name", res.theme_name);

      valueTheme.value = res.theme_name;
      actionsTheme.value = actionsTheme.value.map((item) => {
        if (item.name === valueTheme.value) {
          // 如果匹配，将 color 和 icon 添加到该项中
          return { ...item, color: "#1989fa", icon: "checked" };
        } else {
          // 如果不匹配，去掉 color 和 icon 属性
          const { color, icon, ...rest } = item; // 去掉 color 和 icon
          return rest;
        }
      });
    })
    .then(() => {
      loadingOrderList.value = false;
      showToggleTheme();
    });
};
const purchaseBears = () => {
  if (userOwnThemes.value.includes("熊出没")) {
    showToast("已拥有，无法购买");
    return;
  }

  showConfirmDialog({
    title: "皮肤购买",
    message: `确认花费${priceBears.value}金币购买熊出没吗？`,
  }).then(async () => {
    if (usercoins.value < 20000) {
      showFailToast("金币不足，无法购买");
      return;
    }
    isLoading.value = true;
    const params = new URLSearchParams({
      method: "purchaseBears",
      priceBears: priceBears.value,
      username: username.value,
    });
    const response = await axios.post("words/", params);
    console.log("res: ", response.data);

    const userCoinsResponse = await getUserCoins();
    usercoins.value = userCoinsResponse["data_coins"][0]["coins"];

    valueTheme.value = "熊出没";
    flagTheme.value = 2;
    localStorage.setItem("theme_name", "熊出没");
    actionsTheme.value = actionsTheme.value.map((item) => {
      if (item.name === valueTheme.value) {
        // 如果匹配，将 color 和 icon 添加到该项中
        return { ...item, color: "#1989fa", icon: "checked" };
      } else {
        // 如果不匹配，去掉 color 和 icon 属性
        const { color, icon, ...rest } = item; // 去掉 color 和 icon
        return rest;
      }
    });
    isLoading.value = false;
    showToggleTheme();
    // showSuccessToast("购买成功");
  });
};

const userOwnThemes = ref([]);

// 被动魔法技能
const showPassiveMagic = ref(false);
const userPassiveMagic = ref("");
const purchasePassive = () => {
  if (userPassiveMagic.value) {
    showToast("已拥有，无须购买");
    return;
  }

  showConfirmDialog({
    title: "技能购买",
    message: `确认花费${pricePassiveMagic.value}金币购买不灭的意志吗？`,
  }).then(async () => {
    if (usercoins.value < 25000) {
      showFailToast("金币不足，无法购买");
      return;
    }
    isLoading.value = true;
    const params = new URLSearchParams({
      method: "purchasePassiveMagic",
      pricePassiveMagic: pricePassiveMagic.value,
      username: username.value,
    });
    const response = await axios.post("words/", params);
    console.log("res: ", response.data);
    const userCoinsResponse = await getUserCoins();
    usercoins.value = userCoinsResponse["data_coins"][0]["coins"];
    isLoading.value = false;
  });
};

// 弹幕消除
const showRemoveBarrage = ref(false);
const purchaseRemoveBarrage = () => {
  const storedList = localStorage.getItem("listBarrage");
  console.log("storedList: ", storedList);
  // 判断是否有弹幕
  if (storedList == null) {
    showToast("无弹幕，无需购买");
    return;
  }

  // 判断是否到三天
  const parsed = JSON.parse(storedList);
  const timestamp = new Date(parsed.timestamp); // 转为 Date 对象
  const now = new Date();
  const diff = now - timestamp;
  const threeDays = 3 * 24 * 60 * 60 * 1000;

  if (diff < threeDays) {
    const remaining = threeDays - diff; // 还差多少毫秒

    const remainDays = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const remainHours = Math.floor(
      (remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );

    showToast(`还需要 ${remainDays} 天 ${remainHours} 小时才能购买`);
    return;
  }

  showConfirmDialog({
    title: "弹幕消除",
    message: `确认花费${priceRemoveBarrage.value}金币消除弹幕吗？`,
  }).then(async () => {
    if (usercoins.value < priceRemoveBarrage.value) {
      showFailToast("金币不足，无法购买");
      return;
    }
    isLoading.value = true;
    const params = new URLSearchParams({
      method: "purchaseRemoveBarrage",
      priceRemoveBarrage: priceRemoveBarrage.value,
      username: username.value,
    });
    const response = await axios.post("words/", params);
    console.log("res: ", response.data);
    localStorage.removeItem("listBarrage");
    const userCoinsResponse = await getUserCoins();
    usercoins.value = userCoinsResponse["data_coins"][0]["coins"];
    isLoading.value = false;
    showToast("删除成功");
  });
};

// 预习次数
const showPreviewPro = ref(false);
const getTodayString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const purchasePreviewPro = () => {
  showConfirmDialog({
    title: "购买预习pro次数",
    message: `确认花费${pricePreviewPro.value}金币购买今日10次吗？`,
  }).then(async () => {
    if (usercoins.value < pricePreviewPro.value) {
      showFailToast("金币不足，无法购买");
      return;
    }
    const today = getTodayString();
    const keys = Object.keys(localStorage);

    keys.forEach((key) => {
      if (key.startsWith("pro_usage_") && key !== `pro_usage_${today}`) {
        localStorage.removeItem(key);
      }
    });

    const storageKey = `pro_usage_${today}`;
    localStorage.setItem(storageKey, (-7).toString());
    isLoading.value = true;
    const params = new URLSearchParams({
      method: "purchasePreviewPro",
      pricePreviewPro: pricePreviewPro.value,
      username: username.value,
    });
    const response = await axios.post("words/", params);
    // console.log("res: ", response.data);
    const userCoinsResponse = await getUserCoins();
    usercoins.value = userCoinsResponse["data_coins"][0]["coins"];
    isLoading.value = false;


    showToast("购买成功");
  });
};

// 钻石换金币
const showExchange = ref(false);
const valueDiamonds = ref("1");
const valueCoins = computed(() => {
  return Number(valueDiamonds.value) * 70;
});
const exchangeDiamonds = () => {
  if (userdiamonds.value <= 0) {
    showFailToast("钻石不足，无法交易");
    return;
  }
  showExchange.value = true;
};
const confirmExchange = () => {
  showConfirmDialog({
    theme: "round-button",
    title: "交易无法撤销",
    message: `钻石 💎 ${valueDiamonds.value} 交易成金币 💰 ${valueCoins.value} 吗？`,
  }).then(async () => {
    let toast1 = showLoadingToast({
      message: "交易中...",
      forbidClick: true,
    });
    const params = new URLSearchParams({
      method: "exchangeDiamonds",
      username: username.value,
      diamonds: valueDiamonds.value,
    });

    const response = await axios.post("words/", params);
    const userCoinsResponse = await getUserCoins();
    usercoins.value = userCoinsResponse["data_coins"][0]["coins"];
    userdiamonds.value = userCoinsResponse["data_coins"][0]["diamonds"];

    toast1.close();
    showSuccessToast("交易完成");
    showExchange.value = false;
  });
};

onMounted(async () => {
  // 加载金币
  let res = new Promise((resolve, reject) => {
    resolve(getUserCoins());
  });
  res.then((res) => {
    console.log("res: ", res);
    usercoins.value = res["data_coins"][0]["coins"];
    userdiamonds.value = res["data_coins"][0]["diamonds"];
    userflowers.value = res["data_coins"][0]["flowers"];
    userPassiveMagic.value = res["passive_magic"];

    console.log("user已经拥有的主题：", res["theme_name_list"]);
    console.log("user被动技能：", userPassiveMagic.value);

    userOwnThemes.value = res["theme_name_list"];
    // const userOwnThemes = ["熊出没"];
    valueTheme.value = localStorage.getItem("theme_name");
    // console.log("user选中的主题：", valueTheme.value);

    actionsTheme.value = allThemes.map((theme) => {
      return {
        name: theme.name,
        disabled: !userOwnThemes.value.includes(theme.name),
      };
    });
    actionsTheme.value = actionsTheme.value.map((item) => {
      if (item.name === valueTheme.value) {
        return { ...item, color: "#1989fa", icon: "checked" }; // 为匹配项添加 color 属性
      } else {
        return item; // 不修改其他项
      }
    });
    // console.log("actionsTheme", actionsTheme.value);
  });
});
</script>

<template>
  <div class="container">
    <div class="nav-bar-container">
      <van-nav-bar
        :right-text="username"
        left-text="首页"
        @click-left="gobackHomepage"
      >
        <template #title>
          <div>用户商城</div>
        </template>
      </van-nav-bar>
    </div>

    <router-view />
    <van-tabbar route>
      <van-tabbar-item icon="home-o" replace to="/studentAccountList"
        >主页</van-tabbar-item
      >
      <van-tabbar-item icon="shopping-cart-o" replace to="/userinformation"
        >商城</van-tabbar-item
      >
      <van-tabbar-item
        icon="question-o"
        replace
        :to="{ path: '/tutorial', query: { param: username } }"
        >教程</van-tabbar-item
      >
    </van-tabbar>

    <div class="custom-container">
      <div style="margin-left: 1rem; margin-top: 0rem">
        <!-- 共获得星星 -->
        <div style="display: flex; flex-direction: column">
          <div style="font-size: 36px; font-weight: 700">{{ username }}</div>

          <div
            style="
              font-size: 20px;
              font-weight: 700;
              color: red;
              margin-top: 5px;
              margin-bottom: 0px;
            "
          >
            💰 {{ usercoins }} 金币
          </div>
          <div style="display: flex; justify-content: space-between">
            <div
              style="
                font-size: 20px;
                font-weight: 700;
                color: red;
                margin-top: 5px;
                margin-bottom: 10px;
              "
            >
              💎 {{ userdiamonds }} 钻石
            </div>
            <van-button
              style="margin-top: 0.3rem; margin-left: 1rem"
              size="small"
              type="warning"
              @click="exchangeDiamonds"
              >换金币</van-button
            >
          </div>
          <div
            style="
              font-size: 20px;
              font-weight: 700;
              color: red;
              margin-top: -6px;
              margin-bottom: 0px;
            "
          >
            🌸 {{ userflowers }} 小花
          </div>
        </div>
      </div>
      <div style="margin: 0.8rem 1rem 0 0">
        <van-button block type="warning" plain @click="clickOrderList"
          >订单</van-button
        >
      </div>
    </div>

    <!-- 选择主题 -->
    <van-cell is-link @click="showTheme = true">
      <template #title>
        <div style="font-weight: 700">选择主题：{{ valueTheme }}</div>
      </template>
    </van-cell>
    <van-action-sheet
      v-model="valueTheme"
      cancel-text="取消"
      close-on-click-action
      v-model:show="showTheme"
      :actions="actionsTheme.value"
      @select="onSelectTheme"
    />

    <van-card
      desc="直接获得奖励"
      title="购买星星（1.5❤️可购买）"
      class="custom-cell"
    >
      <template #thumb>
        <img :src="userinfor1" class="custom-thumb-image" alt="thumbnail" />
      </template>
      <template #price>
        <div class="price-container">
          <span>价格：{{ priceStar }} ～ 8000 金币</span>
        </div>
      </template>
      <template #footer>
        <div class="button-purchase">
          <van-button
            size="mini"
            type="primary"
            @click="getPurchaseList('购买星星')"
            >购买</van-button
          >
        </div>
      </template>
    </van-card>

    <van-card desc="熊出没" title="皮肤售卖" class="custom-cell">
      <template #thumb>
        <img
          :src="profileUsershop"
          class="custom-thumb-image"
          alt="thumbnail"
        />
      </template>
      <template #price>
        <div class="price-container">
          <span class="price-text">价格：20000 金币</span>
        </div>
      </template>
      <template #footer>
        <div class="button-purchase">
          <van-button
            size="mini"
            type="primary"
            class="buy-button"
            @click="getPurchaseList('皮肤购买')"
            >购买</van-button
          >
        </div>
      </template>
    </van-card>
    <van-dialog
      v-model:show="showSkinBoonieBear"
      title="限定皮肤"
      show-cancel-button
      @confirm="purchaseBears()"
    >
      <img
        src="../assets/Boonie Bears/usershop.png"
        style="width: 100%; height: auto; margin-right: 0.5rem"
      />
      <template #title>
        <div style="margin-bottom: 1rem; font-size: larger">限定皮肤</div>
        <!-- <div
          style="font-size: smaller; color: lightsalmon; margin-bottom: 0.5rem"
        >
          期中考试后开放购买
        </div> -->
      </template>
    </van-dialog>

    <!-- 被动技能魔法 -->
    <van-card desc="不灭意志" title="技能售卖" class="custom-cell">
      <template #thumb>
        <img
          :src="profileUsershopPassiveMagic"
          class="custom-thumb-image"
          alt="thumbnail"
        />
      </template>
      <template #price>
        <div class="price-container">
          <span class="price-text">价格：{{ pricePassiveMagic }}金币</span>
        </div>
      </template>
      <template #footer>
        <div class="button-purchase">
          <van-button
            size="mini"
            type="primary"
            class="buy-button"
            @click="getPurchaseList('不灭意志')"
            >购买</van-button
          >
        </div>
      </template>
    </van-card>
    <van-dialog
      v-model:show="showPassiveMagic"
      title="限定技能"
      show-cancel-button
      @confirm="purchasePassive"
    >
      <img
        src="../assets/usershop_passive_magic2.png"
        style="width: 100%; height: auto; margin-right: 0.5rem"
      />
      <template #title>
        <div style="margin-bottom: 0rem; font-size: larger">不灭意志</div>
        <div
          style="font-size: smaller; color: lightsalmon; margin-bottom: 0.5rem"
        >
          仅在游戏模式中生效
        </div>
      </template>
    </van-dialog>

    <!-- pro增加数量 -->
    <van-card desc="增加当天预习pro数量" title="预习售卖" class="custom-cell">
      <template #thumb>
        <img :src="shopPreviewPro" class="custom-thumb-image" alt="thumbnail" />
      </template>
      <template #price>
        <div class="price-container">
          <span class="price-text">价格：{{ pricePreviewPro }}金币</span>
        </div>
      </template>
      <template #footer>
        <div class="button-purchase">
          <van-button
            size="mini"
            type="primary"
            class="buy-button"
            @click="getPurchaseList('预习次数')"
            >购买</van-button
          >
        </div>
      </template>
    </van-card>
    <van-dialog
      v-model:show="showPreviewPro"
      title="预习pro次数"
      show-cancel-button
      @confirm="purchasePreviewPro()"
    >
      <img
        src="../assets/shop_preview_pro.png"
        style="width: 100%; height: auto; margin-right: 0.5rem"
      />
      <template #title>
        <div style="margin-bottom: 0rem; font-size: larger">预习pro次数</div>
        <div
          style="font-size: smaller; color: lightsalmon; margin-bottom: 0.5rem"
        >
          可以购买当天使用10次
        </div>
      </template>
    </van-dialog>

    <!-- 弹幕消除 -->
    <van-card desc="首页弹幕" title="弹幕消除" class="custom-cell">
      <template #thumb>
        <img
          :src="profileRemoveBarrage"
          class="custom-thumb-image"
          alt="thumbnail"
        />
      </template>
      <template #price>
        <div class="price-container">
          <span class="price-text">价格：{{ priceRemoveBarrage }}金币</span>
        </div>
      </template>
      <template #footer>
        <div class="button-purchase">
          <van-button
            size="mini"
            type="primary"
            class="buy-button"
            @click="getPurchaseList('弹幕消除')"
            >购买</van-button
          >
        </div>
      </template>
    </van-card>
    <van-dialog
      v-model:show="showRemoveBarrage"
      title="弹幕消除"
      show-cancel-button
      @confirm="purchaseRemoveBarrage()"
    >
      <img
        src="../assets/barrage.png"
        style="width: 100%; height: auto; margin-right: 0.5rem"
      />
      <template #title>
        <div style="margin-bottom: 0rem; font-size: larger">弹幕消除</div>
        <div
          style="font-size: smaller; color: lightsalmon; margin-bottom: 0.5rem"
        >
          弹幕生成后三天才能消除
        </div>
      </template>
    </van-dialog>

    <van-card desc="尝试减少一次" title="消除尝试" class="custom-cell">
      <template #thumb>
        <img
          :src="attemptPurchase"
          class="custom-thumb-image"
          alt="thumbnail"
        />
      </template>
      <template #price>
        <div class="price-container">
          <span class="price-text">价格：{{ priceAttempt }} 金币</span>
        </div>
      </template>
      <template #footer>
        <div class="button-purchase">
          <van-button
            size="mini"
            type="primary"
            class="buy-button"
            @click="getPurchaseList('消除尝试')"
            >购买</van-button
          >
        </div>
      </template>
    </van-card>

    <van-card desc="查看答案减少一次" title="消除查看答案" class="custom-cell" style="margin-bottom: 4rem">
      <template #thumb>
        <img :src="viewPurchase" class="custom-thumb-image" alt="thumbnail" />
      </template>
      <template #price>
        <div class="price-container">
          <span class="price-text">价格：{{ priceView }} 金币</span>
        </div>
      </template>
      <template #footer>
        <div class="button-purchase">
          <van-button
            size="mini"
            type="primary"
            @click="getPurchaseList('消除查看')"
            >购买</van-button
          >
        </div>
      </template>
    </van-card>

    <!-- 购买列表 -->
    <van-popup
      closeable
      round=""
      v-model:show="showPurchaseList"
      position="bottom"
      :style="{ height: '90%' }"
    >
      <div style="font-size: 18px; font-weight: 700; margin: 1rem">
        点击：{{ methodPurchase }}
      </div>

      <div
        style="
          display: flex;
          justify-content: space-between;
          margin-right: 1rem;
          font-weight: 700;
        "
      ></div>

      <van-list
        v-model="loadingOriginalData"
        :finished="finishedOriginalData"
        finished-text="没有更多了"
        @load="onLoadOriginalData"
      >
        <div v-for="(item, index) in originalData" :key="index">
          <van-cell is-link center clickable @click="confirmPurchase(index)">
            <template #icon>
              <img
                v-if="item.rate < 3"
                src="../assets/item_list.png"
                style="width: 27px; height: auto; margin-right: 0.5rem"
                alt="Item List"
              />
              <img
                v-else
                src="../assets/item_list_complete.png"
                style="width: 27px; height: auto; margin-right: 0.5rem"
                alt="Item List Complete"
              />
            </template>
            <template #title>
              <div
                v-if="item.swipe == 0"
                style="display: flex; align-items: flex-start; width: 160%"
              >
                <div style="margin-bottom: 7px; font-weight: 700">
                  {{ processedTitle(item.title) }}
                </div>
                <van-badge
                  content="Game"
                  color="lightgray"
                  style="margin-left: -20px"
                />
              </div>

              <div
                v-else
                style="display: flex; align-items: flex-start; width: 160%"
              >
                <div style="margin-bottom: 7px; font-weight: 700">
                  {{ processedTitle(item.title) }}
                </div>
                <van-badge content="Game" style="margin-left: -20px" />
              </div>
            </template>

            <template #value>
              <div style="font-size: 12px">
                <div style="display: flex; justify-content: flex-end">
                  尝试了
                  <div style="font-weight: 700; color: red">
                    {{ item.attempt }}
                  </div>
                  次
                </div>

                <div style="margin-top: 0.5rem">
                  {{ item.answers.length }}词
                </div>
              </div>

              <div v-if="item.view == 0">
                <van-button
                  style="color: gray; border: none"
                  size="mini"
                  class="button-container2"
                >
                  <span class="button-content">
                    <img
                      src="../assets/close_eye.png"
                      alt="Icon"
                      class="button-icon"
                    />
                  </span>
                </van-button>
              </div>

              <div v-else>
                <van-button
                  style="color: red; font-weight: 700; border: none"
                  size="small"
                  class="button-container2"
                >
                  <span class="button-content">
                    <img
                      src="../assets/eye.png"
                      alt="Icon"
                      class="button-icon"
                      style="margin-right: 0.1rem"
                    />
                    * {{ item.view }}
                  </span>
                </van-button>
              </div>
            </template>

            <template #label>
              <div style="display: flex">
                <van-rate
                  v-model="item.rate"
                  :size="20"
                  color="#ffd21e"
                  void-icon="like"
                  icon="like"
                  void-color="#eee"
                  :count="3"
                  readonly
                  allow-half
                />
                <div
                  style="margin-top: 3%; margin-left: 0.2rem"
                  v-if="showRatePlus[index]"
                >
                  + {{ formattedRate(item.rate) }}
                </div>
              </div>

              <div
                style="
                  margin-left: 4px;
                  margin-top: 7px;
                  width: 120%;
                  font-size: 12px;
                "
              >
                {{ item.create_time }}
              </div>
              <div style="margin-top: 1rem">
                <van-progress
                  :percentage="item.progressPercentage"
                  stroke-width="2"
                  :show-pivot="true"
                  :inactive="item.progressPercentage === 100"
                />
              </div>
            </template>
          </van-cell>
        </div>
      </van-list>
    </van-popup>

    <!-- 订单列表 -->
    <van-popup
      v-model:show="showOrderList"
      position="bottom"
      :style="{ height: '80%' }"
      closeable
      :lock-scroll="false"
    >
      <van-cell-group inset>
        <div style="font-size: 18px; font-weight: 700; margin: 1rem">
          购买记录
        </div>

        <div v-for="(item, index) in orderList" :key="index">
          <van-cell :title="`${item.coins} ${item.type}`">
            <template #label>
              <div style="font-size: 12px">{{ item.create_time }}</div>
            </template>
            <template #value>
              <div style="font-size: 12px">{{ item.title }}</div>
            </template>
          </van-cell>
        </div>
      </van-cell-group>
    </van-popup>

    <!-- 钻石交换 -->
    <van-popup
      v-model:show="showExchange"
      position="bottom"
      closeable
      :style="{ width: '100%', height: '38%' }"
      :lock-scroll="false"
      round
    >
      <van-cell-group inset>
        <div style="font-size: 20px; font-weight: 700; margin: 1rem">
          钻石换金币
        </div>
        <van-cell title="消耗钻石">
          <template #value>
            <van-stepper
              v-model="valueDiamonds"
              step="1"
              min="1"
              :max="userdiamonds"
            />
          </template>
        </van-cell>

        <van-cell title="金币增加" :value="valueCoins" />
        <van-button
          type="warning"
          block
          @click="confirmExchange"
          style="margin-top: 2rem"
          >确认交易</van-button
        >
      </van-cell-group>
    </van-popup>

    <loading v-if="loadingOrderList" />
    <toggleTheme ref="toggleThemeRef" v-if="showToggleTheme" />
  </div>
</template>




<style>
.custom-card {
  width: 100%;
}

.custom-thumb-image {
  width: 80px;
  height: auto;
}
.price-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin-top: -20px;
  height: 80px;
}
.button-purchase {
  margin-top: 70px;
}

.close-icon-checkAnswer {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 24px;
  color: black;
  cursor: pointer;
  font-size: 15px;
}
.dialog-content {
  margin: 20px;
  font-size: 14px;
  text-align: center;
}
.custom-button-checkAnswer-group {
  display: flex;
}

.container {
  width: 100%;
  margin: 0 auto;
  padding: 0;
}

.nav-bar-container {
  position: sticky;
  top: 0;
  z-index: 100;
}

@keyframes starFadeInOut {
  0%,
  100% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1); /* 中间状态最大 */
    opacity: 1;
  }
}
.button-container {
  position: relative;
  margin-top: 0.3rem;
}

.button-content {
  display: flex;
  align-items: center;
}

.button-icon {
  width: 16px;
  height: auto;
}

.custom-dark-dialog .van-dialog__message {
  color: red; /* 设置内容颜色 */
  font-weight: 700;
}
.custom-dark-dialog .van-dialog__header {
  background-color: white; /* 设置暗黑色背景 */
}

.custom-dark-dialog .van-dialog__footer {
  border-top-color: #444; /* 设置底部边框颜色为暗色 */
  background-color: gray; /* 设置暗黑色背景 */
}
.custom-container {
  display: flex;
  justify-content: space-between;
  background-color: #fff; /* 设置背景颜色为白色或其他浅色 */
  border-radius: 8px; /* 轻微圆角效果 */
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.2); /* 应用阴影效果 */
  margin: 10px auto; /* 为了更好的视觉效果和空间感，添加外边距，并居中对齐 */
  padding: 10px 0px; /* 增加内边距，使内容与边框有一定距离 */
  transition: box-shadow 0.3s ease; /* 平滑过渡效果 */
  width: 95%; /* 设置宽度为屏幕的94% */
}

.custom-cell {
  display: flex;
  justify-content: space-between;
  background-color: #fff; /* 设置背景颜色为白色或其他浅色 */
  border-radius: 8px; /* 轻微圆角效果 */
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.2); /* 应用阴影效果 */
  margin: 10px auto; /* 为了更好的视觉效果和空间感，添加外边距，并居中对齐 */
  padding: 15px 10px 8px 10px; /* 增加内边距，使内容与边框有一定距离 */
  transition: box-shadow 0.3s ease; /* 平滑过渡效果 */
  width: 95%; /* 设置宽度为屏幕的95% */
  /* max-width: 1200px; */
  font-size: 13px;
}

@media (max-width: 768px) {
  .custom-container {
    width: 92.5%;
  }
  .custom-cell {
    width: 95%;
  }
}

@media (max-width: 430px) {
  .custom-container {
    width: 95%;
  }
  .custom-cell {
    width: 95%;
  }
}
</style>
