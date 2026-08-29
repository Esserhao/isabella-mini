# 古先生的调香日记

一款基于 uni-app 的微信小程序，帮助用户通过交互式配比滑块探索香水香调组合，生成可分享的封存卡片。

## 功能

- 开屏三道题小调查，根据偏好推荐香水
- 图鉴页展示多款香水信息，含六维雷达图
- 工坊页提供 12 种香调滑块，实时调整配比并同步更新雷达图
- 一键模板、撤销、重置功能
- 封存生成卡片，可保存到相册或分享
- 每日挑战功能

## 技术栈

- uni-app + Vue 3（`<script setup>`）
- 编译目标：mp-weixin（微信小程序）
- Canvas 2D 绘制雷达图与封存卡片
- 无后端依赖，无 API 调用，数据纯前端处理

## 本地开发

```bash
# 安装依赖
npm install

# 构建微信小程序
npm run build:mp-weixin

# 产物路径
# dist/build/mp-weixin
```

使用微信开发者工具导入 `dist/build/mp-weixin` 目录即可预览和调试。

## 项目结构

```
src/
├── pages/          # 页面
│   ├── home/       # 首页
│   ├── gallery/    # 图鉴
│   ├── lab/        # 工坊（调香台）
│   ├── card/       # 封存卡
│   ├── community/  # 我的
│   ├── history/    # 历史配方
│   ├── favorites/  # 我的收藏
│   ├── feedback/   # 留言建议
│   ├── notes/      # 手记
│   ├── contact/    # 联系我
│   ├── tutorial/   # 使用指南
│   └── disclaimer/ # 免责声明
├── components/     # 公共组件
├── utils/          # 工具函数
│   ├── canvas-draw.js  # Canvas 绘制
│   ├── data.js         # 香水数据
│   ├── mix.js          # 配比计算
│   └── ...
├── static/         # 静态资源
│   ├── gallery/    # 香调图标
│   └── logo.png
└── App.vue
```

## 图片资源

图鉴香水图片通过 GitHub raw 链接加载，不占用小程序主包空间。
香调图标保留在本地 `src/static/gallery/accords/`。

## 注意事项

- 微信小程序主包上限 2MB，当前主包约 382KB
- 图片资源需在微信公众平台配置 downloadFile 合法域名
- 无 AI 能力，无 API 调用，纯前端交互