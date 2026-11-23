from PIL import Image, ImageDraw, ImageFont
import os

ICONDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "icons")
GREEN = (15, 107, 92)

def find_font(size):
    for p in ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
              "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
              "/System/Library/Fonts/PingFang.ttc"]:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()

def make(size, maskable=False):
    img = Image.new("RGB", (size, size), GREEN)
    d = ImageDraw.Draw(img)
    # 安全区：maskable 内容放在中央 80%
    margin = size * 0.18 if maskable else 0
    # 画一个简化的书本/字母符号
    # 用白色 "R"（Reading）居中
    font = find_font(int(size * (0.5 if not maskable else 0.42)))
    text = "R"
    box = d.textbbox((0, 0), text, font=font)
    tw, th = box[2] - box[0], box[3] - box[1]
    x = (size - tw) / 2 - box[0]
    y = (size - th) / 2 - box[1]
    d.text((x, y), text, fill=(255, 255, 255), font=font)
    return img

make(192).save(os.path.join(ICONDIR, "icon-192.png"))
make(512).save(os.path.join(ICONDIR, "icon-512.png"))
make(180).save(os.path.join(ICONDIR, "apple-touch-icon.png"))
print("icons:", os.listdir(ICONDIR))
