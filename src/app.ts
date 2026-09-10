import { Component, PropsWithChildren } from 'react'

// 全局引入 Tailwind，Taro 会将全局样式注入 RN 页面和组件。
import './styles/tailwind.css'
import './app.less'

class App extends Component<PropsWithChildren> {

  componentDidMount () {}

  componentDidShow () {}

  componentDidHide () {}

  // this.props.children 是将要会渲染的页面
  render () {
    return this.props.children
  }
}
export default App
