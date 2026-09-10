# taro-app-demo

基于 Taro 4、React Native、React 和 TypeScript 的跨端示例项目，使用 Less 编写样式。当前首页显示 `Hello world!`，主要用于验证 Android / iOS 开发运行与原生打包流程。

项目保留 H5 和多个小程序平台的构建脚本。本文以 **macOS + zsh** 为例，除明确标注外，命令均在项目根目录执行。

## 目录

- [技术栈与环境](#技术栈与环境)
- [安装依赖](#安装依赖)
- [Android 环境与运行](#android-环境与运行)
- [Android 打包](#android-打包)
- [iOS 环境与运行](#ios-环境与运行)
- [iOS 打包](#ios-打包)
- [常用命令](#常用命令)
- [项目结构](#项目结构)
- [常见问题](#常见问题)
- [CI 与发布配置](#ci-与发布配置)
- [验证记录](#验证记录)

## 技术栈与环境

版本以 [package.json](package.json) 和 [pnpm-lock.yaml](pnpm-lock.yaml) 为准。

| 组件 | 当前版本 / 配置 |
| --- | --- |
| Taro | 4.2.1 |
| React / React Native | 锁定为 18.3.1 / 0.73.11 |
| Expo | 锁定为 50.0.21 |
| 语言 / 样式 | TypeScript 5.x、Less |
| Node.js / pnpm | 本机已验证 26.3.0 / 11.7.0；这是验证环境，不表示最低版本要求 |
| Java | JDK 17 |
| Gradle | Wrapper 8.3，无需安装全局 Gradle |
| Android SDK | compile / target SDK 34、min SDK 21 |
| Android Build Tools | 34.0.0；依赖模块还使用 33.0.1 |
| Android NDK / CMake | 25.1.8937393 / 3.22.1 |
| iOS | macOS、完整 Xcode、iOS Simulator Runtime、CocoaPods |

首次构建需要下载原生依赖和工具，请确保终端能够访问 npm registry、Google Android 下载服务、Maven 仓库，以及 iOS Pods 引用的 GitHub 仓库。

## 安装依赖

安装 Node.js 后，准备与本机验证环境一致的 pnpm：

```sh
npm install -g pnpm@11.7.0
pnpm install --frozen-lockfile
```

统一使用 pnpm 和现有锁文件。Android 原生构建也依赖 `node_modules`：Gradle 会从其中加载 React Native 插件和自动链接脚本。

当前项目已声明所需原生模块。日常安装无需执行 `pnpm upgradePeerdeps`；该脚本会修改依赖并触发 Pods 安装，仅在有计划地调整 Taro / 原生模块依赖时使用。

## Android 环境与运行

### 1. 配置 JDK 17

已经安装时先运行 `java -version` 检查。Homebrew 安装示例：

```sh
brew install openjdk@17
```

将以下内容加入 `~/.zshrc`，然后打开新终端，或执行 `source ~/.zshrc`：

```sh
export JAVA_HOME="$(brew --prefix openjdk@17)/libexec/openjdk.jdk/Contents/Home"
export PATH="$JAVA_HOME/bin:$PATH"
```

验证：

```sh
java -version
./android/gradlew --version
```

两者均应使用 Java 17。此前本机还通过用户目录下的 JDK 链接完成了系统注册，详见 [Android 问题记录](docs/android-build.md)。

### 2. 配置 Android SDK

通过 Android Studio 的 SDK Manager 安装以下组件；也可使用 Android Command-line Tools 管理已有 SDK：

- Android SDK Platform 34。
- Android SDK Build-Tools 34.0.0 和 33.0.1。
- Android SDK Platform-Tools、Android Emulator、Android SDK Command-line Tools。
- NDK 25.1.8937393、CMake 3.22.1；选择指定版本时可启用 Show Package Details。
- 模拟器镜像：本机使用 Android 14 / API 34、Google APIs、`arm64-v8a`，适用于 Apple Silicon。

按提示阅读并接受 SDK 许可。使用 macOS 默认 SDK 路径时，在 `~/.zshrc` 中配置，并打开新终端：

```sh
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
```

在 `android/local.properties` 中设置本机 SDK 的**绝对路径**。将下面的用户名替换为自己的用户名；此文件不会展开 `$HOME` 或 `~`：

```properties
sdk.dir=/Users/你的用户名/Library/Android/sdk
```

该文件已被 Git 忽略，不应提交给其他开发者使用。环境变量说明见 [Android 官方文档](https://developer.android.com/tools/variables)。

### 3. 启动设备

在 Android Studio 的 Device Manager 中创建并启动模拟器，或连接已开启 USB 调试并授权的 Android 真机。确认设备状态为 `device`：

```sh
adb devices
```

本机已创建 `Taro_Pixel_8_API_34`，可直接启动：

```sh
emulator -avd Taro_Pixel_8_API_34
```

其他机器先运行 `emulator -list-avds` 查看自己的模拟器名称。

### 4. 运行开发版

终端一启动 Metro，并保持运行：

```sh
pnpm dev:rn
```

终端二构建、安装并启动 Android 应用：

```sh
pnpm android --no-packager
```

多个设备在线时，用 `adb devices` 中的 ID 指定设备。例如，本机模拟器可只构建当前架构，缩短开发构建时间：

```sh
pnpm android --no-packager --deviceId emulator-5554 --active-arch-only
```

Debug 版需要 Metro 提供 JavaScript；给其他人安装体验时使用下面的 Release APK。

## Android 打包

### 生成 Release APK

```sh
pnpm build:android
```

输出文件：

```text
android/app/build/outputs/apk/release/app-release.apk
```

该命令调用 `app:assembleRelease`，自动打包 JavaScript、资源并编译 Hermes 字节码，不需要启动 Metro 或提前执行 `pnpm build:rn`。参见 [React Native Gradle 插件说明](https://reactnative.dev/docs/react-native-gradle-plugin)。

默认包含 `armeabi-v7a`、`arm64-v8a`、`x86`、`x86_64` 四种架构。安装到已连接设备：

```sh
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

当前 Release 使用模板的 `debug.keystore` 签名，适合本地验证。正式发布前需在 [android/app/build.gradle](android/app/build.gradle) 中配置自己的发布签名，并设置应用 ID、版本号和版本代码。

完整失败原因和修复过程见 [Android 打包说明](docs/android-build.md)。

### 仅生成 JavaScript bundle

```sh
pnpm build:rn --platform android
```

该命令只生成 JS bundle、资源和 sourcemap，**不会生成 APK**。输出由 [config/index.ts](config/index.ts) 的 `rn.output` 指定：

- Bundle：`android/app/src/main/assets/index.android.bundle`。
- 资源：`android/app/src/main/res`。
- Sourcemap：`android/app/src/main/assets/index.android.map`。

## iOS 环境与运行

### 1. 准备 Xcode

安装完整 Xcode，首次打开时完成组件安装，阅读并接受许可，再安装所需的 iOS Simulator Runtime。仅安装 Command Line Tools 不能完成本项目的 iOS 构建。组件安装入口见 [Apple 文档](https://developer.apple.com/documentation/xcode/downloading-and-installing-additional-xcode-components)。

检查开发工具目录和 Xcode 版本：

```sh
xcode-select -p
xcodebuild -version
```

若目录指向 Command Line Tools，切换到完整 Xcode；安装位置不同时请调整路径：

```sh
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
```

若终端仍提示尚未接受许可，运行 `sudo xcodebuild -license`，阅读后按提示处理。

### 2. 安装 Pods

本机通过 Homebrew 安装 CocoaPods：

```sh
brew install cocoapods
pnpm podInstall
```

先安装 pnpm 依赖，再安装 Pods。添加或升级带 iOS 原生代码的依赖后，重新执行 `pnpm podInstall`。删除并重装 `node_modules` 后，即使 `ios/Pods` 还在，也需要再执行一次：React Native 的部分 Codegen 文件生成在 `node_modules` 内，重装依赖后必须重新生成并同步 Pods 工程。

### 3. 启动 iOS

终端一运行 `pnpm dev:rn`，终端二执行：

```sh
pnpm ios --no-packager
```

选择指定模拟器时，先查看可用设备，再填入对应名称：

```sh
xcrun simctl list devices available
pnpm ios --no-packager --simulator "iPhone 17"
```

`iPhone 17` 是本机已验证设备，其他机器按实际安装情况替换。

## iOS 打包

仅生成 iOS JS bundle：

```sh
pnpm build:rn --platform ios
```

输出为 `ios/main.jsbundle`，sourcemap 为 `ios/main.map`，资源输出到 `ios/`。此命令不会生成 IPA。

归档与签名使用 Xcode 工作区：

```sh
open ios/taroDemo.xcworkspace
```

选择 `taroDemo` scheme，在 Signing & Capabilities 配置自己的 Team 和 Bundle Identifier，选择可用于归档的 iOS 设备目标后执行 Product → Archive，再按分发方式导出或上传。仓库中的 Bundle Identifier 是模板值，发布前需替换。

本项目已验证 iOS 模拟器开发运行，尚未验证正式签名、IPA 导出或 App Store 上传。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `pnpm install --frozen-lockfile` | 按锁文件安装依赖 |
| `pnpm dev:rn` | 启动 RN 开发服务与二维码输出 |
| `pnpm start` | 直接启动 Metro；与 `dev:rn` 选一个即可 |
| `pnpm android --no-packager` | 运行 Android 开发版，使用已有 Metro |
| `pnpm ios --no-packager` | 运行 iOS 开发版，使用已有 Metro |
| `pnpm build:android` | 生成 Android Release APK |
| `pnpm build:rn --platform android` | 单独生成 Android JS bundle |
| `pnpm build:rn --platform ios` | 单独生成 iOS JS bundle |
| `pnpm podInstall` | 安装 / 更新 iOS Pods |
| `pnpm dev:h5` / `pnpm build:h5` | H5 开发 / 构建 |
| `pnpm dev:weapp` / `pnpm build:weapp` | 微信小程序开发 / 构建 |

其他平台脚本见 [package.json](package.json)。H5 / 小程序脚本保留自模板，本次未进行这些平台的完整验证。

## 项目结构

```text
src/
  app.ts                   应用入口
  app.config.ts            页面路由与全局窗口配置
  app.less                 全局样式
  pages/index/             示例首页与页面配置
config/
  index.ts                 Taro 配置、RN 应用名与 bundle 输出路径
  dev.ts / prod.ts         开发 / 生产环境配置
android/                   Android 原生工程、Gradle 和签名配置
ios/                       iOS 原生工程、工作区和 Podfile
docs/android-build.md      Android 失败原因、修复和验证记录
.github/workflows/         Android / iOS 构建工作流模板
index.js                   React Native 入口，接入 Taro 转换流程
metro.config.js            Metro 与 Taro 的集成配置
babel.config.js            Babel 配置
pnpm-lock.yaml             项目依赖锁文件
```

RN 注册名称为 `taroDemo`，Android application ID 为 `com.tarodemo`。修改首页通常从 [src/pages/index/index.tsx](src/pages/index/index.tsx) 开始。

## 常见问题

| 现象 | 原因与处理 |
| --- | --- |
| `Unable to locate a Java Runtime` | 确认 JDK 17、`JAVA_HOME` 和 `PATH`；用 `java -version`、`./android/gradlew --version` 验证 |
| `SDK location not found` | 检查 `ANDROID_HOME` 或 `android/local.properties` 中的 SDK 绝对路径 |
| `NDK not configured` | 安装 NDK 25.1.8937393；先处理该错误，再判断后续 Expo 配置错误是否仍存在 |
| 找不到 `native_modules.gradle` 或 `@tarojs/rn-supporter/entry-file.js` | 确认 `node_modules` 完整，执行 `pnpm install --frozen-lockfile`，然后重启 Metro / 构建 |
| 找不到 Babel 插件或 `stylelint-config-taro-rn` | 清单已显式声明所需依赖；使用更新后的清单和锁文件，安装包含 devDependencies 的完整依赖 |
| iOS 报 `Build input file cannot be found: .../rncore/EventEmitters.cpp`，Xcode 退出码 65 | 重装 `node_modules` 后 Codegen 文件缺失、Pods 工程未同步；重新安装 Pods，并清理该项目的旧构建产物后再运行，命令见下方 |
| Debug 能运行，Release 失败 | Release 会额外打包 JS 和资源；查看 `createBundleReleaseJsAndAssets` 前的首个具体错误 |
| Android 开发版加载不到 JS | 确认 Metro 正在运行、设备在线；USB / 模拟器调试可运行 `adb reverse tcp:8081 tcp:8081` 后重试 |
| `glog.podspec` 匹配 Xcode 版本失败 | 检查 `xcodebuild -version`，修复 Xcode 路径或许可问题后重试 Pods 安装 |
| Git 提示未接受 Xcode 许可 | 运行 `sudo xcodebuild -license`，阅读并处理许可后重试 |
| FlipperKit 下载报 `SSL_ERROR_SYSCALL` | GitHub HTTPS 连接失败，检查终端网络 / 代理后重试 Pods 安装 |

重装依赖后，如果 iOS 缺少 `rncore` 文件，或继续出现 `SafeAreaViewProps`、`ModalHostViewProps` 未定义，可在项目根目录执行：

```sh
pnpm podInstall
xcodebuild -workspace ios/taroDemo.xcworkspace -scheme taroDemo -configuration Debug clean
pnpm ios
```

Pods 安装会同步工程并准备 Codegen 文件，清理旧构建产物后，完整构建会重新生成原生类型。不要手工创建空的 C++ 文件，也不要仅修改 Xcode 中的源文件引用。

此前本机 HTTP 代理端口为 `7897`，可只对一次 Pods 安装设置代理。仅在该端口确有代理服务时使用，其他环境替换为自己的地址：

```sh
http_proxy=http://127.0.0.1:7897 https_proxy=http://127.0.0.1:7897 pnpm podInstall
```

完整 Android 排查记录见 [docs/android-build.md](docs/android-build.md)。

## CI 与发布配置

仓库包含四个工作流：

- [Android Debug](.github/workflows/assemble_android_debug.yml)
- [Android Release](.github/workflows/assemble_android_release.yml)
- [iOS Debug](.github/workflows/assemble_ios_debug.yml)
- [iOS Release](.github/workflows/assemble_ios_release.yml)

当前配置在推送到 `main`、向 `main` 提交 PR、推送 `v*` 标签或手动触发时运行。Android 工作流通过 Fastlane 构建 APK；iOS 工作流包含签名、归档步骤，Release 还有上传步骤。

这些工作流仍是待适配模板：当前声明 Node.js 20、pnpm 8，iOS runner 为 `macos-13`，与本机验证环境不同，尚未验证 CI 可用。启用前需核对 runner、Node / pnpm 与锁文件兼容性，以及应用 ID、版本和签名配置。

Android 发布需替换模板 keystore 并配置签名凭据。iOS 需配置 `TEAM_ID`、对应 Debug / Release 的描述文件与 P12 证书及密码；Release 上传还使用 `APP_STORE_CONNECT_USERNAME` 和 `APP_STORE_CONNECT_PASSWORD`。具体 Secret 名称以工作流为准，凭据放入 GitHub Actions Secrets。

## 验证记录

2026-09-08 在本机完成：

- Android：Pixel 8 / Android 14 模拟器运行；四架构 Release APK 构建成功、签名校验通过，并在无 Metro 服务时启动。
- iOS：iPhone 17 / iOS 26.5 模拟器开发运行成功。
- 详细环境、失败原因和修复记录：[Android 打包说明](docs/android-build.md)。

以上是本机验证结果；真机适配、商店发布和 CI 构建需按实际目标环境另行验证。
