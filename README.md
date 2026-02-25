# Bilibili 字幕学习助手

一款 Chrome 浏览器插件，自动拦截 Bilibili 视频的 AI 字幕数据，在页面右侧展示多语言字幕面板，助力英语学习。

## 功能特性

- 自动拦截 Bilibili AI 字幕（中文、英文等）
- 多语言筛选：支持同时展示多种语言字幕
- 点击跳转：点击任意字幕行跳转到对应视频时间
- 实时高亮：当前播放的字幕自动高亮并跟随滚动
- 面板可拖拽、可折叠，不遮挡视频播放

## 安装方法

1. 下载本项目源码
2. 打开 Chrome 浏览器，访问 `chrome://extensions`
3. 开启右上角的「开发者模式」
4. 点击「加载已解压的扩展程序」，选择本项目根目录
5. 打开 Bilibili 视频页面，字幕面板会自动出现

## 项目结构

```
src/
├── inject.js                  # 页面注入脚本（拦截字幕请求）
├── content/
│   ├── index.js               # Content script 入口
│   ├── components/            # UI 组件
│   ├── services/              # 数据服务
│   └── styles/                # CSS 样式
├── background/
│   └── service-worker.js      # 后台服务
└── utils/                     # 通用工具
```

## 开发调试

1. 修改代码后，在 `chrome://extensions` 页面点击插件的刷新按钮
2. 刷新 Bilibili 视频页面查看效果
3. 按 F12 打开控制台查看日志（过滤 `[BiliSub]`）
