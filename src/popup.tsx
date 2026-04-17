import { useEffect, useState } from "react"
import "./style.css"

function IndexPopup() {
  // 定义两个状态 (State) 来存放网页的标题和链接
  const [title, setTitle] = useState("正在获取标题...")
  const [url, setUrl] = useState("正在获取链接...")

  // useEffect 里的代码会在弹窗打开时自动运行一次
  useEffect(() => {
    // 调用 Chrome API 获取当前活动窗口的当前标签页
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        const currentTab = tabs[0]
        // 更新状态，界面就会自动重新渲染显示最新的文字
        setTitle(currentTab.title || "无标题")
        setUrl(currentTab.url || "无链接")
      }
    })
  }, [])

  return (
    <div className="flex flex-col p-4 w-80 bg-slate-50">
      <h2 className="text-xl font-bold mb-4 text-blue-600">🏠 HousingInfo</h2>
      
      <label className="text-xs text-gray-500 font-bold mb-1">房源标题</label>
      <input 
        className="border border-gray-300 p-2 mb-3 rounded text-sm" 
        value={title}
        onChange={(e) => setTitle(e.target.value)} // 允许用户手动修改标题
      />

      <label className="text-xs text-gray-500 font-bold mb-1">房源链接</label>
      <input 
        className="border border-gray-300 p-2 mb-4 rounded text-sm bg-gray-100 text-gray-600" 
        value={url}
        readOnly // 链接通常不需要手动修改，设为只读
      />

      <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors">
        保存到 Notion
      </button>
    </div>
  )
}

export default IndexPopup