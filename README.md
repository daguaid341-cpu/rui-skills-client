# Rui-SHOOTING SCRIPT-Skiils

> **禁止商用：本次许可覆盖、且作者有权另行许可的原创部分仅限非商业使用；未经有效授权用于商用，构成违约或侵权的，将依法追究法律责任。** 既有Apache-2.0授权及第三方许可不受影响，不能追溯撤销。详见[使用许可](LICENSE)与[隐私政策](PRIVACY.md)。

公开技能版 **2.5.0**，本地编译引擎 **2.0.1**。提供真人剧、3D漫剧分镜、人物三视图和离线站位图工作流，保留 `$rui-skills` 调用名及 `rui-skills/` 目录。无需 Rui-Skills 设备凭证、管理员发放或版本审批；引擎首次安装后可离线制作。

公开分发地址：[rui-skills-client](https://github.com/daguaid341-cpu/rui-skills-client)，默认分支 `main`。版本见 [VERSION](rui-skills/VERSION)、[技能清单](rui-skills/skill-manifest.json)，更新见 [CHANGELOG.md](CHANGELOG.md)。技能规则与引擎版本分别维护。

## 2.5.0 功能

- **叙事排镜。**依次提取材料与人物状态、梳理节拍、分配观看重点、决定切点、设计调度与摄影、核算时间、复核连续性。镜数和景别服务关系与已有动作，不按说话人、句号或组序机械切镜。
- **3D七字段成稿。**漫剧只输出3D动画或风格化三维CG，逐镜使用画面、镜头、运镜、角色动作 & 表情、台词、约束、特效 & 转场。真人摄影与肤质不自动追加到漫剧。
- **场景光影设计。**先确定已有光源、方向、软硬、补光与反射、冷暖、曝光和灰度，再逐镜落实人物受光、转身位移、遮挡与跨镜连续性。数字仅在有依据且需要时使用，标明比较对象、计量口径及设计/参考/实测状态。3D受光写入“画面”，动态变化写入“角色动作 & 表情”，连续性写入“约束”，保持七字段。
- **导演参考。**按场景读取摄影、运镜、表演、转场、动作和特效参考，不把术语或示例变成固定套餐。
- **独立提示词。**保留实名与原始对白；外语对白同时有中文释义时只保留外语，否则沿用原语言。直接写明动作主体、视线、持物、声音及触发时机，不依赖未随组提交的剧本或其他组。完整新分镜默认Word交付，局部修改按请求范围输出。
- **本地项目与人物资产。**大纲、人物、美术、剧本和分镜的结构化操作、校验、文本导出和HTML报告；正面锚点、独立正侧背、版本管理、过期检查和实际图片导入。
- **离线站位图。**保留带标注俯视图、无标注三维简模机位图、关键状态审阅页，以及ArtCraft基本几何体场景交换。首次安装依赖后离线运行，不需模型或ArtCraft账户。

每镜时长按完整对白和已有动作的顺序、并行及收尾估算；每组上限30秒，不要求填满，不固定总片长。首组与后续组均按剧情选景别，撤销旧的“后续组禁全景/中景”规则。未知但必需的站位、手位或衔接先询问，不自行补造动作、道具、经历或人物已知信息。

真人剧默认参考9:16、ALEXA 35质感、4K、24fps、180°快门，保持自然肤色与皮肤纹理。其他机身及光学参考用于选择质感，不堆成多套实际摄影设置；景深、光色与表演幅度按本场信息决定。默认无字幕、无BGM，用户明确要求优先。

## 安装

已验证平台为 **Windows x64、Node.js 24.15.0**。下载本仓库，将完整 `rui-skills/` 安装为技能目录，不要仅复制SKILL.md。在该目录运行：

```text
node --version
node scripts/install-engine.mjs
```

安装器从本仓库的引擎 **v2.0.1 Release** 下载原版编译文件，逐文件校验固定SHA-256。技能2.5.0不代表引擎升级到2.5.0。首次下载需联网；随后可离线校验、导出、生成提示词及管理资产。不要绕过Node版本或摘要检查。其他平台暂未提供已验证引擎包；Python 3仅用于可选本地复盘日志。

## 技能用法与参考

```text
使用 $rui-skills，把我提供的剧情制作成3D漫剧分镜；保留实名与完整对白，采用七字段模板，按剧情设计镜头和光影，每组不超过30秒，交付Word。
```

从 [SKILL.md](rui-skills/SKILL.md) 进入，按任务读取：

| 任务 | 参考 |
| --- | --- |
| 排镜与时长 | [叙事设计](rui-skills/references/narrative-camera-design.md)、[节奏与连续性](rui-skills/references/storyboard-pacing.md) |
| 模式与成稿 | [模式规则](rui-skills/references/mode-profiles.md)、[3D七字段](rui-skills/references/comic-3d-template.md)、[输出规则](rui-skills/references/prompt-output.md) |
| 光影与摄影 | [光影设计](rui-skills/references/lighting-design.md)、[摄影实务](rui-skills/references/camera-practice.md)、[摄影术语](rui-skills/references/cinematography-vocabulary.md) |
| 表演与动作 | [表演调度](rui-skills/references/performance-direction.md)、[动作设计](rui-skills/references/action-choreography.md)、[特效](rui-skills/references/visual-effects.md)、[转场](rui-skills/references/transitions.md) |
| 空间与导出检查 | [空间调度](rui-skills/references/space-and-blocking.md)、[漫剧质量](rui-skills/references/comic-prompt-quality.md) |
| 项目与人物 | [制作数据](rui-skills/references/production-data.md)、[人物三视图](rui-skills/references/character.md) |

## 命令行

在 `rui-skills/` 中用清单指定的Node运行：

```text
node scripts/production.mjs check 项目目录
node scripts/production.mjs export-text 项目目录 --timing seconds --out 新分镜.md
node scripts/production.mjs export-text 项目目录 --detail full --timing seconds --out 完整摄影稿.md
node scripts/production.mjs report 项目目录 --out 新报告目录
node scripts/character.mjs workflow turnaround
node scripts/character.mjs sheet 观察.json --out 三视图提示词.json
node scripts/character.mjs asset intake-template
node scripts/character.mjs workflow assets
```

仅明确要求每组精确30秒时使用 `--fixed-length`；旧 `--variable-length` 继续兼容。CLI导出是中间稿，助手按当前规则整理最终提示词，不能声称程序已自动输出3D七字段。Word按字段自然分段、段内自动折行。

## 本地站位图

在 `rui-skills/` 中运行：

```text
node scripts/blocking.mjs setup
node scripts/blocking.mjs render assets/blocking-example.json --out 站位示例
```

打开输出 `review.html`，查看各关键状态的俯视图和机位图。实际任务使用独立JSON，每次输出到新目录；位置、路线、朝向及持物数据须已知或已确认。简模只表达空间与构图，不代表最终人物或画风。数据及限制见[本地站位图](rui-skills/references/blocking-diagrams.md)。

[ArtCraft](https://github.com/storytold/artcraft) 提供场景编辑与AI创作工作流；这里使用独立本地渲染和场景格式交换，未内嵌完整编辑器。兼容测试使用 `tests/fixtures/artcraft/` 中固定版本的对象加载器和序列化器；桌面应用、相机恢复及现行菜单导入未验证。

## 验证与局限

安装引擎后，在仓库根目录用Node.js 24.15.0运行：

```text
node tests/offline.mjs
node tests/production-timing.mjs
node tests/comic-quality.mjs
node tests/blocking.mjs
```

ArtCraft开发兼容测试先安装依赖：

```text
npm ci --prefix rui-skills/scripts/blocking --ignore-scripts --no-audit --no-fund
node tests/blocking-artcraft.mjs
```

测试使用合成材料，不调用配音、生图或视频模型。`comic-quality.mjs` 保留底层2.0.1引擎的二维默认兼容用例，它们不是2.5.0成稿示例。已知局限：显式统一提示词可覆盖模式；自定义3D仍可能残留二维通用词；缺少映射时编号不会自动变成人名；最终七字段、机位与光影需助手审阅。可用 `node tests/comic-quality.mjs --out 新目录` 留存合成输入和中间导出；人工案例见[排镜设计案例](tests/storyboard-design-cases.md)。

技能结构、运行回归、实际配音、图片及视频验收分别说明；程序通过不代表成片质量通过。实际生图由当前可用图像工具完成，引擎不自带模型或免费生图额度。

## 可选反馈与许可

指标、生成反馈和自动规则更新分别默认关闭，由用户明确同意后开启。规则维护不授权上传剧本、素材、聊天、路径、姓名、日志或凭证。详见[反馈与更新](rui-skills/references/learning-loop.md)、[隐私与本地运行](rui-skills/references/local-verification.md)。真实生成通常最多尝试3次，用户另有次数或预算时优先；按实际结果定向修改，不空跑或伪造验收。云端只在获准范围内接收固定指标并分发签名预设，不承担制作或授权，不接模型、不训练模型。

本次分发增加[非商业许可及法律责任声明](LICENSE)和[隐私政策](PRIVACY.md)，适用范围以实际权属、既有授权及第三方许可为限。新增条款不撤回此前已依Apache-2.0授予的权利；提交 `4a347c1` 及以前的公开内容仍可依其历史许可使用。本次只有许可与隐私文档修订，没有新增功能代码，不能据此宣称旧内容已被全面禁止商用。原Apache-2.0全文原样保留在[LICENSE-APACHE-2.0](LICENSE-APACHE-2.0)，署名见NOTICE；本非商业许可不是Apache-2.0修改版，也不应称为无用途限制的开源许可。

ArtCraft测试源码及依赖保留各自许可。Release引擎为闭源字节码，仍按随附ENGINE-LICENSE.txt及上游许可执行；本次不改写已发布引擎授权。核心源码、构建源码、服务端实现和签名私钥不在仓库中。本地字节码不保证无法逆向。不要在公开Issue提交私密内容。
