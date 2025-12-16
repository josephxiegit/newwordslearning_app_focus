# macOS环境 - 从这里开始（Java和adb已配置）

## 第一步：打包Vue3项目为APK

### 1. 进入你的Vue3项目目录

```bash
cd ~/Downloads/newWordsLearning_app
```

### 2. 初始化Capacitor

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
```

安装完成后：

```bash
npx cap init
```

按提示输入：
- **App name**: `NewWordsLearning`
- **App Package ID**: `com.example.newwordslearning` **（记住这个！后面要用）**
- **Web assets directory**: 保持默认 `web` 回车即可

### 3. 构建Vue项目

```bash
npm run build
```

确保 `dist` 目录已生成。

### 4. 同步Capacitor配置

```bash
npx cap sync android
```

### 5. 用Android Studio打开项目

```bash
open -a "Android Studio" android/
```

Android Studio打开后：
1. 等待Gradle同步完成（底部显示进度，可能需要2-5分钟）
2. 如果弹出升级提示，选择 "Update"

### 6. 构建APK

在Android Studio菜单中：
- **Build → Build Bundle(s) / APK(s) → Build APK(s)**
- 选择 "debug"
- 等待编译（可能需要5-10分钟）

### 7. 找到生成的APK

编译成功后，APK位置为：

```
android/app/build/outputs/apk/debug/app-debug.apk
```

**记住你的包名**: `com.example.newwordslearning`

---

## 第二步：创建启动器应用（Launcher）

### 1. 创建新Android项目

在Android Studio中：
- **File → New → New Project**
- 选择 **"Empty Activity"**
- 填写信息：
  - **Name**: `CustomLauncher`
  - **Package name**: `com.example.customlauncher`
  - **Location**: 比如 `~/AndroidProjects/CustomLauncher`
  - **Language**: Kotlin
  - **Minimum SDK**: API 24 (Android 7.0)
- 点击 **"Create"**

### 2. 编辑 MainActivity.kt

打开 `app/src/main/java/com/example/customlauncher/MainActivity.kt`

全部替换为以下代码（**注意第7行的包名**）：

```kotlin
package com.example.customlauncher

import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.KeyEvent
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    
    // 修改为你的Vue3应用包名
    private val TARGET_APP_PACKAGE = "com.example.newwordslearning"
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        hideSystemUI()
        launchTargetApp()
    }
    
    private fun launchTargetApp() {
        try {
            val intent = packageManager.getLaunchIntentForPackage(TARGET_APP_PACKAGE)
            if (intent != null) {
                startActivity(intent)
            } else {
                android.util.Log.e("CustomLauncher", "应用未安装: $TARGET_APP_PACKAGE")
            }
        } catch (e: Exception) {
            android.util.Log.e("CustomLauncher", "启动应用失败: ${e.message}")
        }
    }
    
    private fun hideSystemUI() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(false)
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (
                android.view.View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    or android.view.View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    or android.view.View.SYSTEM_UI_FLAG_FULLSCREEN
                    or android.view.View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    or android.view.View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            )
        }
    }
    
    override fun onBackPressed() {
        // 禁用返回键 - 什么都不做
    }
    
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        return when (keyCode) {
            KeyEvent.KEYCODE_HOME -> true  // 禁用Home键
            else -> super.onKeyDown(keyCode, event)
        }
    }
    
    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            hideSystemUI()
        }
    }
}
```

### 3. 编辑 activity_main.xml

打开 `app/src/main/res/layout/activity_main.xml`

全部替换为：

```xml
<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@android:color/black">
</FrameLayout>
```

### 4. 编辑 AndroidManifest.xml

打开 `app/src/main/AndroidManifest.xml`

找到 `<activity>` 标签，替换为：

```xml
<activity
    android:name=".MainActivity"
    android:label="@string/app_name"
    android:launchMode="singleTask"
    android:theme="@style/Theme.CustomLauncher">
    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
        <category android:name="android.intent.category.HOME" />
        <category android:name="android.intent.category.DEFAULT" />
    </intent-filter>
</activity>
```

同时在 `<manifest>` 标签内添加权限（在 `<application>` 之前）：

```xml
<uses-permission android:name="android.permission.REORDER_TASKS" />
<uses-permission android:name="android.permission.QUERY_ALL_PACKAGES" />
```

### 5. 构建启动器APK

在Android Studio中：
- **Build → Build Bundle(s) / APK(s) → Build APK(s)**
- 选择 "debug"
- 等待完成

APK位置：
```
app/build/outputs/apk/debug/app-debug.apk
```

---

## 第三步：安装APK到红米平板

### 1. 在红米平板上启用USB调试

**在平板设置中**：
1. 设置 → 关于手机
2. 连续点击 "MIUI版本" 7次，直到看到 "开发者模式已启用"
3. 返回设置 → 更多设置 → 开发者选项
4. 打开 "USB调试" 开关
5. 用USB线连接平板到Mac

平板会弹出对话框，点击 **"允许"** 或 **"总是允许来自该计算机的调试"**

### 2. 验证设备连接

```bash
adb devices
```

应该看到类似输出：
```
List of attached devices
xxxxxxxxxxxxxxx    device
```

如果看不到设备，运行：
```bash
adb kill-server
adb start-server
adb devices
```

### 3. 复制APK文件到工作目录

```bash
# 创建工作目录
mkdir -p ~/AndroidAPKs

# 复制Vue应用APK
cp ~/Downloads/newWordsLearning_app/cordova-app/platforms/android/app/build/outputs/apk/debug/app-debug.apk ~/AndroidAPKs/newwordslearning.apk

# 复制启动器APK（假设你的CustomLauncher项目在 ~/AndroidProjects 目录）
cp ~/AndroidProjects/CustomLauncher/app/build/outputs/apk/debug/app-debug.apk ~/AndroidAPKs/customlauncher.apk

# 进入工作目录
cd ~/AndroidAPKs
```

### 4. 安装两个APK

```bash
# 安装Vue应用
adb install newwordslearning.apk

# 安装启动器
adb install customlauncher.apk

# 验证安装成功
adb shell pm list packages | grep newwordslearning
adb shell pm list packages | grep customlauncher
```

两个命令都应该输出对应的包名，如果有输出说明安装成功。

### 5. 设置启动器为默认HOME应用

```bash
adb shell cmd package set-home-activity com.example.customlauncher/.MainActivity
```

如果命令行方式不生效，手动设置：
1. 在平板上按 **Home键**
2. 会弹出选择启动器的对话框
3. 选择 **CustomLauncher**
4. 勾选 **"始终使用"**

### 6. 验证安装和启动

```bash
# 启动启动器应用
adb shell am start com.example.customlauncher/.MainActivity

# 此时平板屏幕应该黑屏，然后自动启动你的Vue应用
```

---

## 第四步：进一步锁定（推荐）

### 1. 禁用USB调试

APK安装完成后，运行：

```bash
adb shell settings put global adb_enabled 0
```

### 2. 在平板上设置屏幕PIN锁

1. 设置 → 安全 → 屏幕锁定
2. 选择 "PIN" 或 "图案"
3. 设置强密码（用户无法进入设置，就无法改变任何东西）

### 3. 隐藏开发者选项（可选）

```bash
adb shell settings put global development_settings_enabled 0
```

---

## 快速参考 - 常用命令

```bash
# 查看设备
adb devices

# 安装APK
adb install app.apk

# 强制覆盖安装
adb install -r app.apk

# 卸载应用
adb uninstall com.example.packagename

# 启动应用
adb shell am start com.example.customlauncher/.MainActivity

# 停止应用
adb shell am force-stop com.example.customlauncher

# 查看日志
adb logcat | grep CustomLauncher

# 清空日志
adb logcat -c

# 重启设备
adb reboot

# 进入shell
adb shell
```

---

## 问题排查

| 问题                                | 解决方案                                                     |
| ----------------------------------- | ------------------------------------------------------------ |
| `adb: command not found`            | 运行 `source ~/.zshrc` 重载环境                              |
| `error: no devices/emulators found` | 检查USB调试是否启用，USB线是否正常                           |
| `Installation failed`               | 先卸载：`adb uninstall com.example.newwordslearning`，再安装 |
| 启动器不工作                        | 检查MainActivity.kt第11行包名是否正确                        |
| Vue应用没启动                       | 查看日志：`adb logcat \| grep CustomLauncher`                |

完成这些步骤后，你的红米平板就会变成一个只能运行你Vue应用的专用设备了！