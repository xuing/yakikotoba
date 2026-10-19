# 内容格式

网站只有一页：分「焼肉 / 焼き鳥 / 寿司・魚」三个标签，每个标签是一张表。
所有文字都是三语，**日语为主**，中文、英文作为辅助。

## 表格

- 标签页：`src/content/tabs/<tab>.yaml`，写名称和顺序。
- 分组：`src/content/groups/<tab>/<组 id>.yaml`，一组一个文件，组 id 全站唯一。

```yaml
# src/content/groups/yakiniku/beef.yaml
order: 1
ja: 牛
zh: 牛肉
en: Beef
items:
  - id: tan                # 行 id；引用写成 "<组 id>/<行 id>"，例如 beef/tan
    ja: タン               # 菜单上的写法
    ruby: "{漢字|かな}"     # ja 含汉字时必填
    kana: たん             # 全平假名
    romaji: tan            # 修正黑本式，长音用长音符号（rōsu、jō）
    mean: { ja: 牛の舌, zh: 牛舌, en: Beef tongue }
    part: { ja: 舌, zh: 舌头, en: The tongue }    # 在哪里 / 是什么
    note:                  # 解説：干货，每种语言 2–4 句
      ja: …
      zh: …
      en: …
    sources: [{ title: …, url: … }]
```

**解説写什么**：口感、脂肪、味道上的特点；具体在哪个部位，有哪些细分部位；名字的由来；菜单上常见的写法和吃法；鱼的产季；一头/一条能取多少……
只写有出处的事实。说法不一时写「一説に」/「一说」/ "One theory"。
不写食品安全提示，也不写「以店内为准」之类的话。

## 连锁店：`src/content/chains/<id>.yaml`

在表格上方作为筛选项。选中一家店时，表格只显示这家店有的行，并显示店内的叫法和图片。

```yaml
ja: 牛角
kana: ぎゅうかく
romaji: Gyūkaku
cuisine: yakiniku            # yakiniku | yakitori | sushi
url: "https://www.gyukaku.ne.jp/"
note: { ja: …, zh: …, en: … }   # 一句话介绍
items:
  - id: gyukaku-karubi
    ja: 牛角カルビ
    ruby: "{牛角|ぎゅうかく}カルビ"
    kana: ぎゅうかくかるび
    romaji: gyūkaku karubi
    rows: [beef/karubi]      # 对应表格里的哪一行
    mean: { ja: …, zh: …, en: … }
    signature: true          # 名物 / 招牌
    image: gyukaku-karubi.jpg   # 放在 src/assets/media/chains/<id>/
```

## 图片

- 表格行的图：`src/assets/media/rows/<组 id>/<行 id>/`
- 连锁店的 logo 和菜品图：`src/assets/media/chains/<id>/`

每个图片目录都有一个 `meta.yaml`，逐张写明来源：

```yaml
- file: maff.jpg
  kind: raw                  # raw | cooked | dish | logo
  source:
    title: 農林水産省 aff 2020年9月号「牛の部位図鑑」（監修：日本食肉消費総合センター）
    url: "https://www.maff.go.jp/j/pr/aff/2009/pdf/aff2009_02_poster01.pdf"
    license: 政府標準利用規約（第2.0版）
```

不使用 AI 生成的图片；找不到图就不放。
