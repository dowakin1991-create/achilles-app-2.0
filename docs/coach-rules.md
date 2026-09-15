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
