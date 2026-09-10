import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { Input, ScrollView, Swiper, SwiperItem, Text, View } from '@tarojs/components'
import { assets, categories, formatPrice, groupProducts, products, saleTabs, type Product } from './data'
import { Icon, MemberPrice, ProductCard, ProductImage, type IconName } from './components'
import { useHomeScroll } from './use-home-scroll'
import HomeStatusBar from './home-status-bar'
import { useCartStore } from '../../stores/cart'
import './index.less'

// 原生滚动属性仅传给 RN；Android 开启嵌套滚动，iOS 锁定手势方向，输入时仍可点击搜索。
const nativeScrollOptions = process.env.TARO_ENV === 'rn' ? {
  showsVerticalScrollIndicator: false,
  showsHorizontalScrollIndicator: false,
  nestedScrollEnabled: true,
  directionalLockEnabled: true,
  keyboardShouldPersistTaps: 'handled' as const,
  keyboardDismissMode: 'on-drag' as const
} : {}

const shortcuts: { label: string; icon: IconName; color: string; category?: string; tag?: string }[] = [
  { label: '新品区', icon: 'bag', color: 'red', category: '时尚穿搭' },
  { label: '加开区', icon: 'add', color: 'orange' },
  { label: '会员区', icon: 'crown', color: 'blue' },
  { label: '袜子区', icon: 'sock', color: 'green', category: '鞋袜专区', tag: '舒适棉袜' },
  { label: '鞋子区', icon: 'shoe', color: 'purple', category: '鞋袜专区', tag: '休闲鞋靴' }
]

/** 倒计时使用截止时间计算，切回页面时不会因后台暂停而累计误差。 */
function formatCountdown(deadline: number, now: number) {
  const seconds = Math.max(0, Math.floor((deadline - now) / 1000))
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(value => String(value).padStart(2, '0')).join(':')
}

/** 团购店铺首页：本地展示数据驱动搜索、分类、活动切换及购物车交互。 */
export default function Index() {
  const [windowInfo] = useState(() => Taro.getSystemInfoSync())
  const bottomInset = Math.max(0, windowInfo.screenHeight - (windowInfo.safeArea?.bottom ?? windowInfo.screenHeight))
  const [keyword, setKeyword] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('居家生活')
  const [tag, setTag] = useState('全部')
  const [saleTab, setSaleTab] = useState(0)
  const { scrollProps, scrollTo, trackPosition } = useHomeScroll()
  // Zustand 使用示例：分别订阅需要的状态与操作，避免每次选择时创建新的对象。
  const cart = useCartStore(state => state.quantities)
  const addItem = useCartStore(state => state.addItem)
  const changeQuantity = useCartStore(state => state.changeQuantity)
  const [cartOpen, setCartOpen] = useState(false)
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [reservations, setReservations] = useState<string[]>([])
  const [now, setNow] = useState(Date.now)
  const [startedAt] = useState(Date.now)
  const [toast, setToast] = useState('')
  const [toastVersion, setToastVersion] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 2000)
    return () => clearTimeout(timer)
  }, [toast, toastVersion])

  const allProducts = [...groupProducts, ...products]
  const cartItems = allProducts.filter(product => (cart[product.id] || 0) > 0)
  const cartCount = Object.values(cart).reduce((sum, count) => sum + count, 0)
  const cartTotal = cartItems.reduce((sum, product) => sum + Math.round(product.price * 100) * cart[product.id], 0) / 100
  const tags = ['全部', ...new Set(products.filter(product => product.category === category).map(product => product.tag))]
  const visibleProducts = products.filter(product => query
    ? `${product.name}${product.tag}${product.category}`.toLowerCase().includes(query.toLowerCase())
    : product.category === category && (tag === '全部' || tag === product.tag))
  const featuredProducts = saleTab === 1 ? [...groupProducts].reverse() : groupProducts
  const countdown = formatCountdown(startedAt + (saleTab === 1 ? 2 : saleTab === 2 ? 12 : 39) * 3600000, now)

  /** 相同提示也重新计时，连续加购时反馈保持可见。 */
  function notify(message: string) {
    setToast(message)
    setToastVersion(value => value + 1)
  }

  /** 分类入口同步清空搜索和子分类，避免遗留筛选导致列表为空。 */
  function selectCategory(value: string) {
    setCategory(value)
    setTag('全部')
    setKeyword('')
    setQuery('')
    setCategoryOpen(false)
    scrollTo('home-categories')
  }

  /** 搜索跨全部分类匹配完整商品文案，空关键词恢复分类列表。 */
  function searchProducts() {
    // 搜索后收起两端软键盘，避免键盘遮挡目标商品区域。
    Taro.hideKeyboard()
    setQuery(keyword.trim())
    scrollTo('home-categories')
  }

  /** 调用 Zustand store 加购，页面只负责显示即时反馈。 */
  function addToCart(product: Product) {
    addItem(product.id)
    notify('已加入购物车')
  }

  /** 购买入口展示本地购物车；预告入口仅记录本次浏览的预约状态。 */
  function buyProduct(product: Product) {
    if (saleTab === 2) {
      if (reservations.includes(product.id)) return
      setReservations(current => [...current, product.id])
      notify('已预约，开团前记得回来看看')
      return
    }
    addItem(product.id)
    setCartOpen(true)
  }

  return (
    <View className='home-page' style={{ height: windowInfo.windowHeight }}>
      {/* RN 状态栏采用深色文字，顶部安全区留在滚动容器外，防止商品滑到刘海下方。 */}
      <HomeStatusBar />
      {process.env.TARO_ENV === 'rn' && <View className='native-status-inset' style={{ height: windowInfo.statusBarHeight ?? 0 }} />}
      {/* 首页主滚动区：只在点击入口时定位，购物车打开时禁止原生背景滚动。 */}
      <ScrollView className='home-scroll' scrollY scrollWithAnimation showScrollbar={false} {...scrollProps} {...nativeScrollOptions} {...(process.env.TARO_ENV === 'rn' ? { scrollEnabled: !cartOpen } : {})}>
        {/* 店铺标题和搜索导航，为宿主状态栏预留空间，保留合法的零高度。 */}
        <View className='store-header' style={{ paddingTop: process.env.TARO_ENV === 'rn' ? 0 : windowInfo.statusBarHeight ?? 20 }}>
          <View className='store-title-row'><Text className='store-title'>默默的团购店铺</Text></View>
          <View className='search-row'>
            <View className='search-box'>
              {/* 搜索按钮与键盘确认共用筛选逻辑，输入内容为空时恢复分类列表。 */}
              <View className={keyword ? 'search-trigger' : 'search-trigger'} onClick={searchProducts} aria-label='搜索商品'><Icon name='search' className='search-icon' /></View>
              <Input className='search-input' value={keyword} placeholder='输入关键词' placeholderTextColor='#c8c8c8' confirmType='search' onInput={event => setKeyword(event.detail.value)} onConfirm={searchProducts} />
              {/* 有输入时提供清空入口，同时撤销已提交的搜索条件。 */}
              {keyword.length > 0 && <View className='search-clear' onClick={() => { setKeyword(''); setQuery('') }} aria-label='清空搜索'><Icon name='close' className='search-icon' /></View>}
            </View>
            {/* 店铺消息使用 Taro 弹窗，在小程序和原生端展示相同说明。 */}
            <View className='message-button' onClick={() => Taro.showModal({ title: '店铺消息', content: '欢迎来到默默的团购店铺！精选好物每日上新，喜欢的商品可以先加入购物车。', showCancel: false })} aria-label='店铺消息'><Icon name='message' className='message-icon' /></View>
          </View>
          {/* 活动轮播支持横向滑动，点击海报定位到对应商品分类。 */}
          <View className='hero-frame'>
            <Swiper className='hero-swiper' circular autoplay interval={5000}>
              <SwiperItem><View className='hero-slide' onClick={() => selectCategory('时尚穿搭')}><ProductImage src={assets.hero} className='hero-image' /></View></SwiperItem>
              <SwiperItem><View className='hero-slide' onClick={() => selectCategory('居家生活')}><ProductImage src={assets.promo} className='hero-image' /></View></SwiperItem>
            </Swiper>
          </View>
        </View>

        {/* 记录内容容器相对主滚动区的偏移，与下方区块坐标相加进行原生定位。 */}
        <View className='home-content' {...trackPosition('content')}>
          {/* 快捷入口按配置切换分类或团购区，鞋袜入口同时应用子分类。 */}
          <View className='shortcut-row'>
            {shortcuts.map(item => <View className='shortcut-item' key={item.label} onClick={() => {
              if (item.category) { selectCategory(item.category); if (item.tag) setTag(item.tag) }
              else { setSaleTab(0); scrollTo('home-group'); if (item.label === '会员区') notify('会员专享价已在商品下方展示') }
            }}>
              <View className={`shortcut-circle shortcut-${item.color}`}><Icon name={item.icon} className='shortcut-icon' /></View>
              <Text className='shortcut-label'>{item.label}</Text>
            </View>)}
          </View>

          {/* 家居主活动及主题海报分别跳转到对应商品分类。 */}
          <View className='promo-banner' onClick={() => selectCategory('居家生活')}><ProductImage src={assets.promo} className='promo-image' /></View>
          <View className='campaign-row'>
            <View className='campaign-card' onClick={() => selectCategory('时尚穿搭')}><ProductImage src={assets.fashion} className='campaign-image' /></View>
            <View className='campaign-card' onClick={() => selectCategory('居家生活')}><ProductImage src={assets.father} className='campaign-image' /></View>
            <View className='campaign-card' onClick={() => selectCategory('时尚穿搭')}><ProductImage src={assets.autumn} className='campaign-image' /></View>
          </View>
          {/* 品牌专场按家电与服饰类别展示入口。 */}
          <View className='brand-row'>
            {['极米专场', '鸭鸭专场'].map((title, index) => <View key={title} className='brand-entry' onClick={() => selectCategory(index === 0 ? '品质家电' : '时尚穿搭')}><Text className='brand-title'>{title}</Text><View className='brand-arrow'><Icon name='arrow' className='brand-arrow-icon' /></View></View>)}
          </View>
          {/* 特惠橱窗展示投影仪与服饰价格，点击进入相应分类选购。 */}
          <View className='deals-row'>
            <View className='appliance-deal' onClick={() => selectCategory('品质家电')}><ProductImage src={assets.appliance} className='appliance-image' /><View className='appliance-caption'><Text className='appliance-name'>XGIMI 极米投影</Text><Text className='appliance-price'>到手价 ¥3399</Text></View></View>
            {products.filter(product => ['coat', 'puffer'].includes(product.id)).map(deal => <View className='clothing-deal' key={deal.id} onClick={() => selectCategory('时尚穿搭')}><ProductImage src={deal.image} className='clothing-image' /><Text className='deal-price'>¥{formatPrice(deal.price)}</Text></View>)}
          </View>

          {/* 团购定位锚点：切换活动状态，卡片同步倒计时、购买或预约操作。 */}
          <View className='group-section' id='home-group' {...trackPosition('home-group')}>
            <View className='sale-tabs'>{saleTabs.map((tab, index) => <View key={tab} className={saleTab === index ? 'sale-tab sale-tab-active' : 'sale-tab'} onClick={() => setSaleTab(index)}><Text className={saleTab === index ? 'sale-tab-text sale-tab-text-active' : 'sale-tab-text'}>{tab}</Text>{saleTab === index && <View className='sale-tab-indicator' />}</View>)}</View>
            {featuredProducts.map(product => <ProductCard key={`${saleTab}-${product.id}`} product={product} featured countdown={countdown} upcoming={saleTab === 2} reserved={reservations.includes(product.id)} onAdd={addToCart} onBuy={buyProduct} />)}
          </View>

          {/* 商品分类定位锚点：组织分类筛选、搜索结果和双列商品列表。 */}
          <View className='catalog-section' id='home-categories' {...trackPosition('home-categories')}>
            <View className='category-bar'>
              {/* 横向一级分类：点击切换商品，并保持与页面纵向滚动的手势分工。 */}
              <ScrollView className='category-scroll' scrollX showScrollbar={false} {...nativeScrollOptions}><View className='category-row'>{categories.map(value => <View key={value} className={!query && category === value ? 'category-item category-item-active' : 'category-item'} onClick={() => selectCategory(value)}><Text className={!query && category === value ? 'category-text category-text-active' : 'category-text'}>{value}</Text></View>)}</View></ScrollView>
              {/* 展开分类面板，便于直接选择横向列表中尚未显示的分类。 */}
              <View className='category-toggle' onClick={() => setCategoryOpen(value => !value)} aria-label='展开全部分类'><Icon name='grid' /></View>
            </View>
            {/* 面板展开时展示全部一级分类，选中后自动关闭。 */}
            {categoryOpen && <View className='category-panel'>{categories.map(value => <View key={value} className='category-option' onClick={() => selectCategory(value)}><Text className='category-text'>{value}</Text></View>)}</View>}
            {/* 搜索时展示结果数量及重置入口，否则展示可横向滑动的子分类。 */}
            {query ? <View className='search-summary'><Text className='search-summary-text'>“{query}” 的搜索结果 · {visibleProducts.length}件</Text><Text className='reset-search' onClick={() => { setQuery(''); setKeyword('') }}>重置</Text></View> : <ScrollView className='tag-scroll' scrollX showScrollbar={false} {...nativeScrollOptions}><View className='tag-row'>{tags.map(value => <View className='tag-item' key={value} onClick={() => setTag(value)}><Text className={tag === value ? 'tag-text tag-text-active' : 'tag-text'}>{value}</Text></View>)}</View></ScrollView>}
            {/* 匹配商品按双列展示；没有结果时提供恢复精选分类的入口。 */}
            {visibleProducts.length > 0 ? <View className='product-grid'>{visibleProducts.map(product => <ProductCard key={product.id} product={product} onAdd={addToCart} onBuy={buyProduct} />)}</View> : <View className='empty-state'><Icon name='search' className='empty-icon' /><Text className='empty-title'>暂时没有找到相关商品</Text><Text className='empty-description'>换个关键词，发现更多好物</Text><View className='empty-reset' onClick={() => selectCategory('居家生活')}><Text className='buy-button-text'>看看精选好物</Text></View></View>}
            <Text className='catalog-end'>精选好物 · 用心为你</Text>
          </View>
        </View>
      </ScrollView>

      {/* 原生底部手势区保留背景留白，最后一排商品与系统返回手势保持间距。 */}
      {process.env.TARO_ENV === 'rn' && <View className='native-bottom-inset' style={{ height: bottomInset }} />}

      {/* 有商品且抽屉关闭时显示购物车入口和数量角标。 */}
      {cartCount > 0 && !cartOpen && <View className='floating-cart' onClick={() => setCartOpen(true)} aria-label={`查看购物车，共${cartCount}件商品`}><Icon name='cart' className='floating-cart-icon' /><View className='cart-badge'><Text className='cart-badge-text'>{cartCount > 99 ? '99+' : cartCount}</Text></View></View>}
      {/* 原生提示层只显示反馈，不拦截下方商品的点击和滑动。 */}
      {toast.length > 0 && <View className='home-toast' {...(process.env.TARO_ENV === 'rn' ? { pointerEvents: 'none' as const } : {})}><Text className='home-toast-text'>{toast}</Text></View>}

      {/* 购物车抽屉覆盖页面，点击背景或关闭按钮返回选购。 */}
      {cartOpen && <View className='cart-overlay'>
        <View className='cart-backdrop' onClick={() => setCartOpen(false)} />
        <View className='cart-sheet' style={{ paddingBottom: Math.max(16, bottomInset) }}>
          <View className='cart-heading'><Text className='cart-heading-text'>购物车 · {cartCount}件</Text><View className='sheet-close' onClick={() => setCartOpen(false)} aria-label='关闭购物车'><Icon name='close' /></View></View>
          {/* 购物车商品独立纵向滚动，原生端使用相同的键盘与滚动条配置。 */}
          <ScrollView scrollY className='cart-list' {...nativeScrollOptions}>
            {/* 订阅 Zustand 购物车展示商品；加减按钮更新 store，数量清空后自动显示空态。 */}
            {cartItems.length === 0 && <Text className='cart-empty'>购物车还是空的，去挑选喜欢的好物吧</Text>}
            {cartItems.map(product => <View className='cart-item' key={product.id}>
              <ProductImage src={product.image} className='cart-product-image' />
              <View className='cart-product-info'><Text className='cart-product-name' numberOfLines={2}>{product.name}</Text><Text className='product-price'>¥{formatPrice(product.price)}</Text><MemberPrice price={product.memberPrice} /></View>
              <View className='quantity-control'><View className='quantity-button' onClick={() => changeQuantity(product.id, -1)} aria-label='减少数量'><Icon name='minus' className='quantity-icon' /></View><Text className='quantity-text'>{cart[product.id]}</Text><View className='quantity-button' onClick={() => changeQuantity(product.id, 1)} aria-label='增加数量'><Icon name='plusDark' className='quantity-icon' /></View></View>
            </View>)}
          </ScrollView>
          {/* 合计随购物车数量更新，继续选购仅关闭抽屉并保留已选商品。 */}
          <View className='cart-total-row'><Text className='cart-total-label'>合计 <Text className='group-price'>¥{formatPrice(cartTotal)}</Text></Text><View className='continue-button' onClick={() => setCartOpen(false)}><Text className='buy-button-text'>继续选购</Text></View></View>
        </View>
      </View>}
    </View>
  )
}
