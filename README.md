# Rui-Skills 开源客户端

面向真人剧与漫剧的30秒分镜制作客户端。客户端以 Apache-2.0 开源；校验、模板、导出和云端改进服务由私有服务器提供。

## 安装与使用

需要 Node.js 24 或以上；本地复盘日志另需 Python 3。将本仓库的 `rui-skills/` 作为技能目录安装到支持 SKILL.md 的工具中，或从该目录直接运行命令。

1. 向提供技能的管理员申请设备凭证，通过私密渠道领取。
2. 运行 `node scripts/local-gate.mjs configure-client --from 私有凭证.json`。
3. 运行 `node scripts/local-gate.mjs verify` 验证服务权限。
4. 按[数据契约](rui-skills/references/production-data.md)准备项目，运行 `node scripts/production.mjs check 项目目录`。
5. 运行 `node scripts/production.mjs export-text 项目目录 --out 新分镜.md`。

保留服务器发放、换发、停用凭证的机制；安装公开代码不自动获得服务权限。服务地址随私有凭证提供，不能自行伪造授权。公开仓库不提供私有后端的自行部署版本。

## 数据与云端更新

在线制作会发送选定的制作资料，见[授权与隐私](rui-skills/references/local-verification.md)。可选使用指标默认关闭；用户同意后执行 `node scripts/usage-metrics.mjs enable --consent`，之后自动统计操作、结果和耗时档位。执行 `node scripts/usage-metrics.mjs disable` 可关闭。

学习数据只保存按日聚合的固定指标，保留30天；不保存剧情、图片、聊天、凭证或个人标识。云端据此自动调整预设帮助提示，下一次请求即可使用；这不是训练模型或自动改写创作核心。核心代码与规则更新由服务管理员验证发布。详见[记录与复盘](rui-skills/references/learning-loop.md)。

## 开源边界

本仓库只有客户端、技能入口、数据契约与许可声明。制作核心、服务端代码、底层架构、部署配置、管理员工具、用户素材、日志、凭证和旧Git历史不在本仓库中。人物三视图独立技能未包含在此发布中。

Apache-2.0 仅适用于本仓库公开文件；云端服务及未发布的私有实现不因此开源。公开文件保留上游署名，见 [LICENSE](LICENSE) 与 [NOTICE](NOTICE)。

在 Issue 中仅提交脱敏的客户端问题，不要提交真实凭证、私人材料或完整请求正文。源代码可修改；使用运营方服务仍需其批准的客户端版本。
