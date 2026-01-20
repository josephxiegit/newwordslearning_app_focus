<template>

</template>

<script>
const BASE_URL = 'http://39.105.1.189:8000/newwordslearning'
// const BASE_URL = 'http://127.0.0.1:8000/newwordslearning'
// const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/newwordslearning'
export default {
  BASE_URL,
}
// npm run dev
// npm run build

// 可以不用执行: 造成不兼容
/*
cordova platform remove android
cordova platform add android

cat > platforms/android/app/src/main/res/xml/network_security_config.xml <<'EOF'
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="true" />
</network-security-config>
EOF
*/



/*
// 修改版本号：/Users/jiegengzhe/Desktop/newWordsLearning_app/src/version.js 将数字改大
// 确保studentAccountList.vue和studentAccountListPc.vue中都修改了
// onmouted中的版本检查代码

cd ~/desktop/newWordsLearning_app/
npm run build

cd cordova-app/ 
cordova prepare android
cordova clean android
cordova build android

// 复制版本号
// 修改apk文件名称：/Users/jiegengzhe/Desktop/newWordsLearning_app/cordova-app/platforms/android/app/build/outputs/apk/debug/app-debug.apk
// 将文件放入网盘：apk_26.01.19.1.apk
// 将文件放入服务器：ssh://root@39.105.1.189/usr/StudentsRehearsals/data/app/apk_26.01.19.1.apk

（可能要修改apk名字）
全局删除
adb uninstall com.newwordslearning
只删除主空间
adb shell pm uninstall --user 0 com.newwordslearning

// 安装主空间
// adb install /Users/jiegengzhe/Desktop/newWordsLearning_app_focus/cordova-app/platforms/android/app/build/outputs/apk/debug/apk_f.26.01.20.1.apk
安装主空间测试用：
adb install /Users/jiegengzhe/Desktop/newWordsLearning_app_focus/cordova-app/platforms/android/app/build/outputs/apk/debug/app-debug.apk

（几乎无用）设置app为桌面应用：
adb shell cmd package set-home-activity com.newwordslearning/.MainActivity
// （几乎无用）启动app：
// adb shell am start com.newwordslearning/.MainActivity
*/

/*
第一空间apk复制到第二空间
adb shell pm install-existing --user 10 com.newwordslearning

第二空间设置桌面为app：（卸载本身的桌面）
adb shell pm uninstall --user 10 com.miui.home

第二空间恢复桌面：1. 确保app已安装 2. app冻结
（可以不做）adb shell cmd package install-existing --user 10 com.miui.home
adb shell pm disable-user --user 10 com.newwordslearning

恢复成桌面app：1. 解冻app 2. 卸载本身桌面
adb shell pm enable --user 10 com.newwordslearning
adb shell pm uninstall --user 10 com.miui.home
*/

/*
版本更新
修改版本号：/Users/jiegengzhe/Desktop/newWordsLearning_app/src/version.js 将数字改大
复制版本号
修改apk文件名称：/Users/jiegengzhe/Desktop/newWordsLearning_app/cordova-app/platforms/android/app/build/outputs/apk/debug/app-debug.apk
将文件放入网盘：
将文件放入服务器：ssh://root@39.105.1.189/usr/StudentsRehearsals/data/app/apk_26.01.20.1.apk
*/

</script>

<style scoped>

</style>