# Docker 浏览器版

需要 Docker Compose。在项目根目录运行：

```powershell
docker compose up -d --build
```

启动后打开 http://127.0.0.1:18743。停止服务运行：

```powershell
docker compose down
```

用户设置、日志和媒体任务保存在 Docker 命名卷中。媒体处理组件随镜像提供。默认仅允许本机访问；不要将此配置直接暴露到公网。