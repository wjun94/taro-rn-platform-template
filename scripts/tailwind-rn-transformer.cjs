const fs = require('node:fs')
const { createHash } = require('node:crypto')
const { createRequire } = require('node:module')
const selectorParser = require('postcss-selector-parser')

// 使用当前 Taro 4.2.1 配套的转换器依赖，兼容 pnpm 的隔离依赖目录。
const requireFromTaro = createRequire(require.resolve('@tarojs/rn-supporter'))
const taroTransformer = requireFromTaro('./taroTransformer')
const { getProjectConfig } = requireFromTaro('./utils')
const StyleTransform = requireFromTaro('@tarojs/rn-style-transformer/dist/transforms').default
const babelTransformer = requireFromTaro('@react-native/metro-babel-transformer')

/**
 * 兼容任意值、斜杠及小数点类名，保留 Taro 原有的预处理、单位转换和样式校验。
 * 只转换独立的类选择器；不将伪类、后代选择器等浏览器行为误转换为无条件 RN 样式。
 */
class TailwindStyleTransform extends StyleTransform {
  constructor(config) {
    super(config)
    this.aliases = new Map()
  }

  /** Tailwind 展开后为转义类名生成临时别名，避开旧版 CSS 转换器的选择器过滤。 */
  async processStyle(...args) {
    this.aliases.clear()
    const result = await super.processStyle(...args)
    const rules = []
    const classNames = new Set()
    result.root.walkRules(rule => {
      const selectors = selectorParser().astSync(rule.selector)
      selectors.walkClasses(node => classNames.add(node.value))
      rules.push({ rule, selectors })
    })

    const originalToAlias = new Map()
    for (const { rule, selectors } of rules) {
      selectors.each(selector => {
        if (selector.nodes.length !== 1 || selector.first.type !== 'class') return
        const original = selector.first.value
        if (/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(original)) return
        let alias = originalToAlias.get(original)
        if (!alias) {
          alias = `taro_tw_${Buffer.from(original, 'utf8').toString('hex')}`
          // 避免与用户已有类名冲突，重复出现的同一类名仍使用同一别名。
          while (classNames.has(alias)) alias = `_${alias}`
          classNames.add(alias)
          originalToAlias.set(original, alias)
          this.aliases.set(alias, original)
        }
        selector.first.value = alias
      })
      rule.selector = selectors.toString()
    }
    return { ...result, css: result.root.toString() }
  }

  /** 在 Babel 处理前恢复 StyleSheet 对象的键，与静态或条件 className 的原始字符串一致。 */
  async transform(...args) {
    let source = await super.transform(...args)
    for (const [alias, original] of this.aliases) {
      source = source.replaceAll(`${JSON.stringify(alias)}:`, `${JSON.stringify(original)}:`)
    }
    return source
  }
}

/** 样式文件使用兼容转换器，JS / TS 和其他资源继续交给原有 Taro 转换器。 */
async function transform({ src, filename, options }) {
  if (!/\.(css|scss|sass|less|styl|stylus|pcss)$/i.test(filename)) {
    return taroTransformer.transform({ src, filename, options })
  }
  const config = await getProjectConfig()
  const styleOptions = { ...options, config }
  const source = await new TailwindStyleTransform(config).transform(src, filename, styleOptions)
  return babelTransformer.transform({ src: source, filename, options: styleOptions })
}

/** 将兼容层代码纳入 Metro 缓存键，修改转换逻辑后不复用旧转换结果。 */
function getCacheKey(...args) {
  return createHash('sha256')
    .update(taroTransformer.getCacheKey(...args))
    .update(fs.readFileSync(__filename))
    .digest('hex')
}

module.exports = { transform, getCacheKey, TailwindStyleTransform }
