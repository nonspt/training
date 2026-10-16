# 依赖与成本

沿用“划船机”的版本和 pnpm 锁文件，未增加 UI、拖动或图标库。

| 依赖 | 版本 | 作用 | 许可证 |
| --- | --- | --- | --- |
| React / React DOM | 19.2.6 | 状态和 UI，与参考应用一致 | MIT |
| TypeScript | 5.9.3 | 类型与静态检查，仅开发时 | Apache-2.0 |
| Vite | 8.0.16 | 本地开发与静态构建，仅开发时 | MIT |
| @vitejs/plugin-react | 6.0.2 | React 构建整合，仅开发时 | MIT |
| playwright-core | 1.55.1 | 使用本机 Chrome 的隔离自动验收，仅开发时 | Apache-2.0 |

许可证来自已安装 package.json 的实际读取。类型包沿用锁定版本，不进入运行时。安装时供应链检查通过；没有将未执行的独立漏洞扫描写成通过。

拖动、SVG、存储、音频、缓存、安装与常亮使用浏览器原生能力。无运行时 CDN，无远程后台费用；静态构建脚本和样式 gzip 99.4 KB，离线资源总量约 356.5 KB（1.0.5 本地版）。本轮复用 React DOM Portal、MutationObserver、Pointer Capture 与 inert，没有新增依赖。离线与升级由内容哈希 SW 清单管理。

Chrome 只作为开发验证工具，不随应用安装；重新生成平台安装图标时也使用 Chrome。移动端目标为现代 Safari，功能需要安全上下文；平台特性不支持时显示反馈或降级。
