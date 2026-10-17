/* =========================================================================
   MMIT Portfolio Hub — Application Logic
   Utilities, render, filter/search, modal, drawer, feedback, theme
   ข้อมูลทั้งหมดอ่านจากตัวแปร global ใน data.js
   ========================================================================= */

        // =========================================================================
        // UTILITIES
        // =========================================================================

        // ป้องกัน XSS: ข้อมูลที่ผู้ใช้กรอก (ชื่อ/ความคิดเห็น) ต้อง escape ก่อนใส่ innerHTML เสมอ
        function escapeHtml(value) {
            return String(value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        // localStorage จะ throw ได้ใน file:// บางสภาพแวดล้อม และใน Private Mode บางบราวเซอร์
        const safeStorage = {
            get(key) {
                try { return localStorage.getItem(key); } catch (e) { return null; }
            },
            set(key, value) {
                try { localStorage.setItem(key, value); } catch (e) { /* ไม่มี persistence ก็ยังใช้งานต่อได้ */ }
            }
        };

        // แปลง timestamp เป็นข้อความเวลาย้อนหลังแบบไทย
        function timeAgo(timestamp) {
            const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
            if (seconds < 60) return 'เมื่อสักครู่นี้';
            const minutes = Math.floor(seconds / 60);
            if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
            const hours = Math.floor(minutes / 60);
            if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
            const days = Math.floor(hours / 24);
            return `${days} วันที่แล้ว`;
        }

        // ดึง element แบบ fail-safe กันหน้าพังถ้ามี ID หายไป
        function $(id) {
            return document.getElementById(id);
        }


        // =========================================================================
        // INITIALIZATION
        // =========================================================================
        window.onload = async function () {
            // ธีม + UI พื้นฐาน แสดงทันที ไม่ต้องรอ database
            applySavedTheme();
            renderCategoryFilters();
            initStarRating();
            setDrawer(false);
            document.addEventListener('keydown', handleGlobalKeydown);

            setLoadingState(true);

            try {
                const mode = await Store.init();
                setBackendBanner(mode);

                const stats = await Store.getProjectStats();
                projectsData.forEach(p => Object.assign(p, stats[p.id] || { likes: 0, rating: 0, ratingCount: 0, userLiked: false }));

                userFeedbacks = await Store.fetchFeedback();
                syncRatingsFromFeedback();

                renderProjectSelectOptions();
                renderProjects();
                renderAnalyticsDrawerData();
                updateHeaderMetrics();

                // ฟีดแบ็กอัปเดตเองเมื่อมีคนส่งใหม่ (Firestore realtime)
                Store.subscribeFeedback(list => {
                    userFeedbacks = list;
                    syncRatingsFromFeedback();
                    renderProjects();
                    renderAnalyticsDrawerData();
                    updateHeaderMetrics();
                });
            } catch (err) {
                console.error('[MMIT] โหลดข้อมูลล้มเหลว:', err);
                // ยังคง render หน้าให้ใช้งานได้ แค่ไม่มีตัวเลข
                projectsData.forEach(p => Object.assign(p, { likes: 0, rating: 0, ratingCount: 0, userLiked: false }));
                renderProjectSelectOptions();
                renderProjects();
                renderAnalyticsDrawerData();
                updateHeaderMetrics();
                showLoadError();
            } finally {
                setLoadingState(false);
            }
        };

        function applySavedTheme() {
            if (safeStorage.get('mmit_theme') === 'light') {
                document.documentElement.classList.remove('dark');
            } else {
                document.documentElement.classList.add('dark');
            }
        }

        // แถบสถานะ backend — บอกตรงๆ ว่าตอนนี้ข้อมูลมาจากไหน
        function setBackendBanner(mode) {
            const el = $('backendBanner');
            if (!el) return;
            if (mode === 'firestore') {
                el.className = 'hidden';
                return;
            }
            el.className = '';
            $('backendBannerText').innerHTML =
                '<i class="fa-solid fa-flask mr-2"></i>' +
                '<strong>Local Demo Mode</strong> — ยังไม่ได้ตั้งค่า Firebase ข้อมูลจึงเก็บอยู่ใน browser เครื่องนี้เท่านั้น ' +
                'ตัวเลขที่เห็นเป็นของจริงในเครื่องคุณ แต่ยังไม่แชร์ให้คนอื่นเห็น ' +
                '<a href="SETUP.md" class="underline font-semibold">ดูวิธีตั้งค่า</a>';
        }

        function setLoadingState(loading) {
            document.body.setAttribute('aria-busy', String(loading));
            ['projectsContainer'].forEach(id => { const e = $(id); if (e) e.style.opacity = loading ? '0.45' : ''; });
        }

        function showLoadError() {
            const el = $('backendBanner');
            if (!el) return;
            el.className = '';
            $('backendBannerText').innerHTML =
                '<i class="fa-solid fa-triangle-exclamation mr-2"></i>' +
                '<strong>เชื่อมต่อฐานข้อมูลไม่สำเร็จ</strong> — แสดงรายการผลงานแบบอ่านอย่างเดียว ปุ่มโหวตและฟอร์มฟีดแบ็กอาจใช้ไม่ได้';
        }

        // ค่าเริ่มต้นของตัวเลข จนกว่าจะโหลดจาก database สำเร็จ
        function statOf(p) {
            return {
                likes: Number(p.likes) || 0,
                rating: Number(p.rating) || 0,
                ratingCount: Number(p.ratingCount) || 0,
                userLiked: Boolean(p.userLiked)
            };
        }

        // แสดง "—" เมื่อยังไม่มีคนโหวตจริงเลย (ไม่ปลอมตัวเลข)
        function ratingLabel(p) {
            return statOf(p).ratingCount > 0 ? statOf(p).rating.toFixed(1) : '—';
        }

        // คำนวณคะแนนของแต่ละโปรเจกต์จากฟีดแบ็กที่โหลดมาล่าสุด
        // เพื่อให้ตัวเลขเด้งทันทีที่มีคนส่งฟีดแบ็กใหม่ ไม่ต้องรอ reload
        function syncRatingsFromFeedback() {
            projectsData.forEach(p => {
                const rs = userFeedbacks.filter(f => f.projectId === p.id).map(f => f.rating);
                p.ratingCount = rs.length;
                p.rating = rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : 0;
            });
        }

        // =========================================================================
        // RENDER FUNCTIONS
        // =========================================================================

        function renderCategoryFilters() {
            const container = document.getElementById('categoryFilterContainer');
            container.innerHTML = categories.map(cat => `
                <button onclick="setCategory('${cat.id}')" 
                    class="px-4 py-2 rounded-xl flex items-center gap-2 whitespace-nowrap transition-all duration-200 ${
                        currentCategory === cat.id 
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 font-semibold' 
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }">
                    <i class="fa-solid ${cat.icon} text-xs"></i>
                    <span>${cat.label}</span>
                </button>
            `).join('');
        }

        function renderProjectSelectOptions() {
            const select = document.getElementById('feedbackProjectSelect');
            // เก็บ id ไว้ใน value เพื่อให้บันทึกลง Firestore ได้ตรง key (title อาจซ้ำกันได้)
            select.innerHTML = projectsData.map(p => `
                <option value="${p.id}">${escapeHtml(p.title)} (${escapeHtml(p.categoryLabel)})</option>
            `).join('');
        }

        function renderProjects() {
            const container = document.getElementById('projectsContainer');
            const emptyState = document.getElementById('emptyState');

            // Filter Projects — ค้นครอบคลุมชื่อ, tagline, ทีม, โจทย์ปัญหา และเทคโนโลยี
            const query = currentSearchQuery.trim().toLowerCase();
            const filtered = projectsData.filter(p => {
                const matchCategory = currentCategory === 'all' || p.category === currentCategory;
                const haystack = [
                    p.title, p.tagline, p.team, p.problem, p.categoryLabel, p.persona.name,
                    ...p.techStack
                ].join(' ').toLowerCase();
                const matchSearch = query === '' || haystack.includes(query);
                return matchCategory && matchSearch;
            });

            if (filtered.length === 0) {
                container.innerHTML = '';
                emptyState.classList.remove('hidden');
                return;
            } else {
                emptyState.classList.add('hidden');
            }

            // Adjust grid layout classes according to view mode
            if (currentViewMode === 'grid') {
                container.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-all duration-300";
            } else {
                container.className = "flex flex-col gap-4 transition-all duration-300";
            }

            container.innerHTML = filtered.map(project => {
                if (currentViewMode === 'grid') {
                    return `
                        <div class="glass-card rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800/80 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col group">
                            <!-- Thumbnail & Badges -->
                            <div class="relative h-48 overflow-hidden bg-slate-800 cursor-pointer" onclick="openModal('${project.id}')">
                                <img src="${project.thumbnail}" alt="${project.title}" loading="lazy" decoding="async" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
                                <div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-60"></div>
                                
                                <span class="absolute top-3 left-3 px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-900/80 backdrop-blur-md text-white border border-white/10">
                                    <i class="fa-solid fa-tag text-indigo-400 mr-1"></i> ${project.categoryLabel}
                                </span>

                                <div class="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white/90">
                                    <span class="flex items-center gap-1" title="${statOf(project).ratingCount} คะแนนจากผู้ใช้จริง">
                                        <i class="fa-solid fa-star text-amber-400"></i>
                                        ${ratingLabel(project)}
                                        <span class="text-white/50">(${statOf(project).ratingCount})</span>
                                    </span>
                                    <span class="font-light text-[11px]">${project.team}</span>
                                </div>
                            </div>

                            <!-- Content Body -->
                            <div class="p-5 flex-grow flex flex-col justify-between space-y-4">
                                <div>
                                    <h3 onclick="openModal('${project.id}')" class="font-bold text-lg text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition cursor-pointer line-clamp-1 mb-1">
                                        ${project.title}
                                    </h3>
                                    <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 font-light leading-relaxed">
                                        ${project.tagline}
                                    </p>
                                </div>

                                <!-- Tech Stack Chips -->
                                <div class="flex flex-wrap gap-1.5">
                                    ${project.techStack.map(tech => `
                                        <span class="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60">
                                            ${tech}
                                        </span>
                                    `).join('')}
                                </div>

                                <!-- Card Footer Actions -->
                                <div class="pt-3 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-xs">
                                    <button onclick="toggleLike('${project.id}')" aria-pressed="${statOf(project).userLiked}" aria-label="โหวตชื่นชอบ ${escapeHtml(project.title)}" class="flex items-center gap-1.5 text-slate-500 hover:text-rose-500 transition active:scale-90">
                                        <i class="${statOf(project).userLiked ? 'fa-solid' : 'fa-regular'} fa-heart text-rose-500"></i>
                                        <span>${statOf(project).likes}</span>
                                    </button>

                                    <button onclick="openModal('${project.id}')" class="flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                                        <span>ดู UX Case Study</span>
                                        <i class="fa-solid fa-arrow-right text-[10px]"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    // List View Item
                    return `
                        <div class="glass-card rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800/80 hover:shadow-lg transition-all flex flex-col sm:flex-row gap-4 items-center justify-between group">
                            <div class="flex items-center gap-4 w-full sm:w-auto">
                                <img src="${project.thumbnail}" alt="${project.title}" loading="lazy" decoding="async" class="w-20 h-20 rounded-xl object-cover flex-shrink-0 cursor-pointer" onclick="openModal('${project.id}')">
                                <div>
                                    <div class="flex items-center gap-2 mb-1">
                                        <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                                            ${project.categoryLabel}
                                        </span>
                                        <span class="text-xs text-slate-400 whitespace-nowrap"><i class="fa-solid fa-star text-amber-400 text-[10px]"></i> ${ratingLabel(project)} <span class="opacity-60">(${statOf(project).ratingCount})</span></span>
                                    </div>
                                    <h3 onclick="openModal('${project.id}')" class="font-bold text-base text-slate-900 dark:text-slate-100 hover:text-indigo-600 cursor-pointer">
                                        ${project.title}
                                    </h3>
                                    <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 max-w-lg font-light">
                                        ${project.tagline}
                                    </p>
                                </div>
                            </div>

                            <div class="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200 dark:border-slate-800">
                                <button onclick="toggleLike('${project.id}')" aria-pressed="${statOf(project).userLiked}" aria-label="โหวตชื่นชอบ ${escapeHtml(project.title)}" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                                    <i class="${statOf(project).userLiked ? 'fa-solid' : 'fa-regular'} fa-heart text-rose-500"></i>
                                    <span>${statOf(project).likes}</span>
                                </button>
                                <button onclick="openModal('${project.id}')" class="px-4 py-2 rounded-xl text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 transition">
                                    อ่าน Case Study
                                </button>
                            </div>
                        </div>
                    `;
                }
            }).join('');
        }

        function renderAnalyticsDrawerData() {
            // Category votes breakdown — นับจากไลค์จริงที่โหลดมาจากฐานข้อมูล
            const breakdownContainer = document.getElementById('analyticsCategoryBreakdown');
            const counts = {};
            projectsData.forEach(p => {
                counts[p.categoryLabel] = (counts[p.categoryLabel] || 0) + statOf(p).likes;
            });

            const totalLikes = Object.values(counts).reduce((a, b) => a + b, 0);

            if (totalLikes === 0) {
                breakdownContainer.innerHTML = `
                    <p class="text-xs text-slate-400 italic p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50">
                        ยังไม่มีโหวต — เป็นคนแรกที่กดหัวใจให้ผลงานที่ชอบได้เลย
                    </p>`;
            } else {
                breakdownContainer.innerHTML = Object.entries(counts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([label, likes]) => {
                        const pct = Math.round((likes / totalLikes) * 100);
                        return `
                    <div>
                        <div class="flex justify-between text-xs mb-1">
                            <span class="text-slate-600 dark:text-slate-400">${label}</span>
                            <span class="font-semibold">${likes} โหวต (${pct}%)</span>
                        </div>
                        <div class="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div class="h-full bg-indigo-500 rounded-full transition-all duration-500" style="width: ${pct}%"></div>
                        </div>
                    </div>
                `;
                    }).join('');
            }

            // Recent Feedbacks — escape ข้อมูลที่ผู้ใช้กรอกทุกครั้งเพื่อป้องกัน XSS
            const feedbackContainer = document.getElementById('recentFeedbacksList');
            if (userFeedbacks.length === 0) {
                feedbackContainer.innerHTML = `
                    <p class="text-xs text-slate-400 italic p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50">
                        ยังไม่มีฟีดแบ็ก — เป็นคนแรกที่ร่วมประเมิน UX ได้เลย
                    </p>`;
            } else {
                feedbackContainer.innerHTML = userFeedbacks.map(f => `
                    <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50 text-xs space-y-1">
                        <div class="flex items-center justify-between font-medium gap-2">
                            <span class="text-indigo-600 dark:text-indigo-400 break-words">${escapeHtml(f.author)}</span>
                            <div class="text-amber-400 whitespace-nowrap" role="img" aria-label="ให้คะแนน ${f.rating} จาก 5 ดาว">
                                ${'★'.repeat(f.rating)}${'☆'.repeat(5 - f.rating)}
                            </div>
                        </div>
                        <p class="text-slate-700 dark:text-slate-300 font-light break-words">"${escapeHtml(f.comment)}"</p>
                        <div class="flex justify-between text-[10px] text-slate-400 pt-1 gap-2">
                            <span class="truncate">อ้างอิง: ${escapeHtml(f.projectTitle)}</span>
                            <span class="whitespace-nowrap">${timeAgo(f.createdAt)}</span>
                        </div>
                    </div>
                `).join('');
            }

            // Drawer stats — คำนวณจากฟีดแบ็กจริงล้วน
            const total = userFeedbacks.length;
            const avgScore = total ? userFeedbacks.reduce((a, b) => a + b.rating, 0) / total : 0;
            document.getElementById('drawerAvgScore').innerText = total ? avgScore.toFixed(1) : '—';
            document.getElementById('drawerTotalReviews').innerText = total;
            document.getElementById('voteCountBadge').innerText = total;
        }

        function updateHeaderMetrics() {
            const totalLikes = projectsData.reduce((acc, p) => acc + statOf(p).likes, 0);

            // คะแนนเฉลี่ยคำนวณจากฟีดแบ็กจริงล้วน — ยังไม่มีใครโหวตเลย แสดง "—" ไม่ใช่ตัวเลขปลอม
            const rated = projectsData.filter(p => statOf(p).ratingCount > 0);
            const avgRating = rated.reduce((acc, p) => acc + statOf(p).rating * statOf(p).ratingCount, 0) /
                              rated.reduce((acc, p) => acc + statOf(p).ratingCount, 0);

            document.getElementById('statProjects').innerText = projectsData.length;
            document.getElementById('statCategories').innerText = new Set(projectsData.map(p => p.category)).size;
            document.getElementById('statAvgRating').innerText = rated.length ? avgRating.toFixed(1) : '—';
            document.getElementById('statTotalVotes').innerText = totalLikes;
        }

        // =========================================================================
        // FILTER & SEARCH HANDLERS
        // =========================================================================

        function setCategory(catId) {
            currentCategory = catId;
            renderCategoryFilters();
            renderProjects();
        }

        function handleSearch() {
            currentSearchQuery = document.getElementById('searchInput').value;
            renderProjects();
        }

        function setViewMode(mode) {
            currentViewMode = mode;
            const gridBtn = document.getElementById('viewGridBtn');
            const listBtn = document.getElementById('viewListBtn');

            if (mode === 'grid') {
                gridBtn.className = "p-2 rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 shadow-sm transition";
                listBtn.className = "p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition";
            } else {
                listBtn.className = "p-2 rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 shadow-sm transition";
                gridBtn.className = "p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition";
            }
            renderProjects();
        }

        function resetFilters() {
            currentCategory = 'all';
            currentSearchQuery = '';
            document.getElementById('searchInput').value = '';
            renderCategoryFilters();
            renderProjects();
        }

        // =========================================================================
        // KEYBOARD HANDLING: Esc ปิด / Focus Trap ใน Modal
        // =========================================================================

        function handleGlobalKeydown(e) {
            const modal = document.getElementById('caseStudyModal');
            const modalOpen = !modal.classList.contains('hidden');

            if (e.key === 'Escape') {
                if (modalOpen) {
                    closeModal();
                } else if (isDrawerOpen) {
                    setDrawer(false);
                    document.getElementById('drawerCloseBtn').focus();
                }
                return;
            }

            // กักโฟกัสไว้ใน modal ขณะเปิดอยู่
            if (e.key === 'Tab' && modalOpen) {
                trapFocus(e, modal);
            }
        }

        function trapFocus(e, container) {
            const focusables = Array.from(
                container.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')
            ).filter(el => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement);

            if (focusables.length === 0) return;

            const first = focusables[0];
            const last = focusables[focusables.length - 1];

            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }

        // =========================================================================
        // LIKE & INTERACTION LOGIC
        // =========================================================================

        // กดโหวต — เขียนลงฐานข้อมูลจริง 1 คน 1 โหวตต่อโปรเจกต์
        async function toggleLike(projId) {
            const proj = projectsData.find(p => p.id === projId);
            if (!proj) return;

            const btn = document.activeElement;
            if (btn && typeof btn.disabled !== 'undefined') btn.disabled = true;

            // optimistic update ก่อน ให้ UI ตอบสนองทันที
            const before = statOf(proj);
            applyOptimistic(proj, { likes: Math.max(0, before.likes + (before.userLiked ? -1 : 1)), userLiked: !before.userLiked });
            refreshAll(projId);

            try {
                const result = await Store.toggleLike(projId);
                applyOptimistic(proj, result);
                refreshAll(projId);

                if (result.userLiked) {
                    triggerConfetti();
                    showToast(`ขอบคุณสำหรับโหวตใจให้ "${proj.title}"!`);
                }
            } catch (err) {
                console.error('[MMIT] โหวตไม่สำเร็จ:', err);
                applyOptimistic(proj, before);   // rollback
                refreshAll(projId);
                showToast('บันทึกโหวตไม่สำเร็จ — กรุณาลองใหม่อีกครั้ง');
            } finally {
                if (btn && typeof btn.disabled !== 'undefined') btn.disabled = false;
            }
        }

        function applyOptimistic(proj, patch) {
            proj.likes = patch.likes;
            proj.userLiked = patch.userLiked;
        }

        function refreshAll(projId) {
            renderProjects();
            renderAnalyticsDrawerData();
            updateHeaderMetrics();
            if (activeModalProject && activeModalProject.id === projId) {
                updateModalLikeState();
            }
        }

        // =========================================================================
        // MODAL UX CASE STUDY LOGIC
        // =========================================================================

        function openModal(projId) {
            const proj = projectsData.find(p => p.id === projId);
            if (!proj) return;

            activeModalProject = proj;

            // Populate Modal Fields
            document.getElementById('modalCategoryBadge').innerText = proj.categoryLabel;
            document.getElementById('modalTeam').innerText = proj.team;
            document.getElementById('modalTitle').innerText = proj.title;
            document.getElementById('modalTagline').innerText = proj.tagline;
            document.getElementById('modalCoverImg').src = proj.thumbnail;
            document.getElementById('modalYear').innerText = `MMIT Portfolio ${proj.year}`;
            
            document.getElementById('modalTechStack').innerHTML = proj.techStack.map(t => 
                `<span class="text-[10px] px-2 py-0.5 rounded bg-slate-900/80 border border-white/20">${t}</span>`
            ).join('');

            // Overview & Problem Tab
            document.getElementById('modalProblem').innerText = proj.problem;
            document.getElementById('modalSolution').innerText = proj.solution;
            document.getElementById('modalKeyFeatures').innerHTML = proj.keyFeatures.map(f => 
                `<li class="flex items-start gap-2 text-slate-600 dark:text-slate-300"><i class="fa-solid fa-check text-emerald-500 mt-1"></i> <span>${f}</span></li>`
            ).join('');

            // Persona Tab
            document.getElementById('modalPersonaAvatar').innerText = proj.persona.avatar;
            document.getElementById('modalPersonaName').innerText = proj.persona.name;
            document.getElementById('modalPersonaRole').innerText = proj.persona.role;
            document.getElementById('modalPersonaQuote').innerText = `"${proj.persona.quote}"`;
            document.getElementById('modalPersonaDetails').innerText = proj.persona.details;

            document.getElementById('modalUserFlowSteps').innerHTML = proj.userFlow.map((step, idx) => `
                <div class="flex items-center gap-1.5">
                    <span class="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-semibold">${idx + 1}. ${step}</span>
                    ${idx < proj.userFlow.length - 1 ? '<i class="fa-solid fa-chevron-right text-slate-400"></i>' : ''}
                </div>
            `).join('');

            // Before / After Tab
            document.getElementById('modalBeforePoints').innerHTML = proj.beforeUX.map(pt => 
                `<li class="flex items-start gap-2"><i class="fa-solid fa-xmark text-rose-500 mt-0.5"></i><span>${pt}</span></li>`
            ).join('');
            document.getElementById('modalAfterPoints').innerHTML = proj.afterUX.map(pt => 
                `<li class="flex items-start gap-2"><i class="fa-solid fa-wand-magic-sparkles text-emerald-500 mt-0.5"></i><span>${pt}</span></li>`
            ).join('');

            updateModalLikeState();
            switchModalTab('overview');

            // จำตำแหน่งโฟกัสไว้คืนหลังปิด + ย้ายโฟกัสเข้ามาใน modal
            lastFocusedElement = document.activeElement;
            const modal = document.getElementById('caseStudyModal');
            modal.classList.remove('hidden');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            document.getElementById('modalCloseBtn').focus();
        }

        function closeModal() {
            const modal = document.getElementById('caseStudyModal');
            if (modal.classList.contains('hidden')) return;

            modal.classList.add('hidden');
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
            activeModalProject = null;

            if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
                lastFocusedElement.focus();
            }
            lastFocusedElement = null;
        }

        function switchModalTab(tabName) {
            const tabs = ['overview', 'persona', 'comparison'];
            // ถ้าได้ tab ที่ไม่รู้จัก ให้ถือว่าเป็น overview เพื่อไม่ให้เนื้อหาว่างเปล่า
            const active = tabs.includes(tabName) ? tabName : 'overview';

            tabs.forEach(t => {
                const isActive = t === active;
                const btn = document.getElementById(`tab${t.charAt(0).toUpperCase() + t.slice(1)}`);
                const content = document.getElementById(`modalTabContent${t.charAt(0).toUpperCase() + t.slice(1)}`);

                if (!btn || !content) return;

                if (isActive) {
                    btn.className = "pb-3 border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold";
                    btn.setAttribute('aria-selected', 'true');
                    content.classList.remove('hidden');
                } else {
                    btn.className = "pb-3 border-b-2 border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200";
                    btn.setAttribute('aria-selected', 'false');
                    content.classList.add('hidden');
                }
            });
        }

        function updateModalLikeState() {
            if (!activeModalProject) return;
            const s = statOf(activeModalProject);
            document.getElementById('modalLikeCount').innerText = s.likes;
            const icon = document.getElementById('modalLikeIcon');
            icon.className = s.userLiked ? "fa-solid fa-heart text-rose-500" : "fa-regular fa-heart text-rose-500";
            document.getElementById('modalLikeBtn').setAttribute('aria-pressed', String(s.userLiked));

            const ratingEl = document.getElementById('modalRatingBadge');
            if (ratingEl) {
                ratingEl.innerHTML = s.ratingCount > 0
                    ? `<i class="fa-solid fa-star text-amber-400"></i> ${s.rating.toFixed(1)} <span class="opacity-60">(${s.ratingCount} คะแนน)</span>`
                    : `<span class="opacity-70">ยังไม่มีคะแนน</span>`;
            }
        }

        function toggleModalLike() {
            if (activeModalProject) {
                toggleLike(activeModalProject.id);
            }
        }

        // =========================================================================
        // FEEDBACK FORM & STAR RATING LOGIC
        // =========================================================================

        function initStarRating() {
            const container = document.getElementById('starRatingGroup');
            container.innerHTML = '';
            for (let i = 1; i <= 5; i++) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = `text-2xl transition-colors focus:outline-none ${i <= DEFAULT_RATING ? 'text-amber-400' : 'text-slate-300 dark:text-slate-700'}`;
                btn.innerHTML = `<i class="fa-solid fa-star"></i>`;
                btn.setAttribute('aria-label', `ให้คะแนน ${i} ดาว`);
                btn.setAttribute('aria-pressed', String(i <= DEFAULT_RATING));
                btn.onclick = () => setRating(i);
                container.appendChild(btn);
            }
        }

        function setRating(score) {
            document.getElementById('ratingInput').value = score;
            const btns = document.getElementById('starRatingGroup').children;
            for (let i = 0; i < btns.length; i++) {
                const active = i < score;
                btns[i].className = `text-2xl transition-colors focus:outline-none ${active ? 'text-amber-400' : 'text-slate-300 dark:text-slate-700'}`;
                btns[i].setAttribute('aria-pressed', String(active));
            }
        }

        async function handleFeedbackSubmit(e) {
            if (e && typeof e.preventDefault === 'function') e.preventDefault();

            // ดึงปุ่มจาก form ตรงๆ (ไม่พึ่ง e.target) กันพังเมื่อถูกเรียกจากที่อื่น
            const form = document.getElementById('uxFeedbackForm');
            const btn = form ? form.querySelector('button[type="submit"]') : null;
            const projectId = document.getElementById('feedbackProjectSelect').value;
            const proj = projectsData.find(p => p.id === projectId);
            const author = document.getElementById('feedbackAuthor').value.trim();
            const comment = document.getElementById('feedbackComment').value.trim();
            const rating = parseInt(document.getElementById('ratingInput').value, 10) || DEFAULT_RATING;

            if (!proj || !author || !comment) return;

            if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; }

            try {
                const saved = await Store.submitFeedback({
                    projectId: proj.id,
                    projectTitle: proj.title,
                    author: author,
                    rating: rating,
                    comment: comment
                });

                // ใส่รายการใหม่ด้วยมือก่อน listener เด้งมา (local mode ไม่มี listener)
                userFeedbacks = [saved].concat(userFeedbacks.filter(f => f.id !== saved.id));
                syncRatingsFromFeedback();
                renderProjects();
                renderAnalyticsDrawerData();
                updateHeaderMetrics();
                if (activeModalProject) updateModalLikeState();

                triggerConfetti();
                showToast('บันทึกฟีดแบ็กของคุณเรียบร้อยแล้ว — ขอบคุณที่ช่วยพัฒนางาน MMIT');

                document.getElementById('uxFeedbackForm').reset();
                setRating(DEFAULT_RATING);
            } catch (err) {
                console.error('[MMIT] ส่งฟีดแบ็กไม่สำเร็จ:', err);
                showToast('ส่งฟีดแบ็กไม่สำเร็จ — กรุณาลองใหม่อีกครั้ง');
            } finally {
                if (btn) { btn.disabled = false; btn.style.opacity = ''; }
            }
        }

        // =========================================================================
        // DRAWER & THEME UTILITIES
        // =========================================================================

        // เปิด/ปิด Analytics Drawer แบบมี state ชัดเจน — ใช้ inert เพื่อกันโฟกัสหลุดเข้าไปตอนปิดอยู่
        function setDrawer(open) {
            isDrawerOpen = open;

            const drawer = document.getElementById('analyticsDrawer');
            const backdrop = document.getElementById('drawerBackdrop');

            drawer.classList.toggle('translate-x-full', !open);
            drawer.setAttribute('aria-hidden', String(!open));
            if (open) {
                drawer.removeAttribute('inert');
            } else {
                drawer.setAttribute('inert', '');
            }

            backdrop.classList.toggle('opacity-0', !open);
            backdrop.classList.toggle('pointer-events-none', !open);
        }

        function toggleAnalyticsDrawer() {
            setDrawer(!isDrawerOpen);
            if (isDrawerOpen) {
                document.getElementById('drawerCloseBtn').focus();
            }
        }

        function toggleTheme() {
            const html = document.documentElement;
            if (html.classList.contains('dark')) {
                html.classList.remove('dark');
                safeStorage.set('mmit_theme', 'light');
            } else {
                html.classList.add('dark');
                safeStorage.set('mmit_theme', 'dark');
            }
        }

        function scrollToFeedback() {
            document.getElementById('feedbackSection').scrollIntoView({ behavior: 'smooth' });
        }

        function showToast(msg) {
            const toast = document.getElementById('toastNotification');
            document.getElementById('toastMessage').innerText = msg;
            toast.classList.remove('hidden');
            setTimeout(() => {
                toast.classList.add('hidden');
            }, 3500);
        }

        function triggerConfetti() {
            if (typeof confetti === 'function') {
                confetti({
                    particleCount: 50,
                    spread: 60,
                    origin: { y: 0.8 }
                });
            }
        }
