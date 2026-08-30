/**
 * Sail Training - Quiz & Learning Engine
 * Handles catalog parsing, question queue generation, spaced repetition filtering,
 * answer shuffling, and exam simulation.
 */

class QuizEngine {
    constructor() {
        this.catalogsList = [];
        this.currentCatalog = null;
        this.currentCatalogMeta = null;
        this.allQuestions = []; // Flat list of all questions in active catalog
        this.queue = [];        // Working queue for current session
        this.queueIndex = 0;
        this.currentQuestion = null;
        this.shuffledAnswers = [];
        this.answeredState = null; // null or { selectedIndex, isCorrect, correctIndex }

        this.mode = 'training'; // 'training', 'mistakes', 'exam', 'all', 'bookmarked'
        this.sectionFilter = 'all';

        // Exam state
        this.examConfig = {
            totalQuestions: 30,
            passThreshold: 24, // 24/30 correct to pass SBF
            durationMinutes: 45,
            startTime: null,
            timerInterval: null,
            answers: [] // User answers in exam
        };
    }

    /** Fetch available catalogs list from backend */
    async loadCatalogsList() {
        try {
            const resp = await fetch('/api/catalogs');
            if (!resp.ok) throw new Error(`HTTP error ${resp.status}`);
            const data = await resp.json();
            this.catalogsList = data.catalogs || [];
            return this.catalogsList;
        } catch (err) {
            console.error('Failed to load catalogs list:', err);
            return [];
        }
    }

    /** Load full data for a specific catalog */
    async loadCatalog(filename) {
        try {
            const resp = await fetch(`/api/catalog/${filename}`);
            if (!resp.ok) throw new Error(`HTTP error ${resp.status}`);
            const data = await resp.json();
            this.currentCatalog = data;
            this.currentCatalogMeta = this.catalogsList.find(c => c.filename === filename) || {
                document_name: data.document_name,
                filename: filename
            };

            // Flatten sections into single searchable list
            this.allQuestions = [];
            for (const sec of data.sections || []) {
                const secName = sec.name || 'General';
                const secComment = sec.comment || 'n/a';
                for (const q of sec.questions || []) {
                    this.allQuestions.push({
                        ...q,
                        catalogName: data.document_name,
                        sectionName: secName,
                        sectionComment: secComment,
                        key: `${data.document_name}:::${secName}:::${q.id}`
                    });
                }
            }

            return this.currentCatalog;
        } catch (err) {
            console.error('Failed to load catalog content:', err);
            throw err;
        }
    }

    /** Set learning mode: 'training', 'mistakes', 'exam', 'all', 'bookmarked' */
    setMode(mode) {
        this.mode = mode;
        this.buildQueue();
    }

    /** Set section filter ('all' or specific section name) */
    setSectionFilter(sectionName) {
        this.sectionFilter = sectionName;
        this.buildQueue();
    }

    /** Build and randomize the question queue based on mode and filters */
    buildQueue() {
        const catName = this.currentCatalog ? this.currentCatalog.document_name : '';
        if (!catName || this.allQuestions.length === 0) {
            this.queue = [];
            this.queueIndex = 0;
            return;
        }

        let candidates = [...this.allQuestions];

        // Apply Section Filter
        if (this.sectionFilter && this.sectionFilter !== 'all') {
            candidates = candidates.filter(q => q.sectionName === this.sectionFilter);
        }

        // Apply Mode Rules
        if (this.mode === 'training') {
            // Active Training: Filter out mastered questions (streak >= 5)
            candidates = candidates.filter(q => {
                const rec = window.storageManager.getQuestionRecord(catName, q.sectionName, q.id);
                return !rec.mastered;
            });
            this.shuffleArray(candidates);
        } else if (this.mode === 'mistakes') {
            // Mistakes Drill: Questions with wrong answers or currently at 0 streak after mistakes
            candidates = candidates.filter(q => {
                const rec = window.storageManager.getQuestionRecord(catName, q.sectionName, q.id);
                return (rec.wrongCount > 0 && !rec.mastered);
            });
            // Prioritize higher wrong count first, then randomize
            candidates.sort((a, b) => {
                const recA = window.storageManager.getQuestionRecord(catName, a.sectionName, a.id);
                const recB = window.storageManager.getQuestionRecord(catName, b.sectionName, b.id);
                return (recB.wrongCount || 0) - (recA.wrongCount || 0) || Math.random() - 0.5;
            });
        } else if (this.mode === 'bookmarked') {
            // Starred / Bookmarked questions
            candidates = candidates.filter(q => {
                const rec = window.storageManager.getQuestionRecord(catName, q.sectionName, q.id);
                return rec.bookmarked;
            });
            this.shuffleArray(candidates);
        } else if (this.mode === 'exam') {
            // Exam Simulation: Select official distribution of questions
            candidates = this.generateExamPool();
        } else if (this.mode === 'all') {
            // Review All (including mastered)
            this.shuffleArray(candidates);
        }

        this.queue = candidates;
        this.queueIndex = 0;
        this.answeredState = null;
        this.prepareCurrentQuestion();
    }

    /** Generate realistic official exam question distribution */
    generateExamPool() {
        const pool = [];
        const basisQuestions = this.allQuestions.filter(q => q.sectionName === 'Basisfragen' && q.answers.length > 1);
        const specificQuestions = this.allQuestions.filter(q => q.sectionName.includes('Spezifische') && q.answers.length > 1);

        this.shuffleArray(basisQuestions);
        this.shuffleArray(specificQuestions);

        // Official SBF exam: 7 Basisfragen + 23 Spezifische Fragen = 30 total
        if (basisQuestions.length >= 7 && specificQuestions.length >= 23) {
            pool.push(...basisQuestions.slice(0, 7));
            pool.push(...specificQuestions.slice(0, 23));
        } else {
            // Fallback: take 30 random multiple-choice questions
            const mcQuestions = this.allQuestions.filter(q => q.answers && q.answers.length > 1);
            this.shuffleArray(mcQuestions);
            pool.push(...mcQuestions.slice(0, Math.min(30, mcQuestions.length)));
        }

        this.shuffleArray(pool);
        return pool;
    }

    /** Prepare current question and randomize answer options */
    prepareCurrentQuestion() {
        if (this.queue.length === 0 || this.queueIndex >= this.queue.length) {
            this.currentQuestion = null;
            this.shuffledAnswers = [];
            this.answeredState = null;
            return null;
        }

        this.currentQuestion = this.queue[this.queueIndex];
        this.answeredState = null;

        // Shuffle answers if question is multiple choice
        if (this.currentQuestion.answers && this.currentQuestion.answers.length > 1) {
            const mapped = this.currentQuestion.answers.map((ans, originalIndex) => ({
                text: ans.text,
                image: ans.image || 'n/a',
                isCorrect: ans.correct === 'Y',
                originalIndex: originalIndex
            }));
            this.shuffleArray(mapped);
            this.shuffledAnswers = mapped;
        } else {
            // Single answer (Navigation tasks / flashcards)
            this.shuffledAnswers = (this.currentQuestion.answers || []).map((ans, idx) => ({
                text: ans.text,
                image: ans.image || 'n/a',
                isCorrect: ans.correct === 'Y',
                originalIndex: idx
            }));
        }

        return this.currentQuestion;
    }

    /** Submit an answer for the current question */
    submitAnswer(selectedIndex) {
        if (!this.currentQuestion || this.answeredState !== null) return null;

        const isMultipleChoice = this.shuffledAnswers.length > 1;
        let isCorrect = false;
        let correctIndex = -1;

        if (isMultipleChoice) {
            const chosen = this.shuffledAnswers[selectedIndex];
            isCorrect = chosen ? chosen.isCorrect : false;
            correctIndex = this.shuffledAnswers.findIndex(a => a.isCorrect);
        } else {
            // For flashcard self-evaluation (selectedIndex 0 = Correct, 1 = Wrong)
            isCorrect = (selectedIndex === 0);
            correctIndex = 0;
        }

        // Record in localStorage
        const catName = this.currentQuestion.catalogName;
        const secName = this.currentQuestion.sectionName;
        const qId = this.currentQuestion.id;

        const result = window.storageManager.recordAnswer(catName, secName, qId, isCorrect);

        this.answeredState = {
            selectedIndex,
            isCorrect,
            correctIndex,
            ...result
        };

        // If in exam mode, record in exam answer log
        if (this.mode === 'exam') {
            this.examConfig.answers[this.queueIndex] = {
                question: this.currentQuestion,
                selectedIndex,
                isCorrect,
                correctIndex
            };
        }

        return this.answeredState;
    }

    /** Advance to next question */
    nextQuestion() {
        if (this.queueIndex < this.queue.length - 1) {
            this.queueIndex++;
            return this.prepareCurrentQuestion();
        } else {
            // Queue finished
            this.queueIndex = this.queue.length;
            this.currentQuestion = null;
            return null;
        }
    }

    /** Go back to previous question (useful in Exam or Review mode) */
    prevQuestion() {
        if (this.queueIndex > 0) {
            this.queueIndex--;
            return this.prepareCurrentQuestion();
        }
        return this.currentQuestion;
    }

    /** Jump to specific question in queue */
    goToQuestion(index) {
        if (index >= 0 && index < this.queue.length) {
            this.queueIndex = index;
            return this.prepareCurrentQuestion();
        }
        return null;
    }

    /** Re-shuffle the remaining unmastered questions in the queue */
    shuffleRemaining() {
        if (this.queueIndex < this.queue.length - 1) {
            const finished = this.queue.slice(0, this.queueIndex + 1);
            const remaining = this.queue.slice(this.queueIndex + 1);
            this.shuffleArray(remaining);
            this.queue = [...finished, ...remaining];
        }
    }

    /** Fisher-Yates array shuffle */
    shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
}

window.quizEngine = new QuizEngine();
