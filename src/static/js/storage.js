/**
 * Sail Training - Storage & Mastery Manager
 * Manages all persistent learning data in browser localStorage.
 * Tracks question streaks, mistakes, mastery (5 consecutive correct), and settings.
 */

class StorageManager {
    constructor() {
        this.STORAGE_KEY = 'sbf_trainer_storage_v1';
        this.data = this.load();
    }

    /** Load data from localStorage or initialize defaults */
    load() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') {
                    if (!parsed.catalogs) parsed.catalogs = {};
                    if (!parsed.settings) parsed.settings = {};
                    return parsed;
                }
            }
        } catch (e) {
            console.error('Failed to load localStorage data:', e);
        }

        return {
            version: 1,
            catalogs: {},
            settings: {
                theme: 'dark',
                soundEnabled: true,
                autoAdvance: false,
                autoAdvanceDelay: 1200,
                masteryThreshold: 5
            }
        };
    }

    /** Save current data to localStorage */
    save() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
            return true;
        } catch (e) {
            console.error('Failed to save to localStorage:', e);
            return false;
        }
    }

    /** Get global settings */
    getSettings() {
        return this.data.settings || {
            theme: 'dark',
            soundEnabled: true,
            autoAdvance: false,
            autoAdvanceDelay: 1200,
            masteryThreshold: 5
        };
    }

    /** Update settings */
    updateSettings(newSettings) {
        this.data.settings = { ...this.getSettings(), ...newSettings };
        this.save();
    }

    /** Get mastery threshold (default 5) */
    getMasteryThreshold() {
        return this.getSettings().masteryThreshold || 5;
    }

    /** Generate unique key for a question in a catalog */
    makeKey(catalogName, sectionName, questionId) {
        return `${catalogName}:::${sectionName}:::${questionId}`;
    }

    /** Get question record */
    getQuestionRecord(catalogName, sectionName, questionId) {
        const key = this.makeKey(catalogName, sectionName, questionId);
        const catData = this.data.catalogs[catalogName] || {};
        return catData[key] || {
            streak: 0,
            correctCount: 0,
            wrongCount: 0,
            mastered: false,
            bookmarked: false,
            history: [],
            lastAttempt: null
        };
    }

    /**
     * Record an answer attempt for a question
     * @param {string} catalogName
     * @param {string} sectionName
     * @param {string} questionId
     * @param {boolean} isCorrect
     * @returns {object} { streak, mastered, wasJustMastered, wrongCount, correctCount }
     */
    recordAnswer(catalogName, sectionName, questionId, isCorrect) {
        if (!this.data.catalogs[catalogName]) {
            this.data.catalogs[catalogName] = {};
        }

        const key = this.makeKey(catalogName, sectionName, questionId);
        const record = this.getQuestionRecord(catalogName, sectionName, questionId);
        const threshold = this.getMasteryThreshold();
        const previouslyMastered = record.mastered === true;

        if (isCorrect) {
            record.correctCount = (record.correctCount || 0) + 1;
            record.streak = (record.streak || 0) + 1;
            if (record.streak >= threshold) {
                record.mastered = true;
            }
            record.history.push({ result: 'correct', timestamp: Date.now() });
        } else {
            record.wrongCount = (record.wrongCount || 0) + 1;
            record.streak = 0; // Reset streak on mistake
            // If they got it wrong, un-master it so they have to practice it again
            record.mastered = false;
            record.history.push({ result: 'wrong', timestamp: Date.now() });
        }

        record.lastAttempt = Date.now();
        // Limit history length to last 20 attempts
        if (record.history.length > 20) {
            record.history = record.history.slice(-20);
        }

        this.data.catalogs[catalogName][key] = record;
        this.save();

        const wasJustMastered = !previouslyMastered && record.mastered;

        return {
            streak: record.streak,
            mastered: record.mastered,
            wasJustMastered: wasJustMastered,
            wrongCount: record.wrongCount,
            correctCount: record.correctCount,
            threshold: threshold
        };
    }

    /** Toggle bookmark on a question */
    toggleBookmark(catalogName, sectionName, questionId) {
        if (!this.data.catalogs[catalogName]) {
            this.data.catalogs[catalogName] = {};
        }
        const key = this.makeKey(catalogName, sectionName, questionId);
        const record = this.getQuestionRecord(catalogName, sectionName, questionId);
        record.bookmarked = !record.bookmarked;
        this.data.catalogs[catalogName][key] = record;
        this.save();
        return record.bookmarked;
    }

    /** Reset streak or stats for a single question */
    resetQuestion(catalogName, sectionName, questionId) {
        if (this.data.catalogs[catalogName]) {
            const key = this.makeKey(catalogName, sectionName, questionId);
            delete this.data.catalogs[catalogName][key];
            this.save();
        }
    }

    /** Reset progress for an entire section */
    resetSection(catalogName, sectionName) {
        if (this.data.catalogs[catalogName]) {
            const prefix = `${catalogName}:::${sectionName}:::`;
            for (const key of Object.keys(this.data.catalogs[catalogName])) {
                if (key.startsWith(prefix)) {
                    delete this.data.catalogs[catalogName][key];
                }
            }
            this.save();
        }
    }

    /** Reset progress for an entire catalog */
    resetCatalog(catalogName) {
        if (this.data.catalogs[catalogName]) {
            delete this.data.catalogs[catalogName];
            this.save();
        }
    }

    /** Reset all stored training data */
    resetAll() {
        this.data.catalogs = {};
        this.save();
    }

    /**
     * Compute aggregate statistics for a catalog (and optionally specific section)
     * @param {string} catalogName
     * @param {array} allQuestions Array of all question objects with { sectionName, id }
     * @param {string|null} sectionFilter Optional section filter
     */
    getStats(catalogName, allQuestions = [], sectionFilter = null) {
        const threshold = this.getMasteryThreshold();
        let targetQuestions = allQuestions;

        if (sectionFilter && sectionFilter !== 'all') {
            targetQuestions = allQuestions.filter(q => q.sectionName === sectionFilter);
        }

        const total = targetQuestions.length;
        let mastered = 0;
        let inProgress = 0;
        let mistakes = 0;
        let unseen = 0;
        let bookmarked = 0;
        let totalAttempts = 0;
        let totalCorrect = 0;
        let totalWrong = 0;

        for (const q of targetQuestions) {
            const rec = this.getQuestionRecord(catalogName, q.sectionName, q.id);
            if (rec.bookmarked) bookmarked++;

            const attempts = (rec.correctCount || 0) + (rec.wrongCount || 0);
            totalAttempts += attempts;
            totalCorrect += (rec.correctCount || 0);
            totalWrong += (rec.wrongCount || 0);

            if (rec.mastered) {
                mastered++;
            } else if (rec.wrongCount > 0 && rec.streak === 0) {
                mistakes++;
            } else if (attempts > 0) {
                inProgress++;
            } else {
                unseen++;
            }
        }

        const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
        const progressPercent = total > 0 ? Math.round((mastered / total) * 100) : 0;

        return {
            total,
            mastered,
            inProgress,
            mistakes,
            unseen,
            bookmarked,
            totalAttempts,
            totalCorrect,
            totalWrong,
            accuracy,
            progressPercent,
            threshold
        };
    }

    /** Export all storage data as JSON string for backup */
    exportBackup() {
        return JSON.stringify(this.data, null, 2);
    }

    /** Import storage data from JSON string */
    importBackup(jsonString, merge = false) {
        try {
            const imported = JSON.parse(jsonString);
            if (!imported || typeof imported !== 'object') {
                throw new Error('Invalid JSON format');
            }

            if (merge) {
                this.data.catalogs = { ...this.data.catalogs, ...(imported.catalogs || {}) };
                this.data.settings = { ...this.data.settings, ...(imported.settings || {}) };
            } else {
                this.data = {
                    version: 1,
                    catalogs: imported.catalogs || {},
                    settings: { ...this.getSettings(), ...(imported.settings || {}) }
                };
            }

            this.save();
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}

// Export singleton instance
window.storageManager = new StorageManager();
