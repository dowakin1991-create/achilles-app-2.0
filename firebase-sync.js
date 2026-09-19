/* ===== inline-script-3 ===== */

        const firebaseConfig = {
            apiKey: "AIzaSyDjT5UjvgTs396KGsVtPrOEUrnkUi6LD1I",
            authDomain: "achilles-8de53.firebaseapp.com",
            projectId: "achilles-8de53",
            storageBucket: "achilles-8de53.firebasestorage.app",
            messagingSenderId: "842206429977",
            appId: "1:842206429977:web:eb78b2a92587395999bb88"
        };
        
        let app, db, doc, setDoc, getDoc, onSnapshot;

        // V10.14.1: Firebase is optional transport, not a boot dependency.
        // The local app initializes immediately; SDK modules are loaded in the background.
        window.AchillesFirebaseReady = (async function initFirebaseTransport(){
            try {
                const [{ initializeApp }, firestore] = await Promise.all([
                    import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js"),
                    import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js")
                ]);
                app = initializeApp(firebaseConfig);
                db = firestore.getFirestore(app);
                doc = firestore.doc;
                setDoc = firestore.setDoc;
                getDoc = firestore.getDoc;
                onSnapshot = firestore.onSnapshot;
                window.dispatchEvent(new CustomEvent('achilles:firebase-ready'));
                console.info('[Achilles OS] Firebase transport ready');
                return true;
            } catch(e) {
                app = null; db = null;
                console.warn('[Achilles OS] Firebase unavailable; local-first mode active', e);
                return false;
            }
        })();

        window.waitForFirebaseTransport = async function() {
            if (db && doc && setDoc && getDoc && onSnapshot) return true;
            try {
                const ready = await window.AchillesFirebaseReady;
                return Boolean(ready && db && doc && setDoc && getDoc && onSnapshot);
            } catch (_) {
                return false;
            }
        };

        window.foodDB = [
            { name: "👑 Сніданок Чемпіона (Вівсянка, Чіа, Яйця)", kcal: 418, p: 23, f: 21, c: 33, fiber: 0 },
            { name: "Яблуко (свіже)", kcal: 52, p: 0.3, f: 0.2, c: 14, fiber: 2.4 },
            { name: "Банан (свіжий)", kcal: 89, p: 1.1, f: 0.3, c: 22.8, fiber: 2.6 },
            { name: "Авокадо (Хаас)", kcal: 160, p: 2, f: 14.7, c: 8.5, fiber: 7.0 },
            { name: "Груша", kcal: 57, p: 0.4, f: 0.1, c: 15, fiber: 3.1 },
            { name: "Персик", kcal: 39, p: 0.9, f: 0.3, c: 10, fiber: 1.5 },
            { name: "Кавун", kcal: 30, p: 0.6, f: 0.2, c: 8, fiber: 0.4 },
            { name: "Помідор (свіжий)", kcal: 18, p: 0.9, f: 0.2, c: 3.9, fiber: 1.2 },
            { name: "Огірок (свіжий)", kcal: 15, p: 0.8, f: 0.1, c: 2.8, fiber: 0.5 },
            { name: "Броколі (варена)", kcal: 35, p: 2.4, f: 0.4, c: 7.2, fiber: 3.3 },
            { name: "Картопля (сира)", kcal: 77, p: 2, f: 0.1, c: 17, fiber: 2.2 },
            { name: "Картопля (варена)", kcal: 86, p: 2, f: 0.1, c: 20, fiber: 1.8 },
            { name: "Кабачки (смажені в борошні)", kcal: 85, p: 1.5, f: 5, c: 9, fiber: 1.2 },
            { name: "Куряче філе (сире)", kcal: 110, p: 23, f: 1.2, c: 0, fiber: 0 },
            { name: "Куряче філе (варене/запечене)", kcal: 165, p: 31, f: 3.6, c: 0, fiber: 0 },
            { name: "Свинина (вирізка, пісна)", kcal: 143, p: 26, f: 4, c: 0, fiber: 0 },
            { name: "Яловичина (вирізка, пісна)", kcal: 187, p: 28, f: 8, c: 0, fiber: 0 },
            { name: "Сало (солоне)", kcal: 797, p: 1.4, f: 89, c: 0, fiber: 0 },
            { name: "Лосось (сирий)", kcal: 208, p: 20, f: 13, c: 0, fiber: 0 },
            { name: "Яйце куряче (1 шт ~50г)", kcal: 78, p: 6, f: 5, c: 0.6, fiber: 0 },
            { name: "Гречка (суха)", kcal: 343, p: 13, f: 3.4, c: 71.5, fiber: 10.0 },
            { name: "Гречка (варена)", kcal: 110, p: 4.2, f: 1.1, c: 21, fiber: 2.7 },
            { name: "Рис білий (сухий)", kcal: 360, p: 7, f: 0.6, c: 79, fiber: 1.3 },
            { name: "Рис білий (варений)", kcal: 130, p: 2.7, f: 0.3, c: 28, fiber: 0.4 },
            { name: "Вівсянка (суха)", kcal: 389, p: 16.9, f: 6.9, c: 66, fiber: 10.0 },
            { name: "Макарони твердих сортів (сухі)", kcal: 350, p: 12, f: 1.5, c: 71, fiber: 3.2 },
            { name: "Борщ український", kcal: 65, p: 3, f: 4, c: 5, fiber: 1.8 },
            { name: "Вареники з картоплею", kcal: 180, p: 5, f: 4, c: 31, fiber: 1.5 },
            { name: "Деруни (смажені)", kcal: 230, p: 4, f: 15, c: 20, fiber: 2.0 },
            { name: "Сирники (смажені)", kcal: 220, p: 14, f: 11, c: 16, fiber: 0.5 },
            { name: "Піца Маргарита", kcal: 266, p: 11, f: 10, c: 33, fiber: 2.5 },
            { name: "Бургер з яловичиною", kcal: 254, p: 13, f: 10, c: 30, fiber: 1.5 },
            { name: "Картопля фрі", kcal: 312, p: 3.4, f: 15, c: 41, fiber: 3.8 },
            { name: "Шаурма (курка)", kcal: 220, p: 9, f: 10, c: 22, fiber: 1.5 },
            { name: "Суші (Філадельфія)", kcal: 175, p: 6.5, f: 5.3, c: 25, fiber: 0.5 },
            { name: "Суші (Каліфорнія)", kcal: 150, p: 5.5, f: 3.2, c: 26, fiber: 0.8 },
            { name: "Сир кисломолочний 5%", kcal: 121, p: 17, f: 5, c: 1.8, fiber: 0 },
            { name: "Сметана 15%", kcal: 162, p: 2.6, f: 15, c: 3, fiber: 0 },
            { name: "Молоко 2.5%", kcal: 52, p: 2.8, f: 2.5, c: 4.7, fiber: 0 },
            { name: "Твердий сир", kcal: 350, p: 26, f: 27, c: 0, fiber: 0 },
            { name: "Еспресо / Американо", kcal: 2, p: 0.1, f: 0, c: 0, fiber: 0 },
            { name: "Капучино (без цукру)", kcal: 75, p: 3.4, f: 3.6, c: 7.4, fiber: 0 },
            { name: "Протеїн (Whey)", kcal: 380, p: 80, f: 4, c: 6, fiber: 0 },
            { name: "Шоколад чорний (70%+)", kcal: 598, p: 7.8, f: 42.6, c: 36, fiber: 10.9 },
            { name: "Кола Zero", kcal: 0, p: 0, f: 0, c: 0, fiber: 0 }
        ];
        window.workoutDB = [
            // Кардіо: час + (де доречно) відстань
            { id: "run", name: "Біг (вулиця / доріжка)", desc: "Кардіо · час + дистанція", kind: "cardio_distance", factor: 11.0, distanceUnit: "км" },
            { id: "bike", name: "Велосипед / Велотренажер", desc: "Кардіо · час + дистанція", kind: "cardio_distance", factor: 8.0, distanceUnit: "км" },
            { id: "walk", name: "Ходьба (швидка)", desc: "Кардіо · час + дистанція", kind: "cardio_distance", factor: 5.0, distanceUnit: "км" },
            { id: "swim", name: "Плавання", desc: "Кардіо · час + дистанція", kind: "cardio_distance", factor: 10.0, distanceUnit: "м" },
            { id: "elliptical", name: "Еліпсоїд (Орбітрек)", desc: "Кардіо · тривалість", kind: "cardio_time", factor: 9.0 },
            { id: "hiit", name: "ВІІТ (HIIT)", desc: "Інтервальне кардіо · тривалість", kind: "cardio_time", factor: 12.0 },

            // Власна вага: лише повторення
            { id: "pushups", name: "Віджимання від підлоги", desc: "Груди / трицепс · власна вага", kind: "bodyweight", factor: 0.4 },
            { id: "dips", name: "Віджимання на брусах", desc: "Груди / трицепс · власна вага", kind: "bodyweight_optional", factor: 0.6 },
            { id: "pullups", name: "Підтягування на турніку", desc: "Спина / біцепс · власна вага", kind: "bodyweight_optional", factor: 1.0 },
            { id: "crunch", name: "Скручування на прес", desc: "Прес · повторення", kind: "bodyweight", factor: 0.2 },
            { id: "twists", name: "Діагональні скручування (Твісти)", desc: "Косі м'язи · повторення", kind: "bodyweight", factor: 0.25 },

            // Статика: час у секундах
            { id: "plank", name: "Планка", desc: "Кор · утримання в секундах", kind: "static_time", factor: 4.5 },

            // Зовнішня вага: повторення + кг
            { id: "bench-barbell", name: "Жим штанги лежачи", desc: "Груди · штанга", kind: "strength_weighted", factor: 0.6 },
            { id: "bench-dumbbell", name: "Жим гантелей лежачи", desc: "Груди · гантелі", kind: "strength_weighted", factor: 0.5 },
            { id: "fly-dumbbell", name: "Розведення гантелей лежачи", desc: "Груди · гантелі", kind: "strength_weighted", factor: 0.3 },
            { id: "lat-pulldown", name: "Тяга верхнього блоку", desc: "Спина · тренажер", kind: "strength_weighted", factor: 0.4 },
            { id: "seated-row", name: "Тяга нижнього блоку", desc: "Спина · тренажер", kind: "strength_weighted", factor: 0.4 },
            { id: "barbell-row", name: "Тяга штанги в нахилі", desc: "Спина · штанга", kind: "strength_weighted", factor: 0.6 },
            { id: "dumbbell-row", name: "Тяга гантелі в нахилі", desc: "Спина · гантель", kind: "strength_weighted", factor: 0.5 },
            { id: "shrugs", name: "Шраги з гантелями / штангою", desc: "Трапеція · зовнішня вага", kind: "strength_weighted", factor: 0.3 },
            { id: "ohp-barbell", name: "Жим штанги стоячи", desc: "Плечі · штанга", kind: "strength_weighted", factor: 0.5 },
            { id: "ohp-dumbbell", name: "Жим гантелей сидячи", desc: "Плечі · гантелі", kind: "strength_weighted", factor: 0.4 },
            { id: "lateral-raise", name: "Махи гантелями в сторони", desc: "Середні дельти · гантелі", kind: "strength_weighted", factor: 0.3 },
            { id: "curl-barbell", name: "Підйом штанги на біцепс", desc: "Біцепс · штанга", kind: "strength_weighted", factor: 0.4 },
            { id: "curl-dumbbell", name: "Підйом гантелей на біцепс", desc: "Біцепс · гантелі", kind: "strength_weighted", factor: 0.3 },
            { id: "concentration-curl", name: "Концентроване згинання на біцепс", desc: "Біцепс · гантель · сидячи, лікоть упертий у внутрішню частину стегна", kind: "strength_weighted", factor: 0.3 },
            { id: "hammer-curl", name: "Молотки (Хаммери)", desc: "Брахіаліс · гантелі", kind: "strength_weighted", factor: 0.3 },
            { id: "french-press", name: "Французький жим", desc: "Трицепс · зовнішня вага", kind: "strength_weighted", factor: 0.4 },
            { id: "squat-barbell", name: "Присідання зі штангою", desc: "Ноги · штанга", kind: "strength_weighted", factor: 0.8 },
            { id: "squat-dumbbell", name: "Присідання з гантелями", desc: "Ноги · гантелі", kind: "strength_weighted", factor: 0.6 },
            { id: "leg-press", name: "Жим ногами в тренажері", desc: "Ноги · тренажер", kind: "strength_weighted", factor: 0.5 },
            { id: "lunges", name: "Випади з гантелями", desc: "Ноги / сідниці · гантелі", kind: "strength_weighted", factor: 0.6 },
            { id: "rdl", name: "Румунська тяга", desc: "Сідниці / задня поверхня стегна", kind: "strength_weighted", factor: 0.6 }
        ];

        window.getWorkoutById = function(id) {
            return window.workoutDB.find(w => w.id === id);
        };

        const offsetMs = new Date().getTimezoneOffset() * 60000;
        window.todayDate = (new Date(Date.now() - offsetMs)).toISOString().split('T')[0];
        window.currentViewDate = window.todayDate;
        
        window.consumedCalories = 0; 
        window.workoutBonus = 0;
        window.macros = { p: 0, f: 0, c: 0 }; 
        window.targetMacros = { p: 0, f: 0, c: 0 };
        window.dailyLog = []; 
        window.allDaysData = {};

        window.currentWorkoutMode = 'extended'; 
        window.currentWorkoutFilter = 'all';
        window.currentFoodFilter = 'all';
        window.liveWorkout = null; 

        window.showScreen = function(screenId) {
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active-block'));
            document.getElementById(screenId).classList.add('active-block');
        }

        window.previewTheme = function() {
            let color = document.getElementById('edit-theme-color') ? document.getElementById('edit-theme-color').value : 'gold';
            let mode = document.getElementById('edit-theme-mode') ? document.getElementById('edit-theme-mode').value : 'auto';
            
            localStorage.setItem('achilles_theme_color', color);
            localStorage.setItem('achilles_theme_mode', mode);
            
            window.applyTheme(color, mode);
        };

        window.applyTheme = function(colorStr, modeStr) {
            let color = colorStr || localStorage.getItem('achilles_theme_color') || 'gold';
            let mode = modeStr || localStorage.getItem('achilles_theme_mode') || 'auto';
            
            let actualMode = mode;
            if (mode === 'auto') {
                actualMode = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
            }
            
            document.documentElement.setAttribute('data-color', color);
            document.documentElement.setAttribute('data-theme', actualMode);
            
            const metaThemeColor = document.querySelector('meta[name="theme-color"]');
            if (metaThemeColor) {
                metaThemeColor.setAttribute("content", actualMode === 'light' ? "#F2F2F7" : "#000000");
            }
        };

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if ((localStorage.getItem('achilles_theme_mode') || 'auto') === 'auto') { window.applyTheme(); }
        });

        window.formatDateLabel = function(dateStr) {
            if(dateStr === window.todayDate) return 'Сьогодні';
            let d = new Date(dateStr);
            const options = { day: 'numeric', month: 'short' };
            return d.toLocaleDateString('uk-UA', options);
        };

        window.changeDate = function(offsetDays) {
            const currentStoredDay = window.allDaysData[window.currentViewDate] || {};
            window.allDaysData[window.currentViewDate] = {
                consumedCalories: window.consumedCalories,
                workoutBonus: window.workoutBonus,
                macros: window.macros,
                log: window.dailyLog,
                updatedAt: currentStoredDay.updatedAt || 0
            };
            
            let d = new Date(window.currentViewDate);
            d.setDate(d.getDate() + offsetDays);
            window.currentViewDate = d.toISOString().split('T')[0];
            
            document.getElementById('btn-next-date').disabled = (window.currentViewDate >= window.todayDate);
            document.getElementById('display-date').innerText = window.formatDateLabel(window.currentViewDate);
            
            let dayData = window.allDaysData[window.currentViewDate] || { consumedCalories: 0, workoutBonus: 0, macros: {p:0, f:0, c:0}, log: [] };
            window.consumedCalories = dayData.consumedCalories || 0;
            window.workoutBonus = dayData.workoutBonus || 0;
            window.macros = dayData.macros || {p:0, f:0, c:0};
            window.dailyLog = dayData.log || [];
            
            window.updateGoalDisplay();
            window.renderDiary();
            window.renderProgressInsights();
        };

        window.loadDailyData = function() {
            window.allDaysData = JSON.parse(localStorage.getItem('achilles_all_days')) || {};
            
            // Міграція з попередньої версії (якщо є)
            let oldDaily = JSON.parse(localStorage.getItem('achilles_daily_data'));
            if(oldDaily && oldDaily.date) {
                if(!window.allDaysData[oldDaily.date]) {
                    window.allDaysData[oldDaily.date] = {
                        consumedCalories: oldDaily.consumedCalories, workoutBonus: oldDaily.workoutBonus,
                        macros: oldDaily.macros, log: oldDaily.log
                    };
                }
                localStorage.removeItem('achilles_daily_data');
            }

            window.currentViewDate = window.todayDate;
            document.getElementById('display-date').innerText = 'Сьогодні';
            document.getElementById('btn-next-date').disabled = true;

            let dayData = window.allDaysData[window.currentViewDate] || { consumedCalories:0, workoutBonus:0, macros:{p:0,f:0,c:0}, log:[] };
            
            window.consumedCalories = dayData.consumedCalories || 0;
            window.workoutBonus = dayData.workoutBonus || 0;
            window.macros = dayData.macros || {p:0, f:0, c:0};
            window.dailyLog = dayData.log || [];
            
            window.allDaysData[window.currentViewDate] = {
                consumedCalories: window.consumedCalories, workoutBonus: window.workoutBonus,
                macros: window.macros, log: window.dailyLog,
                updatedAt: dayData.updatedAt || 0
            };
            localStorage.setItem('achilles_all_days', JSON.stringify(window.allDaysData));
            
            window.updateGoalDisplay();
            window.renderDiary();
            window.renderProgressInsights();
        };

        window.saveDailyData = function() {
            window.allDaysData[window.currentViewDate] = {
                consumedCalories: window.consumedCalories,
                workoutBonus: window.workoutBonus,
                macros: window.macros,
                log: window.dailyLog,
                updatedAt: Date.now()
            };
            localStorage.setItem('achilles_all_days', JSON.stringify(window.allDaysData));
            window.renderProgressInsights();
            window.syncToCloud(); 
        };

        const customFoodKey = item => {
            const barcode = String(item?.barcode || '').trim();
            if (barcode) return `barcode:${barcode}`;
            const name = String(item?.name || '').replace(/^[^\p{L}\p{N}]+/u, '').trim().toLowerCase();
            return `name:${name}|${Number(item?.kcal || 0)}`;
        };

        window.mergeCustomFoodLists = function(...lists) {
            const map = new Map();
            lists.forEach((list, sourceRank) => (list || []).forEach(item => {
                if (!item || !item.name) return;
                const key = customFoodKey(item);
                const previous = map.get(key);
                if (!previous) { map.set(key, {item, sourceRank}); return; }
                const prevUpdated = Number(previous.item?.updatedAt || 0);
                const nextUpdated = Number(item?.updatedAt || 0);
                if (nextUpdated > prevUpdated || (nextUpdated === prevUpdated && sourceRank >= previous.sourceRank)) {
                    map.set(key, {item, sourceRank});
                }
            }));
            return [...map.values()].map(entry => entry.item);
        };

        window.syncCustomFoodsBackup = async function(userName = localStorage.getItem('achilles_user')) {
            if(!userName || !(await window.waitForFirebaseTransport())) return false;
            const items = JSON.parse(localStorage.getItem('achilles_custom_foods')) || [];
            await setDoc(doc(db, "users", userName, "backups", "customFoods"), {
                items,
                schemaVersion: 1,
                updatedAt: Date.now()
            });
            return true;
        };

        window.loadCustomFoodsBackup = async function(userName = localStorage.getItem('achilles_user')) {
            if(!userName || !(await window.waitForFirebaseTransport())) return false;
            try {
                const snap = await getDoc(doc(db, "users", userName, "backups", "customFoods"));
                if(!snap.exists()) return false;
                const local = JSON.parse(localStorage.getItem('achilles_custom_foods')) || [];
                const backup = snap.data()?.items || [];
                const merged = window.mergeCustomFoodLists(backup, local);
                localStorage.setItem('achilles_custom_foods', JSON.stringify(merged));
                return true;
            } catch(error) {
                console.warn('[Achilles] Custom food backup unavailable', error);
                return false;
            }
        };

        window.syncToCloud = async function() {
            const userName = localStorage.getItem('achilles_user');
            if(!userName) return false;
            if(!(await window.waitForFirebaseTransport())) return false;

            const icon = document.getElementById('sync-icon');
            if(icon) { icon.style.opacity = '1'; setTimeout(() => icon.style.opacity = '0', 2000); }

            const dataToSave = {
                profile: JSON.parse(localStorage.getItem('achilles_profile')) || {},
                coachWorkflow: window.Achilles?.coachWorkflow?.read?.() || null,
                appMode: localStorage.getItem('achilles_app_mode') || 'pro',
                themeColor: localStorage.getItem('achilles_theme_color') || 'gold',
                themeMode: localStorage.getItem('achilles_theme_mode') || 'auto',
                baseKcal: localStorage.getItem('achilles_base_kcal') || 2000,
                goalText: localStorage.getItem('achilles_goal_text') || '',
                targetMacros: JSON.parse(localStorage.getItem('achilles_macros')) || {p:0, f:0, c:0},
                weightHistory: JSON.parse(localStorage.getItem('achilles_weight_history')) || [],
                favWorkouts: JSON.parse(localStorage.getItem('achilles_fav_workouts')) || [],
                customFoods: JSON.parse(localStorage.getItem('achilles_custom_foods')) || [],
                favFoods: JSON.parse(localStorage.getItem('achilles_fav_foods')) || [],
                avatarState: JSON.parse(localStorage.getItem('achilles_avatar_state_v1')) || null,
                prs: JSON.parse(localStorage.getItem('achilles_prs')) || {},
                lastPR: JSON.parse(localStorage.getItem('achilles_last_pr')) || null,
                allDaysData: window.allDaysData,
                dataVersion: 2,
                syncedAt: Date.now()
            };
            try {
                await setDoc(doc(db, "users", userName), dataToSave);
                await window.syncCustomFoodsBackup(userName);
                return true;
            } catch(e) {
                console.error("Cloud Sync Error", e);
                throw e;
            }
        };

        window.loadFromCloud = async function(userName) {
            if(!userName) return false;
            if(!(await window.waitForFirebaseTransport())) return false;
            try {
                const docSnap = await getDoc(doc(db, "users", userName));
                if (docSnap.exists()) {
                    const d = docSnap.data();
                    window.Achilles?.coachWorkflow?.mergeRemote?.(d.coachWorkflow, userName);
                    
                    localStorage.setItem('achilles_profile', JSON.stringify(d.profile || {}));
                    localStorage.setItem('achilles_app_mode', d.appMode || 'pro');
                    
                    if(!localStorage.getItem('achilles_theme_color') && d.themeColor) {
                        localStorage.setItem('achilles_theme_color', d.themeColor);
                        localStorage.setItem('achilles_theme_mode', d.themeMode || 'auto');
                    }
                    
                    localStorage.setItem('achilles_base_kcal', d.baseKcal || 2000);
                    localStorage.setItem('achilles_goal_text', d.goalText || '');
                    localStorage.setItem('achilles_macros', JSON.stringify(d.targetMacros || {p:0,f:0,c:0}));
                    
                    let localW = JSON.parse(localStorage.getItem('achilles_weight_history')) || [];
                    let cloudW = d.weightHistory || [];
                    let mergedW = [...cloudW];
                    localW.forEach(localItem => {
                        const idx = mergedW.findIndex(cloudItem => cloudItem?.date === localItem?.date);
                        if(idx === -1) {
                            mergedW.push(localItem);
                            return;
                        }
                        const lUpdated = Number(localItem?.updatedAt || 0);
                        const cUpdated = Number(mergedW[idx]?.updatedAt || 0);
                        if(lUpdated >= cUpdated) mergedW[idx] = localItem;
                    });
                    localStorage.setItem('achilles_weight_history', JSON.stringify(mergedW));

                    let localFW = JSON.parse(localStorage.getItem('achilles_fav_workouts')) || [];
                    let cloudFW = d.favWorkouts || [];
                    if(cloudFW.length > localFW.length) localStorage.setItem('achilles_fav_workouts', JSON.stringify(cloudFW));

                    let localCF = JSON.parse(localStorage.getItem('achilles_custom_foods')) || [];
                    let cloudCF = d.customFoods || [];
                    localStorage.setItem('achilles_custom_foods', JSON.stringify(window.mergeCustomFoodLists(cloudCF, localCF)));

                    let localFF = JSON.parse(localStorage.getItem('achilles_fav_foods')) || [];
                    let cloudFF = d.favFoods || [];
                    localStorage.setItem('achilles_fav_foods', JSON.stringify(window.mergeCustomFoodLists(cloudFF, localFF)));

                    window.Achilles?.avatars?.mergeRemote?.(d.avatarState);

                    const localPRs = JSON.parse(localStorage.getItem('achilles_prs')) || {};
                    const cloudPRs = d.prs || {};
                    const mergedPRs = { ...cloudPRs };
                    Object.keys(localPRs).forEach(name => {
                        const l = localPRs[name] || {};
                        const c = cloudPRs[name] || {};
                        mergedPRs[name] = {
                            maxWeight: Math.max(Number(l.maxWeight || 0), Number(c.maxWeight || 0)),
                            est1RM: Math.max(Number(l.est1RM || 0), Number(c.est1RM || 0)),
                            volume: Math.max(Number(l.volume || 0), Number(c.volume || 0)),
                            updatedAt: Math.max(Number(l.updatedAt || 0), Number(c.updatedAt || 0))
                        };
                    });
                    localStorage.setItem('achilles_prs', JSON.stringify(mergedPRs));

                    const localLastPR = JSON.parse(localStorage.getItem('achilles_last_pr') || 'null');
                    if(d.lastPR && (!localLastPR || Number(d.lastPR.updatedAt || 0) > Number(localLastPR.updatedAt || 0))) {
                        localStorage.setItem('achilles_last_pr', JSON.stringify(d.lastPR));
                    }
                    
                    // Злиття історії днів
                    let cloudAllDays = d.allDaysData || {};
                    let localAllDays = JSON.parse(localStorage.getItem('achilles_all_days')) || {};
                    
                    if(d.daily && d.daily.date) {
                        if(!cloudAllDays[d.daily.date]) cloudAllDays[d.daily.date] = d.daily;
                    }

                    for (let date in cloudAllDays) {
                        const cloudDay = cloudAllDays[date] || {};
                        const localDay = localAllDays[date] || null;
                        if(!localDay) {
                            localAllDays[date] = cloudDay;
                            continue;
                        }

                        const cUpdated = Number(cloudDay.updatedAt || 0);
                        const lUpdated = Number(localDay.updatedAt || 0);
                        if(cUpdated || lUpdated) {
                            if(cUpdated > lUpdated) localAllDays[date] = cloudDay;
                            continue;
                        }

                        // Старі записи без updatedAt: сумісний fallback.
                        const cCount = cloudDay.log ? cloudDay.log.length : 0;
                        const lCount = localDay.log ? localDay.log.length : 0;
                        if (cCount > lCount) localAllDays[date] = cloudDay;
                    }
                    
                    window.allDaysData = localAllDays;
                    localStorage.setItem('achilles_all_days', JSON.stringify(window.allDaysData));
                    
                    let dayData = window.allDaysData[window.currentViewDate] || { consumedCalories:0, workoutBonus:0, macros:{p:0,f:0,c:0}, log:[] };
                    window.consumedCalories = dayData.consumedCalories || 0;
                    window.workoutBonus = dayData.workoutBonus || 0;
                    window.macros = dayData.macros || {p:0, f:0, c:0};
                    window.dailyLog = dayData.log || [];
                    
                    await window.loadCustomFoodsBackup(userName);
                    window.applyTheme();
                    window.Achilles?.avatars?.render?.();
                    window.renderProgressInsights();
                    return true;
                }
                const backupRecovered = await window.loadCustomFoodsBackup(userName);
                if(backupRecovered) {
                    window.Achilles?.avatars?.render?.();
                    return true;
                }
            } catch(e) { console.error("Cloud Load Error", e); }
            return false;
        };

        let achillesCloudRealtimeUnsubscribe = null;
        let achillesCloudRealtimeUser = '';
        let achillesCloudRealtimeApplyTimer = 0;

        window.stopCloudRealtimeSync = function() {
            clearTimeout(achillesCloudRealtimeApplyTimer);
            achillesCloudRealtimeApplyTimer = 0;
            if (typeof achillesCloudRealtimeUnsubscribe === 'function') {
                try { achillesCloudRealtimeUnsubscribe(); } catch (_) {}
            }
            achillesCloudRealtimeUnsubscribe = null;
            achillesCloudRealtimeUser = '';
        };

        window.startCloudRealtimeSync = async function(userName) {
            const wantedUser = String(userName || '').trim();
            if (!wantedUser) return false;
            if (achillesCloudRealtimeUnsubscribe && achillesCloudRealtimeUser === wantedUser) return true;
            if (!(await window.waitForFirebaseTransport()) || typeof onSnapshot !== 'function') return false;

            window.stopCloudRealtimeSync();
            achillesCloudRealtimeUser = wantedUser;

            try {
                achillesCloudRealtimeUnsubscribe = onSnapshot(
                    doc(db, "users", wantedUser),
                    snapshot => {
                        if (!snapshot.exists()) return;
                        if (snapshot.metadata?.hasPendingWrites) return;

                        clearTimeout(achillesCloudRealtimeApplyTimer);
                        achillesCloudRealtimeApplyTimer = setTimeout(async () => {
                            if (localStorage.getItem('achilles_user') !== wantedUser) return;
                            try {
                                const loaded = await window.loadFromCloud(wantedUser);
                                if (!loaded) return;
                                window.loadUserData();
                                window.loadDailyData();
                                window.renderWeightChart();
                                window.updateGoalDisplay();
                                window.renderDiary();
                                window.renderProgressInsights();
                                if (window.currentFoodFilter === 'all') window.onSearchInput();
                                else window.renderFavFoods();
                                console.info('[Achilles OS] Realtime cloud update applied');
                            } catch (error) {
                                console.warn('[Achilles OS] Realtime cloud apply failed', error);
                            }
                        }, 120);
                    },
                    error => {
                        console.warn('[Achilles OS] Realtime cloud listener failed', error);
                    }
                );
                console.info('[Achilles OS] Realtime cloud sync active');
                return true;
            } catch (error) {
                achillesCloudRealtimeUnsubscribe = null;
                achillesCloudRealtimeUser = '';
                console.warn('[Achilles OS] Realtime cloud sync unavailable', error);
                return false;
            }
        };

        document.addEventListener("DOMContentLoaded", () => {
            window.applyTheme(); 
            const splash = document.getElementById('splash-screen');
            // V10.14 cinematic boot owns splash timing. Legacy 800ms auto-hide intentionally removed.
            const userName = localStorage.getItem('achilles_user');
            if (userName) {
                window.loadUserData();
                window.loadDailyData(); 
                window.renderWeightChart();
                window.renderProgressInsights();
                window.showScreen('main-app-window');
                window.startCloudRealtimeSync(userName);
                
                window.loadFromCloud(userName).then(loaded => {
                    if(loaded) {
                        window.loadUserData();
                        window.renderWeightChart();
                        window.updateGoalDisplay();
                        window.renderDiary();
                        window.searchWorkout();
                        if(window.currentFoodFilter === 'all') window.onSearchInput(); else window.renderFavFoods();
                    }
                });
            } else { 
                window.showScreen('login-window');
            }
        });

        let achillesLastCloudRefreshAt = 0;
        let achillesCloudRefreshInFlight = null;

        window.refreshFromCloud = async function(force = false) {
            const userName = localStorage.getItem('achilles_user');
            if(!userName) return false;
            const now = Date.now();
            if(!force && now - achillesLastCloudRefreshAt < 10000) return false;
            if(achillesCloudRefreshInFlight) return achillesCloudRefreshInFlight;

            achillesLastCloudRefreshAt = now;
            achillesCloudRefreshInFlight = (async () => {
                const loaded = await window.loadFromCloud(userName);
                if(loaded) {
                    window.loadUserData();
                    window.loadDailyData();
                    window.renderWeightChart();
                    window.updateGoalDisplay();
                    window.renderDiary();
                    window.renderProgressInsights();
                    if(window.currentFoodFilter === 'all') window.onSearchInput();
                    else window.renderFavFoods();
                    // Re-save the merged state so changes made offline on either device
                    // converge instead of remaining only on the device that created them.
                    try { await window.syncToCloud(); } catch(e) {
                        console.warn('[Achilles OS] merged cloud state was not pushed', e);
                    }
                }
                return loaded;
            })();

            try {
                return await achillesCloudRefreshInFlight;
            } finally {
                achillesCloudRefreshInFlight = null;
            }
        };

        window.addEventListener('online', () => window.refreshFromCloud(true));
        window.addEventListener('focus', () => window.refreshFromCloud(false));
        window.addEventListener('pageshow', () => window.refreshFromCloud(false));
        document.addEventListener('visibilitychange', () => {
            if(document.visibilityState === 'visible') window.refreshFromCloud(false);
        });

        window.attemptLogin = async function() {
            const user = document.getElementById('login-username').value.trim();
            const pass = document.getElementById('login-password').value;
            if(!user || !pass) { alert("Введіть логін та пароль!"); return; }

            const btn = document.getElementById('login-btn');
            btn.innerText = "Завантаження...";
            
            try {
                if(!(await window.waitForFirebaseTransport())) throw new Error("Firebase not ready");
                const docSnap = await getDoc(doc(db, "users", user));
                
                if(docSnap.exists()) {
                    const d = docSnap.data();
                    if(d.profile && d.profile.password === pass) {
                        localStorage.setItem('achilles_user', user);
                        await window.loadFromCloud(user);
                        window.loadUserData();
                        window.loadDailyData();
                        window.renderWeightChart();
                        window.showScreen('main-app-window');
                        window.startCloudRealtimeSync(user);
                    } else { alert("Неправильний пароль!"); }
                } else { alert("Користувача не знайдено. Створіть профіль!"); }
            } catch(e) {
                console.error(e);
                const localUser = localStorage.getItem('achilles_user');
                const localProf = JSON.parse(localStorage.getItem('achilles_profile'));
                if(localUser === user && localProf && localProf.password === pass) {
                    window.loadUserData();
                    window.loadDailyData();
                    window.renderWeightChart();
                    window.showScreen('main-app-window');
                } else { alert("Помилка підключення до хмари."); }
            }
            btn.innerText = "Увійти";
        };

        window.calculateNorms = function(gender, weight, height, age, activityMultiplier, goal, diet) {
            let bmr = (10 * weight) + (6.25 * height) - (5 * age);
            bmr += (gender === 'male') ? 5 : -161;
            let tdee = bmr * parseFloat(activityMultiplier);

            let targetKcal = tdee;
            let goalText = "Підтримка форми";
            if (goal === 'lose') { targetKcal = tdee * 0.8; goalText = "Схуднення (Дефіцит 20%)"; }
            else if (goal === 'gain') { targetKcal = tdee * 1.15; goalText = "Набір маси (Профіцит 15%)"; }

            targetKcal = Math.round(targetKcal);
            let p, f, c;

            if (diet === 'balanced') {
                p = (targetKcal * 0.3) / 4; f = (targetKcal * 0.3) / 9; c = (targetKcal * 0.4) / 4;
            } else if (diet === 'lowcarb') {
                p = (targetKcal * 0.4) / 4; f = (targetKcal * 0.4) / 9; c = (targetKcal * 0.2) / 4;
            } else if (diet === 'keto') {
                p = (targetKcal * 0.2) / 4; f = (targetKcal * 0.75) / 9; c = (targetKcal * 0.05) / 4;
            } else {
                p = weight * 2.0; f = weight * 1.0; c = (targetKcal - (p * 4) - (f * 9)) / 4;
                if(c < 0) { 
                    c = 0; let totalNeeded = (p*4) + (f*9);
                    p = p * (targetKcal / totalNeeded); f = f * (targetKcal / totalNeeded);
                }
            }
            return { kcal: targetKcal, goalText: goalText, p: Math.round(p), f: Math.round(f), c: Math.round(c) };
        };

        window.recalcAndSaveNorms = function(profile, skipSync = true) {
            let wDays = parseInt(profile.workDays) || 2;
            let rDays = parseInt(profile.restDays) || 2;
            let aWork = parseFloat(profile.activityWork) || 1.725;
            let aRest = parseFloat(profile.activityRest) || 1.2;
            
            if (wDays + rDays === 0) wDays = 1;
            let avgAct = ((aWork * wDays) + (aRest * rDays)) / (wDays + rDays);
            
            const norms = window.calculateNorms(profile.gender, profile.weight, profile.height, profile.age, avgAct, profile.goal, profile.diet || 'standard');
            
            localStorage.setItem('achilles_base_kcal', norms.kcal); 
            localStorage.setItem('achilles_goal_text', norms.goalText);
            localStorage.setItem('achilles_macros', JSON.stringify({p: norms.p, f: norms.f, c: norms.c}));
            
            window.targetMacros = {p: norms.p, f: norms.f, c: norms.c};
            document.getElementById('target-p').innerText = `/ ${norms.p}г`;
            document.getElementById('target-f').innerText = `/ ${norms.f}г`;
            document.getElementById('target-c').innerText = `/ ${norms.c}г`;
            const goalTextEl = document.getElementById('user-goal-text');
            if (goalTextEl) goalTextEl.textContent = norms.goalText;
            
            window.updateGoalDisplay();
            
            if(!skipSync) window.syncToCloud();
        };

        window.completeRegistration = async function() {
            const name = document.getElementById('reg-name').value.trim();
            const pass = document.getElementById('reg-password').value;
            const gender = document.getElementById('reg-gender').value;
            const age = parseInt(document.getElementById('reg-age').value);
            const height = parseFloat(document.getElementById('reg-height').value);
            const weight = parseFloat(document.getElementById('reg-weight').value);
            const goal = document.getElementById('reg-goal').value;
            const appMode = document.getElementById('reg-app-mode').value;
            const diet = document.getElementById('reg-diet').value;
            
            let wDays = parseInt(document.getElementById('reg-work-days').value) || 0;
            let rDays = parseInt(document.getElementById('reg-rest-days').value) || 0;
            if (wDays + rDays === 0) wDays = 1;
            
            const aWork = parseFloat(document.getElementById('reg-activity-work').value);
            const aRest = parseFloat(document.getElementById('reg-activity-rest').value);
            
            if(!name || !pass || !age || !height || !weight || !aWork || !aRest || !goal || !appMode || !diet) { alert('Заповни всі поля!'); return; }

            const btn = document.getElementById('reg-btn');
            btn.innerText = "Створення...";

            if(await window.waitForFirebaseTransport()) {
                try {
                    const docSnap = await getDoc(doc(db, "users", name));
                    if(docSnap.exists()) {
                        alert("Це ім'я вже зайняте! Придумай інше.");
                        btn.innerText = "Зареєструватися";
                        return;
                    }
                } catch(e) {}
            }

            let profile = { name, password: pass, gender, age, height, weight, activityWork: aWork, activityRest: aRest, workDays: wDays, restDays: rDays, goal, diet };
            localStorage.setItem('achilles_profile', JSON.stringify(profile));
            localStorage.setItem('achilles_user', name);
            localStorage.setItem('achilles_app_mode', appMode);
            localStorage.setItem('achilles_theme_color', 'gold');
            localStorage.setItem('achilles_theme_mode', 'auto');

            window.logNewWeight(weight);
            window.recalcAndSaveNorms(profile, false); 
            
            window.applyTheme();
            window.loadUserData(); 
            window.loadDailyData();
            window.renderWeightChart(); 
            window.showScreen('main-app-window');
            window.startCloudRealtimeSync(name);
        };

        window.loadUserData = function() {
            const uName = localStorage.getItem('achilles_user');
            document.getElementById('display-username').innerText = uName;
            
            let prof = JSON.parse(localStorage.getItem('achilles_profile'));
            if(prof) {
                document.getElementById('edit-name').value = prof.name;
                document.getElementById('edit-gender').value = prof.gender;
                document.getElementById('edit-age').value = prof.age;
                document.getElementById('edit-height').value = prof.height;
                document.getElementById('edit-work-days').value = prof.workDays || 2;
                document.getElementById('edit-rest-days').value = prof.restDays || 2;
                document.getElementById('edit-activity-work').value = prof.activityWork || '1.725';
                document.getElementById('edit-activity-rest').value = prof.activityRest || '1.2';
                document.getElementById('edit-goal').value = prof.goal;
                if(prof.diet) document.getElementById('edit-diet').value = prof.diet;
            }
            
            let savedAppMode = localStorage.getItem('achilles_app_mode') || 'pro';
            document.getElementById('edit-app-mode').value = savedAppMode;
            
            document.getElementById('edit-theme-color').value = localStorage.getItem('achilles_theme_color') || 'gold';
            document.getElementById('edit-theme-mode').value = localStorage.getItem('achilles_theme_mode') || 'auto';

            if(prof) window.recalcAndSaveNorms(prof, true);

            window.currentWorkoutMode = savedAppMode === 'simple' ? 'manual' : 'extended';

            window.searchWorkout();
            window.Achilles?.coachWorkflow?.hydrate?.();
        };

        window.saveProfile = function() {
            const name = document.getElementById('edit-name').value;
            const gender = document.getElementById('edit-gender').value;
            const age = parseInt(document.getElementById('edit-age').value);
            const height = parseFloat(document.getElementById('edit-height').value);
            const aWork = parseFloat(document.getElementById('edit-activity-work').value);
            const aRest = parseFloat(document.getElementById('edit-activity-rest').value);
            const goal = document.getElementById('edit-goal').value;
            const appMode = document.getElementById('edit-app-mode').value;
            const diet = document.getElementById('edit-diet').value;
            
            const themeColor = document.getElementById('edit-theme-color').value;
            const themeMode = document.getElementById('edit-theme-mode').value;
            
            let wDays = parseInt(document.getElementById('edit-work-days').value) || 0;
            let rDays = parseInt(document.getElementById('edit-rest-days').value) || 0;
            if (wDays + rDays === 0) wDays = 1;

            if(!name || !age || !height || !diet || !aWork || !aRest) { alert('Заповни всі поля!'); return; }

            let profile = JSON.parse(localStorage.getItem('achilles_profile')) || {};
            profile = { ...profile, name, gender, age, height, activityWork: aWork, activityRest: aRest, workDays: wDays, restDays: rDays, goal, diet };
            
            localStorage.setItem('achilles_profile', JSON.stringify(profile));
            localStorage.setItem('achilles_app_mode', appMode);
            localStorage.setItem('achilles_theme_color', themeColor);
            localStorage.setItem('achilles_theme_mode', themeMode);
            
            window.applyTheme(themeColor, themeMode);
            window.recalcAndSaveNorms(profile, false); 

            window.loadUserData();
            alert('Профіль успішно оновлено!');
        };

        window.logNewWeight = function(w) {
            const weight = Number(w);
            if(!Number.isFinite(weight) || weight <= 0) return;

            let history = JSON.parse(localStorage.getItem('achilles_weight_history')) || [];
            const date = window.todayDate;
            const now = Date.now();

            const sameDayIndex = history.findIndex(item => item && item.date === date);
            const entry = { date, weight: Math.round(weight * 10) / 10, updatedAt: now };
            if(sameDayIndex >= 0) history[sameDayIndex] = entry;
            else history.push(entry);

            localStorage.setItem('achilles_weight_history', JSON.stringify(history));
        };

        window.logWeight = function() {
            const w = parseFloat(document.getElementById('new-weight-input').value);
            if(!Number.isFinite(w) || w <= 0) return;
            window.logNewWeight(w);
            document.getElementById('new-weight-input').value = '';
            
            let prof = JSON.parse(localStorage.getItem('achilles_profile'));
            if(prof) {
                prof.weight = w;
                localStorage.setItem('achilles_profile', JSON.stringify(prof));
                window.recalcAndSaveNorms(prof, false);
            }
            window.renderWeightChart();
            window.renderProgressInsights();
        };

        window.formatWeightDate = function(dateStr) {
            if(!dateStr) return '';
            return dateStr.length >= 10 ? dateStr.slice(5) : dateStr;
        };

        window.renderWeightChart = function() {
            const history = JSON.parse(localStorage.getItem('achilles_weight_history')) || [];
            const container = document.getElementById('weight-chart-container');
            if (!container) return;

            const normalized = history
                .filter(item => item && Number.isFinite(Number(item.weight)) && Number(item.weight) > 0)
                .reduce((acc, item) => {
                    acc[item.date] = { date: item.date, weight: Math.round(Number(item.weight) * 10) / 10, updatedAt: Number(item.updatedAt || 0) };
                    return acc;
                }, {});

            const chartData = Object.values(normalized)
                .sort((a, b) => String(a.date).localeCompare(String(b.date)))
                .slice(-7);

            if (chartData.length === 0) {
                container.innerHTML = '<div class="weight-chart-empty">Додай перше зважування, щоб побачити тренд.</div>';
                window.renderProgressInsights();
                return;
            }

            const minW = Math.min(...chartData.map(d => d.weight));
            const maxW = Math.max(...chartData.map(d => d.weight));
            const range = Math.max(0.8, (maxW - minW) + 0.6);
            const width = 640;
            const height = 220;
            const padX = 26;
            const padTop = 20;
            const padBottom = 34;
            const stepX = chartData.length > 1 ? (width - padX * 2) / (chartData.length - 1) : 0;

            const points = chartData.map((d, i) => {
                const x = chartData.length > 1 ? padX + i * stepX : width / 2;
                const y = padTop + ((maxW + 0.3 - d.weight) / range) * (height - padTop - padBottom);
                return { ...d, x, y };
            });

            const buildSmoothPath = (pts) => {
                if (!pts.length) return '';
                if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
                let d = `M ${pts[0].x} ${pts[0].y}`;
                for (let i = 0; i < pts.length - 1; i++) {
                    const p1 = pts[i];
                    const p2 = pts[i + 1];
                    const cx = (p1.x + p2.x) / 2;
                    d += ` Q ${cx} ${p1.y} ${p2.x} ${p2.y}`;
                }
                return d;
            };

            const linePath = buildSmoothPath(points);
            const areaPath = `${linePath} L ${points.at(-1).x} ${height - padBottom + 4} L ${points[0].x} ${height - padBottom + 4} Z`;
            const current = points.at(-1)?.weight ?? 0;
            const trend = points.length > 1 ? Math.round((points.at(-1).weight - points[0].weight) * 10) / 10 : null;
            const avg = Math.round((chartData.reduce((sum, p) => sum + p.weight, 0) / chartData.length) * 10) / 10;

            const labels = chartData.map(d => `<span>${window.formatWeightDate(d.date)}</span>`).join('');
            const markers = points.map(point => `
                <g>
                    <circle cx="${point.x}" cy="${point.y}" r="5.5" fill="var(--primary)" stroke="rgba(11,12,17,0.95)" stroke-width="3"></circle>
                    <text x="${point.x}" y="${point.y - 14}" text-anchor="middle" class="weight-svg-label">${point.weight.toFixed(1)}</text>
                </g>`).join('');

            container.innerHTML = `
                <div class="weight-chart-shell">
                    <div class="weight-chart-headline">
                        <div class="weight-chip"><span>Поточна</span><strong>${current.toFixed(1)} кг</strong></div>
                        <div class="weight-chip"><span>Зміна між записами</span><strong>${trend === null ? '—' : `${trend > 0 ? '+' : ''}${trend.toFixed(1)} кг`}</strong></div>
                        <div class="weight-chip"><span>Середня</span><strong>${avg.toFixed(1)} кг</strong></div>
                    </div>
                    <div class="weight-svg-wrap">
                        <svg viewBox="0 0 ${width} ${height}" class="weight-svg" role="img" aria-label="Графік ваги за останні 7 записів">
                            <defs>
                                <linearGradient id="weightAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stop-color="var(--primary)" stop-opacity="0.32" />
                                    <stop offset="100%" stop-color="var(--primary)" stop-opacity="0.02" />
                                </linearGradient>
                                <linearGradient id="weightLineGrad" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stop-color="var(--accent-2)" />
                                    <stop offset="100%" stop-color="var(--accent-1)" />
                                </linearGradient>
                            </defs>
                            <line x1="${padX}" y1="${height - padBottom}" x2="${width - padX}" y2="${height - padBottom}" class="weight-axis-line"></line>
                            <path d="${areaPath}" fill="url(#weightAreaGrad)"></path>
                            <path d="${linePath}" fill="none" stroke="url(#weightLineGrad)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"></path>
                            ${markers}
                        </svg>
                        <div class="weight-axis-labels">${labels}</div>
                    </div>
                </div>`;
            window.renderProgressInsights();
        };

        window.getLastNDates = function(n = 7) {
            const dates = [];
            const base = new Date(`${window.todayDate}T12:00:00`);
            for(let i = n - 1; i >= 0; i--) {
                const d = new Date(base);
                d.setDate(base.getDate() - i);
                dates.push(d.toISOString().slice(0, 10));
            }
            return dates;
        };

        window.getWeightTrend = function() {
            const history = JSON.parse(localStorage.getItem('achilles_weight_history')) || [];
            const valid = history.filter(x => Number.isFinite(Number(x?.weight)) && Number(x.weight) > 0).slice(-7);
            if(valid.length < 2) return null;
            const first = Number(valid[0].weight);
            const last = Number(valid[valid.length - 1].weight);
            return Math.round((last - first) * 10) / 10;
        };

        window.renderProgressInsights = function() {
            const avgKcalEl = document.getElementById('stat-avg-kcal');
            if(!avgKcalEl) return;

            const daysData = window.allDaysData || JSON.parse(localStorage.getItem('achilles_all_days')) || {};
            const dates = window.getLastNDates(7);
            const target = JSON.parse(localStorage.getItem('achilles_macros')) || {p:0,f:0,c:0};
            const baseKcal = Number(localStorage.getItem('achilles_base_kcal')) || 2000;
            const appMode = localStorage.getItem('achilles_app_mode') || 'pro';
            const profile = JSON.parse(localStorage.getItem('achilles_profile')) || {};

            let loggedDays = 0;
            let kcalTotal = 0;
            let proteinHit = 0;
            let calorieHit = 0;
            let workoutCount = 0;

            dates.forEach(date => {
                const d = daysData[date];
                if(!d) return;
                const hasNutrition = Number(d.consumedCalories || 0) > 0 || (d.log || []).some(e => e.type === 'food');
                if(hasNutrition) {
                    loggedDays++;
                    kcalTotal += Number(d.consumedCalories || 0);
                    const dayGoal = baseKcal + (appMode === 'pro' ? Number(d.workoutBonus || 0) : 0);
                    if(dayGoal > 0 && Math.abs(Number(d.consumedCalories || 0) - dayGoal) / dayGoal <= 0.10) calorieHit++;
                    if(Number(target.p || 0) > 0 && Number(d.macros?.p || 0) >= Number(target.p) * 0.9) proteinHit++;
                }
                workoutCount += (d.log || []).filter(e => e.type === 'workout').length;
            });

            const avgKcal = loggedDays ? Math.round(kcalTotal / loggedDays) : 0;
            const weightTrend = window.getWeightTrend();
            const proteinRate = loggedDays ? proteinHit / loggedDays : 0;
            const calorieRate = loggedDays ? calorieHit / loggedDays : 0;

            let score = 0;
            score += Math.round(Math.min(loggedDays / 7, 1) * 20);
            score += Math.round(proteinRate * 30);
            score += Math.round(calorieRate * 30);
            score += Math.round(Math.min(workoutCount / 3, 1) * 20);
            score = Math.max(0, Math.min(100, score));

            document.getElementById('stat-avg-kcal').textContent = loggedDays ? avgKcal : '—';
            document.getElementById('stat-protein-hit').textContent = loggedDays ? `${proteinHit}/${loggedDays}` : '—';
            document.getElementById('stat-workouts').textContent = String(workoutCount);
            document.getElementById('stat-weight-trend').textContent = weightTrend === null ? '—' : `${weightTrend > 0 ? '+' : ''}${weightTrend.toFixed(1)} кг`;
            document.getElementById('progress-score-badge').textContent = `${score} / 100`;

            const lastPR = JSON.parse(localStorage.getItem('achilles_last_pr'));
            const prChip = document.getElementById('last-pr-chip');
            const prText = document.getElementById('last-pr-text');
            if(lastPR && prChip && prText) {
                prChip.style.display = 'inline-flex';
                prText.textContent = `${lastPR.name}: ${lastPR.label.replace('Новий PR: ', '')}`;
            } else if(prChip) {
                prChip.style.display = 'none';
            }
        };

        window.updateGoalDisplay = function() {
            let appMode = localStorage.getItem('achilles_app_mode') || 'pro';
            const baseKcal = parseInt(localStorage.getItem('achilles_base_kcal')) || 2000;
            
            const finalGoal = appMode === 'pro' ? baseKcal + window.workoutBonus : baseKcal; 
            document.getElementById('calories-goal').textContent = finalGoal;
            
            let percent = (window.consumedCalories / finalGoal) * 100;
            if(percent > 100) percent = 100;
            
            requestAnimationFrame(() => {
                const progressEl = document.getElementById('calorie-progress');
                if(progressEl) progressEl.style.width = percent + '%';
                document.getElementById('calories-consumed').innerText = Math.round(window.consumedCalories); 
                document.getElementById('macro-p').innerText = Math.round(window.macros.p);
                document.getElementById('macro-f').innerText = Math.round(window.macros.f);
                document.getElementById('macro-c').innerText = Math.round(window.macros.c);

                const msgObj = document.getElementById('bonus-kcal-msg');
                if(window.workoutBonus > 0 && appMode === 'pro') {
                    msgObj.style.display = 'inline-block';
                    msgObj.innerText = `🔥 Тренування: +${window.workoutBonus} ккал`;
                } else { 
                    msgObj.style.display = 'none'; 
                }
            });
        };

        // V10.9 — єдиний канонічний журнал без пізніх override-патчів.
        // Видалення працює за реальним індексом у dailyLog, тому не залежить від id старих записів.
        window.__achillesRecalcDiaryTotals = function() {
            window.dailyLog = Array.isArray(window.dailyLog) ? window.dailyLog : [];
            let kcal = 0, p = 0, f = 0, c = 0, bonus = 0;

            window.dailyLog.forEach(entry => {
                if(entry?.type === 'food') {
                    kcal += Number(entry.kcal || 0);
                    p += Number(entry.p || 0);
                    f += Number(entry.f || 0);
                    c += Number(entry.c || 0);
                } else if(entry?.type === 'workout') {
                    bonus += Number(entry.burned || 0);
                }
            });

            window.consumedCalories = Math.max(0, kcal);
            window.workoutBonus = Math.max(0, bonus);
            window.macros = {
                p: Math.max(0, p),
                f: Math.max(0, f),
                c: Math.max(0, c)
            };
        };

        window.__achillesPersistDiaryV109 = function() {
            const date = window.currentViewDate || window.todayDate || new Date().toISOString().slice(0, 10);
            window.dailyLog = Array.isArray(window.dailyLog) ? window.dailyLog : [];

            if(!window.allDaysData || typeof window.allDaysData !== 'object') {
                try {
                    window.allDaysData = JSON.parse(localStorage.getItem('achilles_all_days') || '{}') || {};
                } catch(_) {
                    window.allDaysData = {};
                }
            }

            const snapshot = {
                consumedCalories: Number(window.consumedCalories || 0),
                workoutBonus: Number(window.workoutBonus || 0),
                macros: {
                    p: Number(window.macros?.p || 0),
                    f: Number(window.macros?.f || 0),
                    c: Number(window.macros?.c || 0)
                },
                log: window.dailyLog,
                updatedAt: Date.now()
            };

            window.allDaysData[date] = snapshot;
            localStorage.setItem('achilles_all_days', JSON.stringify(window.allDaysData));

            try {
                window.Achilles?.state?.setDailyLog?.([...window.dailyLog], { syncLegacy: false });
            } catch(_) {}
            try {
                window.Achilles?.state?.setNutrition?.({
                    consumedCalories: snapshot.consumedCalories,
                    workoutBonus: snapshot.workoutBonus,
                    macros: { ...snapshot.macros },
                    targets: window.targetMacros || {p:0,f:0,c:0}
                }, { syncLegacy: false });
            } catch(_) {}

            return snapshot;
        };

        window.journalExercise = function(entry) {
            if (entry?.type !== 'workout') return null;
            const model = window.Achilles?.training?.model;
            return model?.byId?.(entry.exerciseId || entry.trainingSession?.exerciseId)
                || model?.byName?.(entry.exercise) || null;
        };

        window.openJournalExerciseHistory = function(index) {
            const exercise = window.journalExercise(window.dailyLog?.[index]);
            if (exercise) window.openExerciseHistory?.(exercise.id);
        };

        window.currentJournalMode = localStorage.getItem('achilles_journal_mode') === 'workout' ? 'workout' : 'food';

        window.setJournalMode = function(mode) {
            const next = mode === 'workout' ? 'workout' : 'food';
            window.currentJournalMode = next;
            localStorage.setItem('achilles_journal_mode', next);

            document.querySelectorAll('.journal-mode-btn').forEach(button => {
                const active = button.id === `journal-mode-${next}`;
                button.classList.toggle('active', active);
                button.setAttribute('aria-selected', active ? 'true' : 'false');
            });

            document.querySelectorAll('.journal-mode-panel').forEach(panel => {
                const active = panel.dataset.journalMode === next;
                panel.classList.toggle('active', active);
                panel.hidden = !active;
            });
        };

        if (!window.__achillesJournalModeBound) {
            window.__achillesJournalModeBound = true;
            document.addEventListener('click', event => {
                const button = event.target.closest?.('[data-journal-mode-target]');
                if (!button) return;
                event.preventDefault();
                window.setJournalMode(button.dataset.journalModeTarget);
            });
        }

        window.renderDiary = function() {
            const foodList = document.getElementById('food-list');
            const workoutList = document.getElementById('workout-list');
            if(!foodList || !workoutList) return;

            window.dailyLog = Array.isArray(window.dailyLog) ? window.dailyLog : [];
            const indexed = window.dailyLog.map((entry, index) => ({ entry, index }));
            const newestFirst = (a, b) => {
                const aTime = Number(a.entry?.createdAt || a.entry?.id || 0);
                const bTime = Number(b.entry?.createdAt || b.entry?.id || 0);
                return bTime - aTime || b.index - a.index;
            };
            const foods = indexed.filter(x => x.entry?.type === 'food').sort(newestFirst);
            const workouts = indexed.filter(x => x.entry?.type === 'workout').sort(newestFirst);

            const row = ({ entry, index }) => {
                const exercise = window.journalExercise(entry);
                const copy = String(entry?.html || '')
                    .replace(/^🥗\s*/, '<i class="fa-solid fa-utensils diary-entry-icon diary-food-icon" aria-hidden="true"></i> ')
                    .replace(/^🏋️\s*/, '<i class="fa-solid fa-dumbbell diary-entry-icon diary-workout-icon" aria-hidden="true"></i> ');
                return `<div class="diary-row-v110">
                    ${exercise
                        ? `<button type="button" class="diary-entry-copy diary-history-trigger" onclick="openJournalExerciseHistory(${index})">${copy}<span class="diary-history-hint">Історія вправи <i class="fa-solid fa-chevron-right" aria-hidden="true"></i></span></button>`
                        : `<div class="diary-entry-copy">${copy}</div>`}
                    <button type="button" class="delete-btn diary-delete-v110" aria-label="Видалити запис" data-log-index="${index}"><i class="fa-solid fa-trash-can"></i></button>
                </div>`;
            };

            foodList.innerHTML = foods.length
                ? foods.map(row).join('')
                : '<div class="journal-empty">Поки що нічого. Час підкріпитися.</div>';

            workoutList.innerHTML = workouts.length
                ? workouts.map(row).join('')
                : '<div class="journal-empty">Сьогодні без тренувань.</div>';

            window.renderExerciseHistoryIndex?.();
            window.Achilles?.coachWorkflow?.syncCompletion?.();
            window.setJournalMode(window.currentJournalMode);

            const countEl = document.getElementById('journal-count');
            if(countEl) {
                const total = window.dailyLog.length;
                countEl.textContent = `${total} ${total === 1 ? 'запис' : total >= 2 && total <= 4 ? 'записи' : 'записів'}`;
            }
        };

        window.deleteLogEntryByIndex = function(rawIndex, ev, skipConfirm = false) {
            try {
                ev?.preventDefault?.();
                ev?.stopPropagation?.();
                ev?.stopImmediatePropagation?.();
            } catch(_) {}

            const now = Date.now();
            if(window.__achillesDiaryDeleteLockUntil && now < window.__achillesDiaryDeleteLockUntil) return false;

            window.dailyLog = Array.isArray(window.dailyLog) ? window.dailyLog : [];
            const index = Number(rawIndex);
            if(!Number.isInteger(index) || index < 0 || index >= window.dailyLog.length) {
                window.Achilles?.toast?.('Запис уже відсутній', 'fa-circle-info', 1400);
                return false;
            }

            if(!skipConfirm) {
                const ok = window.confirm('Видалити цей запис із журналу?');
                if(!ok) return false;
            }

            window.__achillesDiaryDeleteLockUntil = now + 450;
            const removed = window.dailyLog[index];
            window.dailyLog.splice(index, 1);
            window.__achillesRecalcDiaryTotals();

            try {
                window.__achillesPersistDiaryV109();
            } catch(error) {
                console.error('[Achilles V10.10] local save after delete failed', error);
            }

            try { window.updateGoalDisplay?.(); } catch(_) {}
            try { window.renderDiary?.(); } catch(_) {}
            try { window.renderProgressInsights?.(); } catch(_) {}
            try { window.Achilles?.haptics?.light?.(); } catch(_) {}
            window.Achilles?.toast?.('Запис видалено', 'fa-trash-can', 1500);

            setTimeout(() => {
                try {
                    const result = window.syncToCloud?.();
                    if(result?.catch) result.catch(err => console.warn('[Achilles V10.10] cloud sync after delete', err));
                } catch(_) {}
            }, 120);

            console.info('[Achilles V10.10] diary row deleted', { index, removed });
            return false;
        };

        window.deleteLogEntry = function(id) {
            window.dailyLog = Array.isArray(window.dailyLog) ? window.dailyLog : [];
            const wanted = String(id ?? '');
            const index = window.dailyLog.findIndex(entry => String(entry?.id ?? '') === wanted);
            if(index < 0) return false;
            return window.deleteLogEntryByIndex(index, null, true);
        };

        if(!window.__achillesDiaryDelegationV1010) {
            window.__achillesDiaryDelegationV1010 = true;
            document.addEventListener('click', function(event) {
                const button = event.target.closest?.('.diary-delete-v110');
                if(!button) return;
                return window.deleteLogEntryByIndex(button.dataset.logIndex, event, false);
            }, true);
        }

        window.ACHILLES_BUILD = '10.17.6';

        window.openProfileTab = function() {
            if(!localStorage.getItem('achilles_user')) return;
            const profileTab = document.querySelector('.nav-item[data-target="tab-profile"]');
            if(profileTab) profileTab.click();
        };

        window.openCustomFood = function() {
            let overlay = document.getElementById('custom-food-overlay');
            overlay.style.display = 'flex';
            setTimeout(() => { overlay.style.opacity = '1'; }, 10);
        };

        window.closeCustomFood = function() {
            let overlay = document.getElementById('custom-food-overlay');
            overlay.style.opacity = '0';
            setTimeout(() => { overlay.style.display = 'none'; }, 400);
        };

        let searchTimeout;
        let currentAbortController = null;

        window.setFoodFilter = function(filter) {
            window.currentFoodFilter = filter;
            document.getElementById('btn-food-all').classList.toggle('active', filter === 'all');
            document.getElementById('btn-food-fav').classList.toggle('active', filter === 'fav');
            
            if(filter === 'fav') {
                document.getElementById('food-search').style.display = 'none';
                clearTimeout(searchTimeout);
                document.getElementById('loading-spinner').style.display = 'none';
                window.renderFavFoods();
            } else {
                document.getElementById('food-search').style.display = 'block';
                window.onSearchInput();
            }
        };

        window.generateFoodCardHtml = function(item, index) {
            let favs = JSON.parse(localStorage.getItem('achilles_fav_foods')) || [];
            let isFav = favs.some(f => f.name === item.name);
            const itemJson = JSON.stringify(item).replace(/"/g, '&quot;');
            const uniqueId = `food-input-${index}`;
            const isApi = item.name.includes('🌍');
            
            return `
                <div class="list-item" style="${isApi ? 'border-left: 3px solid var(--primary);' : ''}">
                    <div style="display: flex; justify-content: space-between; width: 100%; align-items: flex-start; margin-bottom: 12px;">
                        <div>
                            <strong style="font-size: 18px;">${item.name}</strong><br>
                            <span style="font-size: 13px; opacity: 0.8; color: var(--text-muted);">${item.kcal} ккал | Б:${item.p} Ж:${item.f} В:${item.c} (на 100г)</span>
                        </div>
                        <i class="fa-${isFav ? 'solid' : 'regular'} fa-heart fav-btn ${isFav ? 'active' : ''}" onclick="toggleFavFood('${itemJson}', event)"></i>
                    </div>
                    <div style="display: flex; width: 100%; gap: 10px;">
                        <input type="number" inputmode="numeric" pattern="[0-9]*" id="${uniqueId}" placeholder="Вага (г)" style="margin:0; padding: 14px; flex: 1;">
                        <button class="add-btn primary-btn gradient-bg" onclick="addFood('${itemJson}', '${uniqueId}')" style="margin:0; padding: 0 25px; border-radius: 16px;">+</button>
                    </div>
                </div>`;
        };

        window.toggleFavFood = function(itemJsonStr, event) {
            const item = JSON.parse(itemJsonStr.replace(/&quot;/g, '"'));
            let favs = JSON.parse(localStorage.getItem('achilles_fav_foods')) || [];
            
            const index = favs.findIndex(f => f.name === item.name);
            let isFav = false;
            
            if (index > -1) { favs.splice(index, 1); } else { favs.push(item); isFav = true; }
            
            localStorage.setItem('achilles_fav_foods', JSON.stringify(favs));
            window.syncToCloud();

            if(event && event.target) {
                if(isFav) {
                    event.target.classList.remove('fa-regular');
                    event.target.classList.add('fa-solid', 'active');
                } else {
                    event.target.classList.remove('fa-solid', 'active');
                    event.target.classList.add('fa-regular');
                }
            }
            if(window.currentFoodFilter === 'fav') { window.renderFavFoods(); }
        };

        window.renderFavFoods = function() {
            const resultsBox = document.getElementById('food-results');
            let favs = JSON.parse(localStorage.getItem('achilles_fav_foods')) || [];
            
            if (favs.length === 0) {
                resultsBox.innerHTML = '<div class="list-item" style="color: var(--text-muted); text-align:center; padding: 20px; border: none;">Улюблених продуктів поки немає</div>';
                return;
            }
            resultsBox.innerHTML = favs.map((item, index) => window.generateFoodCardHtml(item, 'fav-' + index)).join('');
        };
        window.setFoodApiStatus = function(state, text) {
            const el = document.getElementById('food-api-status');
            if (!el) return;
            el.dataset.state = state;
            const label = el.querySelector('span:last-child');
            if (label) label.textContent = text;
        };

        window.onSearchInput = function() {
            if(window.currentFoodFilter === 'fav') return;

            clearTimeout(searchTimeout);
            const searchEl = document.getElementById('food-search');
            const query = searchEl.value.toLowerCase().trim();
            if (currentAbortController) currentAbortController.abort();

            if (query.length < 2) {
                document.getElementById('food-results').innerHTML = '';
                document.getElementById('loading-spinner').style.display = 'none';
                window.setFoodApiStatus('ready', 'Онлайн-база Open Food Facts готова');
                return;
            }

            window.renderLocalFoodSearch(query);
            searchTimeout = setTimeout(() => window.searchOnlineFood(query), 450);
        };

        window.renderLocalFoodSearch = function(query) {
            const resultsBox = document.getElementById('food-results');
            let customFoods = JSON.parse(localStorage.getItem('achilles_custom_foods')) || [];
            let allLocalDb = [...customFoods, ...window.foodDB];

            const filtered = allLocalDb.filter(i => i.name.toLowerCase().includes(query));
            resultsBox.innerHTML = filtered.map((item, index) => window.generateFoodCardHtml(item, 'loc-' + index)).join('');
        };

        window.normalizeOnlineFood = function(raw, index, source = 'OFF') {
            const p = raw?._source || raw || {};
            const nut = p.nutriments || {};
            const productName = (p.product_name_uk || p.product_name || p.product_name_en || '').trim();
            if (!productName) return null;

            const num = (v) => {
                const n = Number(v);
                return Number.isFinite(n) ? n : 0;
            };

            let kcal = num(nut['energy-kcal_100g'] ?? nut['energy-kcal']);
            if (!kcal && num(nut.energy_100g)) kcal = num(nut.energy_100g) / 4.184;

            const protein = num(nut.proteins_100g);
            const fat = num(nut.fat_100g);
            const carbs = num(nut.carbohydrates_100g);
            const fiber = num(nut.fiber_100g);

            if (kcal < 0 || kcal > 1200 || protein > 100 || fat > 100 || carbs > 100 || fiber > 100) return null;
            if (kcal === 0 && protein === 0 && fat === 0 && carbs === 0) return null;

            const brand = p.brands ? ` (${String(p.brands).split(',')[0].trim()})` : '';
            return {
                name: `🌐 ${productName}${brand}`,
                kcal: Math.round(kcal),
                p: Math.round(protein * 10) / 10,
                f: Math.round(fat * 10) / 10,
                c: Math.round(carbs * 10) / 10,
                fiber: Math.round(fiber * 10) / 10,
                source,
                barcode: p.code || ''
            };
        };

        window.fetchSearchALicious = async function(query, signal) {
            const params = new URLSearchParams();
            params.set('q', query);
            params.set('page', '1');
            params.set('page_size', '12');
            params.set('boost_phrase', 'true');
            ['uk', 'en'].forEach(lang => params.append('langs', lang));
            ['code','product_name','product_name_uk','product_name_en','brands','nutriments'].forEach(field => params.append('fields', field));

            const response = await fetch(`https://search.openfoodfacts.org/search?${params.toString()}`, {
                signal,
                headers: { 'Accept': 'application/json' },
                cache: 'no-store'
            });
            if (!response.ok) throw new Error(`Search-a-licious ${response.status}`);
            const data = await response.json();
            return Array.isArray(data.hits) ? data.hits : [];
        };

        window.fetchLegacyOFF = async function(query, signal) {
            const params = new URLSearchParams({
                search_terms: query,
                search_simple: '1',
                action: 'process',
                json: '1',
                page_size: '12',
                lc: 'uk',
                fields: 'code,product_name,product_name_uk,product_name_en,brands,nutriments'
            });
            const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?${params.toString()}`, {
                signal,
                headers: { 'Accept': 'application/json' },
                cache: 'no-store'
            });
            if (!response.ok) throw new Error(`OFF v1 ${response.status}`);
            const data = await response.json();
            return Array.isArray(data.products) ? data.products : [];
        };

        window.searchOnlineFood = async function(query) {
            const resultsBox = document.getElementById('food-results');
            const spinner = document.getElementById('loading-spinner');
            spinner.style.display = 'block';
            window.setFoodApiStatus('loading', 'Шукаю в онлайн-базі…');

            currentAbortController = new AbortController();
            const signal = currentAbortController.signal;

            try {
                let rawResults = [];
                let source = 'Open Food Facts Search';

                try {
                    rawResults = await window.fetchSearchALicious(query, signal);
                } catch (primaryErr) {
                    if (primaryErr.name === 'AbortError') throw primaryErr;
                    source = 'Open Food Facts fallback';
                    rawResults = await window.fetchLegacyOFF(query, signal);
                }

                if (signal.aborted) return;

                const seen = new Set();
                const items = rawResults
                    .map((raw, i) => window.normalizeOnlineFood(raw, i, source))
                    .filter(Boolean)
                    .filter(item => {
                        const key = `${item.barcode || ''}|${item.name.toLowerCase()}|${item.kcal}`;
                        if (seen.has(key)) return false;
                        seen.add(key);
                        return true;
                    })
                    .slice(0, 12);

                if (items.length) {
                    const apiHtml = items.map((item, i) => window.generateFoodCardHtml(item, `api-${i}`)).join('');
                    resultsBox.insertAdjacentHTML('beforeend', apiHtml);
                    window.setFoodApiStatus('online', `Онлайн-база підключена · ${items.length} результатів`);
                } else {
                    window.setFoodApiStatus('empty', 'Онлайн-база: збігів не знайдено');
                }
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.warn('Online food search unavailable:', err);
                    window.setFoodApiStatus('error', 'Онлайн-база тимчасово недоступна · локальні продукти працюють');
                }
            } finally {
                if (!signal.aborted) spinner.style.display = 'none';
            }
        };

        // Сумісність зі старими викликами
        window.searchOpenFoodFacts = window.searchOnlineFood;

        window.saveCustomFood = function() {
            let name = document.getElementById('cf-name').value.trim();
            let kcal = parseInt(document.getElementById('cf-kcal').value);
            let p = parseFloat(document.getElementById('cf-p').value) || 0;
            let f = parseFloat(document.getElementById('cf-f').value) || 0;
            let c = parseFloat(document.getElementById('cf-c').value) || 0;

            if(!name || isNaN(kcal)) { alert('Введіть назву та калорійність!'); return; }

            let customItem = { name: "🛠️ " + name, kcal, p, f, c, fiber: 0 };
            
            let customFoods = JSON.parse(localStorage.getItem('achilles_custom_foods')) || [];
            customFoods.push(customItem);
            localStorage.setItem('achilles_custom_foods', JSON.stringify(customFoods));
            
            let favs = JSON.parse(localStorage.getItem('achilles_fav_foods')) || [];
            favs.push(customItem);
            localStorage.setItem('achilles_fav_foods', JSON.stringify(favs));

            window.syncToCloud();
            window.closeCustomFood();
            
            document.getElementById('cf-name').value = ''; document.getElementById('cf-kcal').value = '';
            document.getElementById('cf-p').value = ''; document.getElementById('cf-f').value = '';
            document.getElementById('cf-c').value = '';

            window.setFoodFilter('fav');
        };

        window.addFood = function(itemJsonStr, weightId) {
            const item = JSON.parse(itemJsonStr.replace(/&quot;/g, '"'));
            let weightInput = document.getElementById(weightId).value;
            let weight = parseFloat(weightInput);
            if (!weightInput || isNaN(weight) || weight <= 0) weight = 100; 

            const ratio = weight / 100;
            const actualKcal = Math.round(item.kcal * ratio);
            const actualP = Math.round(item.p * ratio);
            const actualF = Math.round(item.f * ratio);
            const actualC = Math.round(item.c * ratio);
            
            window.consumedCalories += actualKcal;
            window.macros.p += actualP; 
            window.macros.f += actualF; 
            window.macros.c += actualC;
            
            const entry = {
                id: Date.now(),
                type: 'food',
                kcal: actualKcal,
                p: actualP, f: actualF, c: actualC,
                html: `<i class="fa-solid fa-utensils diary-entry-icon diary-food-icon" aria-hidden="true"></i> <strong style="color: var(--text-main);">${item.name} (${weight}г)</strong><br><span style="font-size: 14px; opacity: 0.8;" class="gradient-text">${actualKcal} ккал</span> <span style="font-size: 12px; opacity: 0.6; color: var(--text-main);">| Б:${actualP} Ж:${actualF} В:${actualC}</span>`
            };
            
            window.dailyLog.push(entry);
            window.saveDailyData();
            window.updateGoalDisplay();
            window.renderDiary();
            
            document.getElementById('food-search').value = ''; document.getElementById('food-results').innerHTML = '';
            if(window.currentFoodFilter === 'fav') window.renderFavFoods();
            
            window.setJournalMode('food');
            document.querySelector('.nav-item[data-target="tab-journal"]')?.click();
        };

        window.setWorkoutMode = function(mode) {
            window.currentWorkoutMode = mode;
            window.searchWorkout();
        };

        window.setWorkoutFilter = function(filter) {
            window.currentWorkoutFilter = filter;
            document.getElementById('btn-all-workouts').classList.toggle('active', filter === 'all');
            document.getElementById('btn-fav-workouts').classList.toggle('active', filter === 'fav');
            window.searchWorkout();
        };

        window.toggleFavWorkout = function(name) {
            let favs = JSON.parse(localStorage.getItem('achilles_fav_workouts')) || [];
            if (favs.includes(name)) { favs = favs.filter(n => n !== name); } else { favs.push(name); }
            localStorage.setItem('achilles_fav_workouts', JSON.stringify(favs));
            window.searchWorkout();
            window.syncToCloud();
        };

        window.searchWorkout = function() {
            const query = document.getElementById('workout-search').value.toLowerCase().trim();
            let favs = JSON.parse(localStorage.getItem('achilles_fav_workouts')) || [];
            let appMode = localStorage.getItem('achilles_app_mode') || 'pro';
            let filtered = window.workoutDB;
            
            if (window.currentWorkoutFilter === 'fav') filtered = filtered.filter(w => favs.includes(w.name));
            if (query.length > 0) filtered = filtered.filter(w => w.name.toLowerCase().includes(query) || w.desc.toLowerCase().includes(query));
            
            window.renderWorkouts(filtered);
        };

        window.workoutInputTemplate = function(w, index) {
            const base = `wx-${w.id}-${index}`;
            const addBtn = (handler) => `<button class="add-btn primary-btn gradient-bg workout-add" onclick="${handler}">+</button>`;
            const separatorBtn = (inputId) => `<button class="set-separator-btn" type="button" onpointerdown="event.preventDefault()" onclick="insertSetSeparator('${inputId}')" aria-label="Додати роздільник між підходами" title="Додати наступний підхід">;</button>`;

            if (w.kind === 'strength_weighted') {
                return `<div class="exercise-input-row exercise-set-row">
                    <input type="text" inputmode="numeric" id="${base}-reps" aria-label="Повтори за підходами" placeholder="Повтори: 12;10;8">
                    ${separatorBtn(`${base}-reps`)}
                    <input type="text" inputmode="decimal" id="${base}-weight" aria-label="Вага за підходами, кг" placeholder="Вага, кг: 12,5;10;8">
                    ${separatorBtn(`${base}-weight`)}
                    ${addBtn(`logStrengthExercise('${w.id}','${base}-reps','${base}-weight')`)}
                </div>`;
            }

            if (w.kind === 'bodyweight' || w.kind === 'bodyweight_optional') {
                const extra = w.kind === 'bodyweight_optional'
                    ? `<button class="exercise-extra-toggle" type="button" onclick="toggleExtraWeight('${base}')"><i class="fa-solid fa-plus"></i> дод. вага</button>
                       <input class="exercise-extra-weight" type="number" inputmode="decimal" step="0.5" id="${base}-weight" placeholder="Дод. вага, кг" style="display:none;">`
                    : '';
                return `<div class="exercise-input-stack">
                    <div class="exercise-input-row exercise-set-row exercise-reps-only">
                        <input type="text" inputmode="numeric" id="${base}-reps" aria-label="Повтори за підходами" placeholder="Повтори: 15;12;10">
                        ${separatorBtn(`${base}-reps`)}
                        ${addBtn(`logBodyweightExercise('${w.id}','${base}-reps','${base}-weight')`)}
                    </div>
                    ${extra}
                </div>`;
            }

            if (w.kind === 'cardio_distance') {
                return `<div class="exercise-input-row">
                    <input type="number" inputmode="numeric" id="${base}-time" placeholder="Час, хв">
                    <input type="number" inputmode="decimal" step="0.01" id="${base}-distance" placeholder="Відстань, ${w.distanceUnit || 'км'}">
                    ${addBtn(`logCardioExercise('${w.id}','${base}-time','${base}-distance')`)}
                </div>`;
            }

            if (w.kind === 'cardio_time') {
                return `<div class="exercise-input-row">
                    <input type="number" inputmode="numeric" id="${base}-time" placeholder="Час, хв">
                    ${addBtn(`logCardioExercise('${w.id}','${base}-time',null)`)}
                </div>`;
            }

            if (w.kind === 'static_time') {
                return `<div class="exercise-input-row">
                    <input type="number" inputmode="numeric" id="${base}-seconds" placeholder="Утримання, сек">
                    ${addBtn(`logStaticExercise('${w.id}','${base}-seconds')`)}
                </div>`;
            }

            return '';
        };

        window.renderWorkouts = function(db = window.workoutDB) {
            const container = document.getElementById('workout-list-container');
            let favs = JSON.parse(localStorage.getItem('achilles_fav_workouts')) || [];
            let appMode = localStorage.getItem('achilles_app_mode') || 'pro';

            if(db.length === 0) {
                container.innerHTML = '<div class="list-item" style="color: var(--text-muted); text-align:center; padding: 20px; border: none;">Нічого не знайдено</div>';
                return;
            }

            container.innerHTML = db.map((w, index) => {
                const isFav = favs.includes(w.name);
                const inputUI = window.workoutInputTemplate(w, index);
                const liveLabel = (w.kind === 'cardio_time' || w.kind === 'cardio_distance') ? '▶ Почати кардіо' : (w.kind === 'static_time' ? '▶ Почати таймер' : 'Почати з таймером');

                const actionArea = (appMode === 'pro' && window.currentWorkoutMode === 'extended')
                    ? `<div class="exercise-actions">
                         <button class="add-btn primary-btn gradient-bg live-start-btn" onclick="openLiveWorkoutById('${w.id}')">${liveLabel}</button>
                         <div class="exercise-manual-caption">або внеси вручну</div>
                         ${inputUI}
                       </div>`
                    : inputUI;

                return `<div class="list-item exercise-card" data-kind="${w.kind}" data-exercise-id="${w.id}">
                    <div class="exercise-card-head">
                        <div>
                            <h4>${w.name}</h4>
                            <p>${w.desc}</p>
                        </div>
                        <i class="fa-${isFav ? 'solid' : 'regular'} fa-heart fav-btn ${isFav ? 'active' : ''}" onclick="toggleFavWorkout('${w.name.replace(/'/g, "\'")}')"></i>
                    </div>
                    ${actionArea}
                </div>`;
            }).join('');
        };

        window.toggleExtraWeight = function(base) {
            const input = document.getElementById(`${base}-weight`);
            if (!input) return;
            const show = input.style.display === 'none' || !input.style.display;
            input.style.display = show ? 'block' : 'none';
            if (!show) input.value = '';
        };

        window.parseSetValues = function(value, integer = false) {
            const raw = String(value || '').trim();
            if (!raw) return [];
            const parts = integer ? raw.split(/[;,\s]+/) : raw.split(/[;\s]+/);
            return parts
                .map(v => Number(String(v).replace(',', '.')))
                .filter(v => Number.isFinite(v) && v >= 0)
                .map(v => integer ? Math.round(v) : v);
        };

        window.insertSetSeparator = function(inputId) {
            const input = document.getElementById(inputId);
            if (!input) return;
            const value = String(input.value || '').replace(/[;,\s]+$/, '');
            input.value = value ? `${value};` : '';
            input.focus();
            try { input.setSelectionRange(input.value.length, input.value.length); } catch (_) {}
        };

        window.evaluateStrengthPR = function(name, sets) {
            const weightedSets = (sets || []).filter(s => Number(s.weight) > 0 && Number(s.reps) > 0);
            if(weightedSets.length === 0) return { isPR: false, label: '' };

            const maxWeight = Math.max(...weightedSets.map(s => Number(s.weight)));
            const volume = Math.round(weightedSets.reduce((sum, s) => sum + Number(s.weight) * Number(s.reps), 0) * 10) / 10;
            const est1RM = Math.round(Math.max(...weightedSets.map(s => Number(s.weight) * (1 + Number(s.reps) / 30))) * 10) / 10;

            const allPRs = JSON.parse(localStorage.getItem('achilles_prs')) || {};
            const previous = allPRs[name];
            let label = '';
            let isPR = false;

            if(previous) {
                const gains = [];
                if(maxWeight > Number(previous.maxWeight || 0)) gains.push(`вага ${maxWeight} кг`);
                if(est1RM > Number(previous.est1RM || 0) + 0.05) gains.push(`e1RM ${est1RM} кг`);
                if(volume > Number(previous.volume || 0) + 0.05) gains.push(`обсяг ${volume} кг`);
                if(gains.length) { isPR = true; label = `Новий PR: ${gains.join(' · ')}`; }
            }

            allPRs[name] = {
                maxWeight: Math.max(maxWeight, Number(previous?.maxWeight || 0)),
                est1RM: Math.max(est1RM, Number(previous?.est1RM || 0)),
                volume: Math.max(volume, Number(previous?.volume || 0)),
                updatedAt: Date.now()
            };
            localStorage.setItem('achilles_prs', JSON.stringify(allPRs));
            if(isPR) localStorage.setItem('achilles_last_pr', JSON.stringify({ name, label, date: window.todayDate, updatedAt: Date.now() }));
            return { isPR, label, maxWeight, volume, est1RM };
        };

        window.logWorkoutEntry = function(name, burnedKcal, detailsHtml, metadata = {}) {
            let appMode = localStorage.getItem('achilles_app_mode') || 'pro';
            let htmlStr = `<i class="fa-solid fa-dumbbell diary-entry-icon diary-workout-icon" aria-hidden="true"></i> <strong style="color: var(--text-main);">${name}</strong><br><span style="font-size: 14px; opacity: 0.8; margin-top:5px; display:block; color: var(--text-main);">${detailsHtml}</span>`;
            if(appMode === 'pro') {
                window.workoutBonus += burnedKcal;
                htmlStr += `<span style="font-size: 15px; margin-top: 5px; display:block; color: var(--text-main);">Спалено: <strong class="gradient-text">${burnedKcal} ккал</strong></span>`;
            }
            if(metadata.pr?.isPR) htmlStr += `<span class="pr-chip"><i class="fa-solid fa-trophy"></i>${metadata.pr.label}</span>`;

            const entry = { id: Date.now(), type: 'workout', burned: appMode === 'pro' ? burnedKcal : 0, html: htmlStr, exercise: name, createdAt: Date.now(), ...metadata };
            window.dailyLog.push(entry);
            window.saveDailyData();
            window.updateGoalDisplay();
            window.renderDiary();
            window.renderProgressInsights();
            window.setJournalMode('workout');
            const journalNav = document.querySelector('.nav-item[data-target="tab-journal"]');
            if(journalNav) journalNav.click();
        };

        window.logStrengthExercise = function(id, repsId, weightId) {
            const w = window.getWorkoutById(id);
            const reps = window.parseSetValues(document.getElementById(repsId)?.value, true).filter(v => v > 0);
            const weights = window.parseSetValues(document.getElementById(weightId)?.value, false);
            if (!w || !reps.length) return alert('Введіть повторення.');
            if (!weights.length || weights.every(v => v <= 0)) return alert('Для цієї вправи введіть робочу вагу.');

            const sets = reps.map((r, i) => ({ reps: r, weight: weights[i] ?? weights.at(-1) ?? 0 }));
            const totalReps = reps.reduce((a,b) => a+b, 0);
            const burnedKcal = Math.round(totalReps * w.factor);
            const pr = window.evaluateStrengthPR(w.name, sets);
            const volume = Math.round(sets.reduce((sum,s) => sum + s.reps * s.weight, 0) * 10) / 10;
            const details = sets.map(s => `${s.reps}×${s.weight} кг`).join(' · ');
            window.logWorkoutEntry(w.name, burnedKcal, `${sets.length} підходів: ${details}`, { kind: w.kind, sets, totalReps, volume, estimated1RM: pr.est1RM || 0, pr });
            document.getElementById(repsId).value = '';
            document.getElementById(weightId).value = '';
        };

        window.logBodyweightExercise = function(id, repsId, weightId) {
            const w = window.getWorkoutById(id);
            const reps = window.parseSetValues(document.getElementById(repsId)?.value, true).filter(v => v > 0);
            if (!w || !reps.length) return alert('Введіть повторення.');
            const weight = weightId && document.getElementById(weightId) ? Number(document.getElementById(weightId).value || 0) : 0;
            const sets = reps.map(r => ({ reps: r, weight: weight > 0 ? weight : 0 }));
            const totalReps = reps.reduce((a,b) => a+b, 0);
            const burnedKcal = Math.round(totalReps * w.factor);
            const pr = weight > 0 ? window.evaluateStrengthPR(w.name, sets) : { isPR:false, label:'' };
            const details = weight > 0
                ? `${sets.length} підходів: ${reps.join(', ')} повторів · +${weight} кг`
                : `${sets.length} підходів: ${reps.join(', ')} повторів`;
            window.logWorkoutEntry(w.name, burnedKcal, details, { kind: w.kind, sets, totalReps, addedWeight: weight, pr });
            document.getElementById(repsId).value = '';
            if (weightId && document.getElementById(weightId)) document.getElementById(weightId).value = '';
        };

        window.logCardioExercise = function(id, timeId, distanceId) {
            const w = window.getWorkoutById(id);
            const minutes = Number(document.getElementById(timeId)?.value || 0);
            if (!w || minutes <= 0) return alert('Введіть тривалість у хвилинах.');
            const distance = distanceId && document.getElementById(distanceId) ? Number(document.getElementById(distanceId).value || 0) : 0;
            const burnedKcal = Math.round(minutes * w.factor);
            const distText = distance > 0 ? ` · Відстань: ${distance} ${w.distanceUnit || 'км'}` : '';
            window.logWorkoutEntry(w.name, burnedKcal, `Час: ${minutes} хв${distText}`, { kind: w.kind, duration: minutes, durationUnit: 'хв', distance, distanceUnit: w.distanceUnit || null });
            document.getElementById(timeId).value = '';
            if (distanceId && document.getElementById(distanceId)) document.getElementById(distanceId).value = '';
        };

        window.logStaticExercise = function(id, secondsId) {
            const w = window.getWorkoutById(id);
            const seconds = Number(document.getElementById(secondsId)?.value || 0);
            if (!w || seconds <= 0) return alert('Введіть час утримання у секундах.');
            const burnedKcal = Math.round((seconds / 60) * w.factor);
            window.logWorkoutEntry(w.name, burnedKcal, `Утримання: ${Math.round(seconds)} сек`, { kind: w.kind, duration: seconds, durationUnit: 'сек' });
            document.getElementById(secondsId).value = '';
        };

        // Сумісність зі старими обробниками
        window.logSimpleStrength = function(name, repsId, weightId) {
            const w = window.workoutDB.find(x => x.name === name);
            if (w) {
                if (w.kind === 'strength_weighted') return window.logStrengthExercise(w.id, repsId, weightId);
                return window.logBodyweightExercise(w.id, repsId, weightId);
            }
        };
        window.logSimpleCardio = function(name, timeId) {
            const w = window.workoutDB.find(x => x.name === name);
            if (w) return window.logCardioExercise(w.id, timeId, null);
        };



        window.configureLiveFields = function(w) {
            const container = document.getElementById('live-input-container');
            const strengthFields = document.getElementById('live-strength-fields');
            const cardioFields = document.getElementById('live-cardio-fields');
            const reps = document.getElementById('live-reps-input');
            const weight = document.getElementById('live-weight-input');
            const distance = document.getElementById('live-distance-input');
            const label = document.getElementById('live-input-label');

            [reps, weight, distance].forEach(el => { if (el) el.value = ''; });
            strengthFields.style.display = 'none';
            cardioFields.style.display = 'none';
            container.style.display = 'none';

            if (w.kind === 'strength_weighted') {
                label.textContent = 'Запиши підхід';
                strengthFields.style.display = 'grid';
                reps.style.display = 'block';
                weight.style.display = 'block';
                reps.placeholder = 'Повтори';
                weight.placeholder = 'Вага, кг';
            } else if (w.kind === 'bodyweight' || w.kind === 'bodyweight_optional') {
                label.textContent = w.kind === 'bodyweight_optional' ? 'Повтори та, за потреби, додаткова вага' : 'Повторень зроблено';
                strengthFields.style.display = 'grid';
                reps.style.display = 'block';
                weight.style.display = w.kind === 'bodyweight_optional' ? 'block' : 'none';
                reps.placeholder = 'Повтори';
                weight.placeholder = 'Дод. вага, кг';
            } else if (w.kind === 'cardio_distance') {
                label.textContent = `Відстань (${w.distanceUnit || 'км'}) — можна внести наприкінці`;
                cardioFields.style.display = 'grid';
                distance.placeholder = `Відстань, ${w.distanceUnit || 'км'}`;
                container.style.display = 'block';
            }
        };

        window.openLiveWorkoutById = function(id) {
            const w = window.getWorkoutById(id);
            if (!w) return;
            window.liveWorkout = { exercise: w, name: w.name, factor: w.factor, sets: [], timer: null, sec: 0, state: 'work', currentSet: 1 };
            const overlay = document.getElementById('live-overlay');
            overlay.style.display = 'flex';
            requestAnimationFrame(() => { overlay.style.opacity = '1'; });
            document.getElementById('live-title').innerText = w.name;
            window.configureLiveFields(w);

            const mainBtn = document.getElementById('live-main-btn');
            if (w.kind === 'cardio_time' || w.kind === 'cardio_distance') {
                document.getElementById('live-subtitle').innerText = 'Кардіо · таймер';
                mainBtn.innerHTML = 'Завершити<br>кардіо';
            } else if (w.kind === 'static_time') {
                document.getElementById('live-subtitle').innerText = 'Утримуй позицію';
                mainBtn.innerHTML = 'Завершити<br>утримання';
            } else {
                document.getElementById('live-subtitle').innerText = 'Підхід 1';
                mainBtn.innerHTML = 'Підхід<br>закінчено';
            }
            window.startLiveTimer(true);
        };

        window.openLiveWorkout = function(name) {
            const w = window.workoutDB.find(x => x.name === name);
            if (w) window.openLiveWorkoutById(w.id);
        };

        window.startLiveTimer = function(isWork) {
            clearInterval(window.liveWorkout?.timer);
            if (!window.liveWorkout) return;
            window.liveWorkout.sec = isWork ? 0 : 90;
            window.liveWorkout.state = isWork ? 'work' : 'rest';
            const timerEl = document.getElementById('live-timer');
            timerEl.classList.toggle('rest', !isWork);
            window.updateLiveTimeDisplay();
            window.liveWorkout.timer = setInterval(() => {
                if (isWork) window.liveWorkout.sec++;
                else {
                    window.liveWorkout.sec--;
                    if (window.liveWorkout.sec <= 0) clearInterval(window.liveWorkout.timer);
                }
                window.updateLiveTimeDisplay();
            }, 1000);
        };

        window.updateLiveTimeDisplay = function() {
            if (!window.liveWorkout) return;
            let m = Math.floor(Math.max(0, window.liveWorkout.sec) / 60).toString().padStart(2, '0');
            let s = (Math.max(0, window.liveWorkout.sec) % 60).toString().padStart(2, '0');
            document.getElementById('live-timer').innerText = `${m}:${s}`;
        };

        window.captureLiveSet = function() {
            const w = window.liveWorkout.exercise;
            const reps = Number(document.getElementById('live-reps-input').value || 0);
            const weight = Number(document.getElementById('live-weight-input').value || 0);
            if (reps <= 0) return false;
            if (w.kind === 'strength_weighted' && weight <= 0) {
                alert('Для цієї вправи введіть вагу.');
                return false;
            }
            window.liveWorkout.sets.push({ reps: Math.round(reps), weight: weight > 0 ? weight : 0 });
            document.getElementById('live-reps-input').value = '';
            document.getElementById('live-weight-input').value = '';
            return true;
        };

        window.toggleLiveState = function() {
            if (!window.liveWorkout) return;
            const w = window.liveWorkout.exercise;

            if (w.kind === 'cardio_time' || w.kind === 'cardio_distance' || w.kind === 'static_time') {
                return window.finishLiveWorkout();
            }

            if(window.liveWorkout.state === 'work') {
                window.liveWorkout.lastWorkSeconds = window.liveWorkout.sec;
                window.startLiveTimer(false);
                document.getElementById('live-subtitle').innerText = 'Відпочинок';
                document.getElementById('live-input-container').style.display = 'block';
                document.getElementById('live-main-btn').innerHTML = `Записати +<br>Підхід ${window.liveWorkout.currentSet + 1}`;
            } else {
                if (!window.captureLiveSet()) return;
                window.liveWorkout.currentSet++;
                window.startLiveTimer(true);
                document.getElementById('live-subtitle').innerText = `Підхід ${window.liveWorkout.currentSet}`;
                document.getElementById('live-input-container').style.display = 'none';
                document.getElementById('live-main-btn').innerHTML = 'Підхід<br>закінчено';
            }
        };

        window.closeLiveOverlay = function() {
            const overlay = document.getElementById('live-overlay');
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.style.display = 'none';
                document.getElementById('live-input-container').style.display = 'none';
                document.getElementById('live-main-btn').innerHTML = 'Підхід<br>закінчено';
            }, 320);
        };

        window.finishLiveWorkout = function() {
            if (!window.liveWorkout) return;
            const live = window.liveWorkout;
            const w = live.exercise;

            clearInterval(live.timer);

            if (w.kind === 'cardio_time' || w.kind === 'cardio_distance') {
                const totalSeconds = Math.max(1, live.sec);
                const minutes = Math.round((totalSeconds / 60) * 10) / 10;
                const distance = w.kind === 'cardio_distance' ? Number(document.getElementById('live-distance-input').value || 0) : 0;
                const burnedKcal = Math.max(1, Math.round((totalSeconds / 60) * w.factor));
                const distText = distance > 0 ? ` · Відстань: ${distance} ${w.distanceUnit || 'км'}` : '';
                window.closeLiveOverlay();
                return window.logWorkoutEntry(w.name, burnedKcal, `Час: ${minutes} хв${distText}`, { kind: w.kind, duration: totalSeconds, durationUnit: 'сек', distance, distanceUnit: w.distanceUnit || null, live: true });
            }

            if (w.kind === 'static_time') {
                const seconds = Math.max(1, live.sec);
                const burnedKcal = Math.max(1, Math.round((seconds / 60) * w.factor));
                window.closeLiveOverlay();
                return window.logWorkoutEntry(w.name, burnedKcal, `Утримання: ${seconds} сек`, { kind: w.kind, duration: seconds, durationUnit: 'сек', live: true });
            }

            if (live.state === 'rest') window.captureLiveSet();
            if (!live.sets.length) {
                window.closeLiveOverlay();
                return;
            }

            const totalReps = live.sets.reduce((sum,s) => sum + s.reps, 0);
            const burnedKcal = Math.round(totalReps * w.factor);
            const weighted = live.sets.some(s => s.weight > 0);
            const pr = weighted ? window.evaluateStrengthPR(w.name, live.sets) : { isPR:false, label:'' };
            const volume = Math.round(live.sets.reduce((sum,s) => sum + s.reps * s.weight, 0) * 10) / 10;
            const details = live.sets.map(s => s.weight > 0 ? `${s.reps}×${s.weight} кг` : `${s.reps} разів`).join(' · ');
            window.closeLiveOverlay();
            window.logWorkoutEntry(w.name, burnedKcal, `${live.sets.length} підходів: ${details}`, { kind: w.kind, sets: live.sets, totalReps, volume, estimated1RM: pr.est1RM || 0, pr, live: true });
        };

        window.cancelLiveWorkout = function() {
            if (window.liveWorkout?.timer) clearInterval(window.liveWorkout.timer);
            window.closeLiveOverlay();
        };

        window.logout = function() {
            window.stopCloudRealtimeSync?.();
            localStorage.clear();
            location.reload();
        };
    
