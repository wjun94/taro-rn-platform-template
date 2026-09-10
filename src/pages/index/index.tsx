import { Component, PropsWithChildren } from 'react'
import { View, Text } from '@tarojs/components'

import './index.less'

export default class Index extends Component<PropsWithChildren> {

  componentDidMount () { }

  componentWillUnmount () { }

  componentDidShow () { }

  componentDidHide () { }

  // 首页示例：通过 Tailwind 工具类设置间距、背景与文字样式。
  render () {
    return (
      <View className='index flex flex-col p-4 bg-slate-100'>
        <Text className='text-xl text-[#7f1d1d]'>你好11!</Text>
      </View>
    )
  }
}
