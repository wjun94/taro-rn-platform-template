const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')
const { getMetroConfig } = require('@tarojs/rn-supporter')
const { createHash } = require('node:crypto')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const { watchTailwind } = require('./scripts/watch-tailwind.cjs')

// RN 自动解析 tailwind.rn.css；源码类名变化时同步刷新该入口，使 Metro 重新转换样式。
const stopWatchingTailwind = watchTailwind(__dirname, { watch: process.env.NODE_ENV !== 'production' })
process.once('exit', stopWatchingTailwind)

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  // Taro 将页面列表和 Tab 图标写入原生入口缓存；配置变化后重启 Metro 时必须使旧入口失效。
  cacheVersion: createHash('sha256')
    .update(readFileSync(path.join(__dirname, 'src/app.config.ts')))
    .digest('hex'),
  transformer: {
    // 保留原始 Tailwind 任意值类名，修复 RN 丢弃转义选择器导致的样式缺失。
    babelTransformerPath: require.resolve('./scripts/tailwind-rn-transformer.cjs')
  }
}

module.exports = (async function (){
  return mergeConfig(getDefaultConfig(__dirname), await getMetroConfig(), config)
})()
