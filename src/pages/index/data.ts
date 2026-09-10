import hero from '../../assets/home/hero.jpg'
import promo from '../../assets/home/promo.jpg'
import oranges from '../../assets/home/oranges.jpg'
import flowers from '../../assets/home/flowers.jpg'
import lifestyle from '../../assets/home/lifestyle.jpg'
import fashion from '../../assets/home/fashion.jpg'
import father from '../../assets/home/father.jpg'
import summer from '../../assets/home/summer.jpg'
import appliance from '../../assets/home/appliance.jpg'
import autumn from '../../assets/home/autumn.jpg'
import coat from '../../assets/home/coat.jpg'
import socks from '../../assets/home/socks.jpg'
import shoes from '../../assets/home/shoes.jpg'

/** 首页展示数据集中维护；接入接口时保留商品标识与金额单位（元）。 */
export interface Product {
  id: string
  name: string
  image: string
  price: number
  memberPrice: number
  category: string
  tag: string
}

export const assets = { hero, promo, oranges, flowers, lifestyle, fashion, father, summer, appliance, autumn, coat }

export const products: Product[] = [
  { id: 'flowers', name: '绣球花束｜把温柔装进日常，窗边的一抹浪漫', image: flowers, price: 72.99, memberPrice: 59, category: '居家生活', tag: '鲜花绿植' },
  { id: 'plant', name: '居家绿植好物｜让生活回归自然，记录每一份美好', image: lifestyle, price: 73.2, memberPrice: 59, category: '居家生活', tag: '鲜花绿植' },
  { id: 'oranges', name: '当季鲜橙礼盒｜清甜多汁，阳光下的自然鲜味', image: oranges, price: 72.99, memberPrice: 59, category: '居家生活', tag: '新鲜果蔬' },
  { id: 'summer', name: '夏日缤纷泳圈｜轻盈随行，把快乐带去海边', image: summer, price: 73.2, memberPrice: 59, category: '居家生活', tag: '户外出游' },
  { id: 'coat', name: '鸭鸭秋冬轻暖羽绒服｜蓬松保暖，穿出自在松弛感', image: coat, price: 1099.65, memberPrice: 999, category: '时尚穿搭', tag: '秋冬新品' },
  { id: 'puffer', name: '鸭鸭奶油色羽绒外套｜轻盈锁温，温暖整个秋冬', image: hero, price: 1809.25, memberPrice: 1699, category: '时尚穿搭', tag: '秋冬新品' },
  { id: 'knit', name: '经典针织上衣｜简约百搭，柔软亲肤', image: fashion, price: 189, memberPrice: 159, category: '时尚穿搭', tag: '日常穿搭' },
  { id: 'socks', name: '舒适棉感中筒袜｜亲肤透气，日常百搭组合装', image: socks, price: 39.9, memberPrice: 29.9, category: '鞋袜专区', tag: '舒适棉袜' },
  { id: 'shoes', name: '轻盈休闲运动鞋｜柔软缓震，每一步都自在', image: shoes, price: 129, memberPrice: 109, category: '鞋袜专区', tag: '休闲鞋靴' },
  { id: 'projector', name: '极米 XGIMI 家用高清投影仪｜在家也能拥有私人影院', image: appliance, price: 3399, memberPrice: 3199, category: '品质家电', tag: '智能家电' }
]

export const groupProducts: Product[] = [
  { id: 'group-oranges', name: '阳光鲜橙家庭分享装｜清甜多汁，产地直采新鲜到家，让清新成为日常', image: oranges, price: 234.98, memberPrice: 189, category: '居家生活', tag: '产地直采' },
  { id: 'group-life', name: '把生活过成喜欢的样子｜居家精选好物，发现新鲜灵感，记录每一个温暖瞬间', image: lifestyle, price: 234.98, memberPrice: 189, category: '居家生活', tag: '品质精选' }
]

export const categories = ['时尚穿搭', '居家生活', '鞋袜专区', '品质家电']
export const saleTabs = ['今日主推', '即将结束', '明日预告']

/** 金额最多显示两位小数，避免浮点运算直接进入价格文案。 */
export const formatPrice = (value: number) => value.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
