import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import fs from 'fs'
import path from 'path'

// 云函数拷贝 + 清理 dist 里多余的配置文件
// 编译产物里出现的 project.config.json / project.private.config.json 是 uni-app 生成的，
// 它们会让开发者工具在 dist 目录里重新建一个「项目」，扫描到 cloudfunctions/ 等不需要上传的文件。
// 这里清掉它们，让开发者工具直接读取 isabella-mini/ 下的真实 project.config.json。
function copyCloudFunctions() {
  return {
    name: 'copy-cloud-functions',
    closeBundle() {
      // 1) 云函数拷到 dist/cloudfunctions/（与小程序代码包平级，不会被微信开发者工具扫到）
      const srcDir = path.resolve(__dirname, 'cloudfunctions')
      const destDir = path.resolve(__dirname, 'dist/cloudfunctions')
      if (fs.existsSync(destDir)) {
        fs.rmSync(destDir, { recursive: true, force: true })
      }
      fs.mkdirSync(destDir, { recursive: true })

      const copyDir = (src, dest) => {
        if (!fs.existsSync(src)) return
        const entries = fs.readdirSync(src, { withFileTypes: true })
        for (const entry of entries) {
          const srcPath = path.join(src, entry.name)
          const destPath = path.join(dest, entry.name)
          if (entry.isDirectory()) {
            if (!fs.existsSync(destPath)) {
              fs.mkdirSync(destPath, { recursive: true })
            }
            copyDir(srcPath, destPath)
          } else {
            fs.copyFileSync(srcPath, destPath)
          }
        }
      }
      copyDir(srcDir, destDir)
      console.log('✅ 云函数已拷贝到 dist/cloudfunctions/（独立于小程序代码包）')

      // 2) 清理 dist/build/mp-weixin 下自动生成的配置文件
      const buildDir = path.resolve(__dirname, 'dist/build/mp-weixin')
      const rmFiles = ['project.config.json', 'project.private.config.json']
      for (const f of rmFiles) {
        const fp = path.join(buildDir, f)
        if (fs.existsSync(fp)) {
          fs.rmSync(fp, { force: true })
        }
      }
      console.log('✅ 已清理 dist/build/mp-weixin 下的 project.config.json / project.private.config.json')

      // 3) 清理旧的 dist/build/mp-weixin/cloudfunctions（如果之前残留）
      const oldCfDir = path.join(buildDir, 'cloudfunctions')
      if (fs.existsSync(oldCfDir)) {
        fs.rmSync(oldCfDir, { recursive: true, force: true })
      }
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    uni(),
    copyCloudFunctions(), // 添加自动拷贝插件
  ],
})
