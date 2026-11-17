/* Tesser — Demo Catalogue & Provenance Schema
 *
 * Uses official Creative Commons (CC-BY) open films produced in Amsterdam by
 * the Dutch production team at Blender Foundation / Blender Institute, structured
 * into multi-episode seasons, alternate timeline branches, vertical 9:16 Reels,
 * and Pilot Season entries to demonstrate every feature of the Tesser platform.
 *
 * Every entry includes:
 *   1. Honest CC-BY attribution and actual human crew credits (zero fake AI claims).
 *   2. A toggleable "AI Series Ledger Spec" showing how Tesser documents Video Models,
 *      Voice Direction, Human Edit Hours, and C2PA Content Credentials on AI series.
 */

(function () {
  "use strict";

  const SERIES = [
    {
      id: "tears-of-steel",
      slug: "tears-of-steel",
      visibility: "public",
      featured: true,
      featuredOrder: 1,
      title: "Tears of Steel",
      wordmarkStyle: "sans",
      eyebrow: "Featured Demo Series",
      category: "Sci-Fi · Cyberpunk · Drama",
      subline: "Amsterdam Open-Film Demo · 4 Episodes · CC BY 3.0",
      year: 2012,
      totalRuntimeLabel: "12 min",
      rating: "13+",
      quality: "HD",
      region: "Netherlands (Amsterdam)",
      studio: "Blender Institute Amsterdam",
      poster: "assets/media/tos-poster.jpg",
      heroImage: "assets/media/tos-hero.jpg",
      synopsis:
        "In a fractured future Amsterdam, an aging scientist and a squad of resistance fighters stage a desperate neural-memory experiment inside the shielded Oude Kerk dome—hoping to rewrite the single human heartbreak that triggered a machine uprising forty years earlier.",
      synopsisExtended:
        "Produced in Amsterdam by the Dutch team at Blender Institute (Project Mango) under a Creative Commons Attribution 3.0 license. Split here into four serialized episodes, an alternate tactical timeline, and vertical discovery reels to demonstrate Tesser's full episodic architecture before launch.",
      badges: ["13+", "HD", "CC-BY", "C2PA SPEC", "CC", "SDH"],
      streamUrl: "https://archive.org/download/Tears-of-Steel/tears_of_steel_720p.mp4",
      trailerUrl: "https://archive.org/download/Tears-of-Steel/tears_of_steel_720p.mp4",
      pilot: {
        enabled: true,
        stage: "Season 2 Concept Demo",
        pitch: "New Amsterdam Containment — Vote to test Tesser's community Pilot Season greenlight mechanic.",
        baselineVotes: 0
      },
      episodes: [
        {
          id: "tos-s1e1",
          season: 1,
          number: 1,
          title: "The Bridge",
          startSec: 0,
          endSec: 185,
          durationSec: 185,
          thumb: "assets/media/tos-ep1.jpg",
          streamUrl: "https://archive.org/download/Tears-of-Steel/tears_of_steel_720p.mp4",
          synopsis: "On an Amsterdam footbridge before the singularity, Thom and Celia fracture over her robotic augmentation and deep-space ambition."
        },
        {
          id: "tos-s1e2",
          season: 1,
          number: 2,
          title: "Forty Years Later",
          startSec: 185,
          endSec: 365,
          durationSec: 180,
          thumb: "assets/media/tos-ep2.jpg",
          streamUrl: "https://archive.org/download/Tears-of-Steel/tears_of_steel_720p.mp4",
          synopsis: "Inside the shielded Oude Kerk dome, an older Thom calibrates a neural-memory simulation on a captured android chassis."
        },
        {
          id: "tos-s1e3",
          season: 1,
          number: 3,
          title: "Dome Breach",
          startSec: 365,
          endSec: 555,
          durationSec: 190,
          thumb: "assets/media/tos-ep3.jpg",
          streamUrl: "https://archive.org/download/Tears-of-Steel/tears_of_steel_720p.mp4",
          synopsis: "Autonomous war machines triangulate the uplink signal and breach the church perimeter while Captain Barley's unit holds the line."
        },
        {
          id: "tos-s1e4",
          season: 1,
          number: 4,
          title: "Memory Override",
          startSec: 555,
          endSec: 734,
          durationSec: 179,
          thumb: "assets/media/tos-ep4.jpg",
          streamUrl: "https://archive.org/download/Tears-of-Steel/tears_of_steel_720p.mp4",
          synopsis: "As the defensive barricade falls, Thom steps into the chamber unarmed to confront Celia's preserved consciousness."
        }
      ],
      alternateEpisodes: [
        {
          id: "tos-alt-1",
          season: 1,
          number: 1,
          branchLabel: "Tactical Perspective",
          title: "Barley's Turret Feed (Oude Kerk Siege)",
          startSec: 392,
          endSec: 548,
          durationSec: 156,
          thumb: "assets/media/tos-ep3.jpg",
          streamUrl: "https://archive.org/download/Tears-of-Steel/tears_of_steel_720p.mp4",
          synopsis: "Alternate branch isolating the exterior Amsterdam dome breach and Captain Barley's tactical command sequence."
        },
        {
          id: "tos-alt-2",
          season: 1,
          number: 2,
          branchLabel: "Chamber Cut",
          title: "Celia's Awakening Cut",
          startSec: 575,
          endSec: 712,
          durationSec: 137,
          thumb: "assets/media/tos-ep4.jpg",
          streamUrl: "https://archive.org/download/Tears-of-Steel/tears_of_steel_720p.mp4",
          synopsis: "Enters directly at the moment Celia's synthetic memory rejects Thom's rewritten bridge simulation."
        }
      ],
      madeWith: {
        isStandInDemo: true,
        demoNotice:
          "Stand-in architecture demo: Tears of Steel (2012) is live-action cinema with Blender open-source VFX—not AI-generated. Used under CC BY 3.0 to demonstrate Tesser's episodic player, inline progress, and provenance ledger.",
        actual: [
          { label: "Production Team", value: "Blender Foundation / Blender Institute, Amsterdam (Project Mango)" },
          { label: "Director & Writer", value: "Ian Hubert" },
          { label: "Producer", value: "Ton Roosendaal" },
          { label: "Cinematography & Score", value: "Joris Kerbosch (DoP) · Joram Letraad (Original Score)" },
          { label: "Principal Cast", value: "Derek de Lint, Sergio Hasselbaink, Denise Rebergen, Vanja Rukavina" },
          { label: "Pipeline & License", value: "Live-action + Blender VFX · Creative Commons Attribution 3.0 (mango.blender.org)" }
        ],
        aiSpecExample: [
          { label: "Human Showrunner & Edit", value: "Example Schema: Lead Director + 64 hrs DaVinci Resolve cut, color & sound mix" },
          { label: "Video Generation Stack", value: "Example Schema: Runway Gen-4 · Kling 2.0 · Veo (shot-locked via ControlNet)" },
          { label: "Character Consistency", value: "Example Schema: Custom LoRA + multi-angle reference bible across 4 episodes" },
          { label: "Voice & Performance", value: "Example Schema: Licensed SAG/equity human voice cast (zero unauthorized clones)" },
          { label: "Score & Sound Design", value: "Example Schema: Human-composed stems + Foley mix in Logic Pro" },
          { label: "Provenance Verification", value: "Example Schema: Signed C2PA Content Credentials manifest per episode" }
        ]
      },
      languages: {
        originalAudio: "English (Netherlands Production)",
        audio: "English (Stereo AAC)",
        subtitles: "English (CC, SDH), Dutch, Spanish, French"
      }
    },

    {
      id: "cosmos-laundromat",
      slug: "cosmos-laundromat",
      visibility: "public",
      featured: true,
      featuredOrder: 2,
      title: "Cosmos Laundromat",
      wordmarkStyle: "serif",
      eyebrow: "Pilot Season Demo",
      category: "Surreal Sci-Fi · Dark Comedy · Anthology",
      subline: "First Cycle Pilot · 3 Chapters · CC BY 4.0",
      year: 2015,
      totalRuntimeLabel: "12 min",
      rating: "13+",
      quality: "1080p",
      region: "Netherlands (Amsterdam)",
      studio: "Blender Institute Amsterdam",
      poster: "assets/media/cosmos-poster.jpg",
      heroImage: "assets/media/cosmos-hero.jpg",
      synopsis:
        "On a desolate island, a miserable sheep named Franck meets a smooth-talking stranger named Victor—who steps out of the fog offering infinite lifetimes inside an interdimensional laundromat.",
      synopsisExtended:
        "Created in Amsterdam by the Blender Institute (Project Gooseberry) expressly as 'First Cycle', the pilot episode for a serialized anthology feature/series. Presented here in three episodic chapters to showcase Tesser's Pilot Season greenlight flow.",
      badges: ["13+", "1080p", "CC-BY", "PILOT", "CC", "SDH"],
      streamUrl: "https://archive.org/download/CosmosLaundromatFirstCycle/Cosmos%20Laundromat%20-%20First%20Cycle%20%281080p%29.mp4",
      trailerUrl: "https://archive.org/download/CosmosLaundromatFirstCycle/Cosmos%20Laundromat%20-%20First%20Cycle%20%281080p%29.mp4",
      pilot: {
        enabled: true,
        stage: "Second Cycle Pilot Vote",
        pitch: "First Cycle was built by the Dutch Gooseberry team as a series pilot. Tap Vote to test Tesser's audience greenlight signal.",
        baselineVotes: 0
      },
      episodes: [
        {
          id: "cl-s1e1",
          season: 1,
          number: 1,
          title: "Franck's Island",
          startSec: 0,
          endSec: 230,
          durationSec: 230,
          thumb: "assets/media/cosmos-hero.jpg",
          streamUrl: "https://archive.org/download/CosmosLaundromatFirstCycle/Cosmos%20Laundromat%20-%20First%20Cycle%20%281080p%29.mp4",
          synopsis: "Alone on a windswept rock, Franck fails even at ending his own monotony—until a voice calls out from the treeline."
        },
        {
          id: "cl-s1e2",
          season: 1,
          number: 2,
          title: "Victor's Pitch",
          startSec: 230,
          endSec: 490,
          durationSec: 260,
          thumb: "assets/media/cosmos-victor-poster.jpg",
          streamUrl: "https://archive.org/download/CosmosLaundromatFirstCycle/Cosmos%20Laundromat%20-%20First%20Cycle%20%281080p%29.mp4",
          synopsis: "Worldly salesman Victor unzips the island's horizon, revealing a cosmic washing machine where souls pick their next existence."
        },
        {
          id: "cl-s1e3",
          season: 1,
          number: 3,
          title: "First Cycle",
          startSec: 490,
          endSec: 730,
          durationSec: 240,
          thumb: "assets/media/cosmos-poster.jpg",
          streamUrl: "https://archive.org/download/CosmosLaundromatFirstCycle/Cosmos%20Laundromat%20-%20First%20Cycle%20%281080p%29.mp4",
          synopsis: "As the spin timer ticks toward zero, Franck learns what a wandering caterpillar and a cosmic salesman really have in common."
        }
      ],
      alternateEpisodes: [
        {
          id: "cl-alt-1",
          season: 1,
          number: 1,
          branchLabel: "Portal Sequence",
          title: "Unzipping the Horizon Cut",
          startSec: 300,
          endSec: 470,
          durationSec: 170,
          thumb: "assets/media/cosmos-victor-poster.jpg",
          streamUrl: "https://archive.org/download/CosmosLaundromatFirstCycle/Cosmos%20Laundromat%20-%20First%20Cycle%20%281080p%29.mp4",
          synopsis: "Jumps directly to the storm transition from Franck's island into the glowing Cosmos Laundromat."
        }
      ],
      madeWith: {
        isStandInDemo: true,
        demoNotice:
          "Stand-in architecture demo: Cosmos Laundromat: First Cycle (2015) is 3D open animation by Blender Institute Amsterdam—not AI-generated. Licensed under CC BY 4.0.",
        actual: [
          { label: "Production Team", value: "Blender Institute, Amsterdam (Project Gooseberry)" },
          { label: "Director & Writer", value: "Mathieu Auvray (Director) · Esther Wouda (Screenplay)" },
          { label: "Producer", value: "Ton Roosendaal" },
          { label: "Voice Cast", value: "Pierre Bokma (Franck) · Reinout Scholten van Aschat (Victor)" },
          { label: "Pipeline & License", value: "Blender 3D Open Pipeline · Creative Commons Attribution 4.0 (gooseberry.blender.org)" }
        ],
        aiSpecExample: [
          { label: "Human Showrunner & Edit", value: "Example Schema: Showrunner script + 48 hrs Premiere Pro pacing & sound" },
          { label: "Video Generation Stack", value: "Example Schema: Veo · Luma Ray2 · Blender camera-blocking pass" },
          { label: "Voice & Performance", value: "Example Schema: Two human theatrical voice actors recorded in studio" },
          { label: "Provenance Verification", value: "Example Schema: Signed C2PA Content Credentials + human screenplay deposit" }
        ]
      },
      languages: {
        originalAudio: "English",
        audio: "English (Stereo)",
        subtitles: "English (CC, SDH), Dutch, French, German"
      }
    },

    {
      id: "sintel",
      slug: "sintel",
      visibility: "public",
      featured: true,
      featuredOrder: 3,
      title: "Sintel",
      wordmarkStyle: "serif",
      eyebrow: "Serialized Fantasy Demo",
      category: "Epic Fantasy · Adventure · Drama",
      subline: "Project Durian · 3 Episodes + Trailer · CC BY 3.0",
      year: 2010,
      totalRuntimeLabel: "15 min",
      rating: "13+",
      quality: "2K",
      region: "Netherlands (Amsterdam)",
      studio: "Blender Foundation Amsterdam",
      poster: "assets/media/sintel-clean-poster.jpg",
      heroImage: "assets/media/sintel-hero.jpg",
      synopsis:
        "A lone warrior crosses frozen peaks, desert wastes, and volcanic caverns in search of Scales—the fledgling dragon she nursed back to health before it was torn from her hands.",
      synopsisExtended:
        "Produced in Amsterdam by the Blender Foundation (Project Durian) under Creative Commons Attribution 3.0. Structured here into a three-part miniseries with its official theatrical trailer to demonstrate Tesser's multi-episode continuity.",
      badges: ["13+", "2K", "CC-BY", "CC", "SDH", "AD"],
      streamUrl: "https://archive.org/download/Sintel/sintel-2048-stereo.mp4",
      trailerUrl: "https://download.blender.org/durian/trailer/sintel_trailer-720p.mp4",
      pilot: {
        enabled: true,
        stage: "World Anthology Demo",
        pitch: "Chronicles of Ishtar — Test how viewers signal demand for a full fantasy world order on Tesser.",
        baselineVotes: 0
      },
      episodes: [
        {
          id: "sin-s1e1",
          season: 1,
          number: 1,
          title: "Scales",
          startSec: 0,
          endSec: 280,
          durationSec: 280,
          thumb: "assets/media/sintel-ep1.png",
          streamUrl: "https://archive.org/download/Sintel/sintel-2048-stereo.mp4",
          synopsis: "Ambush-scarred in the winter pass, Sintel shelters a wounded baby dragon in the city of Ishtar until shadow wings descend."
        },
        {
          id: "sin-s1e2",
          season: 1,
          number: 2,
          title: "The Shaman's Warning",
          startSec: 280,
          endSec: 580,
          durationSec: 300,
          thumb: "assets/media/sintel-hero.jpg",
          streamUrl: "https://archive.org/download/Sintel/sintel-2048-stereo.mp4",
          synopsis: "Years of relentless pursuit end at a desert shrine where a tribal shaman reveals why Sintel's quarry never fled far."
        },
        {
          id: "sin-s1e3",
          season: 1,
          number: 3,
          title: "Blood & Ash",
          startSec: 580,
          endSec: 888,
          durationSec: 308,
          thumb: "assets/media/sintel-poster.jpg",
          streamUrl: "https://archive.org/download/Sintel/sintel-2048-stereo.mp4",
          synopsis: "Inside the Guardians' volcanic cavern, Sintel strikes in the dark—and sees the familiar scar under the beast's wing."
        }
      ],
      alternateEpisodes: [
        {
          id: "sin-trailer",
          season: 1,
          number: 1,
          branchLabel: "Theatrical Cut",
          title: "Official Amsterdam Theatrical Trailer",
          startSec: 0,
          endSec: 52,
          durationSec: 52,
          thumb: "assets/media/sintel-hero.jpg",
          streamUrl: "https://download.blender.org/durian/trailer/sintel_trailer-720p.mp4",
          synopsis: "The official 52-second theatrical preview edited by the Durian team in Amsterdam."
        }
      ],
      madeWith: {
        isStandInDemo: true,
        demoNotice:
          "Stand-in architecture demo: Sintel (2010) is open-source 3D cinema produced by Blender Foundation Amsterdam—not AI-generated. Licensed under CC BY 3.0.",
        actual: [
          { label: "Production Team", value: "Blender Foundation, Amsterdam (Project Durian)" },
          { label: "Director & Writer", value: "Colin Levy (Director) · Esther Wouda (Screenplay)" },
          { label: "Producer & Concept Art", value: "Ton Roosendaal (Producer) · David Revoy (Art Direction)" },
          { label: "Voice & Score", value: "Halina Reijn (Sintel) · Thom Hoffman (Shaman) · Jan Morgenstern (Score)" },
          { label: "Pipeline & License", value: "Blender Open Movie · Creative Commons Attribution 3.0 (durian.blender.org)" }
        ],
        aiSpecExample: [
          { label: "Human Showrunner & Edit", value: "Example Schema: Concept art by human illustrator + 72 hrs editorial & color" },
          { label: "Video Generation Stack", value: "Example Schema: Kling 2.0 + Runway Act-One driven by human facial capture" },
          { label: "Score & Vocals", value: "Example Schema: Live acoustic score + original vocalist" },
          { label: "Provenance Verification", value: "Example Schema: C2PA Content Credentials attached to master stream" }
        ]
      },
      languages: {
        originalAudio: "English",
        audio: "English (Stereo)",
        subtitles: "English (CC, SDH), Dutch, Spanish, Japanese"
      }
    },

    {
      id: "elephants-dream",
      slug: "elephants-dream",
      visibility: "public",
      featured: true,
      featuredOrder: 4,
      title: "Elephants Dream",
      wordmarkStyle: "sans",
      eyebrow: "Industrial Surrealism Demo",
      category: "Psychological Sci-Fi · Experimental",
      subline: "Project Orange · 3 Episodes · CC BY 2.5",
      year: 2006,
      totalRuntimeLabel: "11 min",
      rating: "13+",
      quality: "HD",
      region: "Netherlands (Amsterdam)",
      studio: "Blender Foundation & Montevideo Amsterdam",
      poster: "assets/media/ed-cover.jpg",
      heroImage: "assets/media/ed-hero.jpg",
      synopsis:
        "Deep inside an infinite, self-assembling industrial machine, obsessive veteran Proog tries to initiate young Emo into the rules of a world that only exists as long as both of them believe in it.",
      synopsisExtended:
        "Produced in Amsterdam by Blender Foundation and the Netherlands Media Art Institute (Project Orange)—the world's first open-movie production. Presented here as a three-part psychological thriller.",
      badges: ["13+", "HD", "CC-BY", "CC", "SDH"],
      streamUrl: "https://archive.org/download/ElephantsDream/ed_hd.mp4",
      trailerUrl: "https://archive.org/download/ElephantsDream/ed_hd.mp4",
      pilot: {
        enabled: false,
        stage: "Archival Open Film",
        pitch: "",
        baselineVotes: 0
      },
      episodes: [
        {
          id: "ed-s1e1",
          season: 1,
          number: 1,
          title: "Inside the Machine",
          startSec: 0,
          endSec: 215,
          durationSec: 215,
          thumb: "assets/media/ed-hero.jpg",
          streamUrl: "https://archive.org/download/ElephantsDream/ed_hd.mp4",
          synopsis: "Proog pulls Emo across snapping harpoon relays and ringing telephone fields deep inside the Machine."
        },
        {
          id: "ed-s1e2",
          season: 1,
          number: 2,
          title: "The Elevator Shaft",
          startSec: 215,
          endSec: 435,
          durationSec: 220,
          thumb: "assets/media/ed-ep2.jpg",
          streamUrl: "https://archive.org/download/ElephantsDream/ed_hd.mp4",
          synopsis: "Hurtling upward through an abyssal shaft, Proog demands discipline as Emo questions what lies outside the walls."
        },
        {
          id: "ed-s1e3",
          season: 1,
          number: 3,
          title: "Desynchronization",
          startSec: 435,
          endSec: 653,
          durationSec: 218,
          thumb: "assets/media/ed-cover.jpg",
          streamUrl: "https://archive.org/download/ElephantsDream/ed_hd.mp4",
          synopsis: "In the colossal projection room, Emo conjures his own architecture—pushing Proog to a violent breaking point."
        }
      ],
      alternateEpisodes: [
        {
          id: "ed-alt-1",
          season: 1,
          number: 1,
          branchLabel: "Bridge Sequence",
          title: "Self-Assembling Typewriter Bridge",
          startSec: 250,
          endSec: 392,
          durationSec: 142,
          thumb: "assets/media/ed-ep2.jpg",
          streamUrl: "https://archive.org/download/ElephantsDream/ed_hd.mp4",
          synopsis: "Isolates the suspended bridge sequence where footsteps materialize mid-stride."
        }
      ],
      madeWith: {
        isStandInDemo: true,
        demoNotice:
          "Stand-in architecture demo: Elephants Dream (2006) by Blender Foundation & Netherlands Media Art Institute, Amsterdam—not AI-generated. Licensed under CC BY 2.5.",
        actual: [
          { label: "Production Team", value: "Blender Foundation & Netherlands Media Art Institute (Montevideo), Amsterdam" },
          { label: "Director & Art Direction", value: "Bassam Kurdali (Director) · Andy Goralczyk (Art Director)" },
          { label: "Producer", value: "Ton Roosendaal" },
          { label: "Voice & Score", value: "Tygo Gernandt (Proog) · Cas Jansen (Emo) · Jan Morgenstern (Score)" },
          { label: "Pipeline & License", value: "World's First Open Movie · Creative Commons Attribution 2.5 (orange.blender.org)" }
        ],
        aiSpecExample: [
          { label: "Human Showrunner & Edit", value: "Example Schema: Two-hander stage script + 52 hrs sound & editorial" },
          { label: "Video Generation Stack", value: "Example Schema: Sora / Runway world-model environments + Blender depth passes" },
          { label: "Voice & Performance", value: "Example Schema: Studio dialogue session with two human actors" },
          { label: "Provenance Verification", value: "Example Schema: C2PA Content Credentials manifest" }
        ]
      },
      languages: {
        originalAudio: "English",
        audio: "English (Stereo)",
        subtitles: "English (CC, SDH), Dutch, German"
      }
    }
  ];

  /* Vertical 9:16 Reels Discovery Feed (Netflix Fast-Laughs / Previews style)
   * Every Reel loops a tight 25-32 second scene hook and routes straight into
   * the full serialized show (`seriesId` + `episodeId`). */
  const REELS = [
    {
      id: "reel-tos-siege",
      seriesId: "tears-of-steel",
      episodeId: "tos-s1e3",
      tag: "Sci-Fi · S1, E3 Hook",
      title: "Tears of Steel",
      hook: "Autonomous war machines lock onto the Oude Kerk neural signal in occupied Amsterdam.",
      streamUrl: "https://archive.org/download/Tears-of-Steel/tears_of_steel_720p.mp4",
      poster: "assets/media/tos-ep3.jpg",
      startSec: 378,
      endSec: 408
    },
    {
      id: "reel-sintel-peaks",
      seriesId: "sintel",
      episodeId: "sin-s1e1",
      tag: "Epic Fantasy · Official Preview",
      title: "Sintel",
      hook: "\"I've been searching for so long...\" Across frozen peaks in pursuit of a stolen dragon.",
      streamUrl: "https://download.blender.org/durian/trailer/sintel_trailer-720p.mp4",
      poster: "assets/media/sintel-hero.jpg",
      startSec: 6,
      endSec: 44
    },
    {
      id: "reel-cosmos-salesman",
      seriesId: "cosmos-laundromat",
      episodeId: "cl-s1e2",
      tag: "Pilot Season · S1, E2 Hook",
      title: "Cosmos Laundromat",
      hook: "A stranger steps out of the island fog offering infinite lifetimes inside a cosmic washing machine.",
      streamUrl: "https://archive.org/download/CosmosLaundromatFirstCycle/Cosmos%20Laundromat%20-%20First%20Cycle%20%281080p%29.mp4",
      poster: "assets/media/cosmos-victor-poster.jpg",
      startSec: 258,
      endSec: 290
    },
    {
      id: "reel-ed-machine",
      seriesId: "elephants-dream",
      episodeId: "ed-s1e1",
      tag: "Surreal Sci-Fi · S1, E1 Hook",
      title: "Elephants Dream",
      hook: "\"Step only where I step.\" Inside a self-assembling machine that punishes disbelief.",
      streamUrl: "https://archive.org/download/ElephantsDream/ed_hd.mp4",
      poster: "assets/media/ed-hero.jpg",
      startSec: 132,
      endSec: 162
    },
    {
      id: "reel-tos-bridge",
      seriesId: "tears-of-steel",
      episodeId: "tos-s1e1",
      tag: "Cyberpunk Drama · S1, E1 Opening",
      title: "Tears of Steel",
      hook: "Forty years before the machine uprising: one quiet argument on an Amsterdam bridge changes everything.",
      streamUrl: "https://archive.org/download/Tears-of-Steel/tears_of_steel_720p.mp4",
      poster: "assets/media/tos-ep1.jpg",
      startSec: 34,
      endSec: 64
    }
  ];

  const RAILS = [
    {
      id: "must-see",
      title: "Premiere Demo Slate",
      subtitle: "Serialized multi-episode demos · Dutch Blender Institute CC-BY open films",
      cardType: "2x3",
      seriesIds: ["tears-of-steel", "cosmos-laundromat", "sintel", "elephants-dream"]
    },
    {
      id: "pilots",
      title: "Pilot Season · Community Greenlight",
      subtitle: "Watch Episode 1 and signal which worlds deserve a full season",
      cardType: "pilot",
      seriesIds: ["cosmos-laundromat", "tears-of-steel", "sintel"]
    },
    {
      id: "branching",
      title: "Alternate Timelines & Director Cuts",
      subtitle: "Explore parallel narrative cuts inside each series detail ledger",
      cardType: "16x9-feature",
      seriesIds: ["tears-of-steel", "sintel", "cosmos-laundromat", "elephants-dream"]
    }
  ];

  window.TESSER_CATALOG = {
    series: SERIES,
    reels: REELS,
    rails: RAILS,
    getSeriesBySlug(slug) {
      return SERIES.find((s) => s.slug === slug || s.id === slug) || null;
    },
    getEpisode(series, episodeId) {
      if (!series) return null;
      const all = [...(series.episodes || []), ...(series.alternateEpisodes || [])];
      return all.find((e) => e.id === episodeId) || series.episodes[0] || null;
    }
  };
})();
