# 古先生的调香日记

一款基于微信小程序的香水调配工具。通过三道题了解你的偏好，实时调整 12 种香调配比，生成专属香水封存卡。

## 功能

- **首页**：开屏三道题小调查，推荐最贴合你的香水；雷达图实时展示香气画像
- **图鉴**：11 款经典香水资料，六维雷达图对比，一键载入工坊
- **工坊**：12 种香调滑块实时调香，雷达图同步变化；一键模板、撤销、重置；封存生成专属卡片
- **我的**：连续调香天数、封存/收藏/分享统计、每日挑战

## 技术栈

- uni-app + Vue 3 `<script setup>`
- 目标平台：mp-weixin（微信小程序）
- Canvas 2D 手绘雷达图与封存卡
- 香调归一化算法（最大余数法，保证总和恒为 100）

## 本地开发

```bash
# 安装依赖
npm install

# 运行构建
npm run build:mp-weixin

# 产物在 dist/build/mp-weixin，用微信开发者工具导入
```

## 图片说明

图鉴图片通过 GitHub raw 加载，不占用小程序主包空间。
香调图标保留在本地（`src/static/gallery/accords/`）。

## 注意事项

- 微信小程序主包上限 2MB，当前主包约 382KB
- `initCanvas` 中的 `uni.getWindowInfo` 需加 `&&` 守卫（旧基础库兼容）
- 原生 `<canvas type="2d">` 无法用 `z-index` 覆盖，弹窗时需 `display:none` 隐藏
- storage key 统一保留 `isabella_` 前缀