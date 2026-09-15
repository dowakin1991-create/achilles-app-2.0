/* ===== js-training-model ===== */

(function (root) {
    'use strict';

    const A = root.Achilles = root.Achilles || {};
    A.training = A.training || {};

    const TYPES = Object.freeze({
        STRENGTH_WEIGHTED: 'strength_weighted',
        STRENGTH_BODYWEIGHT: 'strength_bodyweight',
        STRENGTH_BODYWEIGHT_OPTIONAL: 'strength_bodyweight_optional_weight',
        CARDIO_TIME: 'cardio_time',
        CARDIO_TIME_DISTANCE: 'cardio_time_distance',
        STATIC_TIME: 'static_time'
    });

    const legacyTypeMap = Object.freeze({
        strength_weighted: TYPES.STRENGTH_WEIGHTED,
        bodyweight: TYPES.STRENGTH_BODYWEIGHT,
        bodyweight_optional: TYPES.STRENGTH_BODYWEIGHT_OPTIONAL,
        cardio_time: TYPES.CARDIO_TIME,
        cardio_distance: TYPES.CARDIO_TIME_DISTANCE,
        static_time: TYPES.STATIC_TIME
    });

    function normalizeExercise(exercise) {
        if (!exercise) return null;
        const type = legacyTypeMap[exercise.type || exercise.kind] || exercise.type || exercise.kind || TYPES.STRENGTH_BODYWEIGHT;
        return Object.freeze({
            id: String(exercise.id || exercise.name || '').trim(),
            name: exercise.name || exercise.id || 'Вправа',
            description: exercise.desc || exercise.description || '',
            type,
            factor: Number(exercise.factor || 0),
            distanceUnit: exercise.distanceUnit || null,
            raw: exercise
        });
    }

    function requiredMetrics(exercise) {
        const ex = normalizeExercise(exercise);
        if (!ex) return [];
        switch (ex.type) {
            case TYPES.STRENGTH_WEIGHTED: return ['sets.reps', 'sets.weightKg'];
            case TYPES.STRENGTH_BODYWEIGHT: return ['sets.reps'];
            case TYPES.STRENGTH_BODYWEIGHT_OPTIONAL: return ['sets.reps', 'sets.addedWeightKg?'];
            case TYPES.CARDIO_TIME: return ['durationSec'];
            case TYPES.CARDIO_TIME_DISTANCE: return ['durationSec', 'distance'];
            case TYPES.STATIC_TIME: return ['durationSec'];
            default: return [];
        }
    }

    function normalizeSets(sets, type) {
        if (!Array.isArray(sets)) return [];
        return sets.map(set => {
            const reps = Number(set.reps || 0);
            const weight = Number(set.weightKg ?? set.weight ?? set.addedWeightKg ?? 0);
            if (type === TYPES.STRENGTH_BODYWEIGHT_OPTIONAL) {
                return { reps, addedWeightKg: weight > 0 ? weight : 0 };
            }
            if (type === TYPES.STRENGTH_WEIGHTED) return { reps, weightKg: weight };
            return { reps };
        }).filter(set => set.reps > 0);
    }

    function entryFromLegacy(logEntry, exercise) {
        const ex = normalizeExercise(exercise || (root.workoutDB || []).find(x => x.name === logEntry?.exercise));
        if (!logEntry || !ex) return null;
        const durationRaw = Number(logEntry.duration || 0);
        const durationSec = logEntry.durationUnit === 'хв' ? durationRaw * 60 : durationRaw;
        const metrics = {
            sets: normalizeSets(logEntry.sets, ex.type),
            durationSec: durationSec || 0,
            distance: Number(logEntry.distance || 0),
            distanceUnit: logEntry.distanceUnit || ex.distanceUnit || null,
            volumeKg: Number(logEntry.volume || 0),
            estimated1RMKg: Number(logEntry.estimated1RM || logEntry.pr?.est1RM || 0),
            burnedKcal: Number(logEntry.burned || 0)
        };
        return {
            schemaVersion: 3,
            id: logEntry.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            exerciseId: ex.id,
            exerciseName: ex.name,
            exerciseType: ex.type,
            createdAt: Number(logEntry.createdAt || logEntry.id || Date.now()),
            metrics
        };
    }

    A.training.types = TYPES;
    A.training.model = {
        normalizeExercise,
        requiredMetrics,
        entryFromLegacy,
        all() { return (root.workoutDB || []).map(normalizeExercise).filter(Boolean); },
        byId(id) {
            const raw = (root.workoutDB || []).find(x => x.id === id);
            return normalizeExercise(raw);
        },
        byName(name) {
            const raw = (root.workoutDB || []).find(x => x.name === name);
            return normalizeExercise(raw);
        }
    };

    A.training.byId = id => A.training.model.byId(id);
})(window);

    

/* ===== js-training-history ===== */

(function (root) {
    'use strict';

    const A = root.Achilles = root.Achilles || {};
    A.training = A.training || {};

    function allEntries() {
        const days = A.storage.days();
        const out = [];
        Object.entries(days).forEach(([date, day]) => {
            (day.log || []).forEach(item => {
                if (item?.type !== 'workout') return;
                const exercise = A.training.model.byId(item.exerciseId) || A.training.model.byName(item.exercise);
                const normalized = item.trainingSession?.schemaVersion === 3
                    ? item.trainingSession
                    : A.training.model.entryFromLegacy(item, exercise?.raw || exercise);
                if (normalized) out.push({ ...normalized, date, legacy: item });
            });
        });
        return out.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
    }

    function formatEntry(entry) {
        if (!entry) return '';
        const m = entry.metrics || {};
        const sets = m.sets || [];
        if (sets.length) {
            return sets.map(s => {
                if (Number(s.weightKg || 0) > 0) return `${s.reps}×${s.weightKg} кг`;
                if (Number(s.addedWeightKg || 0) > 0) return `${s.reps}×+${s.addedWeightKg} кг`;
                return `${s.reps} повт.`;
            }).join(' · ');
        }
        if (m.durationSec) {
            const min = Math.round(m.durationSec / 60);
            const dist = m.distance > 0 ? ` · ${m.distance} ${m.distanceUnit || ''}` : '';
            return `${min} хв${dist}`;
        }
        return 'Записане тренування';
    }

    A.training.history = {
        all: allEntries,
        forExercise(idOrName) {
            return allEntries().filter(x => x.exerciseId === idOrName || x.exerciseName === idOrName);
        },
        last(idOrName) {
            return this.forExercise(idOrName)[0] || null;
        },
        format: formatEntry
    };

    A.training.progression = {
        suggest(idOrName) {
            if (A.coach?.isEnabled?.() === false) return null;
            const exercise = A.training.model.byId(idOrName) || A.training.model.byName(idOrName);
            const last = A.training.history.last(idOrName);
            if (!exercise || !last) return null;

            const sets = last.metrics?.sets || [];
            const type = exercise.type;

            if (type === A.training.types.STRENGTH_WEIGHTED && sets.length) {
                const valid = sets.filter(s => Number(s.weightKg) > 0 && Number(s.reps) > 0);
                if (!valid.length) return null;
                const weakest = Math.min(...valid.map(s => Number(s.reps)));
                return { label: `Орієнтир: +1 повтор у підході з ${weakest}`, reason: 'залишаємо робочу вагу' };
            }

            if ((type === A.training.types.STRENGTH_BODYWEIGHT || type === A.training.types.STRENGTH_BODYWEIGHT_OPTIONAL) && sets.length) {
                const total = sets.reduce((sum, s) => sum + Number(s.reps || 0), 0);
                return { label: `Орієнтир: ${total + 1} сумарних повторів`, reason: 'м’яка прогресія без зміни техніки' };
            }

            if ((type === A.training.types.CARDIO_TIME || type === A.training.types.CARDIO_TIME_DISTANCE) && last.metrics?.durationSec) {
                const minutes = Math.max(1, Math.round(last.metrics.durationSec / 60));
                return { label: `Орієнтир: ${minutes + 2} хв`, reason: 'невелике збільшення тривалості' };
            }

            if (type === A.training.types.STATIC_TIME && last.metrics?.durationSec) {
                return { label: `Орієнтир: ${Math.round(last.metrics.durationSec + 5)} сек`, reason: '+5 секунд до утримання' };
            }

            return null;
        }
    };
})(window);

    
