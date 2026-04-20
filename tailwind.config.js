/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./**/*.{tsx,html}", // 扫描项目所有子目录下的文件
    "./*.{tsx,html}"     // 扫描项目根目录下的文件
  ],
  darkMode: "media"
}