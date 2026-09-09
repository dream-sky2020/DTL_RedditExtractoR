import asyncio
import edge_tts

text = """这俩谁赢我不知道，但军训被太阳暴打这事，我可太有发言权了，怕军训晒黑的，来看看我在得物入的这瓶蜜丝婷小黄帽，亲测好用，高倍防紫外线隔离保湿提亮一手抓，乳液质地抹上脸清清爽爽不闷脸也不粘糊，我直接入的40毫升也就30多，够用一整个夏天了。现在买还有新老客户回归福利大额优惠券不定时发放，直接送了我十几块优惠券呢，而且得物上美妆基本都是品牌官方直发，还有过敏无忧售后，敏感肌朋友也可以放心试，不想军训变成煤炭的兄弟们，直接冲评论区置顶链接，这性价比简直YYDS。"""

async def main():
    await edge_tts.Communicate(text, "zh-CN-YunxiNeural").save("junxun_baoxiang.mp3")

asyncio.run(main())
