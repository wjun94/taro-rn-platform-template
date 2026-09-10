const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFileSync, spawn } = require('node:child_process')

const projectRoot = path.resolve(__dirname, '..')
const isWindows = process.platform === 'win32'
const executableSuffix = isWindows ? '.exe' : ''
const args = process.argv.slice(2)
if (args[0] === '--') args.shift()
// 冷启动可能较慢，最多等待三分钟；每次查询也单独限制耗时。
const bootTimeoutMs = 180_000
const pollIntervalMs = 2_000

/** 读取本机 SDK 配置，兼容 Windows Java properties 中转义的盘符和反斜杠。 */
function readLocalSdk() {
  const file = path.join(projectRoot, 'android', 'local.properties')
  if (!fs.existsSync(file)) return undefined
  const match = fs.readFileSync(file, 'utf8').match(/^\s*sdk\.dir\s*[=:]\s*(.+)$/m)
  return match?.[1].trim().replace(/\\u([0-9a-fA-F]{4})|\\([\\: =])/g,
    (_, unicode, escaped) => unicode ? String.fromCharCode(parseInt(unicode, 16)) : escaped)
}

/** 按项目配置、环境变量、系统默认目录及 PATH 查找 SDK，不写入用户的全局环境。 */
function configureSdk() {
  const localSdk = readLocalSdk()
  const pathKey = Object.keys(process.env).find(key => key.toLowerCase() === 'path') || 'PATH'
  const pathEntries = (process.env[pathKey] || '').split(path.delimiter).filter(Boolean)
  const defaultSdk = isWindows
    ? path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'Android', 'Sdk')
    : path.join(os.homedir(), ...(process.platform === 'darwin' ? ['Library', 'Android', 'sdk'] : ['Android', 'Sdk']))
  const hasAdb = sdk => sdk && fs.existsSync(path.join(sdk, 'platform-tools', `adb${executableSuffix}`))

  // Gradle 也会优先读取 sdk.dir，配置失效时提示修正，避免脚本和构建使用不同的 SDK。
  if (localSdk && !hasAdb(localSdk)) {
    throw new Error('android/local.properties 的 sdk.dir 无效或缺少 platform-tools，请改为本机 Android SDK 路径。Windows 路径建议使用 C:/Users/用户名/AppData/Local/Android/Sdk。')
  }
  const sdk = [localSdk, process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT, defaultSdk,
    ...pathEntries.map(entry => path.dirname(entry.replace(/^"|"$/g, '')))].find(hasAdb)
  if (!sdk) {
    throw new Error('找不到 Android SDK。请通过 Android Studio 安装 SDK 和 Android SDK Platform-Tools，并配置 ANDROID_HOME 或 android/local.properties 的 sdk.dir。')
  }
  const env = { ...process.env, ANDROID_HOME: sdk, ANDROID_SDK_ROOT: sdk }
  // Windows 环境变量名不区分大小写，统一为一个 PATH，避免 Path / PATH 冲突。
  for (const key of Object.keys(env)) {
    if (key.toLowerCase() === 'path') delete env[key]
  }
  env.PATH = [path.join(sdk, 'platform-tools'), path.join(sdk, 'emulator'), ...pathEntries].join(path.delimiter)
  console.log(`[android] SDK: ${sdk}`)
  return { sdk, env, adb: path.join(sdk, 'platform-tools', `adb${executableSuffix}`) }
}

/** 不经过 shell 执行 SDK 工具，兼容 Windows 可执行文件和含空格的路径。 */
function readTool(command, toolArgs, env) {
  return execFileSync(command, toolArgs, {
    cwd: projectRoot, env, encoding: 'utf8', timeout: 10_000,
    windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']
  }).trim()
}

/** 保留设备状态，区分已连接、启动中和 USB 调试尚未授权。 */
function listDevices(context) {
  return readTool(context.adb, ['devices'], context.env).split(/\r?\n/)
    .map(line => line.trim().split(/\s+/))
    .filter(([, state]) => ['device', 'offline', 'unauthorized'].includes(state))
    .map(([id, state]) => ({ id, state }))
}

/** 后台启动已有 AVD，保留日志；命令结束后模拟器继续运行，便于后续开发。 */
function launchEmulator(context) {
  const emulator = path.join(context.sdk, 'emulator', `emulator${executableSuffix}`)
  if (!fs.existsSync(emulator)) {
    throw new Error('没有连接设备，且 SDK 中缺少 Android Emulator。请在 Android Studio 的 SDK Manager 中安装。')
  }
  const avds = readTool(emulator, ['-list-avds'], context.env).split(/\r?\n/).filter(Boolean)
  if (!avds.length) {
    throw new Error('没有可用模拟器。请先在 Android Studio → Device Manager 中创建一个虚拟设备，再运行 pnpm android。')
  }
  const avd = avds[0]
  const logDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'taro-android-'))
  const logPath = path.join(logDirectory, 'emulator.log')
  const logFd = fs.openSync(logPath, 'a')
  let child
  try {
    child = spawn(emulator, ['-avd', avd], {
      cwd: projectRoot, env: context.env, detached: true,
      stdio: ['ignore', logFd, logFd]
    })
  } finally {
    fs.closeSync(logFd)
  }
  const launched = { avd, logPath, error: undefined }
  child.on('error', error => { launched.error = error.message })
  child.on('exit', (code, signal) => {
    launched.error = `模拟器在就绪前退出（${signal || code}）`
  })
  child.unref()
  console.log(`[android] 启动模拟器: ${avd}\n[android] 模拟器日志: ${logPath}`)
  return launched
}

/** 等待目标设备联网及 Android 开机完成，避免刚出现 adb 连接就开始安装。 */
async function waitForDevice(context, deviceId, launched) {
  const deadline = Date.now() + bootTimeoutMs
  console.log('[android] 等待设备就绪，最长三分钟…')
  while (Date.now() < deadline) {
    if (launched?.error) throw new Error(`${launched.error}，请查看 ${launched.logPath}`)
    const devices = listDevices(context)
    for (const device of devices) {
      if (deviceId && device.id !== deviceId) continue
      if (deviceId && device.state === 'unauthorized') {
        throw new Error(`设备 ${deviceId} 未授权，请在手机上允许 USB 调试后重试。`)
      }
      if (device.state !== 'device') continue
      try {
        // 自动启动时只接受所选 AVD，避免启动过程中插入的其他设备被误选。
        if (launched) {
          if (!device.id.startsWith('emulator-')) continue
          const name = readTool(context.adb, ['-s', device.id, 'emu', 'avd', 'name'], context.env).split(/\r?\n/)[0]
          if (name !== launched.avd) continue
        }
        const booted = readTool(context.adb, ['-s', device.id, 'shell', 'getprop', 'sys.boot_completed'], context.env)
        if (booted === '1') return device.id
      } catch {
        // 模拟器启动阶段 adb shell 可能暂不可用，下一轮继续检查。
      }
    }
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
  }
  throw new Error(`等待设备 ${deviceId || launched?.avd || ''} 就绪超时，请检查模拟器窗口或设备连接。${launched ? `日志：${launched.logPath}` : ''}`)
}

/** 使用项目内 React Native CLI，透传参数、终端输出和退出码，无需依赖 pnpm.cmd。 */
async function runReactNative(cliArgs, env) {
  const cliPath = require.resolve('react-native/cli.js')
  const child = spawn(process.execPath, [cliPath, 'run-android', ...cliArgs], {
    cwd: projectRoot, env, stdio: 'inherit'
  })
  const stop = signal => child.kill(signal)
  const onInterrupt = () => stop('SIGINT')
  const onTerminate = () => stop('SIGTERM')
  process.on('SIGINT', onInterrupt)
  process.on('SIGTERM', onTerminate)
  try {
    process.exitCode = await new Promise((resolve, reject) => {
      child.once('error', reject)
      child.once('exit', (code, signal) => resolve(code ?? (signal === 'SIGINT' ? 130 : 1)))
    })
  } finally {
    process.off('SIGINT', onInterrupt)
    process.off('SIGTERM', onTerminate)
  }
}

/** 优先使用现有设备；没有设备时启动第一个 AVD，再交给原有 CLI 构建、安装及启动应用。 */
async function main() {
  if (args.includes('--help') || args.includes('-h')) return runReactNative(args, process.env)
  const context = configureSdk()
  // 显式交互选机仍由 CLI 管理，保留原有命令行为。
  if (args.includes('--list-devices') || args.includes('--interactive')) return runReactNative(args, context.env)
  const deviceFlagIndex = args.findIndex(arg => arg === '--deviceId' || arg.startsWith('--deviceId='))
  const requestedId = deviceFlagIndex < 0 ? undefined
    : args[deviceFlagIndex].includes('=') ? args[deviceFlagIndex].slice('--deviceId='.length) : args[deviceFlagIndex + 1]
  if (deviceFlagIndex >= 0 && (!requestedId || requestedId.startsWith('--'))) {
    throw new Error('--deviceId 后需要提供 adb 设备 ID。')
  }
  const devices = listDevices(context)
  let deviceId = requestedId
  let launched
  if (!deviceId) {
    deviceId = devices.find(device => device.state === 'device')?.id
      || devices.find(device => device.id.startsWith('emulator-') && device.state === 'offline')?.id
    if (!deviceId) {
      if (devices.some(device => device.state === 'unauthorized')) {
        throw new Error('已连接的设备未授权，请在手机上允许 USB 调试后重试。')
      }
      launched = launchEmulator(context)
    }
  }
  deviceId = await waitForDevice(context, deviceId, launched)
  console.log(`[android] 使用设备: ${deviceId}`)
  await runReactNative(requestedId ? args : [...args, '--deviceId', deviceId], context.env)
}

main().catch(error => {
  console.error(`[android] ${error.message}`)
  if (error.stderr) console.error(String(error.stderr).trim())
  process.exitCode = 1
})
