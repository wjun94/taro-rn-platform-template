# Android 打包与失败原因

## 日常打包

在项目根目录执行：

```sh
pnpm install --frozen-lockfile
pnpm build:android
```

APK 输出：`android/app/build/outputs/apk/release/app-release.apk`。

`build:android` 调用 `android/gradlew app:assembleRelease`。React Native Gradle 插件会自动打包 JavaScript、资源并编译 Hermes 字节码，不需要先启动 Metro，也不需要先运行 `pnpm build:rn --platform android`。

三个命令的用途不同：

| 命令 | 用途 |
| --- | --- |
| `pnpm build:android` | 生成可安装、内置 JS 的 Release APK |
| `pnpm build:rn --platform android` | 单独生成 JS bundle 和资源，不生成 APK |
| `pnpm android` | 构建并运行开发版，调试时另开终端运行 `pnpm dev:rn` |

当前 Release 使用模板的 `debug.keystore` 签名，适合本地安装验证；上架或正式分发前需要配置自己的发布签名。

## 本次复现并修复的问题（2026-09-08）

### 1. 项目依赖目录缺失

首次执行 `./gradlew app:assembleRelease`，在 `android/settings.gradle:2` 失败：

```text
Could not read script '.../node_modules/@react-native-community/cli-platform-android/native_modules.gradle' as it does not exist.
```

检查发现整个 `node_modules` 都不存在，因此 Gradle 无法加载 React Native 自动链接脚本。同期旧 Metro 日志中的 `Unable to resolve module @tarojs/rn-supporter/entry-file.js` 也与依赖目录缺失一致。

处理：停止此前遗留的开发进程，按现有 `pnpm-lock.yaml` 恢复依赖。本机缓存完整，实际使用了 `pnpm install --offline --frozen-lockfile`；其他机器通常直接使用上面的在线安装命令。

### 2. Babel 插件无法从项目根目录解析

恢复依赖后，构建进入 `:app:createBundleReleaseJsAndAssets`，报错：

```text
Cannot find module 'babel-plugin-transform-react-jsx-to-rn-stylesheet'
```

原因：Taro 4.2.1 的 `@tarojs/rn-supporter/dist/babel.js` 按字符串名称传入 Babel 插件。插件虽然作为 Taro 的间接依赖存在，但 pnpm 的隔离布局没有将它暴露到项目根目录，Babel 从项目上下文解析时失败。相同配置中还必定使用 `babel-plugin-global-define`。

处理：将以下两个依赖显式加入项目 `devDependencies`，并更新锁文件，使用与已安装 Taro 依赖一致的版本：

- `babel-plugin-transform-react-jsx-to-rn-stylesheet: 4.2.1`
- `babel-plugin-global-define: 1.0.3`

### 3. 样式编译配置无法解析

Babel 通过后，`src/app.less` 编译报错：

```text
Could not find "stylelint-config-taro-rn".
```

原因同样是工具从项目上下文按名称查找间接依赖。处理：显式加入 `stylelint-config-taro-rn: 4.2.1`，保留项目已有的 Stylelint 版本范围 `>=16.4.0 <=16.10.0`，当前锁定为 `16.10.0`。样式配置解析已单独验证通过。

上述修改均保存在 `package.json` 和 `pnpm-lock.yaml`，没有修改 `node_modules` 中的源码，也不需要依赖临时 `NODE_PATH` 才能打包。请统一使用 pnpm 和现有锁文件恢复依赖。

此前 Debug APK 能编译，不代表 Release 一定能通过：默认 Debug 构建跳过内置 JS bundle，由 Metro 提供代码；Release 会额外执行 `createBundleReleaseJsAndAssets`，因此本次插件解析错误在这个阶段暴露。

## 此前的环境问题

这些问题已处理，不是本次恢复依赖后仍然失败的原因。

| 报错 | 已确认原因 | 处理 |
| --- | --- | --- |
| `Unable to locate a Java Runtime` | Homebrew JDK 17 已安装，但系统 Java 查找路径没有注册；此前构建仅临时指定了 JDK | 在用户的 `~/Library/Java/JavaVirtualMachines/openjdk-17.jdk` 创建指向 `/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk` 的链接；`java -version` 和 Gradle 已能直接识别 |
| `NDK not configured ... 25.1.8937393` | 第一次配置时所需 NDK 尚未安装完成 | 安装项目指定 NDK；随后原生编译通过 |
| Expo `unknown property 'release'` | 当时与 NDK 配置失败一起出现的后续错误 | NDK 配好后消失，无需修改 Expo 源码 |

本机 Android SDK 位于 `~/Library/Android/sdk`，`android/local.properties` 已写入对应的绝对路径。这个文件是本机配置，不应提交给其他机器使用。

项目配置：JDK 17、Gradle Wrapper 8.3、Android SDK Platform 34、Build Tools 34.0.0、NDK 25.1.8937393、CMake 3.22.1。构建过程中还安装了依赖模块需要的 Build Tools 33.0.1。

原先的 CocoaPods、FlipperKit 下载和 Xcode 许可报错属于 iOS 流程，不是 Android 打包依赖。

## 验证结果

- 完整 `app:assembleRelease` 已通过，包含 `armeabi-v7a`、`arm64-v8a`、`x86`、`x86_64` 四种架构。
- APK 约 40 MB，`apksigner verify` 校验通过。
- APK 内的 `assets/index.android.bundle` 与本次 Gradle 生成的 Hermes bundle 字节完全一致。
- 已安装到 Pixel 8 / Android 14 模拟器，在 Metro 未运行且无 adb 端口转发的情况下启动成功。
- 日志确认 `taroDemo` 启动，`com.tarodemo/.MainActivity` 位于前台，未发现本次启动的 JavaScript 或 AndroidRuntime 错误。
- 弃用 API、Stylelint CommonJS 和 Gradle 弃用提示在本次成功构建中仍存在，它们不是导致构建终止的错误。

本次构建日志保存在本机 `/tmp/taro-app-demo-android-release.log`；临时日志可能被系统清理。

参考：[React Native Gradle 插件自动打包说明](https://reactnative.dev/docs/react-native-gradle-plugin)、[React Native 0.73 的 Java 17 要求](https://reactnative.dev/blog/2023/12/06/0.73-debugging-improvements-stable-symlinks)。
