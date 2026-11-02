# Partner Data Extraction Specification

Source template: `ABCDEFG1111.docx`

## Purpose

This specification defines the information that must be extracted from a travel partner’s source material before brochure content can be generated.

The source template contains a France product header, Italy-based brochure examples, Hokkaido-based sample information, template instructions and controlled vocabularies. The Italy and Hokkaido content must therefore be treated only as structural or stylistic examples, not as product facts.

## Source notation

- **E** — explicit template requirement
- **R** — inferred recommendation
- **T p.#** — rendered template page
- **C: Field** — Word comment attached to that field

## Extraction specification

| Field ID | Template section or field | Purpose | Required source data | Type / status | Extraction guidance and expected source | Validation | Missing-data handling | Basis / ambiguities |
|---|---|---|---|---|---|---|---|---|
| PROD-01 | Unite Name | Define pricing basis | Per-person/per-room basis; occupancy basis; sharing arrangement | Controlled text; required if pricing is presented | Supplier pricing terms or internal commercial data | Must align with price and accommodation basis | Request commercial clarification | **E—T p.1.** “Unite Name” appears to be a typo for “Unit Name” |
| PROD-02 | Address | Record tour starting point | Start venue, locality, city, region, country and meeting address, where supplied | Location; required | Supplier meeting/start-point instructions | Must agree with Day 1 and Getting There | Flag incomplete address; do not invent street details | **E—T p.1; C: Address—“Starting point of the tour.”** Unclear whether city only or full address is required |
| SET-00 | Settings | Structural heading | No partner data | Structural; not applicable | None | Preserve position | Not applicable | **E—T p.3** |
| SET-01 | Maximum Number of People | State maximum group size | Maximum guests per departure | Integer; optional | Group-size or FAQ section | Positive integer; distinguish guests from staff | Leave blank if unavailable | **E—T p.3; C: Maximum Number—explicit blank rule** |
| SET-02 | Minimum Number of People | State minimum operating size | Minimum guests required for departure | Integer; optional | Booking conditions or group-size section | Positive integer; clarify whether departure is guaranteed | Leave blank if unavailable | **E—T p.3; C: Minimum Number—explicit blank rule** |
| SET-03 | What to Carry | Classify luggage carried during activity | Luggage-transfer arrangements; overnight carrying requirements; porter/vehicle support | Enum; conditional | Itinerary, luggage-transfer and support information | Select exactly one: Day Pack, Overnight Pack or Multiday Pack | Flag if carrying arrangements cannot be determined | **E—T p.3; C: What to Carry.** Applies to walking or biking tours |
| SET-04 | Trip Style | Classify guidance arrangement | Guide presence; route support; transfers; emergency support | Enum; required | Overview, inclusions and guide/support sections | Select one: Self Guided, Self Guided (with Support), or Guided | Flag conflicting descriptions | **E—T p.3; C: Trip Style** |
| SET-05 | Grading | Classify activity difficulty | Supplier grade; distances; duration; elevation; terrain; required fitness | Enum/list; conditional | Activity notes and daily itinerary | Use only: Easy, Easy to Moderate, Moderate, Moderate to Challenging, Challenging | Flag when evidence is insufficient | **E—T p.3; C: Grading.** Comment permits multiple choices, but intended use is unclear |
| SET-06 | Accommodation Type | Categorise accommodation | Property names, official category, star rating and accommodation style for every night | Controlled list; conditional | Accommodation overview and daily itinerary | Select only supported values from the template taxonomy; multiple values allowed | Flag uncategorised properties | **E—T pp.3–4; C: Accommodation Type** |
| SET-07 | Interest | Categorise customer interests | Activities, experiences, destinations and themes included in the tour | Controlled list; required | Overview, highlights and itinerary | Select only supported template categories; multiple values allowed | Omit unsupported categories | **E—T p.4; C: Interest** |
| SELL-01 | Trip highlights | Provide evidence for selling points | Distinctive places, experiences, accommodation, food, culture, scenery, support and access | List; required | Supplier highlights, overview and itinerary | Each highlight must be specific, differentiating and supported | Flag if the source lacks enough distinct highlights | **E—T pp.4–5; C: Trip highlights** |
| INC-01 | WHAT’S INCLUDED | Define package inclusions | Meals, accommodation, transport, transfers, equipment, guides, activities, fees, gratuities and support | List; required | Supplier inclusions and booking conditions | Include only confirmed inclusions; distinguish included items from optional extras | Flag uncertain items; never infer inclusion from itinerary wording alone | **E—T p.5; C: WHAT’S INCLUDED** |
| ITI-00 | ITINERARY | Structural itinerary section | Number of days; ordered itinerary records | Repeating structure; required | Full supplier itinerary | Day count must match duration | Block itinerary generation if days are missing | **E—T p.6; C: ITINERARY** |
| ITI-N-01 | DAY N title | Summarise each day | Day number, origin, destination and principal activity or experience | Text; required per day | Daily itinerary heading and narrative | Preserve chronological order and accurate place names | Generate a neutral factual title only if the source lacks one, then flag as inferred | **E—T pp.6–10.** `N` repeats for every tour day |
| ITI-N-02 | Biking/activity options | Present daily route choices | Level, distance, activity time, elevation gain/loss and route option count | Repeating structured records; conditional | Daily route or activity details | Preserve source levels; retain metric and imperial units where available | Omit if supplier provides no activity metrics | **E—T pp.6–9; C on activity summary** |
| ITI-N-03 | Walking summary | Present a daily walking alternative | Distance, walking time and elevation information | Structured text; conditional | Daily walking or excursion details | Include only sourced values; provide metric and imperial equivalents where supported | Omit if not present | **E—T p.6; C on walking/biking summary** |
| ITI-N-04 | Daily narrative | Describe the day | Transfers, route, places, experiences, timing, optional choices and operational details | Ordered fact set; required per day | Daily supplier itinerary | Do not merge facts from different days; distinguish included from optional activities | Flag unclear chronology or conflicting details | **E—T pp.6–10; C: ITINERARY** |
| ITI-N-05 | Accommodation | Identify overnight stay | Property name, location and accommodation status | Text/list; required per day | Daily itinerary and accommodation section | Match the correct night; allow “None” only when verified | Flag missing overnight information | **E—T pp.6–10; C attached to Accommodation/Meals** |
| ITI-N-06 | Meals | Identify included daily meals | Included breakfast, lunch and dinner | Controlled list; required per day | Daily itinerary and inclusions | Use only confirmed included meals; maintain day alignment | Use “None” only if explicitly verified; otherwise flag | **E—T pp.6–10; C attached to Accommodation/Meals** |
| ITI-99 | Itinerary variation note | Communicate operational variability | Approved itinerary disclaimer or booking-condition wording | Fixed/legal text; conditional | Supplier terms or approved internal legal copy | Do not alter approved legal wording | Request approved disclaimer | **E—T p.10.** It is unclear whether the sample note is mandatory fixed copy |
| META-00 | Meta info | Structural heading | No direct partner data | Structural; not applicable | None | Preserve hierarchy | Not applicable | **E—T p.10** |
| META-01 | Meta Title | Supply facts for SEO title | Duration, destinations, activity, guidance style and priority search terms | Derived field; required | Uses PROD-01 and verified product attributes | All keywords must accurately describe the product | Flag missing product attributes | **E—T p.10; C: Meta Title** |
| META-02 | Meta Description | Supply facts for SEO summary | Destination, activity, duration, major differentiators and experiences | Derived field; required | Uses overview, highlights and itinerary | Must accurately represent the tour | Flag insufficient differentiating content | **E—T p.10; C: Meta Description** |
| MORE-00 | more info | Structural heading | No direct partner data | Structural; not applicable | None | Preserve hierarchy | Not applicable | **E—T p.10** |
| MORE-01 | Getting There | Support arrival and onward travel | Confirmed start/end points and times; nearest transport hubs; transfers; recommended arrival/departure windows; booking cautions | Locations, times and instructions; required | Supplier logistics and pre-departure information | Cross-check against PROD-05 and itinerary; distinguish confirmed facts from recommendations | Flag missing logistics. External travel advice requires an approved source | **E—T pp.10–11; C: Getting There** |
| MORE-02 | Weather & Climate | Describe expected conditions | Tour season; typical temperature and precipitation; seasonal conditions relevant to activities | Structured climate data; required | Supplier notes first | Associate climate information with destination and travel period | Comment permits new content when absent, but an approved external source is required to avoid unsupported facts | **E—T p.11; C: Weather & Climate.** Conflicts with the no-invention rule |
| MORE-03 | Biking Level | Summarise activity intensity | Overall levels; daily distance and duration ranges; maximum elevation; terrain | Repeating levels; conditional | Supplier activity-level guide and itinerary | Metric and imperial measurements; levels must agree with daily records | Omit when the tour is not cycling/walking or data is unavailable | **E—T p.11; C: Biking Level** |
| MORE-04 | Bike Options | Explain available equipment | Included bike types; specifications; handlebars; availability; upgrades; minimum age | Repeating equipment records; conditional | Supplier equipment and cycling FAQ | Separate included and paid options; capture minimum-age requirements | Omit unsupported specifications; flag missing age rules | **E—T pp.11–12; C: Bike Options** |
| MORE-05 | Other Important Information | Capture material trip considerations | Fitness, terrain, vehicle/support style, season, cultural etiquette, dietary handling, single occupancy and other booking-critical facts | Topic-based list; conditional | Supplier FAQs, booking conditions, itinerary and trip notes | Every topic must apply to this product; prevent cross-product contamination | Omit unsupported topics and flag material gaps | **E—T p.12; C: Other Important Information.** Hokkaido content is unrelated sample material |

## Extraction blockers and clarifications

1. The template contains no travel-partner source material for the France product beyond the four header values.
2. SKU, URL, pricing basis, and legal disclaimer may require internal rather than partner sources.
3. “Unite Name” should be confirmed as “Unit Name.”
4. The URL format and ownership are undefined.
5. It is unclear whether Grading is single-select or multi-select.
6. Weather and transport logistics may require approved external sources when absent from partner content.
7. The Italy and Hokkaido examples must not be extracted as facts for the France product.

## Readiness assessment

Partner-data extraction is structurally ready once the supplier source, internal commercial fields and approved external-source policy are provided.
