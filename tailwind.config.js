/**
 * App 共用的 Tailwind 配置：生成 Taro 可转换的基础工具类。
 * 字号、间距、圆角沿用 Tailwind 默认主题；不启用浏览器重置和 CSS 变量类效果。
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  content: {
    relative: true,
    files: ['./src/**/*.{js,jsx,ts,tsx}']
  },
  // RN 的转义类名由 Metro 兼容层处理；响应式和交互状态仍由组件逻辑控制。
  theme: {
    screens: {},
    extend: {}
  },
  // 白名单同时关闭 Preflight、颜色透明度变量、阴影、滤镜和变换等 Web 专用输出。
  corePlugins: [
    'display', 'position', 'inset', 'zIndex',
    'flex', 'flexDirection', 'flexWrap', 'flexGrow', 'flexShrink', 'flexBasis',
    'alignItems', 'alignSelf', 'alignContent', 'justifyContent',
    'width', 'minWidth', 'maxWidth', 'height', 'minHeight', 'maxHeight',
    'margin', 'padding', 'backgroundColor', 'borderColor', 'borderWidth',
    'borderStyle', 'borderRadius', 'opacity',
    'fontSize', 'fontWeight', 'fontStyle', 'textAlign', 'textColor'
  ],
  plugins: []
}
