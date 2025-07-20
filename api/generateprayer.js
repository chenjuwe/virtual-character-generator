// api/generateprayer.js

// 引入 Google AI 套件
const { GoogleGenerativeAI } = require("@google/generative-ai");

// 從環境變數取得您的 API 金鑰
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 這就是我們的 API 函式
export default async function handler(request, response) {
  // 確保請求是 POST 方法
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const characterData = request.body; // 取得從前端傳來的角色資料

    // **新增**：後端輸入驗證
    if (!characterData || !characterData.chineseName || !characterData.wish) {
      return response.status(400).json({ error: 'Bad Request: Missing required character data.' });
    }

    // 取得生成模型
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 設計給 AI 的提示 (Prompt)
    const prompt = `你是一位充滿同理心與智慧的基督徒。請根據以下這位人物的資料，為他/她寫一段大約100-150字的真誠、個人化的第一人稱禱告文。禱告內容需反映他/她的生活狀況、掙扎、感恩與盼望。請直接以禱告文內容作為回應，不要有任何額外的前言或標題。
---
人物姓名: ${characterData.chineseName} (${characterData.nickname})
性別: ${characterData.gender}
年齡: ${characterData.birthday}
婚姻與家庭: ${characterData.maritalStatus}, ${characterData.familyBackground}
職業與經濟: ${characterData.occupation}, ${characterData.financialStatus}
健康狀況: ${characterData.healthCondition}
優點: ${characterData.strengths}
缺點: ${characterData.weaknesses}
最近的掙扎或願望: ${characterData.wish}
喜愛的經文: ${characterData.favoriteVerse}
---
`;

    // 呼叫 Gemini API
    const result = await model.generateContent(prompt);
    const apiResponse = await result.response;
    const prayerText = apiResponse.text();

    // 將生成的禱告文回傳給前端
    response.status(200).json({ prayer: prayerText });

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    response.status(500).json({ error: 'Failed to generate prayer from API' });
  }
}
