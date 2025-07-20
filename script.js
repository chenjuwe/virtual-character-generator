import * as db from './database.js';

// **優化**: 使用常數管理重複字串
const CONSTANTS = {
  STORAGE_KEY: 'savedChristianCharacters',
  PRAYER_USED_CLASS: 'used'
};

let displayedCharacters = [];

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

// 產生一個隨機生日 (YYYY-MM-DD)
function generateRandomBirthday() {
    const year = Math.floor(Math.random() * (2004 - 1975 + 1)) + 1975;
    const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 函式只負責生成中文名與對應的拼音名
function generateChineseNameWithPinyin() {
    const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

    const surname = sample(db.surnames);
    const isTwoCharGivenName = Math.random() > 0.3;

    let givenNameChinese = '';
    let givenNamePinyin = '';

    const char1 = sample(db.givenNameChar1);
    givenNameChinese += char1.chinese;
    givenNamePinyin += capitalize(char1.pinyin);

    if (isTwoCharGivenName) {
        const char2 = sample(db.givenNameChar2);
        givenNameChinese += char2.chinese;
        givenNamePinyin += '-' + capitalize(char2.pinyin);
    }

    return {
        chinese: surname.chinese + givenNameChinese,
        pinyin: `${givenNamePinyin} ${surname.pinyin}`,
        surnamePinyin: surname.pinyin,
        surnameChinese: surname.chinese
    };
}

// 產生符合Gmail規範且多樣化的電子信箱前綴
function generateGmailPrefix(englishName, birthYear) {
    const { colors, items, codes } = db.emailPrefixData;

    let baseName = englishName.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '.');

    let prefix = '';
    const pattern = Math.floor(Math.random() * 5);

    switch (pattern) {
        case 0:
            prefix = `${baseName}${birthYear}`;
            break;
        case 1:
            prefix = `${baseName}.${sample(colors)}`;
            break;
        case 2:
            prefix = `${sample(items)}.${baseName}`;
            break;
        case 3:
            const randomNumber1 = String(Math.floor(Math.random() * 90) + 10);
            prefix = `${baseName}.${sample(codes)}${randomNumber1}`;
            break;
        case 4:
        default:
            const randomNumber2 = String(Math.floor(Math.random() * 900) + 100);
            prefix = `${baseName}${randomNumber2}`;
            break;
    }

    prefix = prefix.replace(/\.{2,}/g, '.').replace(/^\.|\.$/g, '');

    if (prefix.length > 30) {
        prefix = prefix.substring(0, 30);
    }
    while (prefix.length < 6) {
        prefix += String(Math.floor(Math.random() * 10));
    }

    prefix = prefix.replace(/\.$/g, '');

    return prefix;
}


function generateRandomCharacter() {
    const gender = sample(["男性", "女性"]);
    const baseName = generateChineseNameWithPinyin();

    let finalEnglishName = baseName.pinyin;

    const nameTypeChance = Math.random();
    if (nameTypeChance < 0.3) {
        if (gender === '男性') {
            finalEnglishName = `${sample(db.commonMaleNames)} ${baseName.surnamePinyin}`;
        } else {
            finalEnglishName = `${sample(db.commonFemaleNames)} ${baseName.surnamePinyin}`;
        }
    } else if (nameTypeChance < 0.4) {
        if (gender === '男性') {
            finalEnglishName = `${sample(db.uncommonMaleNames)} ${baseName.surnamePinyin}`;
        } else {
            finalEnglishName = `${sample(db.uncommonFemaleNames)} ${baseName.surnamePinyin}`;
        }
    }

    const birthday = generateRandomBirthday();
    const emailPrefix = generateGmailPrefix(finalEnglishName, birthday.substring(0, 4));

    const education = sample(db.educations);
    let occupation = '';
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    if (age < 23 && Math.random() < 0.8) {
        occupation = "大學生";
    } else if (education === '博士') {
        occupation = sample(db.occupations.academic);
    } else if (education === '高中畢業' || education === '國中畢業') {
        occupation = sample(db.occupations.nonDegree);
    } else {
        occupation = sample(db.occupations.all);
    }


    const maritalStatus = sample(["未婚", "已婚", "離婚", "交往中", "同居", "分居", "喪偶"]);
    let spouse = null;
    let spouseAge = null;
    let children = [];

    const hasPartnerStatuses = ['已婚', '同居', '分居'];
    if (hasPartnerStatuses.includes(maritalStatus)) {
        spouse = sample(db.spouseNames);
        spouseAge = sample([age - 2, age, age + 3, age + 5]);
    }

    const canHaveChildrenStatuses = ['已婚', '離婚', '分居', '喪偶', '同居'];
    if (canHaveChildrenStatuses.includes(maritalStatus) && age > 25) {
        if (Math.random() > 0.5) {
            const numChildren = sample([1, 2, 3]);
            for (let i = 0; i < numChildren; i++) {
                let childSurname = baseName.surnameChinese;
                if (spouse && Math.random() < 0.3) {
                    childSurname = spouse.surname;
                }
                children.push({
                    name: childSurname + sample(db.childGivenNames),
                    age: Math.floor(Math.random() * (age - 18)) + 1
                });
            }
        }
    }
    
    return {
        id: Date.now() + Math.random(),
        chineseName: baseName.chinese,
        englishName: finalEnglishName,
        nickname: sample(db.christianNicknames),
        gender,
        birthday: `${birthday} (${age}歲)`,
        emailPrefix,
        maritalStatus,
        spouseName: spouse ? spouse.surname + spouse.givenName : null,
        spouseAge,
        children,
        education,
        occupation,
        story: sample(db.backgroundStories),
        secret: sample(db.secrets),
        denomination: sample(db.denominations),
        churchRole: sample(db.churchRoles),
        favoriteVerse: sample(db.bibleVerses),
        spiritualGift: sample(db.spiritualGifts),
        hobbies: sample(db.hobbies),
        financialStatus: sample(db.financialStatusOptions),
        location: sample(db.locations),
        transportation: sample(db.transportationOptions),
        socialMedia: sample(db.socialMediaOptions),
        politicalView: sample(db.politicalViewOptions),
        healthCondition: sample(db.healthConditions),
        consumptionConcept: sample(db.consumptionConceptOptions),
        lifeView: sample(db.lifeViewOptions),
        motto: sample(db.mottoOptions),
        familyBackground: sample(db.familyBackgroundOptions),
        wish: sample(db.wishOptions),
        lifeGoal: sample(db.lifeGoalOptions),
        strengths: sample(db.strengthsOptions),
        weaknesses: sample(db.weaknessesOptions),
        lifestyle: sample(db.lifestyleOptions),
        learningStyle: sample(db.learningStyleOptions),
        thinkingMode: sample(db.thinkingModeOptions),
        socialStyle: sample(db.socialStyleOptions),
        futurePlan: sample(db.futurePlanOptions),
        socialConcern: sample(db.socialConcernOptions),
        leisureDepth: sample(db.leisureDepthOptions),
        emotionManagement: sample(db.emotionManagementOptions),
        humorType: sample(db.humorTypeOptions),
        symbolicItem: sample(db.symbolicItemOptions),
        habitAction: sample(db.habitActionOptions),
        prayers: [] 
    };
}

function renderPrayerList(container, character) {
    const prayers = character.prayers || [];
    container.innerHTML = ''; 

    if (prayers.length === 0) {
        container.innerHTML = '點擊「生成禱告」按鈕，讓 AI 為這個人物寫出禱告文。';
        return;
    }

    const sortedPrayers = prayers.slice().sort((a, b) => b.timestamp - a.timestamp);

    sortedPrayers.forEach(prayer => {
        const prayerItem = document.createElement('div');
        prayerItem.className = 'prayer-item';

        const prayerDate = new Date(prayer.timestamp).toLocaleString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });

        prayerItem.innerHTML = `
            <div class="prayer-header">
                <div class="prayer-timestamp">${prayerDate}</div>
                <div class="prayer-buttons">
                    <button class="prayer-used-btn">${prayer.isUsed ? '取消使用' : '標為已用'}</button>
                    <button class="prayer-copy-btn">複製</button>
                </div>
            </div>
            <div class="prayer-text ${prayer.isUsed ? CONSTANTS.PRAYER_USED_CLASS : ''}">${prayer.text}</div>
        `;
        container.appendChild(prayerItem);

        const copyBtn = prayerItem.querySelector('.prayer-copy-btn');
        copyBtn.addEventListener('click', () => {
            const textToCopy = prayer.text;
            const textArea = document.createElement("textarea");
            textArea.value = textToCopy;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                const originalText = copyBtn.textContent;
                copyBtn.textContent = '已複製!';
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                }, 2000);
            } catch (err) {
                console.error('無法複製禱告文: ', err);
            }
            document.body.removeChild(textArea);
        });

        const usedBtn = prayerItem.querySelector('.prayer-used-btn');
        usedBtn.addEventListener('click', () => {
            const prayerToUpdate = character.prayers.find(p => p.timestamp === prayer.timestamp);
            if (prayerToUpdate) {
                prayerToUpdate.isUsed = !prayerToUpdate.isUsed;
                updateDisplayedCharacter(character.id, 'prayers', character.prayers);
                renderPrayerList(container, character);
            }
        });
    });
}


function renderCard(character, isSaved = false) {
    const container = document.querySelector(".container");
    const card = document.createElement("div");
    card.className = "character-card";
    card.dataset.id = character.id;

    const isCollapsed = !isSaved;
    if (isCollapsed) {
        card.classList.add('collapsed');
    }
    const toggleButtonText = isCollapsed ? '展開' : '收合';

    let buttonsHtml = '';
    if (isSaved) {
        buttonsHtml = `<button class="delete-btn" aria-label="刪除此人物">刪除</button>`;
    } else {
        buttonsHtml = `<button class="save-btn" aria-label="儲存此人物">儲存此人物</button>`;
    }

    card.innerHTML = `
        <div class="card-actions">
            <button class="copy-btn" aria-label="複製資訊">複製資訊</button>
            <button class="toggle-collapse-btn" aria-label="展開或收合卡片">${toggleButtonText}</button>
            <button class="generate-prayer-btn" aria-label="生成禱告文">生成禱告</button> 
            ${buttonsHtml}
        </div>
        <div class="category-title">個人資訊</div>
        <strong>姓名</strong>：${character.chineseName}<br>
        <strong>電子信箱前綴</strong>：<input type="text" class="editable-field" value="${character.emailPrefix}" data-field="emailPrefix"><br>
        <strong>中文暱稱</strong>：<input type="text" class="editable-field" value="${character.nickname}" data-field="nickname"><br>
        <strong>喜愛的經文</strong>：${character.favoriteVerse}<br>
        <div class="collapsible-content">
            <strong>英文名</strong>：${character.englishName}<br>
            <strong>性別</strong>：${character.gender}<br>
            <strong>生日</strong>：${character.birthday}<br>
            <strong>居住地點</strong>：${character.location}<br>
            <strong>交通工具</strong>：${character.transportation}<br>
            <strong>健康狀況</strong>：${character.healthCondition}<br>

            <div class="category-title">家庭</div>
            <strong>婚姻狀態</strong>：${character.maritalStatus}<br>
            ${character.spouseName ?
            `<strong>另一半姓名</strong>：${character.spouseName}<br>
               <strong>配偶年齡</strong>：${character.spouseAge}<br>`
            : ''
        }
            ${character.children.length > 0 ?
            `<strong>子女人數</strong>：${character.children.length}<br>` +
            character.children.map(child => `&nbsp;&nbsp;• ${child.name} (${child.age}歲)`).join('<br>') + '<br>'
            : ''
        }
            <strong>家庭背景</strong>：${character.familyBackground}<br>

            <div class="category-title">學歷與職業</div>
            <strong>學歷</strong>：${character.education}<br>
            <strong>職業</strong>：${character.occupation}<br>
            <strong>經濟狀況</strong>：${character.financialStatus}<br>
            <strong>對未來規劃</strong>：${character.futurePlan}<br>
            <strong>人生目標</strong>：${character.lifeGoal}<br>

            <div class="category-title">角色故事與特質</div>
            <strong>背景故事</strong>：${character.story}<br>
            <strong>一個秘密</strong>：${character.secret}<br>
            <strong>優點</strong>：${character.strengths}<br>
            <strong>缺點</strong>：${character.weaknesses}<br>
            <strong>生活習慣</strong>：${character.lifestyle}<br>
            <strong>興趣嗜好</strong>：${character.hobbies}<br>
            <strong>代表性物品</strong>：${character.symbolicItem}<br>
            <strong>習慣動作</strong>：${character.habitAction}<br>

            <div class="category-title">信仰生活</div>
            <strong>宗派</strong>：${character.denomination}<br>
            <strong>教會崗位</strong>：${character.churchRole}<br>
            <strong>屬靈恩賜</strong>：${character.spiritualGift}<br>

            <div class="category-title">社交與價值觀</div>
            <strong>政治立場</strong>：${character.politicalView}<br>
            <strong>消費觀念</strong>：${character.consumptionConcept}<br>
            <strong>人生觀</strong>：${character.lifeView}<br>
            <strong>願望</strong>：${character.wish}<br>
            <strong>社群偏好</strong>：${character.socialMedia}<br>
            <strong>人際交往風格</strong>：${character.socialStyle}<br>
            <strong>學習風格</strong>：${character.learningStyle}<br>
            <strong>思維模式</strong>：${character.thinkingMode}<br>
            <strong>情緒管理方式</strong>：${character.emotionManagement}<br>
            <strong>幽默感類型</strong>：${character.humorType}<br>
            <strong>社會議題關注</strong>：${character.socialConcern}<br>
            <strong>休閒娛樂深度</strong>：${character.leisureDepth}<br>
        </div>
        <div class="category-title" style="margin-top: 20px;">AI 生成禱告文</div>
        <div class="prayer-content-box">
        </div>
    `;
    
    const prayerBox = card.querySelector('.prayer-content-box');
    renderPrayerList(prayerBox, character);


    if (isSaved) {
        container.appendChild(card);
    } else {
        container.prepend(card);
    }

    const debouncedUpdate = debounce((id, field, value) => {
        updateDisplayedCharacter(id, field, value);
    }, 300); 

    card.querySelectorAll('.editable-field').forEach(input => {
        input.addEventListener('input', (e) => {
            debouncedUpdate(character.id, e.target.dataset.field, e.target.value);
        });
    });

    const toggleBtn = card.querySelector('.toggle-collapse-btn');
    toggleBtn.addEventListener('click', () => {
        card.classList.toggle('collapsed');
        toggleBtn.textContent = card.classList.contains('collapsed') ? '展開' : '收合';
    });

    const copyBtn = card.querySelector('.copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => copyCharacterInfo(character.id));
    }

    if (isSaved) {
        card.querySelector('.delete-btn').addEventListener('click', () => deleteCharacter(character.id));
    } else {
        card.querySelector('.save-btn').addEventListener('click', (e) => saveCharacter(character.id, e.target));
    }

    const generatePrayerBtn = card.querySelector('.generate-prayer-btn');
    generatePrayerBtn.addEventListener('click', async () => {
        const prayerBox = card.querySelector('.prayer-content-box');
        prayerBox.innerHTML = '<span class="prayer-loading">正在生成中，請稍候...</span>';
        generatePrayerBtn.disabled = true;
        try {
            const prayerText = await generateSelfPrayerContent(character);
            
            const newPrayer = { text: prayerText, timestamp: Date.now(), isUsed: false };
            if (!character.prayers) { 
                character.prayers = [];
            }
            character.prayers.push(newPrayer);
            
            updateDisplayedCharacter(character.id, 'prayers', character.prayers); 
            
            renderPrayerList(prayerBox, character);

        } catch (error) {
            prayerBox.textContent = `生成失敗：${error.message || '未知錯誤'}`;
            console.error("生成禱告失敗:", error);
        } finally {
            generatePrayerBtn.disabled = false;
        }
    });
}

function copyCharacterInfo(characterId) {
    const character = displayedCharacters.find(char => char.id == characterId);
    if (!character) return;

    let prayersToCopy = '尚未生成禱告內容。';
    if (character.prayers && character.prayers.length > 0) {
        const sortedPrayers = character.prayers.slice().sort((a, b) => b.timestamp - a.timestamp);
        prayersToCopy = sortedPrayers.map(p => {
            const prayerDate = new Date(p.timestamp).toLocaleString('zh-TW');
            const usedStatus = p.isUsed ? ' (已使用)' : '';
            return `[${prayerDate}]${usedStatus}\n${p.text}`;
        }).join('\n\n');
    }

    let textToCopy = `個人資訊
姓名：${character.chineseName}
電子信箱前綴：${character.emailPrefix}
中文暱稱：${character.nickname}
喜愛的經文：${character.favoriteVerse}
英文名：${character.englishName}
性別：${character.gender}
生日：${character.birthday}
居住地點：${character.location}
交通工具：${character.transportation}
健康狀況：${character.healthCondition}

家庭
婚姻狀態：${character.maritalStatus}
${character.spouseName ? `另一半姓名：${character.spouseName}\n配偶年齡：${character.spouseAge}\n` : ''}${character.children.length > 0 ? `子女人數：${character.children.length}\n` + character.children.map(child => ` • ${child.name} (${child.age}歲)`).join('\n') + '\n' : ''}家庭背景：${character.familyBackground}

學歷與職業
學歷：${character.education}
職業：${character.occupation}
經濟狀況：${character.financialStatus}
對未來規劃：${character.futurePlan}
人生目標：${character.lifeGoal}

角色故事與特質
背景故事：${character.story}
一個秘密：${character.secret}
優點：${character.strengths}
缺點：${character.weaknesses}
生活習慣：${character.lifestyle}
興趣嗜好：${character.hobbies}
代表性物品：${character.symbolicItem}
習慣動作：${character.habitAction}

信仰生活
宗派：${character.denomination}
教會崗位：${character.churchRole}
屬靈恩賜：${character.spiritualGift}

社交與價值觀
政治立場：${character.politicalView}
消費觀念：${character.consumptionConcept}
人生觀：${character.lifeView}
願望：${character.wish}
社群偏好：${character.socialMedia}
人際交往風格：${character.socialStyle}
學習風格：${character.learningStyle}
思維模式：${character.thinkingMode}
情緒管理方式：${character.emotionManagement}
幽默感類型：${character.humorType}
社會議題關注：${character.socialConcern}
休閒娛樂深度：${character.leisureDepth}

AI 生成禱告文:
${prayersToCopy}`;

    const textArea = document.createElement("textarea");
    textArea.value = textToCopy.trim();
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand('copy');
        const copyBtn = document.querySelector(`[data-id='${characterId}'] .copy-btn`);
        if (copyBtn) {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = '已複製!';
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
        }
    } catch (err) {
        console.error('無法複製文字: ', err);
    }
    document.body.removeChild(textArea);
}

function updateDisplayedCharacter(characterId, field, value) {
    const character = displayedCharacters.find(char => char.id == characterId);
    if (character) {
        character[field] = value;

        const savedCharacters = JSON.parse(localStorage.getItem(CONSTANTS.STORAGE_KEY)) || [];
        const charIndex = savedCharacters.findIndex(char => char.id == characterId);
        if (charIndex > -1) {
            savedCharacters[charIndex][field] = value;
            localStorage.setItem(CONSTANTS.STORAGE_KEY, JSON.stringify(savedCharacters));
        }
    }
}

function saveCharacter(characterId, button) {
    const characterToSave = displayedCharacters.find(char => char.id == characterId);
    if (!characterToSave) return;

    const savedCharacters = JSON.parse(localStorage.getItem(CONSTANTS.STORAGE_KEY)) || [];
    if (!savedCharacters.some(char => char.id === characterId)) {
        savedCharacters.push(characterToSave);
        localStorage.setItem(CONSTANTS.STORAGE_KEY, JSON.stringify(savedCharacters));

        const card = document.querySelector(`[data-id='${characterId}']`);
        if (card) {
            const saveBtnContainer = card.querySelector('.card-actions');
            let deleteBtn = card.querySelector('.delete-btn');
            if (!deleteBtn) {
                deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-btn';
                deleteBtn.textContent = '刪除';
                deleteBtn.setAttribute('aria-label', '刪除此人物');
                saveBtnContainer.appendChild(deleteBtn);
            }
            deleteBtn.addEventListener('click', () => deleteCharacter(characterId));

            button.remove();
        }
    }
}

// **優化**: 使用自訂對話框取代 confirm()
function deleteCharacter(characterId) {
    const modal = document.getElementById('customConfirmModal');
    const confirmBtn = document.getElementById('modalConfirmBtn');
    const cancelBtn = document.getElementById('modalCancelBtn');

    modal.classList.add('visible');

    const handleConfirm = () => {
        let savedCharacters = JSON.parse(localStorage.getItem(CONSTANTS.STORAGE_KEY)) || [];
        savedCharacters = savedCharacters.filter(char => char.id != characterId);
        localStorage.setItem(CONSTANTS.STORAGE_KEY, JSON.stringify(savedCharacters));

        displayedCharacters = displayedCharacters.filter(char => char.id != characterId);

        const cardToRemove = document.querySelector(`[data-id='${characterId}']`);
        if (cardToRemove) {
            cardToRemove.remove();
        }
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

function loadSavedCharacters() {
    let savedCharacters = JSON.parse(localStorage.getItem(CONSTANTS.STORAGE_KEY)) || [];

    let needsResave = false;
    savedCharacters.forEach(character => {
        if (character.prayerContent && typeof character.prayerContent === 'string') {
            character.prayers = [{ text: character.prayerContent, timestamp: Date.now(), isUsed: false }];
            delete character.prayerContent; 
            needsResave = true;
        } else if (!character.prayers) {
            character.prayers = [];
        }

        character.prayers.forEach(p => {
            if (p.isUsed === undefined) {
                p.isUsed = false;
                needsResave = true;
            }
        });
    });

    if (needsResave) {
        localStorage.setItem(CONSTANTS.STORAGE_KEY, JSON.stringify(savedCharacters));
    }


    displayedCharacters = [...savedCharacters];
    const container = document.querySelector('.container');
    container.innerHTML = ''; 
    
    if (displayedCharacters.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; font-size: 1.1em;">目前沒有儲存的人物，點擊上方「✨ 生成新人物」開始創建吧！</p>';
    } else {
        displayedCharacters.forEach(character => renderCard(character, true));
    }
}

function exportCharacters() {
    const savedCharacters = localStorage.getItem(CONSTANTS.STORAGE_KEY);
    if (!savedCharacters || savedCharacters === '[]') {
        const btn = document.getElementById('exportBtn');
        const originalText = btn.textContent;
        btn.textContent = '沒有可匯出的資料!';
        setTimeout(() => { btn.textContent = originalText; }, 2000);
        return;
    }
    const blob = new Blob([savedCharacters], { type: 'application/json' });
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
            if (Array.isArray(importedData)) {
                const isValid = importedData.every(item => typeof item === 'object' && item.id);
                if (!isValid) {
                     throw new Error("Invalid file content.");
                }

                localStorage.setItem(CONSTANTS.STORAGE_KEY, JSON.stringify(importedData));
                loadSavedCharacters();
                
                const btn = document.getElementById('importBtn');
                const originalText = btn.textContent;
                btn.textContent = '匯入成功!';
                setTimeout(() => { btn.textContent = originalText; }, 2000);
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

async function generateSelfPrayerContent(characterData) {
    try {
        const response = await fetch('/api/generateprayer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(characterData),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("後端函式回傳錯誤:", data.error);
            throw new Error(data.error || '未知後端錯誤');
        }

        return data.prayer;

    } catch (error) {
        console.error("呼叫後端函式失敗:", error);
        throw new Error("無法連接到禱告生成服務，請稍後再試。");
    }
}

// 事件綁定
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById("generateBtn").addEventListener("click", () => {
        const character = generateRandomCharacter();
        displayedCharacters.push(character);
        renderCard(character, false);
    });

    document.getElementById('exportBtn').addEventListener('click', exportCharacters);
    document.getElementById('importBtn').addEventListener('click', () => document.getElementById('fileInput').click());
    document.getElementById('fileInput').addEventListener('change', importCharacters);

    loadSavedCharacters();
});
