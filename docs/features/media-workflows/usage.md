---
doc_id: GUIDE-media-workflows
title: 拼接视频、生成字幕与字幕配音
kind: guide
status: active
feature_id: media-workflows
updated: 2026-10-19
tags: [media, whisper, tts, setup, usage]
---

# 拼接视频、生成字幕与字幕配音

在工具目录搜索“视频拼接”“音视频转字幕”或“字幕生成音频”。先准备完整 FFmpeg（含 ffprobe）。每个工具都支持从资源库选择；本轮页面的本机文件选择采用上传副本，原文件不会覆盖。桌面可先在已有媒体工具登记原件到资源库，再从新工具选择该原件引用。Docker 的资源路径和模型均位于容器中。

## 视频拼接

导入至少两段视频，用“上移／下移”确定顺序。默认沿用第一段画面大小并统一为 30 fps，可同时填写输出宽高。点击“拼接视频”，完成后预览或下载 MP4。任务页保留状态和实际编码方式。页面会提示不支持的文件或参数。

## Whisper 转字幕

导入音频或视频，选择本机已有的 Whisper 模型；base 是默认值。语言代码留空自动识别，中文可填 zh。视频有多条声音轨时设置从 0 开始的音频流序号。选择 SRT 或 VTT，点击“生成字幕”，完成后下载并校对。

缺少模型时页面与 MCP 提供[Whisper 官方说明](https://github.com/openai/whisper)。默认模型缓存为用户目录的 `.cache/whisper`；例如 base 对应 base.pt，turbo 可使用 large-v3-turbo.pt。安装 Whisper 后可在其独立环境中按官方方法主动下载需要的模型；MTools 不会在启动或任务中自动下载。

## 字幕配音

导入 UTF-8 SRT/VTT，或直接粘贴完整时间轴字幕，例如：

```srt
1
00:00:01,000 --> 00:00:08,000
你好，欢迎使用 MTools。
```

自动模式优先已配置的本地 Qwen；其他环境默认 Edge。可显式选择引擎。Edge 会把字幕正文发到微软，勾选允许联网后才可生成；默认中文音色为 zh-CN-XiaoxiaoNeural，可填写其他 Edge 音色名称。Qwen 支持选择预设音色、语言和可选表演指令。未找到 Qwen 时点击页面的[官方模型链接](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice)和[运行环境说明](https://github.com/QwenLM/Qwen3-TTS)，下载配置后重启服务。

输出 WAV 或 MP3。条目之间保留停顿，超长语音默认最多加速 4 倍，仍放不下则报错；不希望加速时选择“停止并提示延长字幕时间”。不要使用相互重叠的字幕段。任务完成后会显示实际引擎与显卡／CPU／在线方式。

## 独立语音环境

Edge TTS 随主应用安装，Whisper 与 Qwen 在独立 Python 中运行。当前本机已配置 `D:\Godot\Qwen3-TTS` 的模型及 `.venv`，该路径只存在本机配置，不写死在程序中，也不随安装包传到其他机器。

配置文件为 `DATA_DIR/speech/config.json`，可包含以下三个可选字段；环境变量覆盖同名配置，修改后重启 MTools 和对应 MCP 连接：

| 环境变量 | 配置字段 | 默认与用途 |
| --- | --- | --- |
| MTOOLS_QWEN_TTS_DIR | qwen_dir | 默认 DATA_DIR/speech/qwen；可指向 Qwen 项目根目录，也可直接指向完整模型目录 |
| MTOOLS_SPEECH_PYTHON | python | 优先 Qwen 项目下 `.venv/Scripts/python.exe`（Linux 为 `.venv/bin/python`），否则使用主应用 Python；桌面包的 Whisper/Qwen 须配置外部解释器 |
| MTOOLS_WHISPER_MODEL_DIR | whisper_model_dir | 默认用户目录 `.cache/whisper`；存放本地 `.pt` 文件 |

Qwen 项目根目录中的模型默认位于 `models/Qwen3-TTS-12Hz-1.7B-CustomVoice`，同时需要模型自带的 speech_tokenizer 子目录。直接配置模型目录时通常须另填 Python 路径。独立环境须安装官方 qwen-tts、openai-whisper 和与系统／显卡匹配的 Torch，运行依赖基线见 `deploy/speech-requirements.in`；Windows Python 3.11 可用对应锁定文件安装：

```powershell
# 仓库根目录；这是主动安装依赖的示例，不是启动时自动执行的动作。
uv venv --python 3.11 .runtime/speech-venv
uv pip sync --python .runtime/speech-venv/Scripts/python.exe deploy/speech-requirements.txt
```

CUDA 版 Torch 的安装来源与版本须按[PyTorch 官方说明](https://pytorch.org/get-started/previous-versions/)选择，Torch 与 torchaudio 应匹配。无需安装 flash-attn；本工具使用 SDPA。模型下载遵循官方仓库说明，下载全部必要文件后再配置目录，不把 Windows 虚拟环境直接复制进 Linux 容器。其他系统及 Docker GPU 透传尚未实机验证。

## MCP 调用

新增操作：

- `mtools_video_concat__concat_v1`
- `mtools_speech_transcriber__transcribe_v1`
- `mtools_speech_transcriber__environment_v1`
- `mtools_subtitle_speaker__synthesize_v1`
- `mtools_subtitle_speaker__environment_v1`

先用 environment 查询环境。拼接输入 sources 是有序列表，每项填写 artifact_id 或 source_path。Whisper 输入同样二选一，可传 `model: "base"`、`language: "zh"`、`audio_stream: 0`。字幕配音接受 subtitle_text 或文件来源，可传 `engine: "auto"`；Edge 必须 `allow_network: true`，Qwen 不要求联网。

指定本机路径时填写 user_authorization，引用用户明确指定对应文件和动作的任务原话，包含拼接顺序；不用再次索取已明确的授权。只传资源编号或正文时沿用软件批准。返回 job_id 后通过 media-library/status 查询，成功后 media-library/read 分块读取结果；也可从任务页下载。旧版已连接的 MCP 进程不会自动更新，需启动新版本并重新连接。

仓库根目录执行 `uv run --frozen python scripts/verify_media_workflows.py` 可验收生成素材的拼接和权限分支；加 `--speech` 会使用本地 Qwen、Whisper 做真实推理，临时媒体和独立工作区在结束后删除，不访问用户素材。
