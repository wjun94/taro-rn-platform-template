export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/category/index',
    'pages/message/index',
    'pages/profile/index'
  ],
  // 使用 Taro 内置底部导航，各端统一切换页面；选中项用首页主题红色标识。
  tabBar: {
    color: '#777777',
    selectedColor: '#ff454c',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    position: 'bottom',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页',
        iconPath: 'assets/tabbar/home.png',
        selectedIconPath: 'assets/tabbar/home.png'
      },
      {
        pagePath: 'pages/category/index',
        text: '分类',
        iconPath: 'assets/tabbar/layout-grid.png',
        selectedIconPath: 'assets/tabbar/layout-grid.png'
      },
      {
        pagePath: 'pages/message/index',
        text: '消息',
        iconPath: 'assets/tabbar/message-circle.png',
        selectedIconPath: 'assets/tabbar/message-circle.png'
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: 'assets/tabbar/user.png',
        selectedIconPath: 'assets/tabbar/user.png'
      }
    ]
  },
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: 'WeChat',
    navigationBarTextStyle: 'black'
  }
})
