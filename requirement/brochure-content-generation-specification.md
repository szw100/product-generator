# Brochure Content Generation Specification

Source template: `ABCDEFG1111.docx`

## Purpose

This specification defines how validated extracted data must be transformed into publication-ready travel brochure content.

The template’s Italy and Hokkaido text is treated only as structural or stylistic examples. It must not be reused as factual content for another product.

## Source notation

- **E** — explicit template requirement
- **R** — inferred recommendation
- **T p.#** — rendered template page
- **C: Field** — Word comment attached to that field

## Generation specification

| Field ID | Template section or field | Content purpose and inputs | Generation instructions | Writing and format | Length | Mandatory elements and validation | Basis / ambiguities |
|---|---|---|---|---|---|---|---|
| PROD-02 | SKU | Uses approved internal identifier | Reproduce exactly | Single-line code | Exact value | No rewriting or punctuation changes | **E—T p.1** |
| PROD-03 | URL | Uses approved CMS slug | Reproduce approved value; do not silently correct | Single-line slug or URL | Exact value | Must pass the organisation’s unspecified URL rules | **E—T p.1.** Sample formatting is inconsistent |
| PROD-04 | Unite Name | Uses verified pricing basis | State the approved unit and occupancy basis | Short label | **R:** 2–6 words, based on T p.1 example | Must align with commercial data | Label spelling requires clarification |
| PROD-05 | Address | Uses verified starting location | State the start address at the level required by the publishing system | Short location line | **R:** one line, based on T p.1 | Must agree with Getting There and Day 1 | **E—C: Address** |
| SET-00 | Settings | Structural label | Preserve heading | Heading | Fixed label | No generated prose | **E—T p.3** |
| SET-01 | Maximum Number of People | Uses verified maximum | Output label plus integer | Label/value | One line | Leave blank when unavailable | **E—C: Maximum Number** |
| SET-02 | Minimum Number of People | Uses verified minimum | Output label plus integer | Label/value | One line | Leave blank when unavailable | **E—C: Minimum Number** |
| SET-03 | What to Carry | Uses luggage-support classification | Output one approved taxonomy value | Single selection | One value | Day Pack, Overnight Pack or Multiday Pack only | **E—C: What to Carry** |
| SET-04 | Trip Style | Uses guidance/support classification | Output one approved taxonomy value | Single selection | One value | Self Guided, Self Guided (with Support), or Guided | **E—C: Trip Style** |
| SET-05 | Grading | Uses verified difficulty evidence | Map supplier evidence to the controlled vocabulary without overstating ease or difficulty | One or more controlled labels | One value recommended; multiple only if business rule confirmed | Use only the five template values | **E—C: Grading.** Multiple-choice behaviour needs clarification |
| SET-06 | Accommodation Type | Uses all verified accommodation classifications | List each applicable approved category once | Controlled multi-select list | As required | Do not list a category based only on marketing language | **E—C: Accommodation Type** |
| SET-07 | Interest | Uses verified tour experiences | List each applicable interest once | Controlled multi-select list | As required | Use only the template taxonomy | **E—C: Interest** |
| SELL-01 | Trip highlights | Uses the strongest verified differentiators | Prioritise distinctive experiences, destinations, access, accommodation and support; avoid repeating the overview verbatim. Leave the list empty when no supported highlights are available | Parallel, benefit-led bullet points | **E:** prefer 4, 6 or 8 points; **R:** 15–30 words each, based on T p.5 examples | Prefer an even number when points are present; each point must contain a supported selling point. An empty list is valid | **E—T pp.4–5; C: Trip highlights** |
| INC-01 | WHAT’S INCLUDED | Uses verified inclusion records | Convert inclusions into concise, non-duplicative points. Leave the list empty when no confirmed inclusions are available | Bullet list; factual and unembellished | **R:** one inclusion per bullet, based on T p.5 | Do not include optional or payable items. An empty list is valid | **E—T p.5; C: WHAT’S INCLUDED** |
| ITI-00 | ITINERARY | Uses ordered daily records | Preserve chronological day order | Section heading followed by repeating daily blocks | One block per day | Day count must match the product duration | **E—T p.6** |
| ITI-N-01 | DAY N title | Uses day number, location and key experience | Create a concise summary heading without adding unsourced claims | Uppercase-style day heading, following template hierarchy | **R:** 6–16 words, based on T pp.6–10 examples | Include day number; retain accurate place names | Capitalisation is demonstrated but not explicitly mandated |
| ITI-N-02 | Biking/activity options | Uses sourced daily route options | Begin with the number/type of options, then list each option consistently | Bold lead-in and one line per option | One line per option | Include level, metric/imperial distance, duration and elevation when available | **E—T pp.6–9; C on activity summary** |
| ITI-N-03 | Walking summary | Uses sourced walking metrics | Place before the narrative; do not create conversions from uncertain values | Bold summary line | One line per option | Include distance, time and elevation; metric and imperial; omit if unavailable | **E—C on walking/biking summary** |
| ITI-N-04 | Daily narrative | Uses that day’s verified chronology | Summarise movements, experiences, scenery, cultural context, meals and choices without changing day allocation | Evocative but operationally clear paragraphs | **R:** 100–250 words per day, derived from T pp.6–10 examples | Separate included, optional and own-expense activities; preserve times where operationally important | No explicit daily word limit |
| ITI-N-05 | Accommodation | Uses verified nightly property | State the property or “None” when confirmed | Bold label plus value | One line | Correct day/night alignment | **E—T pp.6–10; C on Accommodation/Meals** |
| ITI-N-06 | Meals | Uses verified included meals | List meals in day order | Bold label plus comma-separated values | One line | Include only meals covered by the package | **E—T pp.6–10; C on Accommodation/Meals** |
| ITI-99 | Itinerary variation note | Uses approved disclaimer | Reproduce approved wording exactly | Note/disclaimer | Exact approved copy | No stylistic rewriting of legal text | **E—T p.10.** Confirm whether the displayed wording is approved fixed copy |
| META-00 | Meta info | Structural label | Preserve heading | Heading | Fixed label | No generated prose | **E—T p.10** |
| META-01 | Meta Title | Uses verified search attributes | Prioritise destination, duration and activity; avoid unsupported keyword variants | SEO title; natural noun phrase | **R:** approximately 20–30 words, derived from T p.10 example; no character limit is specified | Must describe the actual product; avoid keyword claims not supported by the source | **E—C: Meta Title.** Publishing-platform limits are missing |
| META-02 | Meta Description | Uses overview, destination and differentiators | Summarise the product and principal appeal in one natural sentence or compact pair | Clear, persuasive SEO description | **R:** 20–30 words, derived from T p.10 example | Include product type and destination; avoid unsupported superlatives | **E—C: Meta Description.** Publishing-platform limits are missing |
| MORE-00 | more info | Structural label | Preserve heading | Heading | Fixed label | No generated prose | **E—T p.10** |
| MORE-01 | Getting There | Uses confirmed logistics | State start and end points first; explain arrival access and onward travel; finish with booking cautions where applicable | Practical bullet points; direct and precise | **R:** 4–6 bullets, derived from T pp.10–11 | Clearly distinguish confirmed arrangements from recommendations; cross-check all times and locations | **E—C: Getting There.** External logistics research is not authorised by the supplied-source rule |
| MORE-02 | Weather & Climate | Uses verified climate and season data | Explain conditions relevant to the actual travel period and activities | Neutral, useful prose; avoid promotional exaggeration | **R:** 70–120 words, derived from T p.11 example | State units consistently; do not present invented climate facts | **E—C: Weather & Climate.** Approved external-source policy is needed |
| MORE-03 | Biking Level | Uses verified overall activity metrics | Introduce the range of levels, then provide one consistent line per level | Compact level-by-level list | One introductory sentence plus one line per level | Include duration, distance and maximum elevation in metric and imperial units | **E—T p.11; C: Biking Level.** Clarify whether walking tours need a renamed “Walking Level” section |
| MORE-04 | Bike Options | Uses verified equipment records | Describe included bikes first, then upgrades; mention paid upgrades generically without publishing prices | One short paragraph per bike type | **R:** 25–50 words per option, based on T pp.11–12 | State inclusion status, key specifications and minimum age; use “available at an additional cost/fee/charge” for upgrades | **E—C: Bike Options** |
| MORE-05 | Other Important Information | Uses applicable operational and booking topics | Organise under short topic labels; include only information material to this tour | Concise topic-led paragraphs | **R:** 30–100 words per topic, based on T p.12 examples | Verify product relevance; do not copy Hokkaido sample content into another destination | **E—C: Other Important Information** |

## Generation blockers and clarifications

1. Generation cannot begin until validated extracted data is available.
2. `AT A GLANCE` is produced by a separate task and is not part of this specification.
3. Meta-title and meta-description character limits are not specified.
4. The itinerary disclaimer has not been confirmed as approved fixed wording.
5. It is unclear whether Grading is single-select or multi-select.
6. Walking tours may require “Walking Level” rather than “Biking Level.”
7. Weather and Getting There content require an approved source policy when partner information is incomplete.
8. Italy and Hokkaido sample copy must not be carried into another product.

## Readiness assessment

Brochure-content generation is not ready until validated partner data, required internal fields and the identified business rules are supplied.
