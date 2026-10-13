# 制作接口

排镜时先读[紧凑短剧节奏与交付](storyboard-pacing.md)。`export-text` 生成中间稿，最终分镜提示词默认整理为Word（`.docx`）。最终Word的统一提示词须加入用户指定的默认摄影规格，且不包含人物站位；原始导出中的“站位：”及相关空间关系移入逐镜动作起点、镜头正文和衔接，详见上述参考。

项目包含 `production.json`（mode为live-action或comic，可选style），以及按需提供的：

| 文件 | 数据契约 |
| --- | --- |
| outline/outline.json | [大纲](novel-outline-schema.md) |
| characters/cast.json | [人物](novel-characters-schema.md) |
| art/art.json | [美术](novel-art-schema.md) |
| script/script.json | [剧本](novel-script-schema.md) |
| storyboard/storyboard.json | [分镜](novel-storyboard-schema.md) |

从技能目录执行：

```text
node scripts/production.mjs check 项目目录
node scripts/production.mjs report 项目目录 --out 报告目录
node scripts/production.mjs export-text 项目目录 --out 分镜.md
node scripts/production.mjs run novel-outline checkup 大纲.json
node scripts/production.mjs run novel-characters seed 大纲.json
node scripts/production.mjs run novel-storyboard render 分镜.json --script 剧本.json --html --out 分镜.html
```

本地引擎执行所有命令；没有在线授权，不发送项目正文。输出文件已存在时拒绝覆盖，应选择新路径。check/report/export-text支持 `--mode live-action|comic`、`--variable-length`、`--fixed-length`、`--allow-music`。默认可变时长（客户端向引擎传入 `variableLength: true`），每组为镜头实际秒数之和且不超过30秒；不要求凑满，也不会自动删台词或填空。`--variable-length` 保留为兼容选项，用户明确要求每组精确30秒时才传 `--fixed-length`；两个选项不能同时使用。程序接口 `checkProject` / `exportText` 同样默认可变时长，可用 `{variableLength: false}` 显式选择固定时长。report只处理JSON，不嵌入本地图片。

run支持模块相应的validate/checkup/render/seed/assets/stats/export/chunk/merge/assemble/ui-template/slug。上下文通过 `--script/--outline/--cast/--art 文件`、`--source-text 原文文件`传入，支持 `--html/--md`、`--lang`、`--stage`、`--protocol h3|seedance`、`--eps 起-止`、`--per-volume 数量`。不支持旧版任意目录扫描或任意系统命令。merge/assemble输入改为已整理的JSON数组；chunk返回分块JSON；export返回包含文件内容与缺图清单的JSON，不自动复制素材或写入返回的任意路径。

运行只读取指定JSON与明确指定的原文。单文件超过2MiB按分集拆分。引擎不编造缺失原文，不调用模型；正文由当前助手根据实际材料整理，最终模板、校验和导出在本地完成。

