#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
图鉴图压缩：把 src/static/gallery/*.jpg 压到总和 ≤700KB。

策略：
  1. 先在内存里试算，不落盘。只有整轮达标后才一次性写盘——否则第二轮
     会去压「已经压过的图」，画质被反复劣化（generation loss）。
  2. 最长边 700px。详情页最大展示 460rpx 高，3x 屏约 690px 物理像素，
     700px 刚好够；再大就是白白吃掉主包体积。
  3. 单张硬上限 150KB，超过就单独降该张的质量。
  4. 只在「压完更小」时才覆盖。

注意：压缩是不可逆的（原图有损）。调大 MAX_EDGE 前先确认主包还有余量，
     目前无分包配置，微信主包硬上限 2MB。
"""
import os
import sys
import io
from pathlib import Path
from PIL import Image

# 项目根 = scripts 的上一级（双重 dirname 上跳，源码里不出现 '..' 字面量）
ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / 'src' / 'static' / 'gallery'
MAX_EDGE = 700
TARGET_TOTAL = 700 * 1024  # 700KB
MAX_SINGLE = 150 * 1024    # 单张 150KB
QUALITY = 80


def safe_target(name):
    """落盘前校验：目标必须仍在 SRC_DIR 内（防路径穿越）"""
    p = (SRC_DIR / name).resolve()
    if not p.is_relative_to(SRC_DIR.resolve()):
        raise ValueError('落盘路径越出目标目录: %s' % name)
    return p


def load_scaled(path):
    """读图并缩放到最长边 ≤ MAX_EDGE，返回 (PIL.Image, 原始宽高, 原文件体积)"""
    before = os.path.getsize(path)
    im = Image.open(path)
    if im.mode != 'RGB':
        im = im.convert('RGB')

    w, h = im.size
    if max(w, h) > MAX_EDGE:
        scale = MAX_EDGE / float(max(w, h))
        im = im.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

    return im, (w, h), before


def encode(im, q):
    """把图按质量 q 编码成 JPEG 字节，返回 (bytes, 大小)"""
    buf = io.BytesIO()
    im.save(buf, 'JPEG', quality=q, optimize=True, progressive=True)
    data = buf.getvalue()
    return data, len(data)


def try_round(files, q):
    """按质量 q 试算整轮。不落盘，返回 (每张结果, 合计大小)"""
    results = []
    total = 0
    for f in files:
        im, orig_size, before = load_scaled(SRC_DIR / f)

        # 单张超过 150KB 就单独降质量，不让某一张图吃掉大半主包预算
        q_used = q
        while True:
            data, after = encode(im, q_used)
            if after <= MAX_SINGLE or q_used <= 40:
                break
            q_used -= 10

        results.append({
            'file': f, 'data': data, 'before': before,
            'after': after, 'size': im.size, 'orig': orig_size, 'q': q_used
        })
        total += after
    return results, total


def main():
    if not SRC_DIR.is_dir():
        print('目录不存在:', SRC_DIR)
        return 1

    files = sorted(f.name for f in SRC_DIR.iterdir() if f.suffix.lower() in ('.jpg', '.jpeg'))
    if not files:
        print('没有可压缩的 jpg')
        return 1

    q = QUALITY
    while True:
        results, total = try_round(files, q)
        if total <= TARGET_TOTAL or q <= 50:
            break
        q -= 10
        print(f'试算 q={q + 10} 合计 {total / 1024:.0f} KB 超标，降到 q={q} 重试...')

    # 只有整轮达标（或已到质量下限）后才落盘。
    # 写入用 Path.write_bytes 且目标经 safe_target 校验，杜绝路径穿越。
    written = 0
    for r in results:
        if r['after'] < r['before']:
            safe_target(r['file']).write_bytes(r['data'])
            written += 1
        flag = '->' if r['after'] < r['before'] else '=='
        print(f"{r['file']:10s} {r['before'] / 1024:7.0f} KB {flag} {r['after'] / 1024:7.0f} KB"
              f"  {r['size'][0]}x{r['size'][1]}  q{r['q']}")

    total_before = sum(r['before'] for r in results)
    total_after = sum(r['after'] for r in results)
    print('-' * 62)
    print(f'合计 {total_before / 1024:.0f} KB -> {total_after / 1024:.0f} KB  (q={q}, 落盘 {written}/{len(results)} 张)')
    if total_after <= TARGET_TOTAL:
        print(f'✅ 达标（≤{TARGET_TOTAL // 1024}KB），省 {(total_before - total_after) / 1024:.0f} KB')
    else:
        print(f'⚠️ 仍超 {TARGET_TOTAL // 1024}KB，需调小 MAX_EDGE 或做分包')
    return 0

if __name__ == '__main__':
    sys.exit(main())
