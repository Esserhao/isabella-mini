#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
图鉴图压缩：把 src/static/gallery/*.jpg 压到总和 ≤200KB（平台要求）。

策略：
  1. 目标总和 ≤200KB，先按 q60 跑一轮，如果总和仍超则降 q 再跑。
  2. 最长边 900px（保留余量，小屏上 400-500px 展示已足够）。
  3. 只在「压完更小」时才覆盖。
"""
import os
import sys
from PIL import Image

SRC_DIR = os.path.join(os.path.dirname(__file__), '..', 'src', 'static', 'gallery')
MAX_EDGE = 300
TARGET_TOTAL = 200 * 1024  # 200KB
QUALITY = 60

def optimize(path):
    before = os.path.getsize(path)
    im = Image.open(path)
    if im.mode != 'RGB':
        im = im.convert('RGB')

    w, h = im.size
    if max(w, h) > MAX_EDGE:
        scale = MAX_EDGE / float(max(w, h))
        im = im.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

    tmp = path + '.tmp'
    im.save(tmp, 'JPEG', quality=QUALITY, optimize=True, progressive=True)
    after = os.path.getsize(tmp)

    if after < before:
        os.replace(tmp, path)
        return before, after, im.size, True
    os.remove(tmp)
    return before, before, (w, h), False

def main():
    if not os.path.isdir(SRC_DIR):
        print('目录不存在:', SRC_DIR)
        return 1

    global QUALITY
    while True:
        total_before = total_after = 0
        files = sorted(f for f in os.listdir(SRC_DIR) if f.lower().endswith(('.jpg', '.jpeg')))
        for f in files:
            p = os.path.join(SRC_DIR, f)
            b, a, size, changed = optimize(p)
            total_before += b
            total_after += a
            flag = '->' if changed else '=='
            print(f'{f:10s} {b/1024:7.0f} KB {flag} {a/1024:7.0f} KB  {size[0]}x{size[1]}')

        print('-' * 52)
        print(f'合计 {total_before/1024:.0f} KB -> {total_after/1024:.0f} KB  (q={QUALITY})')
        if total_after <= TARGET_TOTAL:
            print(f'✅ 达标（≤200KB），省 {(total_before-total_after)/1024:.0f} KB')
            break
        if QUALITY <= 20:
            print(f'⚠️ q=20 仍超限，需考虑缩小图片尺寸')
            break
        QUALITY -= 10
        print(f'⬇ 降质量到 q={QUALITY} 重新压缩...\n')
    return 0

if __name__ == '__main__':
    sys.exit(main())
