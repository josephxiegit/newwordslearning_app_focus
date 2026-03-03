/**
 * ===========================
 * 客户端版本信息（唯一来源）
 * ===========================
 * 
 * ⚠️ 每次打包 APK 前只需要改这个文件
 * ⚠️ 前端更新检测、日志、调试统一引用
 */

// 客户端版本号（用于与后端对比）
export const CLIENT_VERSION = "26.03.03.1";

// 当前 APK 文件名（用于后端识别、展示）
export const CLIENT_APK = "apk_26.03.03.1.apk";

// 可选：发布渠道
export const RELEASE_CHANNEL = "stable"; // stable | beta | test

// 可选：构建时间（方便你确认是否是新包）
export const BUILD_TIME = "2026-01-20 10:30";

// 统一对象（可选，用于一次性引用）
export const APP_VERSION_INFO = {
  version: CLIENT_VERSION,
  apk: CLIENT_APK,
  channel: RELEASE_CHANNEL,
  buildTime: BUILD_TIME,
};