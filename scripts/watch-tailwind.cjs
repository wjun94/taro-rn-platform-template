const fs = require('node:fs')
const path = require('node:path')
const { createHash } = require('node:crypto')

/** 按稳定顺序收集 Tailwind 扫描的源码，包含新增、修改和删除后的完整内容。 */
function hashSources(directory, hash) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const filename = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      hashSources(filename, hash)
    } else if (entry.isFile() && /\.[jt]sx?$/.test(entry.name)) {
      hash.update(filename).update('\0').update(fs.readFileSync(filename)).update('\0')
    }
  }
}

/**
 * 为 RN 创建带内容指纹的样式入口，让 JSX 类名变化成为 Metro 可观察的 CSS 文件变化。
 * 入口保留 Tailwind 指令，由现有 Taro PostCSS 处理；不在这里生成 CSS 或调用构建命令。
 */
function watchTailwind(projectRoot, { watch = true } = {}) {
  const sourceRoot = path.join(projectRoot, 'src')
  const sourceCss = path.join(sourceRoot, 'styles', 'tailwind.css')
  const generatedCss = path.join(sourceRoot, 'styles', 'tailwind.rn.css')
  const configFile = path.join(projectRoot, 'tailwind.config.js')
  let timer

  /** 只在内容变化时改写自动生成入口，避免重复刷新及监听循环。 */
  function syncEntry() {
    const css = fs.readFileSync(sourceCss, 'utf8')
    const hash = createHash('sha256').update(css).update(fs.readFileSync(configFile))
    hashSources(sourceRoot, hash)
    const content = `/* 自动生成，请勿修改。Tailwind 源码指纹：${hash.digest('hex')} */\n${css}`
    if (!fs.existsSync(generatedCss) || fs.readFileSync(generatedCss, 'utf8') !== content) {
      fs.writeFileSync(generatedCss, content)
    }
  }

  // Metro 扫描依赖前准备入口；非开发模式仅同步一次。
  syncEntry()
  if (!watch) return () => {}

  /** 合并编辑器保存事件；失败时显示原因，下一次保存仍可重试。 */
  function scheduleSync() {
    clearTimeout(timer)
    timer = setTimeout(() => {
      try {
        syncEntry()
      } catch (error) {
        console.error(`[tailwind] 样式刷新失败：${error.message}`)
      }
    }, 100)
    timer.unref()
  }

  // macOS / Windows 均支持递归监听；生成的 CSS 不参与事件过滤，避免自己触发自己。
  const sourceWatcher = fs.watch(sourceRoot, { recursive: true, persistent: false }, (_event, filename) => {
    if (!filename) return scheduleSync()
    const name = filename.toString()
    if (/\.[jt]sx?$/.test(name) || path.resolve(sourceRoot, name) === sourceCss || !path.extname(name)) {
      scheduleSync()
    }
  })
  // 监听目录而非文件本身，兼容编辑器通过重命名替换配置文件的保存方式。
  const configWatcher = fs.watch(projectRoot, { persistent: false }, (_event, filename) => {
    if (!filename || filename.toString() === 'tailwind.config.js') scheduleSync()
  })
  for (const watcher of [sourceWatcher, configWatcher]) {
    watcher.on('error', error => console.error(`[tailwind] 文件监听失败，请重启 Metro：${error.message}`))
  }
  return () => {
    clearTimeout(timer)
    sourceWatcher.close()
    configWatcher.close()
  }
}

module.exports = { watchTailwind }
