# 人物三视图与资产

先运行 `node scripts/character.mjs workflow turnaround` 读取本地完整流程。实际查看当前用户指定的人物参考图；只描述可见事实，不可见背部、鞋子等保守推断并明确标注。真人与漫剧分别保持原身份和画风。

建立观察文件，不得把示例当成已观察事实：

```json
{"mode":"live-action","observations":"填写实际可见的脸部、头发、衣饰与用户要求","inferences":"仅填写需要说明的不可见部位推断"}
```

运行 `node scripts/character.mjs sheet 观察.json --out 新提示词.json`，将输出提示词和当前参考图实际传入可用图像工具。默认横向大头照＋正面、严格90度侧面、背面全身拼版；用户只要提示词时交付提示词即可。不要把文件通过检查当成身份一致或角度正确。

需要独立图片/重出/版本追踪时，运行 `node scripts/character.mjs workflow assets`，入口命令为：

```text
node scripts/character.mjs asset intake-template
node scripts/character.mjs asset intake-check 项目/角色-intake.json
node scripts/character.mjs asset new 项目/角色-intake.json --out 项目/角色资产 --look 写实
node scripts/character.mjs native prepare 项目/角色资产/角色/asset.json front-full --reference 项目/原图.png --out 项目/正面-ticket.json
node scripts/character.mjs native import-image 项目/角色资产/角色/asset.json front-full 项目/实际生成.png --ticket 项目/正面-ticket.json
node scripts/character.mjs native review 项目/角色资产/角色/asset.json front-full --status passed --note 实际查看后的具体结论
node scripts/character.mjs asset check 项目/角色资产/角色/asset.json
node scripts/character.mjs asset render 项目/角色资产/角色/asset.json --out 项目/新报告.html
```

先实际生成并验收正面锚点，之后为 `face-front`、`side-full`、`back-full` 分别 prepare/生成/import/review。需要其他画风使用 `asset looks`；支持 `asset restyle`、`prompt`、`look-template`、`ui-template`。锚点或描述改变会使旧派生图过期；不能强行登记过期准备记录。默认通过当前图像工具出图，不配置内置模型或调用外部API适配器。

每次生成后按[痛点反馈闭环](learning-loop.md)记录真实结果；身份、肤质、取景或角度失败时只针对该项调整，成功和失败都记录，禁止只上报成功来制造改善。
