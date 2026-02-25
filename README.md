# Bilibili 字幕学习助手

一款 Chrome 浏览器扩展，自动拦截 Bilibili 视频的 AI 字幕数据，提供双语对照、智能分句、循环复读、AB 段重播等功能，助力语言学习。

## 功能特性

**字幕拦截与双语合并**
- 自动拦截 Bilibili AI 字幕（支持中文、英文、日文、韩文）
- 智能双语对照：目标语言 + 母语同步展示
- 自动拉取多语言字幕数据并合并为双语时间轴

**智能分句**
- 基于标点、连接词、时间间隔自动合并碎片字幕为完整句子
- 支持 CJK 与西文不同的分句策略
- 最多合并 4 条相邻字幕片段

**三种显示模式**
- 🎓 学习模式：显示目标语言，点击展开翻译
- 📚 双语模式：同时显示目标语言和母语
- 📖 辅助模式：显示母语，点击展开原文

**循环复读**
- 单句循环：点击循环按钮可切换无限循环 / 5 次重复 / 停止
- AB 段重播：自由选择起止字幕段落进行区间循环播放

**播放控制**
- 0.5x ~ 1.5x 五档变速播放
- 点击字幕跳转到对应视频时间
- 实时高亮当前播放字幕，自动滚动跟随

**面板交互**
- 可拖拽、可折叠、可关闭
- 面板位置和设置自动持久化（chrome.storage）
- 深色主题，与 Bilibili 风格融合

## 安装方法

### 从源码加载（开发者模式）

1. 下载或克隆本项目：
   ```bash
   git clone https://github.com/vonxq/bilibili-subtitle-ext.git
   ```
2. 打开 Chrome 浏览器，访问 `chrome://extensions`
3. 开启右上角的「开发者模式」
4. 点击「加载已解压的扩展程序」，选择本项目根目录
5. 打开任意 Bilibili 视频页面，点击扩展图标即可打开字幕面板

## 技术栈

- Chrome Extension Manifest V3
- 纯 JavaScript（无框架、无构建工具）
- CSS 自定义属性 + BEM 命名

## 项目结构

```
bilibili-subtitle-ext/
├── manifest.json                          # 扩展配置
├── src/
│   ├── inject.js                          # 页面上下文脚本（拦截 fetch/XHR）
│   ├── background/
│   │   └── service-worker.js              # 后台 worker（处理图标点击）
│   ├── utils/
│   │   ├── constants.js                   # 全局常量、事件名、选择器
│   │   ├── time.js                        # 时间格式化工具
│   │   └── dom.js                         # DOM 操作工具
│   ├── content/
│   │   ├── index.js                       # Content script 入口
│   │   ├── services/
│   │   │   ├── player-service.js          # 视频播放器控制
│   │   │   ├── repeater-service.js        # 循环重播核心引擎
│   │   │   ├── sentence-service.js        # 字幕智能分句算法
│   │   │   └── subtitle-service.js        # 字幕数据管理与双语合并
│   │   ├── components/
│   │   │   ├── Panel.js                   # 主面板
│   │   │   ├── Header.js                  # 面板头部栏
│   │   │   ├── Settings.js                # 语言设置面板
│   │   │   ├── ModeSelector.js            # 显示模式切换
│   │   │   ├── ABRepeatBar.js             # AB 段重播控制栏
│   │   │   ├── SubtitleItem.js            # 单条字幕项
│   │   │   ├── SubtitleList.js            # 字幕列表容器
│   │   │   └── SpeedControl.js            # 播放速度控制
│   │   └── styles/
│   │       ├── panel.css                  # 面板样式 + CSS 变量
│   │       ├── filter.css                 # 模式选择器、速度控制样式
│   │       └── subtitle.css               # 字幕项、循环按钮、AB 栏样式
```

## 开发调试

1. 在 `chrome://extensions` 页面启用开发者模式，加载本项目根目录
2. 修改代码后，点击扩展的刷新按钮
3. 刷新 Bilibili 视频页面查看效果
4. 按 F12 打开控制台查看日志

## 许可证

MIT License
