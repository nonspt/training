# 正式版 V1.0 发布记录

2026-10-14，应用版本 1.0.0。用户授权将当前已开发版本作为正式版，发布到既有公共仓库 `nonspt/training`。

## 发布内容

源码、公共图标与 PWA 清单、构建和预览脚本、依赖锁文件、验证脚本、项目文档及 GitHub Pages 工作流。依赖目录、生成的 dist、本机测试产物、原始参考图片、证书和用户数据不进入源码仓库。工作流从源码构建，只将 dist 作为站点产物发布。

线上地址：<https://nonspt.github.io/training/>。仓库：<https://github.com/nonspt/training>。

## 部署与回滚

GitHub 仓库 Settings → Pages → Build and deployment → Source 需选择 GitHub Actions。main 分支提交或手动运行“发布训练跟练”工作流，使用 Node 24、pnpm 11.25.0、锁定依赖和 `/training/` 构建基路径。规则测试、类型检查、生产构建通过后上传并部署。工作流采用 GitHub 官方 Pages Actions，部署权限只授予部署任务。

更新应用的 SW 由构建内容哈希确定，已有安装不会在跟练草稿未结束时强制切换。数据格式仍为数据库/备份 v1，无迁移。需要回滚时在 main 撤销目标代码提交并重新部署；保留现有数据库和兼容动作注册表，不清理用户存储。

localhost 与 github.io 属于不同来源。本地计划需在原应用设置中导出备份，再在正式站点校验、预览并确认导入；部署不读取或自动上传本机训练数据。

## 当前核验状态

已确认仓库存在、为空并具有代码写入权限。V1.0 构建、上传和线上验证进行中；最终结果将补充到本节。真实 iPadOS Safari、主屏安装和 VoiceOver 仍需实机验收。
