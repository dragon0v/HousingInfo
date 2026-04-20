import { useState, useEffect } from "react"
import React from "react"
import { useStorage } from "@plasmohq/storage/hook"
import "./style.css"

const buildNotionProperty = (value: string, type: string) => {
  if (!value || type === "none") return undefined;
  
  const strVal = String(value).trim();
  
  switch (type) {
    case "title":
      return { title: [{ text: { content: strVal } }] };
    case "rich_text":
      return { rich_text: [{ text: { content: strVal } }] };
    case "number":
      // Extract numeric part (handles values like "SEK 12,450" -> 12450)
      const cleaned = strVal.replace(/,/g, '').replace(/[^\d.-]/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? undefined : { number: num };
    case "select":
      return { select: { name: strVal } };
    case "multi_select":
      // Split by comma if there are multiple tags, otherwise just one
      const tags = strVal.split(',').map(s => s.trim()).filter(Boolean);
      if (tags.length === 0) return undefined;
      return { multi_select: tags.map(t => ({ name: t })) };
    case "url":
      return { url: strVal };
    default:
      return undefined;
  }
}

function IndexPopup() {
  const [activeTab, setActiveTab] = useState("jobs")

  // 从本地存储读取 Notion 配置
  const [notionToken, setNotionToken] = useStorage("notion_token", "")
  const [databaseId, setDatabaseId] = useStorage("database_id", "")

  // 从本地存储读取列名映射 (默认值为原有设定的列名)
  const [colTitle, setColTitle] = useStorage("col_title", "Name")
  const [colUrl, setColUrl] = useStorage("col_url", "URL")
  const [colRent, setColRent] = useStorage("col_rent", "Rent")
  const [colRooms, setColRooms] = useStorage("col_rooms", "Rooms")
  const [colSize, setColSize] = useStorage("col_size", "Size")
  const [colFloor, setColFloor] = useStorage("col_floor", "Floor")
  const [colPlatform, setColPlatform] = useStorage("col_platform", "Platform")

  // 从本地存储读取列类型映射 (默认值)
  const [colTitleType, setColTitleType] = useStorage("col_title_type", "title")
  const [colUrlType, setColUrlType] = useStorage("col_url_type", "url")
  const [colRentType, setColRentType] = useStorage("col_rent_type", "rich_text")
  const [colRoomsType, setColRoomsType] = useStorage("col_rooms_type", "rich_text")
  const [colSizeType, setColSizeType] = useStorage("col_size_type", "rich_text")
  const [colFloorType, setColFloorType] = useStorage("col_floor_type", "number")
  const [colPlatformType, setColPlatformType] = useStorage("col_platform_type", "select")

  // 控制是否保存description到Notion page正文
  const [saveDescriptionToBody, setSaveDescriptionToBody] = useStorage("save_description_to_body", "true")

  // 本地表单状态，用于 Settings 面板（避免输入时频繁存入 Storage 导致中文输入法卡顿）
  const [form, setForm] = useState({
    notionToken: "", databaseId: "",
    colTitle: "Name", colUrl: "URL", colRent: "Rent", colRooms: "Rooms", colSize: "Size", colFloor: "Floor", colPlatform: "Platform",
    colTitleType: "title", colUrlType: "url", colRentType: "rich_text", colRoomsType: "rich_text", colSizeType: "rich_text", colFloorType: "number", colPlatformType: "select",
    saveDescriptionToBody: "true"
  });
  const [saveMessage, setSaveMessage] = useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // 当 storage 数据加载完成或发生变化时，同步到本地表单
  useEffect(() => {
    setForm({
      notionToken: notionToken || "",
      databaseId: databaseId || "",
      colTitle: colTitle || "Name",
      colUrl: colUrl || "URL",
      colRent: colRent || "Rent",
      colRooms: colRooms || "Rooms",
      colSize: colSize || "Size",
      colFloor: colFloor || "Floor",
      colPlatform: colPlatform || "Platform",
      colTitleType: colTitleType || "title",
      colUrlType: colUrlType || "url",
      colRentType: colRentType || "rich_text",
      colRoomsType: colRoomsType || "rich_text",
      colSizeType: colSizeType || "rich_text",
      colFloorType: colFloorType || "number",
      colPlatformType: colPlatformType || "select",
      saveDescriptionToBody: saveDescriptionToBody || "true"
    });
  }, [notionToken, databaseId, colTitle, colUrl, colRent, colRooms, colSize, colFloor, colPlatform, colTitleType, colUrlType, colRentType, colRoomsType, colSizeType, colFloorType, colPlatformType, saveDescriptionToBody]);

  // 表单变更处理
  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // 导出设置为 JSON 文件
  const handleExportSettings = () => {
    // 导出除了 notionToken 之外的所有设置（包括 databaseId）
    const settingsData: Record<string, any> = {};
    Object.keys(form).forEach((key) => {
      if (key !== "notionToken") {
        settingsData[key] = (form as Record<string, any>)[key];
      }
    });

    const dataStr = JSON.stringify(settingsData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `housing-info-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setSaveMessage("Settings exported (token excluded for security) 📥");
    setTimeout(() => setSaveMessage(""), 2000);
  };

  // 导入设置从 JSON 文件
  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedData = JSON.parse(content);

        // 验证导入的数据结构（检查是否至少有一个期望的字段）
        if (!importedData.colTitleType && !importedData.databaseId) {
          throw new Error("Invalid settings file format");
        }

        // 构建新的 form 对象，保留现有的 token，并更新导入的所有其他字段
        const updatedForm: Record<string, any> = { ...form, notionToken: form.notionToken };
        Object.keys(importedData).forEach((key) => {
          updatedForm[key] = importedData[key];
        });

        setForm(updatedForm as typeof form);

        setSaveMessage("Settings imported successfully! 📤 Click 'Save Settings' to apply.");
        setTimeout(() => setSaveMessage(""), 3000);
      } catch (error: any) {
        setSaveMessage(`Import failed: ${error.message}`);
        setTimeout(() => setSaveMessage(""), 3000);
      }
    };

    reader.readAsText(file);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 点击保存按钮时的处理
  const handleSaveSettings = () => {
    setNotionToken(form.notionToken);
    setDatabaseId(form.databaseId);
    setColTitle(form.colTitle);
    setColUrl(form.colUrl);
    setColRent(form.colRent);
    setColRooms(form.colRooms);
    setColSize(form.colSize);
    setColFloor(form.colFloor);
    setColPlatform(form.colPlatform);
    setColTitleType(form.colTitleType);
    setColUrlType(form.colUrlType);
    setColRentType(form.colRentType);
    setColRoomsType(form.colRoomsType);
    setColSizeType(form.colSizeType);
    setColFloorType(form.colFloorType);
    setColPlatformType(form.colPlatformType);
    setSaveDescriptionToBody(form.saveDescriptionToBody);

    setSaveMessage("Settings saved successfully! 🎉");
    setTimeout(() => setSaveMessage(""), 2000);
  };

  // 当前网页的数据状态
  const [title, setTitle] = useState("")
  const [url, setUrl] = useState("")
  const [rent, setRent] = useState("")
  const [rooms, setRooms] = useState("")
  const [size, setSize] = useState("")
  const [floor, setFloor] = useState("")
  const [description, setDescription] = useState("")
  const [platform, setPlatform] = useState("")
  const [status, setStatus] = useState("Ready") // 用于显示任务执行状态

  // Job 1: 提取当前网页信息的方法
  const extractCurrentPage = () => {
    setStatus("Extracting...")
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0 && tabs[0].id) {
        setUrl(tabs[0].url || "")
        
        // 在当前网页执行脚本以提取数据
        chrome.scripting.executeScript(
          {
            target: { tabId: tabs[0].id },
            func: async () => {
              // 这里面的代码是在目标网页的上下文中执行的
              // 1. 提取标题 (Title)
              const title = document.querySelector("h1")?.textContent?.trim() || document.title;
              
              // 2. 提取租金 (Rent Price)
              const rentNode = Array.from(document.querySelectorAll("h2")).find(
                (el) => el.textContent?.includes("SEK") || el.textContent?.includes("kr")
              );
              const rent = rentNode?.textContent?.replace(/\u00A0/g, " ")?.trim() || "";
            
              // 3. 提取房间数和面积 (Rooms & Size)
              const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute("content") || "";
              const roomsMatch = metaDescription.match(/(\d+)\s+rooms?/i);
              const sizeMatch = metaDescription.match(/(\d+)\s+m²/i);

              // 4. 提取楼层 (Floor)
              const pageText = document.body.innerText;
              const floorMatch = pageText.match(/(\d+)(?:st|nd|rd|th)\s+floor/i);
              const floor = floorMatch ? floorMatch[1] : "";

              // 5. 提取描述 (Description)
              let description = "";
              
              // 找到主要内容区域（包含描述、About、Renovation等的大容器）
              let mainContentArea = document.querySelector('main') ||
                                    document.querySelector('[role="main"]') ||
                                    document.querySelector('article') ||
                                    document.querySelector('div[class*="content"]') ||
                                    document.querySelector('div[class*="listing"]');
              
              if (!mainContentArea) {
                mainContentArea = document.body;
              }
              
              // 只点击第一个"read more"按钮（房源描述下的）
              const readMoreButtons = Array.from(mainContentArea.querySelectorAll('button'));
              let readMoreClicked = false;
              for (const btn of readMoreButtons) {
                const text = btn.textContent?.toLowerCase() || '';
                // 只点击一次，且避免点击其他功能按钮
                if (!readMoreClicked && (text.includes('read more') || text.includes('see more')) && 
                    !text.includes('save') && !text.includes('share') && !text.includes('contact')) {
                  btn.click();
                  readMoreClicked = true;
                  // 等待内容加载
                  await new Promise(resolve => setTimeout(resolve, 500));
                  break; // 只点击一个，然后跳出
                }
              }
              
              // 收集所有描述部分
              const descriptionParts: string[] = [];
              
              // 1. 主要描述 - 查找可能的描述元素（只在主内容区域内）
              const descElement = mainContentArea.querySelector('[class*="description"]') || 
                                  mainContentArea.querySelector('[class*="about"]:not([class*="aboutus"])') ||
                                  mainContentArea.querySelector('div[class*="detail"]');
              
              if (descElement) {
                const mainDesc = descElement.textContent?.trim();
                if (mainDesc && mainDesc.length > 10) {
                  descriptionParts.push(mainDesc);
                }
              }
              
              // 2 & 3. 查找所有可能的标题，包括 div、span 等可能作为标题的元素
              const allElements = Array.from(mainContentArea.querySelectorAll('*'));
              const titleElements: { title: string; element: Element; type: string }[] = [];
              
              for (const elem of allElements) {
                const text = elem.textContent?.toLowerCase() || '';
                const tagName = elem.tagName;
                
                // 跳过过大的元素（可能是容器）
                if (elem.children.length > 10) continue;
                
                // 只检查直接文本内容
                let directText = '';
                for (const child of elem.childNodes) {
                  if (child.nodeType === 3) { // TEXT_NODE
                    directText += child.textContent;
                  }
                }
                directText = directText.toLowerCase().trim();
                
                // 匹配 "About the building"
                if (directText.includes('about') && directText.includes('building') && directText.length < 100) {
                  titleElements.push({ title: 'about_building', element: elem, type: tagName });
                }
                
                // 匹配 "Renovation" 或 "Renovated"
                if ((directText.includes('renovation') || directText.includes('renovated')) && directText.length < 100) {
                  titleElements.push({ title: 'renovation', element: elem, type: tagName });
                }
              }
              
              // 处理找到的标题
              for (const titleItem of titleElements) {
                let contentElement = titleItem.element.nextElementSibling;
                let content = '';
                let elementCount = 0;
                
                // 收集后续内容，直到遇到下一个标题或收集足够多的内容
                while (contentElement && elementCount < 5) {
                  const siblingText = contentElement.textContent?.toLowerCase() || '';
                  
                  // 如果遇到另一个标题（包含某些关键词），停止
                  if (siblingText.includes('about') || siblingText.includes('renovation') || 
                      siblingText.includes('contact') || siblingText.includes('features')) {
                    if (contentElement.textContent !== titleItem.element.textContent) {
                      break;
                    }
                  }
                  
                  content += contentElement.textContent + '\n';
                  contentElement = contentElement.nextElementSibling;
                  elementCount++;
                }
                
                content = content.trim();
                if (content && content.length > 10) {
                  if (titleItem.title === 'about_building') {
                    descriptionParts.push('About the building:\n' + content);
                  } else if (titleItem.title === 'renovation') {
                    descriptionParts.push('Renovation:\n' + content);
                  }
                }
              }
              
              // 合并所有部分
              description = descriptionParts.join('\n\n').trim();
              
              // 如果还没找到，尝试从页面文本中提取段落
              if (!description) {
                const paragraphs = Array.from(document.querySelectorAll('p'));
                description = paragraphs.slice(0, 3).map(p => p.textContent?.trim()).filter(Boolean).join("\n") || "";
              }
            
              return {
                title,
                rent,
                rooms: roomsMatch ? roomsMatch[1] : "",
                size: sizeMatch ? sizeMatch[1] : "",
                floor,
                description
              };
            }
          },
          (injectionResults) => {
            if (injectionResults && injectionResults[0]) {
              const result = injectionResults[0].result;
              if (result) {
                setTitle(result.title);
                setRent(result.rent);
                setRooms(result.rooms);
                setSize(result.size);
                setFloor(result.floor);
                setDescription(result.description);
              }
            }
            
            // 检测平台
            if (tabs[0].url?.includes("qasa.com")) {
              setPlatform("Qasa");
            } else {
              setPlatform("");
            }
            
            setStatus("Extracted successfully!")
          }
        );
      } else {
        setStatus("Error: Cannot access tab")
      }
    })
  }

  // Job 2: 保存到 Notion 的方法
  const saveToNotion = async () => {
    setStatus("Saving to Notion...")

    try {
      // 构造属性，如果列名映射为空或选择了“不保存”，则不保存该字段
      const properties: any = {};

      const titleProp = buildNotionProperty(title, colTitleType);
      if (colTitle && titleProp) properties[colTitle] = titleProp;

      const urlProp = buildNotionProperty(url, colUrlType);
      if (colUrl && urlProp) properties[colUrl] = urlProp;

      const rentProp = buildNotionProperty(rent, colRentType);
      if (colRent && rentProp) properties[colRent] = rentProp;

      const roomsProp = buildNotionProperty(rooms, colRoomsType);
      if (colRooms && roomsProp) properties[colRooms] = roomsProp;

      const sizeProp = buildNotionProperty(size, colSizeType);
      if (colSize && sizeProp) properties[colSize] = sizeProp;

      const floorProp = buildNotionProperty(floor, colFloorType);
      if (colFloor && floorProp) properties[colFloor] = floorProp;

      // 平台属性：如果有平台值，则添加到属性中
      if (platform) {
        const platformProp = buildNotionProperty(platform, colPlatformType);
        if (colPlatform && platformProp) properties[colPlatform] = platformProp;
      }

      // 准备请求体
      const requestBody: any = {
        parent: { database_id: databaseId },
        properties: properties
      };

      // 如果启用了保存description到page正文，添加到page的正文中
      if (saveDescriptionToBody === "true" && description && description.trim().length > 0) {
        // 按段落分割描述（分割符是 \n\n）
        const paragraphs = description.split('\n\n').filter(p => p.trim());
        
        requestBody.children = paragraphs.map((paragraph) => ({
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: paragraph.trim()
                }
              }
            ]
          }
        }));
      }

      // 向 Notion 发送 POST 请求
      const response = await fetch("https://api.notion.com/v1/pages", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${notionToken}`,
          "Notion-Version": "2022-06-28", // Notion API 的版本号
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      })

      // 如果请求失败，抛出错误
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Unknown error occurred")
      }

      // 请求成功！
      setStatus("Saved successfully! 🎉")
      
      // 两秒后把状态栏文字重置
      setTimeout(() => setStatus("Ready"), 2000)

    } catch (error: any) {
      // 捕捉并显示错误信息
      setStatus(`Error: ${error.message}`)
    }
  }

  // 组件加载时自动执行一次提取操作
  useEffect(() => {
    extractCurrentPage()
  }, [])

  return (
    <div className="flex flex-col w-[350px] min-h-[500px] bg-white text-slate-800">
      {/* 顶部 Tab 导航栏 */}
      <div className="flex border-b">
        <button 
          onClick={() => setActiveTab("jobs")}
          className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'jobs' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Jobs
        </button>
        <button 
          onClick={() => setActiveTab("settings")}
          className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'settings' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Settings
        </button>
      </div>

      {/* 内容区域 */}
      <div className="p-4 flex-1 flex flex-col bg-slate-50/50">
        {activeTab === "jobs" ? (
          /* ================= Jobs Tab ================= */
          <div className="flex flex-col h-full">
            
            {/* 状态提示栏 */}
            <div className="mb-3 px-3 py-2 bg-blue-50 text-blue-700 text-xs rounded border border-blue-100 font-medium">
              Status: {status}
            </div>

            {/* 1. 数据面板 (Current Data) */}
            <div className="mb-5">
              <label className="text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-2 block">Target Data</label>
              
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-500 w-10 text-right">title</label>
                  <input 
                    className="flex-1 border border-slate-200 p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Page Title"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-500 w-10 text-right">rent</label>
                  <input 
                    className="flex-1 border border-slate-200 p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    value={rent}
                    onChange={(e) => setRent(e.target.value)}
                    placeholder="Rent Price"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-500 w-10 text-right">rooms</label>
                  <input 
                    className="flex-1 border border-slate-200 p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    value={rooms}
                    onChange={(e) => setRooms(e.target.value)}
                    placeholder="Rooms"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-500 w-10 text-right">size</label>
                  <input 
                    className="flex-1 border border-slate-200 p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    placeholder="Size in m²"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-500 w-10 text-right">floor</label>
                  <input 
                    className="flex-1 border border-slate-200 p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    placeholder="Floor Number"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-500 w-10 text-right">platform</label>
                  <input 
                    className="flex-1 border border-slate-200 p-2 rounded text-sm bg-slate-100 text-slate-500 outline-none"
                    value={platform}
                    readOnly
                    placeholder="Auto-detected Platform"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">description</label>
                  <textarea 
                    className="flex-1 border border-slate-200 p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white resize-none"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Property Description"
                    rows={3}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-500 w-10 text-right">url</label>
                  <input 
                    className="flex-1 border border-slate-200 p-2 rounded text-sm bg-slate-100 text-slate-500 outline-none"
                    value={url}
                    readOnly
                    placeholder="Page URL"
                  />
                </div>
              </div>
            </div>

            {/* 2. 任务执行面板 (Actions) */}
            <div className="mt-auto flex flex-col gap-2">
              <label className="text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-1 block">Execute Jobs</label>
              
              {/* 任务A：重新提取 */}
              <button 
                onClick={extractCurrentPage}
                className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold py-2 px-4 rounded transition-colors text-sm text-left flex items-center justify-between"
              >
                <span>Extract Current Page</span>
              </button>

              {/* 任务B：存入 Notion */}
              <button 
                onClick={saveToNotion}
                disabled={!notionToken || !databaseId}
                className="w-full bg-slate-800 hover:bg-black disabled:bg-slate-300 text-white font-bold text-base py-3 px-4 rounded transition-all text-left flex items-center justify-between active:scale-[0.98]"
              >
                <span>Save to Notion</span>
                {(!notionToken || !databaseId) && <span className="text-[10px] text-red-300">Config Required</span>}
              </button>

            </div>
          </div>
        ) : (
          /* ================= Settings Tab ================= */
          <div className="flex flex-col h-full overflow-y-auto">
            <h3 className="text-sm font-bold mb-4 text-slate-700">Notion API Config</h3>
            
            <label className="text-xs font-semibold text-slate-500 mb-1">Integration Token</label>
            <input 
              type="password"
              placeholder="secret_..."
              className="border border-slate-200 p-2 mb-4 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={form.notionToken}
              onChange={(e) => handleChange("notionToken", e.target.value)}
            />

            <label className="text-xs font-semibold text-slate-500 mb-1">Database ID</label>
            <input 
              placeholder="32-character ID"
              className="border border-slate-200 p-2 mb-4 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={form.databaseId}
              onChange={(e) => handleChange("databaseId", e.target.value)}
            />

            <div className="mt-2 mb-4 h-px bg-slate-200"></div>

            <h3 className="text-sm font-bold mb-4 text-slate-700">Column Mapping</h3>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-500 w-10 text-right">title</label>
                <input 
                  className="flex-1 border border-slate-200 p-1.5 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                  value={form.colTitle}
                  onChange={(e) => handleChange("colTitle", e.target.value)}
                  placeholder="Column Name"
                  disabled={form.colTitleType === "none"}
                />
                <select
                  className="border border-slate-200 p-1.5 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none w-[100px] bg-white text-slate-600"
                  value={form.colTitleType}
                  onChange={(e) => handleChange("colTitleType", e.target.value)}
                >
                  <option value="none">Do Not Save</option>
                  <option value="title">Title</option>
                  <option value="rich_text">Text</option>
                  <option value="number">Number</option>
                  <option value="select">Select</option>
                  <option value="multi_select">Multi-select</option>
                  <option value="url">URL</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-500 w-10 text-right">rent</label>
                <input 
                  className="flex-1 border border-slate-200 p-1.5 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                  value={form.colRent}
                  onChange={(e) => handleChange("colRent", e.target.value)}
                  placeholder="Column Name"
                  disabled={form.colRentType === "none"}
                />
                <select
                  className="border border-slate-200 p-1.5 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none w-[100px] bg-white text-slate-600"
                  value={form.colRentType}
                  onChange={(e) => handleChange("colRentType", e.target.value)}
                >
                  <option value="none">Do Not Save</option>
                  <option value="title">Title</option>
                  <option value="rich_text">Text</option>
                  <option value="number">Number</option>
                  <option value="select">Select</option>
                  <option value="multi_select">Multi-select</option>
                  <option value="url">URL</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-500 w-10 text-right">rooms</label>
                <input 
                  className="flex-1 border border-slate-200 p-1.5 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                  value={form.colRooms}
                  onChange={(e) => handleChange("colRooms", e.target.value)}
                  placeholder="Column Name"
                  disabled={form.colRoomsType === "none"}
                />
                <select
                  className="border border-slate-200 p-1.5 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none w-[100px] bg-white text-slate-600"
                  value={form.colRoomsType}
                  onChange={(e) => handleChange("colRoomsType", e.target.value)}
                >
                  <option value="none">Do Not Save</option>
                  <option value="title">Title</option>
                  <option value="rich_text">Text</option>
                  <option value="number">Number</option>
                  <option value="select">Select</option>
                  <option value="multi_select">Multi-select</option>
                  <option value="url">URL</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-500 w-10 text-right">size</label>
                <input 
                  className="flex-1 border border-slate-200 p-1.5 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                  value={form.colSize}
                  onChange={(e) => handleChange("colSize", e.target.value)}
                  placeholder="Column Name"
                  disabled={form.colSizeType === "none"}
                />
                <select
                  className="border border-slate-200 p-1.5 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none w-[100px] bg-white text-slate-600"
                  value={form.colSizeType}
                  onChange={(e) => handleChange("colSizeType", e.target.value)}
                >
                  <option value="none">Do Not Save</option>
                  <option value="title">Title</option>
                  <option value="rich_text">Text</option>
                  <option value="number">Number</option>
                  <option value="select">Select</option>
                  <option value="multi_select">Multi-select</option>
                  <option value="url">URL</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-500 w-10 text-right">floor</label>
                <input 
                  className="flex-1 border border-slate-200 p-1.5 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                  value={form.colFloor}
                  onChange={(e) => handleChange("colFloor", e.target.value)}
                  placeholder="Column Name"
                  disabled={form.colFloorType === "none"}
                />
                <select
                  className="border border-slate-200 p-1.5 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none w-[100px] bg-white text-slate-600"
                  value={form.colFloorType}
                  onChange={(e) => handleChange("colFloorType", e.target.value)}
                >
                  <option value="none">Do Not Save</option>
                  <option value="title">Title</option>
                  <option value="rich_text">Text</option>
                  <option value="number">Number</option>
                  <option value="select">Select</option>
                  <option value="multi_select">Multi-select</option>
                  <option value="url">URL</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-500 w-10 text-right">url</label>
                <input 
                  className="flex-1 border border-slate-200 p-1.5 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                  value={form.colUrl}
                  onChange={(e) => handleChange("colUrl", e.target.value)}
                  placeholder="Column Name"
                  disabled={form.colUrlType === "none"}
                />
                <select
                  className="border border-slate-200 p-1.5 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none w-[100px] bg-white text-slate-600"
                  value={form.colUrlType}
                  onChange={(e) => handleChange("colUrlType", e.target.value)}
                >
                  <option value="none">Do Not Save</option>
                  <option value="title">Title</option>
                  <option value="rich_text">Text</option>
                  <option value="number">Number</option>
                  <option value="select">Select</option>
                  <option value="multi_select">Multi-select</option>
                  <option value="url">URL</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-500 w-16 text-right">platform</label>
                <input 
                  className="flex-1 border border-slate-200 p-1.5 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                  value={form.colPlatform}
                  onChange={(e) => handleChange("colPlatform", e.target.value)}
                  placeholder="Column Name"
                  disabled={form.colPlatformType === "none"}
                />
                <select
                  className="border border-slate-200 p-1.5 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none w-[100px] bg-white text-slate-600"
                  value={form.colPlatformType}
                  onChange={(e) => handleChange("colPlatformType", e.target.value)}
                >
                  <option value="none">Do Not Save</option>
                  <option value="title">Title</option>
                  <option value="rich_text">Text</option>
                  <option value="number">Number</option>
                  <option value="select">Select</option>
                  <option value="multi_select">Multi-select</option>
                  <option value="url">URL</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-500">description</label>
                <input 
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-200 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  checked={form.saveDescriptionToBody === "true"}
                  onChange={(e) => handleChange("saveDescriptionToBody", e.target.checked ? "true" : "false")}
                />
                <span className="text-xs text-slate-500">Save to page body</span>
              </div>
            </div>

            <div className="p-3 bg-blue-50/50 border border-blue-100 rounded text-[11px] text-blue-700 leading-relaxed mt-4">
              💡 <strong>Note:</strong> Enter your Notion column name and select type.
            </div>
            {/* 保存按钮区域 */}
            <div className="mt-auto pt-4 pb-2 border-t border-slate-200">
              <button 
                onClick={handleSaveSettings}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-2.5 px-4 rounded transition-all active:scale-[0.98] mb-2"
              >
                Save Settings
              </button>
              
              {/* 导入导出按钮 */}
              <div className="flex gap-2">
                <button 
                  onClick={handleExportSettings}
                  className="flex-1 bg-slate-600 hover:bg-slate-700 text-white font-semibold text-xs py-2 px-3 rounded transition-all active:scale-[0.98]"
                >
                  📥 Export
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 bg-slate-600 hover:bg-slate-700 text-white font-semibold text-xs py-2 px-3 rounded transition-all active:scale-[0.98]"
                >
                  📤 Import
                </button>
              </div>
              
              {/* 安全说明 */}
              <div className="p-3 bg-amber-50/50 border border-amber-200 rounded text-[11px] text-amber-800 leading-relaxed mt-2">
                🔒 <strong>Security:</strong> API token is NOT exported for your safety. Database ID and column mappings will be exported.
              </div>
              
              {/* 隐藏的文件输入 */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportSettings}
              />
              
              {saveMessage && (
                <div className="mt-2 text-center text-xs font-semibold text-green-600 transition-opacity">
                  {saveMessage}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default IndexPopup
