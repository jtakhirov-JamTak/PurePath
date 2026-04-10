# Background Art Specification

## Technical Requirements
- **Format:** WebP (preferred) or PNG
- **Resolution:** 1440x2560px (mobile portrait, 9:16)
- **File size:** Under 500KB each (optimize with squoosh.app or similar)
- **Naming:** Exact filenames listed below — the code references these paths

## Style Guide (All Images)
Same perspective throughout: a **single tree on a gentle hill**, with a simple landscape behind it (rolling hills, soft sky). Viewed from slightly below, looking up at the tree.

**Prompt prefix** (use for every image):
> Studio Ghibli anime style, hand-painted watercolor feel, warm soft lighting, lush nature scene inspired by Whisper of the Heart. A single tree on a gentle grassy hill, rolling hills in the background, soft clouds. Teal and green color palette (hex #2C6355 as dominant tone). Portrait orientation, mobile wallpaper composition with the tree centered in the upper third, leaving space for UI text in the lower half. No people, no text, no UI elements.

---

## Part 1: Setup Wizard (6 images)

Place in `client/public/backgrounds/wizard/`

### step-0.webp — Seed
> [prefix] The hill is bare, fresh brown soil. A single seed sits on the surface, glowing faintly. Very early morning, pre-dawn pink sky. Everything is potential, nothing has started yet. Dewdrops on the soil.

### step-1.webp — Sprout
> [prefix] A tiny green sprout has pushed through the soil, two small cotyledon leaves unfurling. Early morning golden light from the right. The hill is still mostly bare but there are hints of grass starting. Hope and beginning.

### step-2.webp — Sapling
> [prefix] A small sapling about 2 feet tall with a thin trunk and 8-10 bright green leaves. Morning sunlight dappling through. Small wildflowers beginning to appear on the hill. The landscape is waking up.

### step-3.webp — Young Tree
> [prefix] A young tree about 6 feet tall with thin branches forming a small canopy. Midday sun, fuller light. The hill has lush grass now. A few birds nearby. The tree has character but is still growing.

### step-4.webp — Growing Tree
> [prefix] A substantial tree with a developing canopy, branches reaching outward. Warm afternoon light, golden tones. The hill is covered in grass and wildflowers. Butterflies and gentle breeze suggested by leaf movement.

### step-5.webp — Full Summer Tree
> [prefix] A magnificent mature tree in full summer glory. Thick trunk, wide spreading canopy full of vibrant green leaves. Golden hour lighting, warm and triumphant. Lush green hill, wildflowers everywhere. The tree is fully alive and thriving. This is arrival.

---

## Part 2: Sprint Daily Cycle (31 images)

Place in `client/public/backgrounds/sprint/`

The cycle represents: **Late Summer (peak) -> Fall (shedding) -> Winter (bare) -> Spring (renewal) -> Mid-Summer (new growth)**

This mirrors the sprint philosophy: you must shed your old self to grow into your new one.

### Late Summer — Days 1-3 (Peak before the turn)

#### day-01.webp
> [prefix] The mature tree in late summer, leaves at their deepest green with the first hints of golden edges. Warm late-afternoon light, long shadows. The sky has high cirrus clouds. Peak abundance, but a subtle sense that change is coming.

#### day-02.webp
> [prefix] The tree in late summer, slightly more golden tones in the canopy. The light is softer, more amber. A few leaves have turned from green to yellow-green. Warm but with the faintest cool breeze suggested.

#### day-03.webp
> [prefix] The tree transitioning from summer to early fall. The canopy is a mix of deep green and warm gold. The sky is turning from summer blue to a softer, more muted tone. The grass is still green but drying at the tips.

### Fall — Days 4-10 (Shedding the old)

#### day-04.webp
> [prefix] Early autumn. The tree's canopy is now 40% gold and orange, 60% green. A few leaves have fallen to the ground. Cool morning light, misty air. The hill grass is turning amber.

#### day-05.webp
> [prefix] Autumn deepening. The tree is mostly orange and gold with patches of red. More fallen leaves on the ground, creating a carpet. Overcast sky with soft light breaking through. Cool, contemplative mood.

#### day-06.webp
> [prefix] Full autumn color. The tree blazes with red, orange, and gold. A stream of leaves caught in the wind, falling. The hill is covered in fallen leaves. Low sun, warm amber light despite the cool air.

#### day-07.webp
> [prefix] Late autumn. The tree is thinning out, branches becoming visible through sparse remaining red and brown leaves. Many leaves on the ground. Grey sky with golden breaks. The beauty of letting go.

#### day-08.webp
> [prefix] The tree is mostly bare, with the last clusters of brown and burnt orange leaves clinging to branches. The ground is thick with fallen leaves. Grey overcast sky. Quiet, stripped-back beauty.

#### day-09.webp
> [prefix] Nearly bare tree with just a handful of stubborn brown leaves remaining. Wind blowing the last few away. Dark grey sky, but a break of light on the horizon. The tree's branch structure is beautiful and exposed.

#### day-10.webp
> [prefix] The last leaves falling from the tree. Bare branches against a grey autumn sky. The ground is covered in decomposing leaves turning brown. Rain beginning to fall. Surrender and acceptance.

### Winter — Days 11-17 (The bare truth)

#### day-11.webp
> [prefix] Completely bare tree in early winter. Dark elegant branches against a pale grey sky. The first frost on the ground, the grass has gone dormant. Cold clear air. The tree stands dignified and exposed.

#### day-12.webp
> [prefix] The bare tree with the first dusting of snow on its branches. Light snowfall. The ground has a thin white layer. Blue-grey winter sky. Everything is still and silent.

#### day-13.webp
> [prefix] The tree in winter with moderate snow accumulated on branches and at its base. Steady gentle snowfall. The landscape is mostly white with patches of dark earth. Cold blue tones with soft light.

#### day-14.webp
> [prefix] Deep winter. The bare tree covered in heavy snow, branches bowing slightly. The ground is fully blanketed in pristine white snow. Overcast sky, snowflakes falling. The quietest moment of the cycle.

#### day-15.webp
> [prefix] The tree in heavy winter, thick snow on every branch. A break in the clouds lets moonlight or soft sun illuminate the snow, creating a glow. The snow sparkles. In the depths, there is beauty. This is the turning point.

#### day-16.webp
> [prefix] Late winter. The snow on the tree branches is beginning to melt, dripping. The sky is slightly warmer grey. Some snow has slid off branches, revealing dark bark. The ground snow has patches melting.

#### day-17.webp
> [prefix] End of winter. Most snow has melted, revealing wet dark branches. Small puddles of meltwater on the ground. The sky has a faint warmth returning. The ground shows hints of dormant grass beginning to green. Anticipation.

### Spring — Days 18-24 (Renewal)

#### day-18.webp
> [prefix] Very early spring. The bare tree has the tiniest buds swelling on branch tips. The ground shows the first new grass shoots pushing through mud and old leaves. Soft rain falling. Grey-green sky with warm undertones.

#### day-19.webp
> [prefix] Early spring. Small buds are opening on the tree, revealing the lightest green. The rain has stopped, mist lingers. The hill is dotted with the first crocuses and snowdrops. Dawn light, golden and gentle.

#### day-20.webp
> [prefix] Spring arriving. The tree has small fresh leaves unfurling, bright lime green. Cherry blossom pink hints. Morning sunlight streams through, creating light patterns. The hill is greening rapidly. Birds returning.

#### day-21.webp
> [prefix] Mid-spring. The tree is about 40% leafed out with fresh bright green leaves. Some blossoms. Light rain shower with sun simultaneously (sun shower). A rainbow suggested in the background. Vibrant new energy.

#### day-22.webp
> [prefix] Spring in full swing. The tree canopy is filling in, about 60% coverage, leaves still young and bright. Wildflowers blooming on the hill — purple, yellow, white. Warm sunlight, blue sky with puffy clouds. Joy and growth.

#### day-23.webp
> [prefix] Late spring. The tree is nearly full, leaves thickening and deepening from lime to true green. Abundant wildflowers. Butterflies and bees. Warm afternoon light. Everything is alive and growing fast.

#### day-24.webp
> [prefix] The transition from spring to summer. The tree's canopy is almost complete, dense fresh green. The grass is lush. Long golden evening light casting warm shadows. The world feels generous and full of possibility.

### Summer — Days 25-31 (The new self emerges)

#### day-25.webp
> [prefix] Early summer. The tree's canopy is full and deep green. The hill is lush with tall grass and summer flowers. Warm morning light. Clear blue sky. A fresh chapter has begun.

#### day-26.webp
> [prefix] Summer morning. The tree in full glory, leaves rustling in a gentle warm breeze. Dappled sunlight on the grass. The landscape is vibrant and alive. Birdsong suggested by small birds on branches.

#### day-27.webp
> [prefix] Summer midday. The tree providing deep cool shade. The sun is high and bright. The canopy is thick and healthy. Tall grass sways. The tree stands strong and rooted. Confidence.

#### day-28.webp
> [prefix] Summer afternoon. Golden light filtering through the tree's full canopy, creating beautiful light patterns on the ground. The hill is at its most beautiful — flowers, butterflies, warm breeze. Peace and strength.

#### day-29.webp
> [prefix] Summer golden hour. The tree silhouetted against a warm golden-pink sky. The canopy is magnificent and full. Fireflies beginning to appear. The grass glows golden. Beauty and accomplishment.

#### day-30.webp
> [prefix] Summer evening. The tree under a spectacular sunset sky — warm oranges, pinks, and purples fading to deep blue above. The tree is a strong dark silhouette with edges lit gold. Stars appearing. Triumph.

#### day-31.webp
> [prefix] Mid-summer peak. The tree at its absolute fullest and most vibrant. Bright warm sunlight, vivid green canopy, lush landscape. The same tree as the wizard's final step but seen from the sprint's perspective — this is who you've become. Not the end, but a moment of fullness before the next cycle begins.

---

## Implementation Notes

1. Generate all images at 1440x2560 for crisp mobile display
2. Export as WebP with quality 80 for good compression
3. The system interpolates across all 31 frames regardless of sprint length:
   - 10-day sprint: jumps ~3 frames per day
   - 20-day sprint: jumps ~1.5 frames per day
   - 31-day sprint: 1 frame per day (1:1)
4. Test with both light and dark mode — the overlay adjusts automatically
