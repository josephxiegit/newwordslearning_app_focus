<script setup>
import {
  watch,
  onMounted,
  ref,
  getCurrentInstance,
  onBeforeUpdate,
  computed,
  onUnmounted,
  inject,
} from "vue";
import Typed from "typed.js";

import {
  showFailToast,
  showToast,
  showLoadingToast,
  showDialog,
  showSuccessToast,
} from "vant";
import { Base64 } from "js-base64";
import { useRouter } from "vue-router";

const flagTheme = inject("flagTheme");
const router = useRouter();
const instance = getCurrentInstance();
const axios = instance.appContext.config.globalProperties.$ajax;

const missyouFlag = ref(false);
const missDays = ref(2);
const userAccount = ref("");
const passwordAccount = ref("");

async function submitAccountData() {
  let params = new URLSearchParams();
  params.append("method", "getUserData");
  params.append("user", userAccount.value);
  params.append("password", passwordAccount.value);

  return await axios.post("words/", params).then((ret) => {
    return ret.data;
  });
}

const submitAccount = () => {
  if (passwordAccount.value.trim() && userAccount.value.trim()) {
    submitAccountData().then((res) => {
      console.log("res: ", res);
      if (res == "用户名不存在") {
        showFailToast("用户名不存在");
        setTimeout(() => {
          showToast({
            message: "提示：姓名全拼音全小写，如：张三：zhangsan",
            duration: 0,
            closeOnClick: true,
          });
        }, 1500);
        return;
      } else if (res == "密码错误") {
        showFailToast("密码错误");
        return;
      } else if (res.status == false) {
        showFailToast("用户暂时冻结");
        return;
      } else {
        // 主题选择
        localStorage.setItem("theme_name", res.theme.theme_name);
        if (res.theme.theme_name == "喜羊羊与灰太狼") {
          flagTheme.value = 1;
        }
        if (res.theme.theme_name == "熊出没") {
          flagTheme.value = 2;
        }

        async function missTask() {
          let params = new URLSearchParams();
          params.append("method", "missTask");
          params.append("user", userAccount.value);
          return await axios.post("words/", params).then((ret) => {
            return ret.data;
          });
        }

        async function userTestUpdate() {
          let params = new URLSearchParams();
          params.append("method", "userTestUpdate");
          return await axios.post("words/", params).then((ret) => {
            return ret.data;
          });
        }

        async function executeTasks() {
          const res_miss = await missTask();
          if (res_miss.message != "无") {
            missyouFlag.value = true;
            missDays.value = res_miss.message;
            console.log("missDays.value: ", missDays.value);
          }

          if (userAccount.value == "user" || userAccount.value == "teacher") {
            await userTestUpdate();
            router.push({
              path: "/studentAccountList",
              state: {
                data: JSON.stringify(res),
                missyouflag: missyouFlag.value,
                missDays: missDays.value,
              },
            });
          } else {
            const userData = {
              username: userAccount.value.trim(),
              password: passwordAccount.value.trim(),
            };
            const now = new Date();
            const expirationDate = new Date(
              now.getTime() + 7 * 24 * 60 * 60 * 1000
            );
            localStorage.setItem("userData", JSON.stringify(userData));
            localStorage.setItem(
              "expirationDate",
              expirationDate.toISOString()
            );
            router.push({
              path: "/studentAccountList",
              state: {
                data: JSON.stringify(res),
                missyouflag: missyouFlag.value,
                missDays: missDays.value,
              },
            });
          }
        }
        executeTasks();
      }
    });
  } else {
    showFailToast("账号密码不能为空");
  }
};

const pushUserTest = () => {
  let res = new Promise((resolve, reject) => {
    userAccount.value = "user";
    passwordAccount.value = "password";
    resolve("ok");
  });
  res.then((res) => {
    submitAccount();
  });
};

const typed = ref(null);
const pRef = ref(null);
const videoRef = ref(null);

const gotoParent = () => {
  showToast({
    message: "平板/电脑暂不支持",
    duration: 0,
    closeOnClick: true,
  });
};

// 强制播放视频
const forcePlayVideo = async () => {
  if (videoRef.value) {
    try {
      await videoRef.value.play();
      console.log("视频自动播放成功");
    } catch (error) {
      console.log("自动播放失败，尝试静音播放:", error);
      // 如果自动播放失败，确保静音后重试
      videoRef.value.muted = true;
      try {
        await videoRef.value.play();
        console.log("静音播放成功");
      } catch (retryError) {
        console.log("播放失败:", retryError);
      }
    }
  }
};

onMounted(async () => {
  const expirationDate = localStorage.getItem("expirationDate");
  if (expirationDate) {
    const now = new Date();
    const expiration = new Date(expirationDate);
    if (now >= expiration) {
      localStorage.removeItem("userData");
      localStorage.removeItem("expirationDate");
    } else {
      let res = new Promise((resolve, reject) => {
        const userData = JSON.parse(localStorage.getItem("userData"));
        console.log("userData: ", userData);
        userAccount.value = userData["username"];
        passwordAccount.value = userData["password"];
        resolve("ok");
      });
      res.then(() => {
        submitAccountData().then((res) => {
          console.log("res: ", res);
          router.push({
            path: "/studentAccountList",
            state: {
              data: JSON.stringify(res),
            },
          });
        });
      });
    }
  } else {
    userAccount.value = "";
    passwordAccount.value = "";
  }

  // 开场动画
  const options = {
    strings: ["每天10分钟", "扫码背单词"],
    typeSpeed: 140,
    backSpeed: 60,
    showCursor: false,
    onComplete: (self) => {
      setTimeout(() => {
        self.reset();
        self.start();
      }, 1500);
    },
    onStringTyped: (arrayPos, self) => {
      if (arrayPos === 0) {
        self.options.typeSpeed = 120;
        self.options.backSpeed = 50;
      } else if (arrayPos === 1) {
        self.options.typeSpeed = 140;
        self.options.backSpeed = 60;
      }
    },
  };
  typed.value = new Typed(pRef.value, options);


});

onUnmounted(() => {
  if (typed.value) {
    typed.value.destroy();
  }
});
</script>

<template>
  <div class="page-container">
    <!-- 视频背景 -->
  <div class="background-image-container">
    </div>
    
    <div class="content-wrapper">
      <!-- 主要内容区域：左右布局 -->
      <div class="main-content">
        <!-- 左侧：打字动画标题 -->
        <div class="left-section">
          <!-- Logo -->
          <div class="logo-container">
            <div class="logo logo-large" data-text="♠ Designed by xie ♠">
              ♠ Designed by xie ♠
            </div>
          </div>
          <div class="typing-container">
            <div ref="pRef" class="content"></div>
          </div>
        </div>

        <!-- 右侧：登录表单 -->
        <div class="right-section">
          <div class="login-box">
            <van-cell-group inset>
              <div class="header-section">
                <div class="login-title">请输入账户名和密码</div>
              </div>
              <van-field
                v-model="userAccount"
                label="用户"
                placeholder="请输入用户名"
                size="normal"
                class="large-field"
              />
              <van-field
                v-model="passwordAccount"
                type="password"
                label="密码"
                placeholder="请输入密码"
                size="normal"
                class="large-field"
              />
            </van-cell-group>
            <div class="button-group">
              <van-button type="success" plain block @click="submitAccount"
                >提交</van-button
              >
            </div>
            <div class="test-user-container">
              <van-button
                type="warning"
                plain
                @click="pushUserTest"
                size="normal"
                class="test-user-button"
                >点击体验</van-button
              >
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
html,
body {
  height: 100%;
  overflow-x: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
  margin: 0;
  padding: 0;
}

* {
  box-sizing: border-box;
}

.page-container {
  min-height: 100vh;
  width: 100%;
  position: relative;
  overflow: hidden;
}

/* 视频背景 */
.background-image-container {
  /* 确保覆盖整个视口 */
  position: fixed; 
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0; /* 保持在最底层 */

  /* 使用 CSS 属性设置图片 */
  background-image: url("../assets/homepagebackground.jpg"); /* 这里的路径需要根据您的实际文件结构来确定 */
  background-size: cover; /* 关键：确保图片覆盖整个容器 */
  background-position: center; /* 确保图片居中显示 */
  background-repeat: no-repeat; /* 防止图片重复平铺 */
}

.page-container::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.1);
  z-index: 0;
  pointer-events: none;
}

.content-wrapper {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 60px;
}

.main-content {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 60px;
  width: 100%;
  max-width: 1200px;
}

.left-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 30px;
}

.right-section {
  flex: 1.4;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 打字动画 */
.typing-container {
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.content {
  font-size: 28px;
  font-weight: 600;
  color: #E7C8C8;
  text-align: center;
  
  line-height: 1.2; 
  margin: 0; 
  padding: 0;
}

/* 登录表单 */
.login-box {
  width: 100%;
  max-width: 450px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.7);
  border-radius: 16px;
  padding: 24px;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 0 20px;
}

.login-title {
  padding: 20px 0px;
  font-weight: 700;
  font-size: 18px;
  color: #333;
}

.large-field :deep(.van-field__label),
.large-field :deep(.van-field__control) {
  font-size: 16px;
}

.button-group {
  margin-top: 20px;
}

:deep(.van-button) {
  font-size: 16px;
  height: 44px;
}

.test-user-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.test-user-button {
  min-width: 100px;
}

/* Logo */
.logo-container {
  width: 100%;
  text-align: center;
  margin-bottom: 0;
}

.logo {
  font-size: 40px;
  font-family: "SourceHanSansCN-Bold", -apple-system, BlinkMacSystemFont,
    "Segoe UI", Roboto, sans-serif;
  font-weight: 700;
  color: #222;
  position: relative;
  display: inline-block;
  overflow: hidden;
}

.logo-large {
  font-size: 18px;
}

.logo::after {
  content: attr(data-text);
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-image: linear-gradient(
    to right,
    rgb(236, 72, 153),
    rgb(239, 68, 68),
    rgb(234, 179, 8)
  );
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  clip-path: ellipse(80px 80px at 50% 50%);
  animation: move 5s linear infinite;
  white-space: nowrap;
}

@keyframes move {
  0%,
  100% {
    clip-path: ellipse(80px 80px at 0% 50%);
  }
  50% {
    clip-path: ellipse(80px 80px at 100% 50%);
  }
}

/* 响应式设计 */
@media (min-width: 768px) {
  .content {
    font-size: 48px;
  }

  .login-box {
    max-width: 500px;
  }

  .login-title {
    font-size: 20px;
  }

  .logo-large {
    font-size: 22px;
  }
}

@media (max-width: 767px) {
  .main-content {
    flex-direction: column;
    gap: 40px;
  }

  .left-section,
  .right-section {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .content {
    font-size: 28px;
  }

  .login-title {
    font-size: 16px;
  }

  .parent-link-button {
    font-size: 12px;
    padding: 5px 10px;
  }

  .login-box {
    padding: 20px;
  }
}
</style>