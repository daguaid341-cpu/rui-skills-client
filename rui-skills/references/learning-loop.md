# 生成痛点反馈与预设优化

## 同意与控制

首次说明三项独立可选功能：运行指标用于观察调用成功率；生成反馈用于统计反复出现的痛点及重试是否解决；自动更新用于接收签名预设。均默认关闭，分别按使用者的明确选择启用。不因安装技能或作者授权就假定每位使用者同意。拒绝或未回答保持关闭，已有选择不重复追问。

```text
node scripts/evolution.mjs status
node scripts/evolution.mjs enable metrics --consent
node scripts/evolution.mjs enable feedback --consent
node scripts/evolution.mjs enable updates --consent
node scripts/evolution.mjs disable metrics
node scripts/evolution.mjs disable feedback
node scripts/evolution.mjs disable updates
```

只执行用户同意的启用命令。统计不含原文、图片、聊天或自由文本；日志默认保留在项目私有目录，不能自动上传原始日志。

## 每次实际生成的闭环

1. 创建任务随机编号：`node scripts/evolution.mjs new-task`，在本次任务各轮复用。不能用用户名、文件名或项目名作为编号。
2. 记录本轮实际采用的规则：生成提示词返回的 applied_rules（或 `status` 的 active_rules）中包含本轮痛点ID且实际用了该附加预设，标为 enhanced；否则标为 baseline。保留尝试序号和本地原始输出，不能伪造生成。
3. 实际生成和查看结果后，按下面固定类别判定是否解决。不确定时留在本地待审，不上报成功。文件检查不能代替视觉验收。
4. 反馈已获同意时提交实际结果。失败后仅调整对应因素再生成；成功也提交，才能比较改善率。默认最多3次实际生成尝试，用户给出更高次数/预算时遵照执行；不自动无限重试或额外刷次数。

| 类别 | 痛点 |
| --- | --- |
| identity | 人脸、年龄、发型、服装或身份漂移 |
| skin | 磨皮、塑料感、重复毛孔或不当真人质感 |
| framing | 头脚裁切、身高比例或拼版错位 |
| angle | 侧面不是90度、背面回头 |
| continuity | 人物站位、动作、轴线或道具连续性错误 |
| timing | 分镜时长与台词/动作不匹配 |

命令格式：

```text
node scripts/evolution.mjs feedback 类别 character或live-action或comic ok或failed 实际尝试序号 任务UUID baseline或enhanced
```

同一尝试同一痛点只记录一次最终验收。开始新生成才增加序号；每次最多20号，达到用户预算或已解决就停止。此命令不执行生图，也不读取项目、图片或聊天。采集的尝试次数按 first/retry/many 档位聚合；随机编号仅短期去重，长期不保存。

## 云端如何改进

近期累计足够的基线结果、某痛点反复失败时，云端选择已有的针对性预设，经规则结构与行为兼容检查后发布签名更新。后续继续收集真实生成结果；有足够的增强预设结果时比较失败率，明显恶化则撤回。样本不足保持基线，不能仅凭一次失败泛化为所有用户的规则。

这是观察统计，不是随机对照试验；任务难度、输入和工具变化可能影响结果，不承诺必然提升视觉质量。客户端按任务实际使用结果反馈，不能把重复请求或合成测试当作真实质量证据。

同意更新后，在本地命令结束时最多每小时检查一次；断网时沿用已验证版本。`node scripts/evolution.mjs sync` 手动同步；`node scripts/evolution.mjs rollback` 回到上一版本或内置基线，并关闭自动更新以免立即覆盖。以后需主动重新开启。损坏签名、未知规则和远程降级都拒绝。

本地引擎会把已验证预设纳入分镜附加验收与人物提示词/工作流。预设不得覆盖用户明确要求，也不能改变地址、权限、凭证或执行代码。本方案不调用模型、不训练权重、不自动写新代码；新增痛点类别或新核心能力仍需作者实现、测试、发布。

可选本地日志使用 `python scripts/record_invocation.py`，输出到项目 `.rui-private/logs`；仅记录可观察摘要，不记录隐藏推理。长期聚合保留30天，细节见[隐私](local-verification.md)。
