# やきことば · Yaki Kotoba

焼肉・焼き鳥・寿司のことば —— 菜单上最常用的日语，一页一张表：读音、发音、意思、部位、解说。
日语为主，中文和英文为辅，可以随时隐藏。连锁店作为筛选项：选中一家店，表格只显示这家店有的菜，并显示店内的写法和官方图片。

## 运行

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # 输出到 dist/，可直接放到任何静态托管
npm run tts      # 生成缺失的发音（需要 .env 里的 GEMINI_API_KEY 和 ffmpeg）
```

## 内容

格式见 [docs/CONTENT.md](docs/CONTENT.md)。

| 路径 | 内容 |
|---|---|
| `src/content/tabs/` | 标签页：焼肉、焼き鳥、寿司・魚 |
| `src/content/groups/<tab>/<group>.yaml` | 表格的一组，例如 牛、ホルモン、マグロ |
| `src/content/chains/<id>.yaml` | 连锁店：店里的菜对应表格的哪一行 |
| `src/assets/media/` | 图片；每个目录的 `meta.yaml` 写明出处 |

- 加一行：在对应的 group 文件里加一项，然后跑 `npm run tts`。
- 加一家店：新建 `src/content/chains/<id>.yaml`，图片放到 `src/assets/media/chains/<id>/`。

## 图片出处

- 肉的照片来自农林水产省「aff」2020 年 9 月号「お肉丸わかり図鑑」（监修：日本食肉消費総合センター），按公共数据利用规约（PDL1.0）注明出处使用。
- 连锁店的 logo 和菜品图来自各店官网。

每张图的出处写在对应的 `meta.yaml` 里，页面底部也有汇总。
