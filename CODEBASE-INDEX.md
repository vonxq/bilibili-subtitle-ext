# Bilibili 字幕助手 — 代码索引

> 最后更新：2026-02-27
> 总行数：约 4800+ 行（含收藏功能 + 自动录制切片）

## 项目概览

Chrome Extension Manifest V3 插件，拦截 Bilibili 视频页面的 AI 字幕数据，提供双语对照、智能分句、循环复读、AB段重播、收藏（单句/AB 段、备注 Markdown+图片、标签、本地切片录制）等语言学习功能。纯 JavaScript，无框架无构建工具。

---

## 文件结构与行数

```
bilibili-subtitle-ext/
├── manifest.json                                    # 扩展配置，定义加载顺序
├── src/
│   ├── inject.js                          (109行)   # 页面上下文脚本，拦截 fetch/XHR
│   ├── background/
│   │   ├── service-worker.js              (125行)   # 后台 worker，图标点击、收藏页、切片 IndexedDB 存取
│   │   ├── offscreen.html                   (10行)   # Offscreen 文档（已弃用）
│   │   └── offscreen-recorder.js            (85行)   # Tab 录制（已弃用，切片现由 content 直接录制）
│   ├── utils/
│   │   ├── constants.js                    (72行)   # 全局常量、事件名、选择器
│   │   ├── time.js                         (20行)   # 时间格式化工具
│   │   └── dom.js                          (60行)   # DOM 操作工具
│   ├── content/
│   │   ├── index.js                        (27行)   # Content script 入口
│   │   ├── services/
│   │   │   ├── player-service.js           (51行)   # 视频播放器控制
│   │   │   ├── repeater-service.js        (153行)   # 循环重播核心引擎
│   │   │   ├── sentence-service.js        (160行)   # 字幕智能分句算法
│   │   │   ├── subtitle-service.js        (165行)   # 字幕数据管理与双语合并
│   │   │   ├── shortcut-service.js        (199行)   # 快捷键：左右切句、空格播放/暂停/单句循环
│   │   │   ├── bookmark-service.js       (231行)   # 收藏 CRUD、标签、备注图片 IndexedDB
│   │   │   ├── clip-service.js           (249行)   # 视频切片自动录制（ring buffer 20句）、通过 background 持久化
│   │   │   └── auto-subtitle-service.js    (91行)   # 自动控制 B 站字幕菜单/双语开关
│   │   ├── components/
│   │   │   ├── NoteEditor.js              (126行)   # 备注 Markdown 编辑、粘贴图片、编辑/预览切换
│   │   │   ├── BookmarkDialog.js         (508行)   # 收藏弹窗：双语预览、切片预览、备注、标签、录制切片
│   │   │   ├── Header.js                   (50行)   # 面板头部栏
│   │   │   ├── Settings.js                (150行)   # 语言/快捷键/默认显示模式设置面板
│   │   │   ├── ModeSelector.js             (79行)   # 显示模式切换（学习/双语/辅助）
│   │   │   ├── ABRepeatBar.js             (180行)   # AB段重播控制栏（含收藏此 AB 段）
│   │   │   ├── SubtitleItem.js            (164行)   # 单条字幕项（含播放/循环/收藏按钮）
│   │   │   ├── SubtitleList.js             (98行)   # 字幕列表容器
│   │   │   ├── SpeedControl.js             (77行)   # 播放速度控制
│   │   │   └── Panel.js                   (215行)   # 主面板（组装所有组件，触发自动录制）
│   │   └── styles/
│   │       ├── panel.css                  (148行)   # 面板、设置面板样式 + CSS变量
│   │       ├── filter.css                  (92行)   # 模式选择器、速度控制样式
│   │       └── subtitle.css               (860行)   # 字幕项、循环按钮、AB栏、BookmarkDialog 切片预览样式
│   ├── bookmarks/
│   │   ├── bookmarks.html                  (45行)   # 收藏独立页
│   │   ├── bookmarks.js                  (495行)   # 聚合、筛选、显示模式（双语/学习/辅助）、TTS、卡片渲染、切片预览、导出
│   │   └── bookmarks.css                 (380行)   # 收藏页白+蓝主题、现代 card、操作在卡片右上角
│   ├── options/
│   │   ├── popup.html                      (90行)   # 浏览器工具栏图标点击时的设置弹窗
│   │   └── popup.js                       (140行)   # 弹窗逻辑（语言设置、默认模式、授权码）
```

---

## manifest.json 加载顺序

```
CSS:  panel.css → filter.css → subtitle.css
JS:   constants → time → dom
    → player-service → repeater-service → sentence-service → subtitle-service → shortcut-service → bookmark-service → clip-service → auto-subtitle-service
    → SubtitleItem → SubtitleList → ABRepeatBar → NoteEditor → BookmarkDialog
    → Settings → ModeSelector → SpeedControl → Header → Panel
    → index.js（入口）
```

**新增模块必须按依赖顺序插入此列表。**

---

## 模块 API 索引

### utils/constants.js
- **模块名**: `window.BiliSub.Constants`（直接对象，非 IIFE）
- **职责**: 集中管理所有常量
- **关键内容**:
  - `EVENTS` — 含 `BOOKMARK_ADDED` 等（见事件流）
  - `DISPLAY_MODES` — `bilingual` / `learning` / `assisted`
  - `SUPPORTED_LANGS` — `['zh', 'en', 'ja', 'es', 'ar', 'pt']`
  - `SELECTORS` — DOM 选择器（`VIDEO`, `PLAYER_CONTAINER`, `VIDEO_WRAPPER`）
  - `STORAGE_KEYS` — chrome.storage 存储键（语言、显示模式、面板位置、播放速度、默认模式策略、默认模式、快捷键开关、`BOOKMARKS`、`BOOKMARK_TAGS` 等）
  - `INDEXEDDB` — `NAME: 'bili-sub-db'`，`CLIPS_STORE`、`NOTE_IMAGES_STORE`
  - `DEFAULTS` — 默认配置（母语 zh、目标语 en、辅助模式、速度 1x）
  - `SENTENCE` — 分句算法参数（最大合并数 4、时间间隔阈值 1.5s 等）
  - `REPEATER` — 循环重播配置：`LOOP_OPTIONS: [Infinity, 5]`，`PAUSE_BETWEEN_LOOPS: 500`
  - `SPEED_OPTIONS` — `[0.5, 0.75, 1, 1.25, 1.5]`

### utils/time.js
- **模块名**: `window.BiliSub.Time`（直接对象）
- **职责**: 秒数 → 时间字符串
- **API**:
  - `format(seconds)` → `"MM:SS"`
  - `formatWithMs(seconds)` → `"MM:SS.mmm"`

### utils/dom.js
- **模块名**: `window.BiliSub.DOM`（直接对象）
- **职责**: DOM 操作封装
- **API**:
  - `create(tag, className, attrs)` → HTMLElement（attrs 支持 textContent/innerHTML/其他属性）
  - `appendChildren(parent, ...children)` → parent
  - `onEvent(target, event, handler)` → 返回取消函数
  - `injectPageScript(url)` → 注入 `<script>` 到页面
  - `waitForElement(selector, timeout?)` → Promise<Element>

---

### services/player-service.js
- **模块名**: `window.BiliSub.PlayerService`（IIFE）
- **依赖**: Constants
- **职责**: 视频元素操作、时间跟踪
- **API**:
  - `getVideo()` → HTMLVideoElement（带缓存）
  - `getCurrentTime()` → number
  - `seekTo(time)` → 跳转到指定时间
  - `startHighlightTracking(callback)` → 每 200ms 调用 callback(currentTime)
  - `stopHighlightTracking()` → 停止跟踪
- **监听事件**: `SEEK_TO` → 调用 seekTo

### services/repeater-service.js
- **模块名**: `window.BiliSub.RepeaterService`（IIFE）
- **依赖**: Constants
- **职责**: 循环重播核心引擎（单句重播 + AB段重播）
- **内部状态**: `{ active, sentenceFrom, sentenceTo, loopTotal, loopCount, originalSpeed, mode }`
  - `mode`: `'sentence'`（单句）或 `'ab'`（AB段）
- **API**:
  - `play(from, to, loopTotal, mode?)` → 开始循环播放，mode 默认 `'sentence'`
  - `stop(silent?)` → 停止播放。silent=true 不触发通知（内部使用）
  - `setLoopTotal(total)` → 运行中切换循环次数（不重启播放）
  - `isActive()` → boolean
  - `getState()` → 状态快照 `{ active, from, to, loopTotal, loopCount, mode }`
  - `setSpeed(rate)` → 设置播放速率
  - `getSpeed()` → 当前速率
  - `onStateChange(callback)` → 注册状态变化监听
- **触发事件**: `REPEATER_STATE`（CustomEvent on window，detail 为状态快照）
- **核心逻辑**: 每 50ms 检查播放边界，到达终点时立即 `pause + seekBack`（防止闪到下一句），等 500ms 后重播

### services/sentence-service.js
- **模块名**: `window.BiliSub.SentenceService`（IIFE）
- **依赖**: Constants.SENTENCE
- **职责**: 将字幕条目智能合并为完整句子
- **API**:
  - `groupIntoSentences(body, lang)` → 分句结果 `[{ from, to, segments, mergedContent }]`
  - `buildBilingualTimeline(targetBody, targetLang, nativeBody, nativeLang)` → 双语时间轴 `[{ from, to, target, native, segments }]`
- **分句策略**: 根据终止标点、连接词、CJK 短片段、时间间隔等规则决定是否合并相邻条目，上限 4 条

### services/bookmark-service.js
- **模块名**: `window.BiliSub.BookmarkService`（IIFE）
- **依赖**: Constants
- **职责**: 收藏 CRUD、标签列表、导出 JSON、备注图片 IndexedDB（saveNoteImage/getNoteImage/deleteNoteImages）
- **API**: `add(bookmark)`、`list()`、`get(id)`、`update(id, patch)`、`remove(id)`、`getAllTags()`、`exportBookmarks()`、`saveNoteImage(bookmarkId, index, blob)`、`getNoteImage(bookmarkId, index)`、`deleteNoteImages(bookmarkId)`、`getDb()`
- **触发事件**: `BOOKMARK_ADDED`

### services/clip-service.js
- **模块名**: `window.BiliSub.ClipService`（IIFE）
- **依赖**: PlayerService, SubtitleService
- **职责**: 自动录制当前句（ring buffer 最近 20 句）、通过 background 持久化切片到扩展 origin IndexedDB
- **API**:
  - `startAutoRecord()` → 开始自动录制（监听 video timeupdate，按句录制到内存 ring buffer）
  - `stopAutoRecord()` → 停止自动录制并停止当前自动录制的 MediaRecorder
  - `getAutoClip(from, to)` → Blob | null，从 ring buffer 获取单句切片
  - `requestClip(fromSec, toSec)` → Promise\<{clipId, blob}\>，始终按需录制一段新切片（不再依赖自动缓存），录制结束后立即持久化
  - `recordFreshClip(fromSec, toSec)` → Promise\<{clipId, blob}\>，与 `requestClip` 相同策略，但显式用于“立即重新录制”场景
  - `persistClip(blob)` → Promise\<clipId\>，通过 background 保存到扩展 origin IndexedDB
  - `deleteClip(clipId)` → Promise，删除已保存切片

### services/subtitle-service.js
- **模块名**: `window.BiliSub.SubtitleService`（IIFE）
- **依赖**: Constants, SentenceService
- **职责**: 字幕数据存储、语言管理、时间轴构建
- **内部状态**: `_rawByLang`（语言→原始数据）、`_timeline`（双语时间轴）、`_settings`（语言设置）
- **语言代码标准化**: 内部使用 `_normalizeLang` 将 B 站 lang 代码（如 `ai-zh`、`en-US`）统一为短码（`zh`、`en`）
- **API**:
  - `addSubtitleData(data)` → 添加字幕数据并重建时间轴
  - `setSettings(nativeLang, targetLang)` → 切换语言并重建
  - `getTimeline()` → 当前时间轴数组
  - `findCurrentIndex(time)` → 查找当前句子索引
  - `getAvailableLangs()` → 已加载的语言列表
  - `getSettings()` → `{ nativeLang, targetLang }`
  - `onUpdate(callback)` → 注册数据更新监听
- **监听事件**: `SUBTITLE_DATA`（添加数据）、`SUBTITLE_URLS`（自动拉取缺失语言）

### services/shortcut-service.js
- **模块名**: `window.BiliSub.ShortcutService`（IIFE）
- **依赖**: Constants, SubtitleService, PlayerService, RepeaterService
- **职责**: 仅在「快捷键模式」开启时监听键盘：左右切句（保持播放/暂停状态）、空格短按播放/暂停（连播到句末暂停）、空格长按单句循环
- **行为**:
  - 从 storage 读取 `SHORTCUT_ENABLED`，并监听 `SETTINGS_CHANGED`、`chrome.storage.onChanged` 更新开关
  - Left/Right：定位到上一句/下一句开头，不改变播放状态（在播则继续播，暂停则停在句首）
  - Space 短按（&lt;400ms）：非循环时播放/暂停，播放为「连播」——到句末自动暂停，再按从当前时间继续；循环中短按为句内暂停/继续
  - Space 长按（≥400ms）：切换当前句单句循环（RepeaterService.play(..., Infinity) 或 stop）
- **API**: `init()` → 注册 keydown/keyup 监听并订阅设置变更

### services/auto-subtitle-service.js
- **模块名**: `window.BiliSub.AutoSubtitleService`（IIFE）
- **依赖**: DOM, SubtitleService
- **职责**: 在获取到字幕时间轴后，自动打开 B 站播放器的字幕菜单、开启双语字幕开关，并按扩展设置选择主/副字幕语言
- **API**:
  - `applyPreferredLanguagesOnce(timeline, langs)` → 仅在首次有字幕数据时尝试应用一遍首选语言
- **行为细节**:
  - 通过 `SubtitleService.onUpdate` 监听时间轴更新，首次收到非空 `timeline` 时触发
  - 使用 `DOM.waitForElement('.bpx-player-ctrl-btn.bpx-player-ctrl-subtitle')` 等待播放器字幕按钮渲染完成
  - 若字幕菜单未展开，则点击按钮展开，并在短暂延时后获取 `.bpx-player-ctrl-subtitle-menu` 根节点
  - 若存在 `.bpx-player-ctrl-subtitle-bilingual-above` 或 `.bpx-player-ctrl-subtitle-bilingual-bottom` 中的 `input.bui-switch-input`，则保证其处于选中状态（开启双语字幕）
  - 读取 `SubtitleService.getSettings()` 的 `nativeLang` / `targetLang`，映射为 `ai-xx` 形式，在主字幕区域 `.bpx-player-ctrl-subtitle-major-inner` 和副字幕区域 `.bpx-player-ctrl-subtitle-minor-inner` 中查找对应 `data-lan` 条目并点击选择

### services/license-service.js
- **模块名**: `window.BiliSub.LicenseService`（IIFE）
- **依赖**: Constants
- **职责**: 管理扩展的授权状态（免费 / 专业版），在本地校验和存储授权码
- **API**:
  - `isPro()` → boolean，当前是否为专业版
  - `getLicenseKey()` → string | ''，当前保存的授权码
  - `verifyAndSave(licenseKey)` → boolean，按约定格式校验授权码，合法则写入 `chrome.storage.local`
  - `showUpgradeDialog(feature?)` → 弹出提示，引导用户前往设置页或官网解锁
- **授权码规则**:
  - 预期格式：`L-YYYYMMDD-RANDOM4-CHECK2`
  - 通过对前 3 段字符串（例如 `L-20260225-A7K3`）按字符 ASCII 求和，对 100 取模，生成 2 位校验码，与结尾 `CHECK2` 对比，一致则视为形式合法

---

### components/NoteEditor.js
- **模块名**: `window.BiliSub.NoteEditor`（IIFE）
- **依赖**: DOM
- **职责**: 备注 Markdown 编辑、粘贴图片（data URL/asset 占位符）、编辑/预览切换
- **API**: `create(options)` → `{ getElement, getValue, setValue, setGetAssetUrl, renderPreview }`；静态 `markdownToHtml(md, getAssetUrl)`、`escapeHtml(s)`

### components/BookmarkDialog.js
- **模块名**: `window.BiliSub.BookmarkDialog`（IIFE）
- **依赖**: DOM, Time, BookmarkService, ClipService, NoteEditor
- **职责**: 收藏弹窗（单句/AB 段）、双语预览、切片预览（自动关联 auto-clip）、NoteEditor、标签模糊匹配、录制切片
- **定位逻辑**: 自动检测上下空间，底部不足时向上弹出
- **备注图片**: 保存时将粘贴的图片 blob 转为 data URL 内联到 markdown，避免 IndexedDB 跨域问题
- **API**: `open(data, options)`、`close()`

### components/Header.js
- **模块名**: `window.BiliSub.Header`（IIFE）
- **依赖**: DOM
- **职责**: 面板头部栏（左侧主页/设置切换标签 + 折叠/关闭按钮）
- **API**:
  - `create(onHome, onSettings, onCollapse, onClose)` → HTMLElement
  - `setActive(tab)` → 手动切换高亮标签（`'home'` / `'settings'`）

### components/Settings.js
- **模块名**: `window.BiliSub.Settings`（IIFE）
- **依赖**: DOM, Constants
- **职责**: 语言设置覆盖层（母语/目标语选择，仅保存到 storage，刷新后生效）
- **API**:
  - `create()` → HTMLElement（改语言后显示"刷新生效"提示，自动保存到 chrome.storage）
  - `toggle()` / `close()` / `isOpen()` → 控制开关状态

### components/ModeSelector.js
- **模块名**: `window.BiliSub.ModeSelector`（IIFE）
- **依赖**: DOM, Constants
- **职责**: 三种显示模式切换（学习🎓 / 双语📚 / 辅助📖）
- **API**:
  - `create(onChange)` → HTMLElement
  - `getMode()` → 当前模式 ID
  - `setMode(modeId)` → 切换模式

### components/ABRepeatBar.js
- **模块名**: `window.BiliSub.ABRepeatBar`（IIFE）
- **依赖**: DOM, Time, Constants, RepeaterService, SubtitleService, BookmarkDialog
- **职责**: AB段重播控制栏（选起点→选终点→自动循环→可取消、收藏此 AB 段）
- **四种状态**: `idle` → `selecting-a` → `selecting-b` → `playing`
- **API**: `create()` → HTMLElement
- **交互机制**:
  - idle: 显示"AB段重播"按钮
  - selecting-a: 在字幕列表上添加 click 事件委托，点击字幕项设 A 点
  - selecting-b: 点击另一字幕项设 B 点，自动取 min/max 确保顺序正确
  - playing: 调用 `RepeaterService.play(aFrom, bTo, Infinity, 'ab')`，显示停止按钮
- **监听**: RepeaterService 状态变化（外部停止时重置）、`SUBTITLE_UPDATED`（字幕切换时重置）
- **CSS 类**: 选择模式下给列表加 `.bili-sub-list--ab-selecting`，选中项加 `.bili-sub-item--ab-a`/`--ab-range`

### components/SubtitleItem.js
- **模块名**: `window.BiliSub.SubtitleItem`（IIFE）
- **依赖**: DOM, Time, Constants, RepeaterService, BookmarkDialog
- **职责**: 单条字幕渲染（播放、循环、收藏按钮、文本内容）
- **API**: `create(sentence, index, displayMode)` → HTMLElement
- **循环按钮三段式交互**:
  1. 点击 → 无限循环（∞）：`RepeaterService.play(from, to, Infinity)`
  2. 再点 → 5 次重复（5x）：`RepeaterService.setLoopTotal(5)`（不重启）
  3. 再点 → 停止：`RepeaterService.stop()`
- **按钮状态存储**: `btn._loopIndex` 存在 DOM 元素上，点击时重置所有其他 active 按钮
- **显示模式**:
  - bilingual: 直接显示 target + native
  - learning: target + 可展开的 native（"查看翻译"按钮）
  - assisted: native + 可展开的 target（"查看原文"按钮）

### components/SubtitleList.js
- **模块名**: `window.BiliSub.SubtitleList`（IIFE）
- **依赖**: DOM, Constants, SubtitleService, SubtitleItem
- **职责**: 字幕列表容器、高亮跟踪、自动滚动
- **API**:
  - `create()` → HTMLElement
  - `render(mode?)` → 渲染所有字幕项
  - `setDisplayMode(mode)` → 切换模式并重新渲染
  - `highlightCurrent(currentTime)` → 高亮当前播放句
  - `getElement()` → 容器元素
- **监听**: `REPEATER_STATE` 事件 → active=false 时重置所有循环按钮
- **自动滚动**: 高亮变化时自动居中滚动，手动滚动后 3 秒内不自动滚动

### components/SpeedControl.js
- **模块名**: `window.BiliSub.SpeedControl`（IIFE）
- **依赖**: DOM, Constants, RepeaterService
- **职责**: 播放速度控制栏（0.5x ~ 1.5x）
- **API**: `create()` → HTMLElement, `setSpeed(speed)`

### components/Panel.js
- **模块名**: `window.BiliSub.Panel`（IIFE）
- **依赖**: DOM, Constants, Header, Settings, ModeSelector, SubtitleList, ABRepeatBar, SpeedControl, SubtitleService, PlayerService
- **职责**: 主面板，组装所有组件，管理拖拽/折叠/关闭/状态持久化
- **API**: `create()` → HTMLElement（自动 append 到 body）, `show()`
- **面板布局（从上到下）**: Header → Settings（overlay） → Body（ModeSelector → 查看收藏链接 → ABRepeatBar → SubtitleList → EmptyState → SpeedControl）

---

## 入口与注入

### content/index.js
- **职责**: Content script 入口，注入页面脚本 + 创建面板
- **流程**: 注入 `inject.js` → `Panel.create()`
- **监听**: chrome.runtime 消息 `toggle-panel` → Panel.show()；`clip-seek-play` → PlayerService.seekTo + video.play()

### inject.js（页面上下文）
- **职责**: 拦截 fetch/XHR，捕获字幕数据和字幕 URL 列表
- **拦截规则**:
  - URL 包含 `ai_subtitle` 或 `/bfs/subtitle/` → 派发 `bili-subtitle-data` 事件（覆盖 AI 翻译字幕和原语言字幕）
  - URL 匹配 `/x/player/(wbi/)?v2` → 提取字幕 URL 列表，派发 `bili-subtitle-urls` 事件

### background/service-worker.js
- **职责**: 扩展图标点击 → `toggle-panel`；`open-bookmarks-page` → 打开收藏页；`save-clip` → 将 dataUrl 转 Blob 存入扩展 origin IndexedDB 并返回 clipId；`delete-clip` → 删除切片

---

## 事件流

```
inject.js (页面上下文)
  │── bili-subtitle-data ──→ SubtitleService.addSubtitleData()
  └── bili-subtitle-urls ──→ SubtitleService.setSubtitleUrls()

SubtitleService
  │── onUpdate callback ──→ Panel（显示面板、渲染列表）
  └── bili-sub-updated ──→ ABRepeatBar（重置AB状态）

RepeaterService
  │── onStateChange callback ──→ ABRepeatBar（播放停止时重置）
  └── bili-sub-repeater-state (window event) ──→ SubtitleList（重置循环按钮）

PlayerService
  └── startHighlightTracking ──→ SubtitleList.highlightCurrent()（每 200ms）

chrome.runtime.onMessage
  ├── toggle-panel ──→ Panel.show()
  ├── save-clip ──→ service-worker 存 Blob 到 IndexedDB，返回 clipId
  └── delete-clip ──→ service-worker 从 IndexedDB 删除切片

BookmarkService.add()
  └── BOOKMARK_ADDED (window event)
```

---

## CSS 架构

### 自定义属性（定义在 panel.css :root）
| 变量 | 用途 |
|------|------|
| `--bili-sub-primary` | 主色 #00a1d6 |
| `--bili-sub-primary-hover` | 主色悬停 #00b5e5 |
| `--bili-sub-primary-alpha` | 主色透明 rgba(0,161,214,0.15) |
| `--bili-sub-bg` | 面板背景 rgba(24,25,28,0.94) |
| `--bili-sub-surface` | 表面色 rgba(255,255,255,0.06) |
| `--bili-sub-surface-hover` | 表面悬停色 |
| `--bili-sub-border` | 边框色 |
| `--bili-sub-text` | 主文字色 #e5e9ef |
| `--bili-sub-text-secondary` | 次要文字色 |
| `--bili-sub-text-muted` | 弱化文字色 |
| `--bili-sub-highlight-bg` | 高亮背景 |
| `--bili-sub-highlight-border` | 高亮左边框 |
| `--bili-sub-radius` / `radius-sm` | 圆角 12px / 8px |
| `--bili-sub-shadow` | 面板阴影 |
| `--bili-sub-transition` | 动画过渡 0.2s ease |
| `--bili-sub-success` / `warn` | 成功/警告色 |

### 样式文件职责
| 文件 | 内容 |
|------|------|
| `panel.css` | CSS 变量、面板容器、折叠/隐藏状态、空状态、设置覆盖层 |
| `filter.css` | 模式选择器按钮组、速度控制栏 |
| `subtitle.css` | 头部栏、字幕列表、播放/循环/收藏按钮、NoteEditor、BookmarkDialog、AB 重播栏、AB 选择模式 |
| `bookmarks.css` | 收藏独立页：筛选、列表、按句展开、备注预览 |

---

## 数据结构

### 字幕时间轴条目（SubtitleService.getTimeline() 的元素）
```javascript
{
  from: number,       // 开始时间（秒）
  to: number,         // 结束时间（秒）
  target: string,     // 目标语言文本
  native: string,     // 母语文本
  segments: Array,    // 原始字幕片段
}
```

### RepeaterService 状态快照
```javascript
{
  active: boolean,
  from: number,
  to: number,
  loopTotal: number | Infinity,
  loopCount: number,
  mode: 'sentence' | 'ab',
}
```

### 收藏项（BookmarkService）
```javascript
{
  id: string,
  type: 'sentence' | 'segment',
  sentences: [{ from, to, target, native }],
  video: { url, title, from, to },
  note: string,        // Markdown，含 ![](asset:N) 占位符
  tags: string[],
  clipId: string | null,
  createdAt: number,
}
```
备注图片存 IndexedDB `bili-sub-note-images`，key = `${bookmarkId}_${index}`；切片存 `bili-sub-clips`，key = clipId。

---

## chrome.storage 存储键
| 键 | 类型 | 说明 |
|----|------|------|
| `bili-sub-native-lang` | string | 母语选择 |
| `bili-sub-target-lang` | string | 目标语选择 |
| `bili-sub-display-mode` | string | 显示模式 |
| `bili-sub-panel-pos` | {left, top} | 面板位置 |
| `bili-sub-panel-collapsed` | boolean | 面板折叠状态 |
| `bili-sub-speed` | number | 播放速度 |
| `bili-sub-default-mode-strategy` | string | 默认显示模式策略：`last` 记住上次 / `fixed` 固定模式 |
| `bili-sub-default-mode` | string | 固定时的默认模式：`bilingual` / `learning` / `assisted` |
| `bili-sub-shortcut-enabled` | boolean | 是否开启快捷键模式（左右切句、空格播放/暂停/单句循环） |
| `bili-sub-bookmarks` | array | 收藏列表 |
| `bili-sub-bookmark-tags` | string[] | 去重后的标签列表（供模糊匹配） |
