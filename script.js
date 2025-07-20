import * as db from './database.js';
// **新增**: 引入 Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// **重要**: 請將此處替換為您自己的 Firebase 設定檔
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

const CONSTANTS = {
  PRAYER_USED_CLASS: 'used'
};

let displayedCharacters = [];
let currentUser = null;
let unsubscribeFromFirestore = null; // 用來取消監聽的函式

// Helper function: Debounce for performance optimization
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

// 輔助函式：從陣列中隨機取樣一個元素
function sample(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// --- 角色生成邏輯 (與之前相同) ---
// (此處省略 generateRandomBirthday, generateChineseNameWithPinyin, generateGmailPrefix, generateRandomCharacter 函式，它們與您之前的版本完全相同，以節省篇幅)
function generateRandomBirthday(){const year=Math.floor(Math.random()*(2004-1975+1))+1975;const month=String(Math.floor(Math.random()*12)+1).padStart(2,'0');const day=String(Math.floor(Math.random()*28)+1).padStart(2,'0');return`${year}-${month}-${day}`}
function generateChineseNameWithPinyin(){const capitalize=s=>s.charAt(0).toUpperCase()+s.slice(1);const surname=sample(db.surnames);const isTwoCharGivenName=Math.random()>0.3;let givenNameChinese='';let givenNamePinyin='';const char1=sample(db.givenNameChar1);givenNameChinese+=char1.chinese;givenNamePinyin+=capitalize(char1.pinyin);if(isTwoCharGivenName){const char2=sample(db.givenNameChar2);givenNameChinese+=char2.chinese;givenNamePinyin+='-'+capitalize(char2.pinyin)}return{chinese:surname.chinese+givenNameChinese,pinyin:`${givenNamePinyin} ${surname.pinyin}`,surnamePinyin:surname.pinyin,surnameChinese:surname.chinese}}
function generateGmailPrefix(englishName,birthYear){const{colors,items,codes}=db.emailPrefixData;let baseName=englishName.toLowerCase().replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,'.');let prefix='';const pattern=Math.floor(Math.random()*5);switch(pattern){case 0:prefix=`${baseName}${birthYear}`;break;case 1:prefix=`${baseName}.${sample(colors)}`;break;case 2:prefix=`${sample(items)}.${baseName}`;break;case 3:const randomNumber1=String(Math.floor(Math.random()*90)+10);prefix=`${baseName}.${sample(codes)}${randomNumber1}`;break;case 4:default:const randomNumber2=String(Math.floor(Math.random()*900)+100);prefix=`${baseName}${randomNumber2}`;break}prefix=prefix.replace(/\.{2,}/g,'.').replace(/^\.|\.$/g,'');if(prefix.length>30){prefix=prefix.substring(0,30)}while(prefix.length<6){prefix+=String(Math.floor(Math.random()*10))}prefix=prefix.replace(/\.$/g,'');return prefix}
function generateRandomCharacter(){const gender=sample(["男性","女性"]);const baseName=generateChineseNameWithPinyin();let finalEnglishName=baseName.pinyin;const nameTypeChance=Math.random();if(nameTypeChance<0.3){if(gender==='男性'){finalEnglishName=`${sample(db.commonMaleNames)} ${baseName.surnamePinyin}`}else{finalEnglishName=`${sample(db.commonFemaleNames)} ${baseName.surnamePinyin}`}}else if(nameTypeChance<0.4){if(gender==='男性'){finalEnglishName=`${sample(db.uncommonMaleNames)} ${baseName.surnamePinyin}`}else{finalEnglishName=`${sample(db.uncommonFemaleNames)} ${baseName.surnamePinyin}`}}const birthday=generateRandomBirthday();const emailPrefix=generateGmailPrefix(finalEnglishName,birthday.substring(0,4));const education=sample(db.educations);let occupation='';const birthDate=new Date(birthday);const today=new Date();let age=today.getFullYear()-birthDate.getFullYear();const m=today.getMonth()-birthDate.getMonth();if(m<0||(m===0&&today.getDate()<birthDate.getDate())){age--}if(age<23&&Math.random()<0.8){occupation="大學生"}else if(education==='博士'){occupation=sample(db.occupations.academic)}else if(education==='高中畢業'||education==='國中畢業'){occupation=sample(db.occupations.nonDegree)}else{occupation=sample(db.occupations.all)}const maritalStatus=sample(["未婚","已婚","離婚","交往中","同居","分居","喪偶"]);let spouse=null;let spouseAge=null;let children=[];const hasPartnerStatuses=['已婚','同居','分居'];if(hasPartnerStatuses.includes(maritalStatus)){spouse=sample(db.spouseNames);spouseAge=sample([age-2,age,age+3,age+5])}const canHaveChildrenStatuses=['已婚','離婚','分居','喪偶','同居'];if(canHaveChildrenStatuses.includes(maritalStatus)&&age>25){if(Math.random()>0.5){const numChildren=sample([1,2,3]);for(let i=0;i<numChildren;i++){let childSurname=baseName.surnameChinese;if(spouse&&Math.random()<0.3){childSurname=spouse.surname}children.push({name:childSurname+sample(db.childGivenNames),age:Math.floor(Math.random()*(age-18))+1})}}}return{id:Date.now()+Math.random(),chineseName:baseName.chinese,englishName:finalEnglishName,nickname:sample(db.christianNicknames),gender,birthday:`${birthday} (${age}歲)`,emailPrefix,maritalStatus,spouseName:spouse?spouse.surname+spouse.givenName:null,spouseAge,children,education,occupation,story:sample(db.backgroundStories),secret:sample(db.secrets),denomination:sample(db.denominations),churchRole:sample(db.churchRoles),favoriteVerse:sample(db.bibleVerses),spiritualGift:sample(db.spiritualGifts),hobbies:sample(db.hobbies),financialStatus:sample(db.financialStatusOptions),location:sample(db.locations),transportation:sample(db.transportationOptions),socialMedia:sample(db.socialMediaOptions),politicalView:sample(db.politicalViewOptions),healthCondition:sample(db.healthConditions),consumptionConcept:sample(db.consumptionConceptOptions),lifeView:sample(db.lifeViewOptions),motto:sample(db.mottoOptions),familyBackground:sample(db.familyBackgroundOptions),wish:sample(db.wishOptions),lifeGoal:sample(db.lifeGoalOptions),strengths:sample(db.strengthsOptions),weaknesses:sample(db.weaknessesOptions),lifestyle:sample(db.lifestyleOptions),learningStyle:sample(db.learningStyleOptions),thinkingMode:sample(db.thinkingModeOptions),socialStyle:sample(db.socialStyleOptions),futurePlan:sample(db.futurePlanOptions),socialConcern:sample(db.socialConcernOptions),leisureDepth:sample(db.leisureDepthOptions),emotionManagement:sample(db.emotionManagementOptions),humorType:sample(db.humorTypeOptions),symbolicItem:sample(db.symbolicItemOptions),habitAction:sample(db.habitActionOptions),prayers:[]}}

// --- UI 更新邏輯 ---
function updateUIForAuthState(user) {
    const authContainer = document.getElementById('authContainer');
    const welcomeMessage = document.getElementById('welcome-message');
    const mainContainer = document.querySelector('.container');
    const actionButtons = document.querySelectorAll('.main-actions button');

    if (user) {
        // 使用者已登入
        authContainer.innerHTML = `
            <span id="user-display">歡迎, ${user.displayName || user.email}</span>
            <button id="logoutBtn">登出</button>
        `;
        document.getElementById('logoutBtn').addEventListener('click', signOutUser);
        
        welcomeMessage.style.display = 'none';
        mainContainer.style.display = 'flex';
        actionButtons.forEach(btn => btn.disabled = false);

    } else {
        // 使用者已登出
        authContainer.innerHTML = `<button id="loginBtn">使用 Google 登入</button>`;
        document.getElementById('loginBtn').addEventListener('click', signInWithGoogle);

        welcomeMessage.style.display = 'block';
        mainContainer.style.display = 'none';
        actionButtons.forEach(btn => btn.disabled = true);
        document.querySelector('.container').innerHTML = ''; // 清空卡片
    }
}

// --- Firebase 驗證功能 ---
function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch(error => {
        console.error("Google 登入失敗:", error);
    });
}

function signOutUser() {
    signOut(auth).catch(error => {
        console.error("登出失敗:", error);
    });
}

// --- Firestore 資料庫功能 ---
async function saveDataToFirestore() {
    if (!currentUser) return;
    const userDocRef = doc(firestore, "user_characters", currentUser.uid);
    try {
        await setDoc(userDocRef, { characters: displayedCharacters });
    } catch (error) {
        console.error("寫入 Firestore 失敗:", error);
    }
}

function setupFirestoreListener() {
    if (unsubscribeFromFirestore) {
        unsubscribeFromFirestore(); // 取消之前的監聽
    }
    const userDocRef = doc(firestore, "user_characters", currentUser.uid);
    unsubscribeFromFirestore = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
            const data = doc.data();
            displayedCharacters = data.characters || [];
            renderAllCards();
        } else {
            // 這是新用戶，資料庫還沒有他們的文件
            displayedCharacters = [];
            renderAllCards();
        }
    });
}

// --- 核心渲染與互動邏輯 (已修改為使用 Firestore) ---
function renderAllCards() {
    const container = document.querySelector('.container');
    container.innerHTML = ''; 
    if (displayedCharacters.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; font-size: 1.1em;">目前沒有儲存的人物，點擊上方「✨ 生成新人物」開始創建吧！</p>';
    } else {
        displayedCharacters.forEach(character => renderCard(character));
    }
}

const debouncedSave = debounce(saveDataToFirestore, 1000); // 1秒防抖

function renderCard(character) {
    const container = document.querySelector(".container");
    const card = document.createElement("div");
    card.className = "character-card";
    card.dataset.id = character.id;

    const isCollapsed = true; 
    card.classList.add('collapsed');
    const toggleButtonText = '展開';

    card.innerHTML = `
        <div class="card-actions">
            <button class="copy-btn" aria-label="複製資訊">複製</button>
            <button class="toggle-collapse-btn" aria-label="展開或收合卡片">${toggleButtonText}</button>
            <button class="generate-prayer-btn" aria-label="生成禱告文">禱告</button> 
            <button class="delete-btn" aria-label="刪除此人物">刪除</button>
        </div>
        <div class="category-title">個人資訊</div>
        <strong>中文姓名</strong>：${character.chineseName}<br>
        <div class="field-container">
            <span><strong>信箱前綴</strong>：<input type="text" class="editable-field" value="${character.emailPrefix}" data-field="emailPrefix" id="email-${character.id}"></span>
            <button class="field-copy-btn" data-copy-target="email-${character.id}" data-copy-type="input">複製</button>
        </div>
        <div class="field-container">
            <span><strong>中文暱稱</strong>：<input type="text" class="editable-field" value="${character.nickname}" data-field="nickname" id="nickname-${character.id}"></span>
            <button class="field-copy-btn" data-copy-target="nickname-${character.id}" data-copy-type="input">複製</button>
        </div>
        <div class="field-container">
            <span><strong>喜愛經文</strong>：${character.favoriteVerse}</span>
            <button class="field-copy-btn" data-copy-text="${character.favoriteVerse}" data-copy-type="text">複製</button>
        </div>
        <div class="collapsible-content">
            <strong>英文姓名</strong>：${character.englishName}<br>
            <strong>生理性別</strong>：${character.gender}<br>
            <strong>出生日期</strong>：${character.birthday}<br>
            <strong>居住地點</strong>：${character.location}<br>
            <strong>交通工具</strong>：${character.transportation}<br>
            <strong>健康狀況</strong>：${character.healthCondition}<br>
            <div class="category-title">家庭</div>
            <strong>婚姻狀態</strong>：${character.maritalStatus}<br>
            ${character.spouseName ? `<strong>另一半姓名</strong>：${character.spouseName}<br><strong>配偶年齡</strong>：${character.spouseAge}<br>`:''}
            ${character.children.length > 0 ? `<strong>子女人數</strong>：${character.children.length}<br>` + character.children.map(child => `&nbsp;&nbsp;• ${child.name} (${child.age}歲)`).join('<br>') + '<br>':''}
            <strong>家庭背景</strong>：${character.familyBackground}<br>
            <div class="category-title">學歷與職業</div>
            <strong>最高學歷</strong>：${character.education}<br>
            <strong>最新職業</strong>：${character.occupation}<br>
            <strong>經濟狀況</strong>：${character.financialStatus}<br>
            <strong>未來規劃</strong>：${character.futurePlan}<br>
            <strong>人生目標</strong>：${character.lifeGoal}<br>
            <div class="category-title">角色故事與特質</div>
            <strong>背景故事</strong>：${character.story}<br>
            <strong>一個秘密</strong>：${character.secret}<br>
            <strong>個人優點</strong>：${character.strengths}<br>
            <strong>個人缺點</strong>：${character.weaknesses}<br>
            <strong>生活習慣</strong>：${character.lifestyle}<br>
            <strong>興趣嗜好</strong>：${character.hobbies}<br>
            <strong>代表物品</strong>：${character.symbolicItem}<br>
            <strong>習慣動作</strong>：${character.habitAction}<br>
            <div class="category-title">信仰生活</div>
            <strong>信仰派別</strong>：${character.denomination}<br>
            <strong>教會崗位</strong>：${character.churchRole}<br>
            <strong>屬靈恩賜</strong>：${character.spiritualGift}<br>
            <div class="category-title">社交與價值觀</div>
            <strong>政治立場</strong>：${character.politicalView}<br>
            <strong>消費觀念</strong>：${character.consumptionConcept}<br>
            <strong>人生觀念</strong>：${character.lifeView}<br>
            <strong>目標願望</strong>：${character.wish}<br>
            <strong>社群偏好</strong>：${character.socialMedia}<br>
            <strong>人際關係</strong>：${character.socialStyle}<br>
            <strong>學習風格</strong>：${character.learningStyle}<br>
            <strong>思維模式</strong>：${character.thinkingMode}<br>
            <strong>情緒管理</strong>：${character.emotionManagement}<br>
            <strong>幽默類型</strong>：${character.humorType}<br>
            <strong>議題關注</strong>：${character.socialConcern}<br>
            <strong>休閒娛樂</strong>：${character.leisureDepth}<br>
        </div>
        <div class="category-title" style="margin-top: 20px;">AI 生成禱告文</div>
        <div class="prayer-content-box"></div>
    `;
    
    const prayerBox = card.querySelector('.prayer-content-box');
    renderPrayerList(prayerBox, character);
    container.prepend(card);

    // --- 事件綁定 ---
    card.querySelector('.toggle-collapse-btn').addEventListener('click', () => {
        card.classList.toggle('collapsed');
        card.querySelector('.toggle-collapse-btn').textContent = card.classList.contains('collapsed') ? '展開' : '收合';
    });

    card.querySelector('.copy-btn').addEventListener('click', () => copyCharacterInfo(character.id));
    card.querySelector('.delete-btn').addEventListener('click', () => deleteCharacter(character.id));
    
    card.querySelectorAll('.editable-field').forEach(input => {
        input.addEventListener('input', (e) => {
            const charToUpdate = displayedCharacters.find(c => c.id === character.id);
            if(charToUpdate) {
                charToUpdate[e.target.dataset.field] = e.target.value;
                debouncedSave();
            }
        });
    });

    card.querySelector('.generate-prayer-btn').addEventListener('click', async () => {
        prayerBox.innerHTML = '<span class="prayer-loading">正在生成中，請稍候...</span>';
        card.querySelector('.generate-prayer-btn').disabled = true;
        try {
            const prayerText = await generateSelfPrayerContent(character);
            const newPrayer = { text: prayerText, timestamp: Date.now(), isUsed: false };
            const charToUpdate = displayedCharacters.find(c => c.id === character.id);
            if (charToUpdate) {
                if (!charToUpdate.prayers) charToUpdate.prayers = [];
                charToUpdate.prayers.push(newPrayer);
                saveDataToFirestore();
            }
        } catch (error) {
            prayerBox.textContent = `生成失敗：${error.message || '未知錯誤'}`;
            console.error("生成禱告失敗:", error);
        } finally {
            card.querySelector('.generate-prayer-btn').disabled = false;
        }
    });

    card.querySelectorAll('.field-copy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const button = e.currentTarget;
            let textToCopy = '';
            if (button.dataset.copyType === 'input') {
                const inputElement = card.querySelector(`#${button.dataset.copyTarget}`);
                if (inputElement) textToCopy = inputElement.value;
            } else {
                textToCopy = button.dataset.copyText;
            }
            if (textToCopy) copyTextToClipboard(textToCopy, button);
        });
    });
}

function copyCharacterInfo(characterId){const character=displayedCharacters.find(char=>char.id==characterId);if(!character)return;let prayersToCopy='尚未生成禱告內容。';if(character.prayers&&character.prayers.length>0){const sortedPrayers=character.prayers.slice().sort((a,b)=>b.timestamp-a.timestamp);prayersToCopy=sortedPrayers.map(p=>{const prayerDate=new Date(p.timestamp).toLocaleString('zh-TW');const usedStatus=p.isUsed?' (已使用)':'';return`[${prayerDate}]${usedStatus}\n${p.text}`}).join('\n\n')}let textToCopy=`個人資訊
中文姓名：${character.chineseName}
信箱前綴：${character.emailPrefix}
中文暱稱：${character.nickname}
喜愛經文：${character.favoriteVerse}
英文姓名：${character.englishName}
生理性別：${character.gender}
出生日期：${character.birthday}
居住地點：${character.location}
交通工具：${character.transportation}
健康狀況：${character.healthCondition}

家庭
婚姻狀態：${character.maritalStatus}
${character.spouseName?`另一半姓名：${character.spouseName}\n配偶年齡：${character.spouseAge}\n`:''}${character.children.length>0?`子女人數：${character.children.length}\n`+character.children.map(child=>` • ${child.name} (${child.age}歲)`).join('\n')+'\n':''}家庭背景：${character.familyBackground}

學歷與職業
最高學歷：${character.education}
最新職業：${character.occupation}
經濟狀況：${character.financialStatus}
未來規劃：${character.futurePlan}
人生目標：${character.lifeGoal}

角色故事與特質
背景故事：${character.story}
一個秘密：${character.secret}
個人優點：${character.strengths}
個人缺點：${character.weaknesses}
生活習慣：${character.lifestyle}
興趣嗜好：${character.hobbies}
代表物品：${character.symbolicItem}
習慣動作：${character.habitAction}

信仰生活
信仰派別：${character.denomination}
教會崗位：${character.churchRole}
屬靈恩賜：${character.spiritualGift}

社交與價值觀
政治立場：${character.politicalView}
消費觀念：${character.consumptionConcept}
人生觀念：${character.lifeView}
目標願望：${character.wish}
社群偏好：${character.socialMedia}
人際關係：${character.socialStyle}
學習風格：${character.learningStyle}
思維模式：${character.thinkingMode}
情緒管理：${character.emotionManagement}
幽默類型：${character.humorType}
議題關注：${character.socialConcern}
休閒娛樂：${character.leisureDepth}

AI 生成禱告文:
${prayersToCopy}`;copyTextToClipboard(textToCopy.trim(),document.querySelector(`[data-id='${characterId}'] .copy-btn`))}

function deleteCharacter(characterId) {
    const modal = document.getElementById('customConfirmModal');
    const confirmBtn = document.getElementById('modalConfirmBtn');
    const cancelBtn = document.getElementById('modalCancelBtn');
    modal.classList.add('visible');

    const handleConfirm = () => {
        displayedCharacters = displayedCharacters.filter(char => char.id != characterId);
        saveDataToFirestore();
        closeModal();
    };

    const closeModal = () => {
        modal.classList.remove('visible');
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', closeModal);
    };

    confirmBtn.addEventListener('click', handleConfirm, { once: true });
    cancelBtn.addEventListener('click', closeModal, { once: true });
}

function exportCharacters() {
    if (displayedCharacters.length === 0) {
        alert('沒有可匯出的資料!');
        return;
    }
    const blob = new Blob([JSON.stringify({ characters: displayedCharacters }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'characters_save.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importCharacters(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (Array.isArray(importedData.characters)) {
                const isConfirmed = confirm(`這將會用匯入的 ${importedData.characters.length} 筆資料覆蓋您目前的雲端資料，確定要繼續嗎？`);
                if (isConfirmed) {
                    displayedCharacters = importedData.characters;
                    saveDataToFirestore();
                }
            } else {
                throw new Error("Invalid file format.");
            }
        } catch (error) {
            console.error("匯入失敗:", error);
        } finally {
            event.target.value = '';
        }
    };
    reader.readAsText(file);
}

async function generateSelfPrayerContent(characterData){try{const response=await fetch('/api/generateprayer',{method:'POST',headers:{'Content-Type':'application/json',},body:JSON.stringify(characterData),});const data=await response.json();if(!response.ok){console.error("後端函式回傳錯誤:",data.error);throw new Error(data.error||'未知後端錯誤')}return data.prayer}catch(error){console.error("呼叫後端函式失敗:",error);throw new Error("無法連接到禱告生成服務，請稍後再試。")}}

// --- 主程式入口 ---
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        updateUIForAuthState(user);
        if (user) {
            setupFirestoreListener();
        } else {
            if (unsubscribeFromFirestore) {
                unsubscribeFromFirestore();
            }
            displayedCharacters = [];
        }
    });

    document.getElementById("generateBtn").addEventListener("click", () => {
        const character = generateRandomCharacter();
        displayedCharacters.push(character);
        saveDataToFirestore();
    });

    document.getElementById('exportBtn').addEventListener('click', exportCharacters);
    document.getElementById('importBtn').addEventListener('click', () => {
        if (!currentUser) {
            alert("請先登入再匯入資料。");
            return;
        }
        document.getElementById('fileInput').click()
    });
    document.getElementById('fileInput').addEventListener('change', importCharacters);
});
