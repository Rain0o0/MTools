# 配置和数据

MTools 默认使用推荐设置，无需填写 API 密钥。主题和常用工具偏好保存在本机；媒体任务和文件会在保留期后清理。桌面版与源码模式的数据存放在当前用户的 MTools 数据目录，Docker 数据保存在命名卷中。

如需临时更换数据目录或服务端口，可通过 `MTOOLS_DATA_DIR`、`MTOOLS_ALLOWED_ORIGINS` 等环境变量配置。普通桌面用户无需修改这些设置。不要将本机单用户服务直接暴露到公网。

语音模型路径等高级设置按[语音工具说明](../features/media-workflows/usage.md)操作。