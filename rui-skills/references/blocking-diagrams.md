# 本地站位图与 ArtCraft 场景交换

用于真人与漫剧的空间调度预演。生成带姓名、朝向、关系轴、路径、机位的俯视图，以及无标注三维简模机位图；不生成最终角色外观或视频。先遵守[空间与人物调度](space-and-blocking.md)和[叙事镜头设计](narrative-camera-design.md)。

## 运行与交付

在技能目录执行。首次安装下载锁定的 npm 依赖；之后检查、渲染、审阅均在本地运行，无服务账户、模型费用或素材上传，不需要闭源引擎或 ArtCraft 桌面程序。当前实际验收环境为 Windows x64 / Node.js 24.15.0；其他平台未验证。

```text
node scripts/blocking.mjs setup
node scripts/blocking.mjs check assets/blocking-example.json
node scripts/blocking.mjs render assets/blocking-example.json --out 站位示例
```

实际任务先另存输入，按真实材料修改，不使用示例人物代替剧本角色。输出目录必须不存在，不覆盖已有成果。`review.html` 可在本地浏览器打开，选择状态查看俯视图与机位图。输出包括：

| 文件 | 用途 |
| --- | --- |
| `状态id.plan.png/.svg` | 有标注俯视图：审阅站位、朝向、路径和机位 |
| `镜头id.camera.png/.svg` | 无文字简模构图图：只提供空间和姿态参考 |
| `镜头id.artcraft.json` | 基本几何体、人偶分件和机位场景交换数据 |
| `blocking.json` | 归一化源数据，可编辑后再次渲染到新目录 |
| `review.json` | 自动几何检查；`visualReview: not_run`，不冒充人工验收 |
| `generation-reference.md` | 向生成模型附图时的用途说明 |

默认 9:16 输出720×1280；其他画幅最长边1280。俯视图1440×1080。完成后实际查看每个关键状态和机位 PNG，另记视觉验收结论、问题和未测项目；不要仅凭命令成功或零警告宣布质量过关。

## 数据契约

从 [blocking-example.json](../assets/blocking-example.json) 复制完整结构。顶层使用 `schema: "rui-blocking/1"`、`units: "meters"`、`title`、`room`、`characters`、`props`、`anchors`、`states`、`shots`。

坐标为 `[x,y,z]` 米，房间中心为原点；+X东、+Y上、+Z南。地面 y=0，角色位置为双脚所在基准；道具位置为几何中心。`facingDegrees` 为朝向角：0朝北（−Z），90朝东，180朝南。位置/距离未知时采用合理设计值，并在交付说明中标明，不能声称测量过参考图。

| 字段 | 内容 |
| --- | --- |
| `room` | `width`、`depth`，只画地板与平面边界，墙体须作为真实已知道具单独描述 |
| `characters[]` | 唯一 `id`、真实 `name`、十六进制 `color`，可选 `height`（默认1.7米，允许0.5—3） |
| `props[]` | 唯一 `id`、`name`、`color`、`size:[宽,高,深]`、`position`；仅支持 `kind:"box"`；`rotationDegrees:[X,Y,Z]` 为右手系 XYZ 欧拉角；`solid:false` 可排除装饰物碰撞 |
| `anchors[]` | 必要空间锚点的 `name`、`position`，只加标注，不改变场景几何 |
| `states[]` | 唯一 `id`、`label`、所有角色的 `placements`，可选 `propOverrides` 与 `paths` |
| `placements[]` | `id`、`position`、`facingDegrees`，可选 `pose`、`joints`、`gaze`（角色或道具id） |
| `shots[]` | 唯一 `id`、`label`、`stateId`、`camera`，可选 `subjects:[角色id]` 与 `axis:[角色id,角色id]` |
| `camera` | `position`、`target`、`focalLengthMm`（8—300）、`aspect`（默认[9,16]）、`filmGaugeMm`（默认35） |

ID仅用字母、数字、下划线、连字符，最多64位；角色和道具不能重名。名字与标签可用中文。支持1—30角色、最多150道具、1—50状态、1—100机位；输入最多2MiB，坐标各轴绝对值不超过100米，画幅比例1:4至4:1。日常先做少量关键状态，避免无必要的密集人偶、道具与机位。

`pose` 支持 `stand`、`sit`、`reach-left`、`reach-right`。`joints` 可覆盖局部关节点：`pelvis`、`neck`、`head`、`hipL/R`、`kneeL/R`、`footL/R`、`shoulderL/R`、`elbowL/R`、`handL/R`。坐标按1.7米基础人偶定义，自动按角色身高缩放，再应用朝向与位置；L/R指角色自身左右。只是几何连接，不做骨骼约束、逆向运动学或人体可行性保证。

持物道具使用 `holder:{characterId:"A",hand:"right",offset:[0,0,0]}`，位置随该手关节点计算；offset在角色局部坐标中旋转，不随身高缩放，道具朝向由 `rotationDegrees` 独立设定。状态可用 `propOverrides:[{id:"物件id",holder:null,position:[x,y,z]}]` 放下，或换 holder 表示交接完成。覆盖只允许 `position`、`rotationDegrees`、`holder`，每个状态独立相对基础props，不隐式继承前态。接触前、接触中、交接后分别显式记录，工具不自动补动作。

移动路径使用 `paths:[{characterId:"A",points:[[起点],[转折点],[终点]],toState:"目标状态id"}]`。路径只画在俯视图并检查近似碰撞，不生成中间帧、时长或动画。角色没有移动依据时保持位置；`gaze` 只在俯视图画视线，不自动改变三维头部朝向。

## 生成提示词如何用图

先以实际人物、服装、场景参考锁定身份和画风，再把对应 `camera.png` 作为空间附图：

> 空间参考图只约束本镜机位、人物站位、朝向、姿态与遮挡。人物身份、服装和最终画风按指定角色及场景参考；不要继承占位人偶、色块或简模材质。

根据工具能力真正附图，不能仅写本地文件名就声称模型收到图片。带名字、箭头和辅助线的俯视图用于导演审阅，通常不作为最终视频的首帧图。漫剧继续按[漫剧提示词质量](comic-prompt-quality.md)区分二维/三维；此三维简模不代表最终选择三维画风。

静态构图不判定景别是否符合剧情组次。超过30秒连续任务的后续组仍禁全景和中景；检查推拉过程、起点与终点，不因站位工具能渲染全身而放宽规则。统一提示词仍不写站位，具体空间承接写在对应镜头。

## 检查边界

自动检查覆盖房间外站位、站立角色与实体道具近似占地相交、路径与障碍物相交、路径首尾和状态不一致、主体头部中心出框或被遮、同状态同一人物关系轴上的跨侧机位。只检查选入 `subjects` 的角色头部，不承诺全身/肢体不裁切。

检查不覆盖人物互相碰撞、精确人体接触、坐姿与椅子的可行性、跨状态轴线变化、连续运动、对话机位是否来自听者端、剧情因果或时长。倾斜障碍物和人形包络是近似值。零警告只表示没有触发已有检查。

机位图采用 Three.js SVGRenderer 与 Resvg 的CPU渲染，宽面分片减少遮挡排序误差；它没有GPU深度缓冲，交叉几何、贴面和复杂遮挡可能排序错误，不提供材质、真实光照或成片质感。复杂接触镜头须逐图查看，必要时在完整三维编辑器中精修后导出。

## 与 ArtCraft 的关系

对应项目是 [storytold/artcraft](https://github.com/storytold/artcraft)，不是一个开箱即用的人物站位图API。Rui 使用独立本地工具生成图像，同时输出其场景格式；未内嵌完整编辑器、未启动桌面应用、未接云端生成或自动上传。

格式锁定 ArtCraft 源码提交 `d4e4ac69bbd93d237eaf5d0260bc6a5ff3a5e373`。导出人偶为 Box/Cylinder/Sphere 基本几何体，使用 `Parim` 标记与 `user_data.shapeKey`，没有骨骼绑定、云素材、动画、天空盒或第三方美术资产。相机元数据与常用画幅同时输出；自定义画幅及胶片尺寸记录在 `rui` 扩展中，接收端需显式配置。

仓库测试 `tests/blocking-artcraft.mjs` 真实执行该提交的原始对象加载器与序列化器，验证五个示例场景的几何类型、变换、颜色、可见性及再次保存/加载。Scene宿主用最小几何实现替代，未验证桌面菜单、GPU渲染、相机恢复或云素材。场景可供开发者通过编辑器的 `applyJson/loadCache` 接口接入，不能承诺现行桌面版本存在可直接点击的JSON导入菜单。当前可靠可用的交付是本地站位图、机位PNG及可编辑源数据。

Rui运行时代码独立实现；上游未改动的源码仅收录在测试夹具中，保留 MIT 许可与固定来源记录，不包含上游第三方素材。
