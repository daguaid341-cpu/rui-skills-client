# storyboard.json 结构

三层：**集 → 段（segment）→ 分镜（cut）**。

填写分镜前执行[叙事镜头设计](narrative-camera-design.md)。下列机位、构图和镜头参数示例不是自动默认值；每镜按叙事功能选择，`frame`、`shot` 与摄影字段保持一致。内部可用已有 `cut.note` 记录功能和节拍依据，不新增必填字段。最终角色称谓和文本格式遵守用户要求及[提示词输出规则](prompt-output.md)。

景别与机位方向分别判断，按当前剧情、人物关系和已有动作选择；首组与后续组不预设景别优先级或禁用项，不因总时长、组序、换场或导出方式套用固定排镜模板。继续使用已有字段，不新增景别枚举；用户当前明确的取景要求及人物、摄像机方向规则以叙事镜头设计为准。

台词镜头在已有`cameraPosition`中落实从被讲话者这一端拍讲话者的机位及轴线同侧的过肩或斜侧方向，在`eyeline`中落实实际视线对象，并同步`frame`、`shot`与最终提示词。反打、听者反应和多人物换对象按叙事镜头设计处理；人物朝向与摄影机朝向分别写清，不新增协议字段或未知坐标。

镜头类型按叙事需要开放选择，执行叙事镜头设计中的“开放的镜头设计范围”。现有五档`size`为内部协议分类，`frame`、`shot`可在如实分类的前提下细化近景、中近景等实际取景；`cameraPosition`落实方向、高度与角度，`composition`和`focus`落实构图与焦点。`camera`仍使用现有允许值，必要的组合运动在正文中说明顺序和起止，不新增字段或枚举。侧面、过肩等示例不构成镜头类型上限，细分描述和运动全过程仍须满足用户当前明确的取景要求。

- **段** = 同场连续分镜组，总时长等于镜头实际时长之和，不跨场次——换景必开新段。Rui制作入口默认可变时长、每组上限30秒；实际视频工具上限更短时再拆分，不把30秒作为填满目标。直接调用模块时仍须显式配置 `maxSegmentSeconds`（底层缺省15秒）。见[节奏与连续性](storyboard-pacing.md)。
- **分镜** = 段内的一次剪切，`minCutSeconds`–`maxCutSeconds`（默认 2–5 秒），各自认领剧本节拍、带景别运镜和一张分镜图
- **分镜图** = 每个分镜一张关键帧：第 1 切的是**主分镜图**（钉在 0.00 秒），其余是**子分镜图**（各钉在自己的切点时刻）。**每段一个文件夹**：`<段号>/f<切序>.png` + `prompt.md`（export 生成，内容就是 h3Prompt）

```json
{
  "source": "渡口",
  "promptLang": "zh",
  "params": { "maxSegmentSeconds": 15, "minCutSeconds": 2, "maxCutSeconds": 5, "maxOnScreen": 3, "tolerance": 0.15 },
  "episodes": [ { "ep": 1, "segments": [ ... ] } ]
}
```

`promptLang` 可省略（**默认 `en`——官方规范口径**）：整条英文，台词在 `<d>[Chinese]` 里保留原文。设成 `zh` 可切整条中文（对齐指令、字段名、镜头标记都有中文版）——偏离官方推荐的备选项。**禁角色名不跟着语言变**：两种模式的 H3 正文都用通用身份。

**Seedance 视频提示词不存在 JSON 里**：它由程序从 `shot`、构图量化字段、`blocking`、`soundscape`、`music` 和剧本台词现拼（结构见 `references/seedance-prompt.md`），报告和 `export --protocol seedance` 都用同一个拼法。

## segment（段）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 段号 `E01-01`：集号 + 两位序号，**按顺序连号**。它就是素材文件名（`E01-01.mp4` / `E01-01-f1.png`） |
| `sceneIndex` | int | 这一段在剧本该集的第几场（1 起）。段内全部分镜同场 |
| `cuts` | cut[] | 段内分镜，按时间顺序。段总秒数 = 分镜秒数之和，**不单独存**——少一处会漂的冗余 |
| `h3Prompt` | string | **一段一条 H3 视频提示词**，正文语言跟 `promptLang`（默认中文），结构见 `references/h3-prompt.md` |
| `blocking` | string | **人物关系与构图逻辑**：开场那一瞬谁在画面左、谁在右、面朝哪、相距多远（厘米或步数）。一段一份，各镜从它出发。纯参考图出片时这是唯一说清「人在哪」的地方。**必填**（`composition` 门） |
| `soundscape` | string | **Seedance 用的音景**（中文）：环境声、动作声、非语言人声，不复述台词。程序套上 `<>`，字段里别自己写 |
| `music` | string | **Seedance 用的配乐**（中文），写配器与速度。没有就省略这个字段。程序套上 `（）` |
| `note` | string | 备注，可选 |

## cut（分镜）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `beats` | [int, int] | 认领该场第几拍到第几拍（含两端）。**每个节拍必须被恰好一个分镜认领**，按顺序、连续 |
| `seconds` | number | 镜头实际时长，须在配置的 `minCutSeconds`–`maxCutSeconds` 内。2–5秒是常见节奏参考；长句与连续动作可延长并同步上限，不通过删词或加速硬塞。认领节拍的台词与必须依次完成的动作须装得下 |
| `size` | enum | 景别：`extreme-wide` 大远景 / `wide` 全景 / `medium` 中景 / `close` 特写 / `extreme-close` 大特写 |
| `camera` | enum | 运镜，**直接用 H3 官方词表**（原样字符串）：`Static Shot` `Push In` `Pull Out` `Zoom In/Out` `Pan Left/Right` `Truck Left/Right` `Tilt Up/Down` `Pedestal Up/Down` `Arc Shot` `Tracking Shot` `Shake Slightly/Strongly` `POV` `Roll Clockwise/Counterclockwise` |
| `characters` | string[] | 画内人物（C 编号），必须 ⊆ 剧本该场人物；空镜给空数组。> `maxOnScreen` 时必须带 `note` |
| `props` | string[] | 画内道具（P 编号），必须 ⊆ 剧本该场道具。可省略 |
| `frame` | string | **分镜图提示词**（中文）：这一格的主体、位置状态、动作瞬间、光线与氛围。景别中文词必须在里面；**直呼角色名**（它指的是挂上去的设定图） |
| `shot` | string | **镜头正文**（中文）：这几秒发生什么——运镜或切换方式 → 主体动作与表情 → 位置或空间变化，写法见 `shot-writing.md`。**用通用身份，不写角色名**；不写秒数、镜头编号、图片引用、台词和 `{}` `<>` `（）`——这些由程序加。Seedance 提示词的「画面：」行就是它 |
| `lens` | string | 焦距 + 景深：`50mm 标准，中浅景深` / `85mm 长焦，极浅景深`。这六个构图字段**每镜必填**（`composition` 门） |
| `cameraPosition` | string | 机位：对着谁 + 什么角度，`李四 + 平视正面` / `双人 + 俯视 30°` |
| `composition` | string | 构图法：`三分法` / `中心构图` / `对角线` / `对称` |
| `eyeline` | string | 视线落点：`对方面部` / `手中衬衫` / `闭眼` |
| `focus` | string | 焦点锁定什么：`锁定李四上半身` |
| `stability` | enum | `stable` 稳定 / `slight-shake` 微晃 / `handheld` 手持 |
| `sfx` | string | 这一镜自己的音效，段级音景之外，可选 |
| `lighting` | string | 这一镜特有的光影，场景级之外，可选 |
| `recipe` | string | 镜头配方卡 id，可选。挂了 `--shots <卡片目录>` 才查（`shot-recipe` 门）。**cut 级不是 segment 级**——一段可以跨多种配方；**多格配方靠连续同 id 的分镜表达**，不是数组 |
| `note` | string | 备注，可选 |

`recipe` 是**可选挂载**：不给 `--shots` 就整门跳过。给了就查三条——id 在卡库里、卡片的每条 `must_phrases` 出现在该切的 `frame` 里（两边小写化后 `includes`）、卡片 `cuts` 下限 ≥ 2 时连续同 id 的分镜数不得低于该下限。卡片的**建议景别与运镜不设门**，只在报告里提示偏离：配方是语汇不是法条。

## h3Prompt 的结构（三道门盯着，两处逐字对账）

写法见 `references/h3-prompt.md`（官方方法论的内化版，本 skill 自包含不依赖外部 skill）。骨架：

```text
How the reference pictures align with the target video — Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot 2) aligns with the 3.00-second mark of the target video; ….

integrated_multimodal_description:
[Shot 1] …（首格锚定 → 动作 → 运镜 → 对白；不写画风句）
[Shot 2] At 00:03.000, the camera cuts to …（每个镜头独立一行，切点时刻开头）

overall_soundscape: …（环境声与动作声，1–4 句）

non_diegetic_music: …（1–3 句，没有就 N/A）
```

确定性检查的五条：

1. **首行对齐指令整行由分镜结构按 `promptLang` 推导**（`h3AlignmentLine`）：多分镜的段把每张分镜图钉在自己的切点秒数上；单分镜的段用固定句式。validate **逐字对账**——分镜秒数一改，旧指令立刻对不上
2. 三个字段名齐全且按序；描述正文有 `[Shot 1]`
3. **每个 `[Shot k]`（k ≥ 2）必须带切点时刻 `At 00:0X.XXX,`，且等于前面分镜秒数的累计**——节奏写在纸上就必须和提示词一致
4. 认领节拍的每句台词**逐字**进 `<d>[Chinese] …</d>`；说话人身份音色语气用英文写在 `<d>` 外；画外音用 `says in an off-screen voiceover` 并注明唇形闭合
5. `<d>` 块之外的正文语言与 `promptLang` 一致（中文写成英文、英文混进中文都拦）；两种模式都禁角色名（官方规范，不跟着语言变）；每个分镜的运镜词（中文用词表中文词如「推」「固定」，英文用官方词）必须出现在**自己的 [Shot k] 段落**里

## 时长约束链

台词自然语速估算及必需动作须装入分镜 `seconds`；分镜满足配置的镜头上下限，段 Σ分镜不超过实际生成上限（Rui制作入口当前上限30秒），集 Σ段与按实际排镜确定的 `targetSeconds` 对账。默认允许不足30秒的组，只有显式固定时长才要求精确30秒。对白与动作可并行时按时间线估算，不能把每个动作机械累加；详细规则见[紧凑节奏与连续性](storyboard-pacing.md)。

## Rui-Skills 最终导出补充

上述字段为内部制作与协议资料，不要求全部逐项写入最终提示词。默认参考素材齐全；最终视频描述不重新设计外观。段级可选 `constraints: string[]` 保存本段特有的关键约束。`export-text` 默认精简、按镜头顺序，`--detail full` 提供完整字段，`--timing seconds` 显示时间。内部每组不超过30秒并根据动作/对白分配，不机械均分。两种输出均禁止生理变色的情绪描述，按上下文改成可见反应；保留原台词。

可选 `segment.unifiedPrompt: string` 为该独立提交段完整的统一设定，优先于项目级 `storyboard.unifiedPrompt`；未填写时保持旧项目行为。只写本段必要信息，并保留用户指定的共享摄影与声音要求。
