import { useEffect, useState } from 'react'
import { Image, Text, View, type ImageProps } from '@tarojs/components'
import search from '../../assets/home/icons/search.png'
import message from '../../assets/home/icons/message-circle.png'
import bag from '../../assets/home/icons/shopping-bag.png'
import add from '../../assets/home/icons/square-plus.png'
import crown from '../../assets/home/icons/crown.png'
import sock from '../../assets/home/icons/sock.png'
import shoe from '../../assets/home/icons/shoe.png'
import cart from '../../assets/home/icons/shopping-cart.png'
import plus from '../../assets/home/icons/plus.png'
import arrow from '../../assets/home/icons/chevron-right.png'
import grid from '../../assets/home/icons/layout-grid.png'
import close from '../../assets/home/icons/x.png'
import member from '../../assets/home/icons/rosette-discount-check.png'
import minus from '../../assets/home/icons/minus.png'
import plusDark from '../../assets/home/icons/plus-dark.png'
import { formatPrice, type Product } from './data'
// RN 按模块绑定样式，独立卡片组件需要显式引入自身使用的样式表。
import './index.less'

const icons = { search, message, bag, add, crown, sock, shoe, cart, plus, plusDark, arrow, grid, close, member, minus }
export type IconName = keyof typeof icons

/** 使用本地 Tabler PNG 图标，避免字体图标在小程序与 RN 中的加载差异。 */
export function Icon({ name, className = '', style }: { name: IconName; className?: string; style?: ImageProps['style'] }) {
  // RN 会将调用处的 className 转为 style，必须继续传给 Image 才能保留图标尺寸与颜色。
  return (
    <>
      {/* 本地图标按入口传入的尺寸显示，基础尺寸仅作为默认值。 */}
      <Image src={icons[name]} mode='aspectFit' className={`home-icon ${className}`} style={style} />
    </>
  )
}

/** 图片加载失败时提供可重试提示，不让商品图片区域塌陷。 */
export function ProductImage({ src, className = '', style }: { src: string; className?: string; style?: ImageProps['style'] }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])
  return failed ? (
    <View className={`${className} image-fallback`} style={style} onClick={() => setFailed(false)}>
      {/* 失败占位保留原图尺寸，点击后重新加载，不改变页面滚动位置。 */}
      <Icon name='bag' />
      <Text className='image-fallback-text'>图片加载失败，点击重试</Text>
    </View>
  ) : (
    <>
      {/* 透传 RN 转换后的宽高与圆角，避免图片回退到原生默认的 300 × 225 尺寸。 */}
      <Image src={src} mode='aspectFill' className={className} style={style} lazyLoad onError={() => setFailed(true)} />
    </>
  )
}

/** 商品卡片共用会员价标识。 */
export function MemberPrice({ price }: { price: number }) {
  return <View className='member-price'>
    {/* 金色会员徽标与价格共用紧凑基线，避免挤压右侧加购按钮。 */}
    <View className='member-icon-wrap'><Icon name='member' className='member-icon' /></View>
    <Text className='member-price-text' numberOfLines={1}>会员价¥{formatPrice(price)}</Text>
  </View>
}

/** 团购卡片和双列卡片共享商品数据，预告商品只能预约提醒。 */
export function ProductCard({ product, featured = false, countdown = '', upcoming = false, reserved = false, onAdd, onBuy }: {
  product: Product
  featured?: boolean
  countdown?: string
  upcoming?: boolean
  reserved?: boolean
  onAdd: (product: Product) => void
  onBuy: (product: Product) => void
}) {
  return <View className={featured ? 'group-card' : 'product-card'}>
    {/* 团购卡使用横幅比例，双列商品使用竖图比例，图片均填满卡片宽度。 */}
    <ProductImage src={product.image} className={featured ? 'group-image' : 'product-image'} />
    {/* 团购专属活动条展示倒计时和推广人数。 */}
    {featured && <View className='group-ribbon'><Text className='ribbon-label'>{upcoming ? '明日开团 距开始：' : '团购活动 距结束：'}{countdown}</Text><Text className='ribbon-count'>{upcoming ? '好物抢先看' : '9999人推广'}</Text></View>}
    <View className={featured ? 'group-info' : 'product-info'}>
      {/* 商品标题固定两行，保持两列价格和操作按钮对齐。 */}
      <Text className='product-title' numberOfLines={2} maxLines={2}>{product.name}</Text>
      {/* 团购卡附加商品标签，普通卡片保留紧凑的信息密度。 */}
      {featured && <View className='product-tags'>{[product.tag, '品质保障', '精选好物'].map(tag => <Text key={tag} className='product-tag'>{tag}</Text>)}</View>}
      <View className='product-footer'>
        {/* 售价与会员价左对齐，价格区域可收缩，为右侧按钮保留固定宽度。 */}
        <View className='price-stack'><Text className={featured ? 'group-price' : 'product-price'} numberOfLines={1}><Text className={featured ? 'currency' : 'product-currency'}>¥ </Text>{formatPrice(product.price)}</Text><MemberPrice price={product.memberPrice} /></View>
        {/* 团购卡提供购买或预约，普通商品使用圆形加购入口。 */}
        {featured ? <View className='group-actions'>
          {!upcoming && <View className='cart-button' onClick={() => onAdd(product)} aria-label={`将${product.name}加入购物车`}><Icon name='cart' className='cart-icon' /></View>}
          <View className={reserved ? 'buy-button buy-button-reserved' : 'buy-button'} onClick={() => onBuy(product)}><Text className='buy-button-text'>{upcoming ? (reserved ? '已预约' : '提醒我') : '购买'}</Text></View>
        </View> : <View className='add-button' onClick={() => onAdd(product)} aria-label={`将${product.name}加入购物车`}><Icon name='plus' className='add-icon' /></View>}
      </View>
    </View>
  </View>
}
