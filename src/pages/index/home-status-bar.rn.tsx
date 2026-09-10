import { StatusBar } from 'react-native'

/** 原生首页使用深色状态栏文字；组件卸载时由 RN 恢复其他页面的状态栏配置。 */
export default function HomeStatusBar() {
  return (
    <>
      {/* 系统时钟、信号和电量由系统绘制，透明底色露出页面的米棕色安全区。 */}
      <StatusBar barStyle='dark-content' backgroundColor='transparent' translucent />
    </>
  )
}
