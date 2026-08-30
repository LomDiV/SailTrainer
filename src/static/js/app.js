/**
 * Sail Training - Main Application Controller
 * Manages UI rendering, interactions, keyboard shortcuts, exam timers, and modals.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // DOM Elements
    const elements = {
        catalogSelect: document.getElementById('catalogSelect'),
        sectionSelect: document.getElementById('sectionSelect'),
        modeTabs: document.querySelectorAll('.mode-tab'),
        btnShuffleQueue: document.getElementById('btnShuffleQueue'),
        btnAudioToggle: document.getElementById('btnAudioToggle'),
        audioIcon: document.getElementById('audioIcon'),
        btnThemeToggle: document.getElementById('btnThemeToggle'),
        themeIcon: document.getElementById('themeIcon'),
        btnStatsModal: document.getElementById('btnStatsModal'),
        btnSettingsModal: document.getElementById('btnSettingsModal'),

        // Stats summary
        statMastered: document.getElementById('statMastered'),
        statInProgress: document.getElementById('statInProgress'),
        statMistakes: document.getElementById('statMistakes'),
        statAccuracy: document.getElementById('statAccuracy'),
        badgeTrainingCount: document.getElementById('badgeTrainingCount'),
        badgeMistakesCount: document.getElementById('badgeMistakesCount'),
        badgeAllCount: document.getElementById('badgeAllCount'),
        badgeBookmarkedCount: document.getElementById('badgeBookmarkedCount'),

        // Exam HUD
        examHud: document.getElementById('examHud'),
        examTimer: document.getElementById('examTimer'),
        examCurrentNum: document.getElementById('examCurrentNum'),
        btnFinishExam: document.getElementById('btnFinishExam'),

        // Question Card
        questionCard: document.getElementById('questionCard'),
        qSectionTag: document.getElementById('qSectionTag'),
        qIdTag: document.getElementById('qIdTag'),
        qQueuePosTag: document.getElementById('qQueuePosTag'),
        streakTracker: document.getElementById('streakTracker'),
        streakDots: document.getElementById('streakDots'),
        btnBookmark: document.getElementById('btnBookmark'),
        bookmarkIcon: document.getElementById('bookmarkIcon'),
        scenarioBox: document.getElementById('scenarioBox'),
        scenarioText: document.getElementById('scenarioText'),
        questionText: document.getElementById('questionText'),
        questionImageContainer: document.getElementById('questionImageContainer'),
        questionImage: document.getElementById('questionImage'),
        answersGrid: document.getElementById('answersGrid'),
        flashcardView: document.getElementById('flashcardView'),
        btnRevealSolution: document.getElementById('btnRevealSolution'),
        solutionBox: document.getElementById('solutionBox'),
        solutionText: document.getElementById('solutionText'),
        btnSelfCorrect: document.getElementById('btnSelfCorrect'),
        btnSelfWrong: document.getElementById('btnSelfWrong'),
        feedbackBanner: document.getElementById('feedbackBanner'),
        feedbackMessage: document.getElementById('feedbackMessage'),
        feedbackDetail: document.getElementById('feedbackDetail'),
        btnPrevQuestion: document.getElementById('btnPrevQuestion'),
        btnNextQuestion: document.getElementById('btnNextQuestion'),
        btnResetQuestionStreak: document.getElementById('btnResetQuestionStreak'),

        // Empty state
        emptyState: document.getElementById('emptyState'),
        emptyTitle: document.getElementById('emptyTitle'),
        emptyDesc: document.getElementById('emptyDesc'),
        btnRestartAll: document.getElementById('btnRestartAll'),
        btnRestartSection: document.getElementById('btnRestartSection'),

        // Modals
        statsModal: document.getElementById('statsModal'),
        settingsModal: document.getElementById('settingsModal'),
        examResultModal: document.getElementById('examResultModal'),
        lightboxModal: document.getElementById('lightboxModal'),
        lightboxImage: document.getElementById('lightboxImage'),
        confettiContainer: document.getElementById('confettiContainer'),

        // Modal Stats
        modalStatMastered: document.getElementById('modalStatMastered'),
        modalStatInProgress: document.getElementById('modalStatInProgress'),
        modalStatMistakes: document.getElementById('modalStatMistakes'),
        modalStatAccuracy: document.getElementById('modalStatAccuracy'),
        sectionProgressList: document.getElementById('sectionProgressList'),
        btnResetCurrentCatalog: document.getElementById('btnResetCurrentCatalog'),

        // Settings Inputs
        settingSoundToggle: document.getElementById('settingSoundToggle'),
        settingAutoAdvanceToggle: document.getElementById('settingAutoAdvanceToggle'),
        settingMasteryThreshold: document.getElementById('settingMasteryThreshold'),
        btnExportBackup: document.getElementById('btnExportBackup'),
        importBackupFile: document.getElementById('importBackupFile'),

        // Exam Result modal items
        examResultBadge: document.getElementById('examResultBadge'),
        examResultStatus: document.getElementById('examResultStatus'),
        examResultScore: document.getElementById('examResultScore'),
        examMistakesSection: document.getElementById('examMistakesSection'),
        examMistakesList: document.getElementById('examMistakesList'),
        btnRestartExam: document.getElementById('btnRestartExam')
    };

    let autoAdvanceTimeout = null;
    let examCountdownInterval = null;
    let examTimeRemaining = 45 * 60; // 45 minutes in seconds

    // --- 1. Initialize Settings & Theme ---
    function initThemeAndSettings() {
        const settings = window.storageManager.getSettings();

        // Theme
        document.documentElement.setAttribute('data-theme', settings.theme || 'dark');
        elements.themeIcon.textContent = settings.theme === 'light' ? '☀️' : '🌙';

        // Sound
        window.soundEffects.setEnabled(settings.soundEnabled !== false);
        elements.audioIcon.textContent = settings.soundEnabled !== false ? '🔊' : '🔇';
        elements.btnAudioToggle.classList.toggle('active', settings.soundEnabled !== false);
        elements.settingSoundToggle.checked = settings.soundEnabled !== false;

        // Auto Advance
        elements.settingAutoAdvanceToggle.checked = !!settings.autoAdvance;

        // Mastery Threshold
        elements.settingMasteryThreshold.value = String(settings.masteryThreshold || 5);
    }

    // Toggle Theme
    elements.btnThemeToggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        elements.themeIcon.textContent = next === 'light' ? '☀️' : '🌙';
        window.storageManager.updateSettings({ theme: next });
    });

    // Toggle Audio
    elements.btnAudioToggle.addEventListener('click', () => {
        const settings = window.storageManager.getSettings();
        const newVal = !settings.soundEnabled;
        window.storageManager.updateSettings({ soundEnabled: newVal });
        window.soundEffects.setEnabled(newVal);
        elements.audioIcon.textContent = newVal ? '🔊' : '🔇';
        elements.btnAudioToggle.classList.toggle('active', newVal);
        elements.settingSoundToggle.checked = newVal;
    });

    // --- 2. Load Catalogs and Setup Navigation ---
    async function initCatalogs() {
        const catalogs = await window.quizEngine.loadCatalogsList();
        elements.catalogSelect.innerHTML = '';

        if (catalogs.length === 0) {
            elements.catalogSelect.innerHTML = '<option value="">Keine Kataloge gefunden</option>';
            return;
        }

        for (const cat of catalogs) {
            const opt = document.createElement('option');
            opt.value = cat.filename;
            opt.textContent = `${cat.document_name} (${cat.total_questions} Fragen)`;
            elements.catalogSelect.appendChild(opt);
        }

        // Select first catalog by default
        const initialCatalog = catalogs[0].filename;
        await selectCatalog(initialCatalog);
    }

    async function selectCatalog(filename) {
        elements.catalogSelect.value = filename;
        await window.quizEngine.loadCatalog(filename);
        populateSectionsDropdown();
        window.quizEngine.buildQueue();
        updateAllStats();
        renderCurrentQuestion();
    }

    function populateSectionsDropdown() {
        elements.sectionSelect.innerHTML = '<option value="all">Alle Abschnitte</option>';
        if (!window.quizEngine.currentCatalog) return;

        for (const sec of window.quizEngine.currentCatalog.sections || []) {
            const opt = document.createElement('option');
            opt.value = sec.name;
            const qCount = (sec.questions || []).length;
            opt.textContent = `${sec.name} (${qCount} Fragen)`;
            elements.sectionSelect.appendChild(opt);
        }
    }

    // Catalog change event
    elements.catalogSelect.addEventListener('change', async (e) => {
        await selectCatalog(e.target.value);
    });

    // Section change event
    elements.sectionSelect.addEventListener('change', (e) => {
        window.quizEngine.setSectionFilter(e.target.value);
        updateAllStats();
        renderCurrentQuestion();
    });

    // Mode tab click event
    elements.modeTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const mode = tab.dataset.mode;
            elements.modeTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            if (mode === 'exam') {
                startExamSimulation();
            } else {
                stopExamSimulation();
                window.quizEngine.setMode(mode);
                updateAllStats();
                renderCurrentQuestion();
            }
        });
    });

    // Shuffle queue button
    elements.btnShuffleQueue.addEventListener('click', () => {
        window.quizEngine.buildQueue();
        window.soundEffects.playTick();
        renderCurrentQuestion();
    });

    // --- 3. Render Question ---
    function renderCurrentQuestion() {
        clearTimeout(autoAdvanceTimeout);
        const q = window.quizEngine.currentQuestion;

        if (!q) {
            showEmptyState();
            return;
        }

        elements.emptyState.classList.remove('show');
        elements.questionCard.style.display = 'block';

        // Meta tags
        elements.qSectionTag.textContent = q.sectionName;
        elements.qIdTag.textContent = `Frage #${q.id}`;
        elements.qQueuePosTag.textContent = `${window.quizEngine.queueIndex + 1} / ${window.quizEngine.queue.length}`;

        // Bookmark status
        const catName = q.catalogName;
        const rec = window.storageManager.getQuestionRecord(catName, q.sectionName, q.id);
        elements.bookmarkIcon.textContent = rec.bookmarked ? '★' : '☆';
        elements.btnBookmark.classList.toggle('active', rec.bookmarked);

        // 5-Streak visualizer dots
        renderStreakDots(rec.streak || 0);

        // Scenario text box (Navigationsaufgaben)
        if (q.sectionComment && q.sectionComment !== 'n/a' && q.sectionComment.trim() !== '') {
            elements.scenarioBox.style.display = 'block';
            elements.scenarioText.textContent = q.sectionComment;
        } else {
            elements.scenarioBox.style.display = 'none';
        }

        // Question text
        elements.questionText.textContent = q.text;

        // Question image
        if (q.image && q.image !== 'n/a' && q.image.trim() !== '') {
            elements.questionImage.src = `/images/${q.image}`;
            elements.questionImageContainer.style.display = 'flex';
        } else {
            elements.questionImageContainer.style.display = 'none';
        }

        // Reset feedback banner
        elements.feedbackBanner.className = 'feedback-banner';

        // Previous button visibility (only in exam or when index > 0)
        elements.btnPrevQuestion.style.display = (window.quizEngine.queueIndex > 0) ? 'inline-flex' : 'none';

        // Check if multiple choice or flashcard solution
        const isMultipleChoice = window.quizEngine.shuffledAnswers.length > 1;

        if (isMultipleChoice) {
            elements.answersGrid.style.display = 'flex';
            elements.flashcardView.classList.remove('active');
            renderMultipleChoiceAnswers(window.quizEngine.shuffledAnswers);
        } else {
            elements.answersGrid.style.display = 'none';
            elements.flashcardView.classList.add('active');
            renderFlashcardSolution(q);
        }
    }

    // Render 5 Streak dots
    function renderStreakDots(currentStreak) {
        const threshold = window.storageManager.getMasteryThreshold();
        elements.streakDots.innerHTML = '';

        for (let i = 0; i < threshold; i++) {
            const dot = document.createElement('span');
            dot.className = `streak-dot ${i < currentStreak ? 'active' : ''}`;
            elements.streakDots.appendChild(dot);
        }
    }

    // Render Multiple Choice Cards
    function renderMultipleChoiceAnswers(answers) {
        elements.answersGrid.innerHTML = '';
        const keys = ['A', 'B', 'C', 'D'];

        answers.forEach((ans, idx) => {
            const card = document.createElement('button');
            card.className = 'answer-card';
            card.type = 'button';
            card.dataset.index = idx;

            const keyBadge = document.createElement('span');
            keyBadge.className = 'answer-key';
            keyBadge.textContent = keys[idx] || (idx + 1);

            const contentDiv = document.createElement('div');
            contentDiv.className = 'answer-content';

            if (ans.image && ans.image !== 'n/a') {
                const img = document.createElement('img');
                img.className = 'answer-img';
                img.src = `/images/${ans.image}`;
                img.alt = `Antwort ${keys[idx]}`;
                contentDiv.appendChild(img);
            }

            const textSpan = document.createElement('span');
            textSpan.textContent = ans.text;
            contentDiv.appendChild(textSpan);

            card.appendChild(keyBadge);
            card.appendChild(contentDiv);

            card.addEventListener('click', () => handleAnswerSelect(idx));
            elements.answersGrid.appendChild(card);
        });
    }

    // Render Flashcard Solution for Navigationsaufgaben
    function renderFlashcardSolution(q) {
        elements.solutionBox.classList.remove('show');
        elements.btnRevealSolution.style.display = 'block';

        const solutionAnswer = (q.answers && q.answers.length > 0) ? q.answers[0].text : 'Keine Musterlösung vorhanden';
        elements.solutionText.textContent = solutionAnswer;

        elements.btnRevealSolution.onclick = () => {
            elements.solutionBox.classList.add('show');
            elements.btnRevealSolution.style.display = 'none';
            window.soundEffects.playTick();
        };

        elements.btnSelfCorrect.onclick = () => handleAnswerSelect(0);
        elements.btnSelfWrong.onclick = () => handleAnswerSelect(1);
    }

    // Handle user answering
    function handleAnswerSelect(selectedIndex) {
        if (window.quizEngine.answeredState !== null) return; // already answered

        const result = window.quizEngine.submitAnswer(selectedIndex);
        if (!result) return;

        const isMultipleChoice = window.quizEngine.shuffledAnswers.length > 1;

        if (isMultipleChoice) {
            const cards = elements.answersGrid.querySelectorAll('.answer-card');
            cards.forEach((c, idx) => {
                c.classList.add('disabled');
                if (idx === result.correctIndex) {
                    c.classList.add('correct');
                } else if (idx === selectedIndex && !result.isCorrect) {
                    c.classList.add('wrong');
                }
            });
        }

        // Streak & Sound feedback
        renderStreakDots(result.streak);

        if (result.isCorrect) {
            if (result.wasJustMastered) {
                window.soundEffects.playMastery();
                triggerConfetti();
                showFeedback(true, '🎉 GEMEISTERT!', `5-mal in Folge richtig! Frage ist gemeistert und wandert in den Meister-Bereich.`);
            } else {
                window.soundEffects.playCorrect();
                const remaining = result.threshold - result.streak;
                showFeedback(true, '✅ Richtig!', `Serie: ${result.streak}/${result.threshold} 🔥 (Noch ${remaining} bis zur Meisterschaft)`);
            }

            // Auto-advance if enabled
            const settings = window.storageManager.getSettings();
            if (settings.autoAdvance) {
                autoAdvanceTimeout = setTimeout(() => {
                    handleNextQuestion();
                }, settings.autoAdvanceDelay || 1200);
            }
        } else {
            window.soundEffects.playWrong();
            showFeedback(false, '❌ Leider falsch!', `Die richtige Lösung ist markiert. Serie wurde auf 0 zurückgesetzt.`);
        }

        updateAllStats();
    }

    function showFeedback(isCorrect, title, detail) {
        elements.feedbackBanner.className = `feedback-banner show ${isCorrect ? 'correct' : 'wrong'}`;
        elements.feedbackMessage.innerHTML = `<span>${isCorrect ? '✅' : '❌'}</span> ${title}`;
        elements.feedbackDetail.textContent = detail;
    }

    function handleNextQuestion() {
        clearTimeout(autoAdvanceTimeout);
        const nextQ = window.quizEngine.nextQuestion();
        if (nextQ) {
            renderCurrentQuestion();
        } else {
            if (window.quizEngine.mode === 'exam') {
                finishExamSimulation();
            } else {
                showEmptyState();
            }
        }
    }

    function handlePrevQuestion() {
        clearTimeout(autoAdvanceTimeout);
        const prevQ = window.quizEngine.prevQuestion();
        if (prevQ) {
            renderCurrentQuestion();
        }
    }

    elements.btnNextQuestion.addEventListener('click', handleNextQuestion);
    elements.btnPrevQuestion.addEventListener('click', handlePrevQuestion);

    // Bookmark Toggle
    elements.btnBookmark.addEventListener('click', () => {
        const q = window.quizEngine.currentQuestion;
        if (!q) return;
        const isBookmarked = window.storageManager.toggleBookmark(q.catalogName, q.sectionName, q.id);
        elements.bookmarkIcon.textContent = isBookmarked ? '★' : '☆';
        elements.btnBookmark.classList.toggle('active', isBookmarked);
        window.soundEffects.playTick();
        updateAllStats();
    });

    // Reset single question streak
    elements.btnResetQuestionStreak.addEventListener('click', () => {
        const q = window.quizEngine.currentQuestion;
        if (!q) return;
        if (confirm(`Serie für Frage #${q.id} wirklich zurücksetzen?`)) {
            window.storageManager.resetQuestion(q.catalogName, q.sectionName, q.id);
            renderStreakDots(0);
            updateAllStats();
            window.soundEffects.playTick();
        }
    });

    // Empty state handlers
    function showEmptyState() {
        elements.questionCard.style.display = 'none';
        elements.emptyState.classList.add('show');

        if (window.quizEngine.mode === 'training') {
            elements.emptyTitle.textContent = 'Alle Fragen gemeistert! 🎉';
            elements.emptyDesc.textContent = 'Hervorragend! In dieser Auswahl wurden alle Fragen 5-mal in Folge korrekt beantwortet.';
        } else if (window.quizEngine.mode === 'mistakes') {
            elements.emptyTitle.textContent = 'Keine Fehler vorhanden! 👏';
            elements.emptyDesc.textContent = 'Du hast aktuell keine offenen Fragen mit Fehlern in diesem Katalog.';
        } else if (window.quizEngine.mode === 'bookmarked') {
            elements.emptyTitle.textContent = 'Keine gemerkten Fragen';
            elements.emptyDesc.textContent = 'Klicke auf den Stern (☆) bei einer Frage, um sie hier zu sammeln.';
        } else {
            elements.emptyTitle.textContent = 'Durchgang beendet!';
            elements.emptyDesc.textContent = 'Du hast alle Fragen dieser Runde durchgearbeitet.';
        }
    }

    elements.btnRestartAll.addEventListener('click', () => {
        window.quizEngine.setMode('all');
        elements.modeTabs.forEach(t => t.classList.toggle('active', t.dataset.mode === 'all'));
        renderCurrentQuestion();
    });

    elements.btnRestartSection.addEventListener('click', () => {
        window.quizEngine.setMode('training');
        elements.modeTabs.forEach(t => t.classList.toggle('active', t.dataset.mode === 'training'));
        renderCurrentQuestion();
    });

    // --- 4. Exam Simulation Mode ---
    function startExamSimulation() {
        window.quizEngine.setMode('exam');
        elements.examHud.classList.add('active');
        examTimeRemaining = 45 * 60; // 45 minutes
        updateExamTimerDisplay();

        clearInterval(examCountdownInterval);
        examCountdownInterval = setInterval(() => {
            examTimeRemaining--;
            updateExamTimerDisplay();
            if (examTimeRemaining <= 0) {
                clearInterval(examCountdownInterval);
                finishExamSimulation();
            }
        }, 1000);

        renderCurrentQuestion();
    }

    function stopExamSimulation() {
        clearInterval(examCountdownInterval);
        elements.examHud.classList.remove('active');
    }

    function updateExamTimerDisplay() {
        const mins = Math.floor(examTimeRemaining / 60);
        const secs = examTimeRemaining % 60;
        elements.examTimer.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        if (window.quizEngine.queue) {
            elements.examCurrentNum.textContent = Math.min(window.quizEngine.queueIndex + 1, window.quizEngine.queue.length);
        }
    }

    elements.btnFinishExam.addEventListener('click', () => {
        if (confirm('Möchtest du die Prüfung jetzt abgeben und auswerten?')) {
            finishExamSimulation();
        }
    });

    function finishExamSimulation() {
        stopExamSimulation();

        const answers = window.quizEngine.examConfig.answers || [];
        const totalExamQuestions = window.quizEngine.queue.length;
        const correctCount = answers.filter(a => a && a.isCorrect).length;
        const scorePercent = totalExamQuestions > 0 ? Math.round((correctCount / totalExamQuestions) * 100) : 0;
        const passed = correctCount >= window.quizEngine.examConfig.passThreshold;

        // Modal output
        elements.examResultBadge.textContent = passed ? '🏆' : '⚠️';
        elements.examResultStatus.textContent = passed ? 'BESTANDEN!' : 'NICHT BESTANDEN';
        elements.examResultStatus.style.color = passed ? 'var(--color-emerald)' : 'var(--color-coral)';
        elements.examResultScore.textContent = `Du hast ${correctCount} von ${totalExamQuestions} Fragen richtig beantwortet (${scorePercent}%).`;

        // Mistakes list
        const mistakes = answers.filter(a => a && !a.isCorrect);
        if (mistakes.length > 0) {
            elements.examMistakesSection.style.display = 'block';
            elements.examMistakesList.innerHTML = '';
            mistakes.forEach(m => {
                const item = document.createElement('div');
                item.style.padding = '8px 12px';
                item.style.background = 'rgba(239, 68, 68, 0.1)';
                item.style.borderRadius = '6px';
                item.style.fontSize = '0.88rem';
                item.innerHTML = `<strong>Frage #${m.question.id}:</strong> ${m.question.text}`;
                elements.examMistakesList.appendChild(item);
            });
        } else {
            elements.examMistakesSection.style.display = 'none';
        }

        openModal('examResultModal');
        if (passed) {
            window.soundEffects.playMastery();
            triggerConfetti();
        } else {
            window.soundEffects.playWrong();
        }
    }

    elements.btnRestartExam.addEventListener('click', () => {
        closeModal('examResultModal');
        startExamSimulation();
    });

    // --- 5. Update Aggregate Stats and Badges ---
    function updateAllStats() {
        const cat = window.quizEngine.currentCatalog;
        if (!cat) return;

        const allQ = window.quizEngine.allQuestions;
        const currentSec = elements.sectionSelect.value;
        const stats = window.storageManager.getStats(cat.document_name, allQ, currentSec);

        // Header chips
        elements.statMastered.textContent = `${stats.mastered} (${stats.progressPercent}%)`;
        elements.statInProgress.textContent = stats.inProgress;
        elements.statMistakes.textContent = stats.mistakes;
        elements.statAccuracy.textContent = `${stats.accuracy}%`;

        // Tab badges
        elements.badgeTrainingCount.textContent = stats.total - stats.mastered;
        elements.badgeMistakesCount.textContent = stats.mistakes;
        elements.badgeAllCount.textContent = stats.total;
        elements.badgeBookmarkedCount.textContent = stats.bookmarked;

        // Modal overall stats
        elements.modalStatMastered.textContent = `${stats.mastered} / ${stats.total}`;
        elements.modalStatInProgress.textContent = stats.inProgress;
        elements.modalStatMistakes.textContent = stats.mistakes;
        elements.modalStatAccuracy.textContent = `${stats.accuracy}%`;

        // Section breakdown progress bars in modal
        renderSectionProgressBars(cat, allQ);
    }

    function renderSectionProgressBars(catalog, allQuestions) {
        elements.sectionProgressList.innerHTML = '';

        for (const sec of catalog.sections || []) {
            const secStats = window.storageManager.getStats(catalog.document_name, allQuestions, sec.name);
            if (secStats.total === 0) continue;

            const masteredPercent = Math.round((secStats.mastered / secStats.total) * 100);
            const inProgPercent = Math.round((secStats.inProgress / secStats.total) * 100);
            const mistakePercent = Math.round((secStats.mistakes / secStats.total) * 100);

            const container = document.createElement('div');
            container.className = 'section-progress-item';

            container.innerHTML = `
                <div class="section-progress-header">
                    <span>${sec.name}</span>
                    <span>${secStats.mastered}/${secStats.total} (${masteredPercent}%)</span>
                </div>
                <div class="progress-track">
                    <div class="progress-fill-mastered" style="width: ${masteredPercent}%;" title="Gemeistert: ${secStats.mastered}"></div>
                    <div class="progress-fill-learning" style="width: ${inProgPercent}%;" title="In Bearbeitung: ${secStats.inProgress}"></div>
                    <div class="progress-fill-mistake" style="width: ${mistakePercent}%;" title="Fehler: ${secStats.mistakes}"></div>
                </div>
            `;
            elements.sectionProgressList.appendChild(container);
        }
    }

    // Reset Catalog Button
    elements.btnResetCurrentCatalog.addEventListener('click', () => {
        const cat = window.quizEngine.currentCatalog;
        if (!cat) return;
        if (confirm(`Möchtest du wirklich den gesamten Lernstand für "${cat.document_name}" zurücksetzen?`)) {
            window.storageManager.resetCatalog(cat.document_name);
            updateAllStats();
            window.quizEngine.buildQueue();
            renderCurrentQuestion();
            closeModal('statsModal');
        }
    });

    // --- 6. Settings & Backup Handling ---
    elements.settingSoundToggle.addEventListener('change', (e) => {
        window.storageManager.updateSettings({ soundEnabled: e.target.checked });
        window.soundEffects.setEnabled(e.target.checked);
        elements.audioIcon.textContent = e.target.checked ? '🔊' : '🔇';
    });

    elements.settingAutoAdvanceToggle.addEventListener('change', (e) => {
        window.storageManager.updateSettings({ autoAdvance: e.target.checked });
    });

    elements.settingMasteryThreshold.addEventListener('change', (e) => {
        const val = parseInt(e.target.value, 10) || 5;
        window.storageManager.updateSettings({ masteryThreshold: val });
        updateAllStats();
        renderCurrentQuestion();
    });

    // Export Backup JSON
    elements.btnExportBackup.addEventListener('click', () => {
        const jsonString = window.storageManager.exportBackup();
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sbf_trainer_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // Import Backup JSON
    elements.importBackupFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const res = window.storageManager.importBackup(event.target.result);
            if (res.success) {
                alert('Lernstand erfolgreich importiert!');
                initThemeAndSettings();
                updateAllStats();
                window.quizEngine.buildQueue();
                renderCurrentQuestion();
                closeModal('settingsModal');
            } else {
                alert(`Fehler beim Importieren: ${res.error}`);
            }
        };
        reader.readAsText(file);
    });

    // --- 7. Modal Helpers ---
    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('open');
    }

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('open');
    }

    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.dataset.close));
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.remove('open');
        });
    });

    elements.btnStatsModal.addEventListener('click', () => {
        updateAllStats();
        openModal('statsModal');
    });

    elements.btnSettingsModal.addEventListener('click', () => {
        openModal('settingsModal');
    });

    // Image Zoom Lightbox
    elements.questionImageContainer.addEventListener('click', () => {
        if (elements.questionImage.src) {
            elements.lightboxImage.src = elements.questionImage.src;
            elements.lightboxModal.classList.add('open');
        }
    });

    elements.lightboxModal.addEventListener('click', () => {
        elements.lightboxModal.classList.remove('open');
    });

    // --- 8. Confetti Celebration Effect ---
    function triggerConfetti() {
        const colors = ['#10b981', '#3b82f6', '#f59e0b', '#06b6d4', '#ec4899', '#8b5cf6'];
        elements.confettiContainer.innerHTML = '';

        for (let i = 0; i < 45; i++) {
            const conf = document.createElement('div');
            conf.className = 'confetti-piece';
            conf.style.left = `${Math.random() * 100}vw`;
            conf.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            conf.style.animationDuration = `${1.5 + Math.random() * 2}s`;
            conf.style.animationDelay = `${Math.random() * 0.4}s`;
            conf.style.transform = `scale(${0.6 + Math.random() * 0.8})`;
            elements.confettiContainer.appendChild(conf);
        }

        setTimeout(() => {
            elements.confettiContainer.innerHTML = '';
        }, 4000);
    }

    // --- 9. Keyboard Shortcuts ---
    window.addEventListener('keydown', (e) => {
        // If typing in input, ignore
        if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

        // Escape to close modals
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay, .lightbox-overlay').forEach(m => m.classList.remove('open'));
            return;
        }

        // 1-4 for Multiple Choice answers
        if (['1', '2', '3', '4'].includes(e.key)) {
            const idx = parseInt(e.key, 10) - 1;
            handleAnswerSelect(idx);
            return;
        }

        // Space or Enter for Next Question
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            handleNextQuestion();
            return;
        }

        // Key 'M' for Bookmark
        if (e.key.toLowerCase() === 'm') {
            elements.btnBookmark.click();
            return;
        }
    });

    // Initialize App
    initThemeAndSettings();
    await initCatalogs();
});
