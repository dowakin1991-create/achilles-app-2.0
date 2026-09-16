# Coach 10.15.8

An offline, deterministic advice engine, not an LLM or a clinically validated system.
Every observation separates evidence from a suggested action. At most four prioritized
observations are returned; only the first is expanded. The existing coach-off preference
still prevents analysis and hides coaching controls.

## Data and limits

- Day analysis uses the selected journal date. The two-week weight and training context
  ends on today. Logged meals are never assumed to be a complete day.
- New food entries retain an immutable portion snapshot with name, inferred or explicit
  food group and available fiber, sugar and free-sugar values. Unknown nutrients are null.
- Legacy entries can resolve by stable catalog ID or, for group inference only, their
  saved name. Custom foods are not matched to unrelated catalog values by fuzzy name.
- Classification from names is a conservative heuristic and is disclosed in the UI.
  Mixed dishes may remain unclassified. A dessert's calories are not sugar calories.
- A dessert review gets priority at 20% of the user's calorie goal. This is a product
  prioritization heuristic, NOT a recommended dessert limit or a medical threshold.
- Total sugar is never substituted for free sugar. Partial known free sugar is described
  as a lower bound; missing fiber does not produce a deficiency claim.
- Weight compares two adjacent seven-day means, with at least three distinct weighing
  dates in each. A change of at least -0.9 kg triggers review, not an automatic calorie
  change. This screening heuristic cannot distinguish water, fat and muscle.
- Training frequency counts days with workouts, not exercise entries. Multiple sessions
  in one day remain one active day. There is no assumed three-session weekly target
  in the new advice engine. Legacy Score is a separate heuristic, not advice evidence.
- Training comparisons require three dates spanning at least seven days and identical
  recorded load patterns and set counts. Effort, pain, technique and sleep are unknown.
- Progression no longer raises all sets to the heaviest weight plus 2.5 kg. A requested
  draft preserves each weight and adds one repetition. It is explicitly conditional,
  not a personalized prescription; there are no automated changes to stored workouts.
- Removed the Apple Watch entry form and logging function. Existing history is preserved.

## Sources

[WHO: Healthy diet](https://www.who.int/news-room/fact-sheets/detail/healthy-diet),
accessed 2026-09-15: adult reference points for fiber (25 g), fruit/vegetables (400 g),
and free sugars (less than 10% of energy). These are general guidelines, not individual
medical targets. The interface links the relevant observations to this source.

[CDC: Steps for Losing Weight](https://www.cdc.gov/healthy-weight-growth/losing-weight/index.html),
accessed 2026-09-15: gradual weight loss and the role of tracking patterns. The engine's
sampling window and screening thresholds are implementation choices, not validated
clinical rules.

## 10.15.9 — explicit tracking and weekly review

- In the journal, users confirm a day's food and drink are fully logged. Confirmation
  is tied to a compact change detector over that day's food entries. Adding, deleting
  or editing food invalidates confirmation; adding a workout does not. Confirmation
  can be revoked. Empty and future days cannot be confirmed. Existing days are not
  automatically marked complete.
- Coach workflow records use a separate account-scoped local key and a `coachWorkflow`
  field in the existing cloud document. Date confirmations, settings, actions and
  per-date checkins merge independently by modification time. A newer revocation is
  retained as a tombstone. Concurrent offline accepted steps are retained in history,
  with only the most recent remaining active.
- Schedule can be unset, a work/rest cycle with an explicit first-workday anchor,
  or chosen weekdays. Cycle training can occur on the first or every rest day.
  Duration and equipment are stored as context; they do not generate an exercise
  programme automatically. New settings apply from their save date; accepted actions
  retain their original schedule snapshot. No universal three-session target is used.
- The primary card proposes one seven-day action. Acceptance is explicit. It retains
  the reason, baseline and start date through reloads and changes to daily observations.
  Users can check in once per date (done/difficult), stop early, or assess convenience
  at review. Recently completed or rejected kinds have a seven-day cooldown.
- Baseline is the seven calendar days before acceptance; follow-up is the seven days
  beginning on acceptance. Nutrition comparisons use at least three currently
  confirmed days per period; fiber additionally needs three known-value days. Other
  days are omitted, never counted as zero intake. A data-collection action instead
  compares how many days were confirmed. Workout review counts distinct dates.
- Review describes measurements and user-reported feasibility. It does not declare
  effectiveness or causality. Missing data produces an explicit insufficient-data
  result. The completed review is retained with the action. Safety observations can
  remain visible above an active action. Coach-off preserves state but disables actions.
- Detailed observations are collapsed beneath the primary action. The workflow is
  deterministic and offline-capable; there is no conversational AI integration yet.
