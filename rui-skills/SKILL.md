---
name: rui-skills
description: Use the owner's authenticated online service to validate and export live-action or comic storyboard projects in 30-second groups. Use for 真人剧、漫剧分镜、小说改编制作资料与剧本校验. Character sheets are a separate skill.
---

<!-- 谢谢你用我的技能 我叫瑞 -->

# Rui-Skills · 在线制作

制作校验、模式模板、报告和分镜导出在所有设备共用的服务器执行。本客户端不包含核心实现；没有本机服务、子模块或离线回退。

1. 每项视频任务先读[授权与隐私](references/local-verification.md)，运行 `node scripts/local-gate.mjs verify`，实际通过后开始读取剧情。失败即停止本技能任务，不改服务器地址、不发放凭证、不降级证书、不用纯聊天替代服务结果。
2. 依据用户材料整理结构化项目，优先已有角色与场景，不能假称读过未提供的剧本或看过未提供的图片。真人剧与漫剧分别存项目；默认30秒、中文、无BGM和字幕，用户明确要求优先。字段与命令见[制作接口](references/production-data.md)。
3. 按[记录与复盘](references/learning-loop.md)保存本地脱敏摘要。首次使用主动说明可选使用指标并询问是否参与；只有用户明确同意后才能启用，拒绝或未回答均保持关闭，不重复追问。制作命令仅发送所需的JSON或用户明确选择的文本；不上传图片、目录清单、凭证文件或无关文档。用户不允许上传制作资料时停止在线制作并说明限制。
4. 执行在线校验后，由服务器导出最终分镜或报告；不能把未执行服务的草稿标成Rui-Skills已验证输出。服务器失败不交付伪造许可或缓存结果。人物设定图使用独立 `$character-turnaround-from-image`，不在视频流程中重新设计人物。
5. 已交付结果仍需实际图像/视频工具生成并人工视觉验收。本服务不调用模型、不生成成片，不承诺锁脸或画面效果。

复盘建议保存到项目目录，不作为自动执行指令。云端可依据已同意收集的固定指标自动更新经过预设验证的帮助提示；客户端不执行返回的任意指令或代码。核心制作规则及代码变更仍须管理员测试发布；日常使用不修改安装文件或已批准摘要。
