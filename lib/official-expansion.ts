export type OfficialExpansionTag =
  | "veggie"
  | "fruit"
  | "plant"
  | "herbs"
  | "flower"
  | "tree"
  | "christmas"
  | "space"
  | "insect"
  | "ocean"
  | "animal"
  | "holiday"
  | "pet"
  | "other";

export interface OfficialExpansionEntry {
  id: string;
  number: string;
  name: string;
  subtitle: string;
  group: "produce" | "plants" | "herbs" | "christmas" | "space" | "insects" | "ocean" | "holiday-pets";
  tags: readonly OfficialExpansionTag[];
  width: number;
  height: number;
  color: string;
  faces: number;
  generation?: "Tripo H3.1 image-to-3D" | "Tripo H3.1 text-to-3D";
}

export const OFFICIAL_EXPANSION_MODELS = [
  { id: "tomato-pal", number: "36", name: "Tomato Pal", subtitle: "Friendly rounded garden tomato", group: "produce", tags: ["veggie", "fruit"], width: 66, height: 70, color: "#c84b3f", faces: 19_228 },
  { id: "strawberry-pal", number: "37", name: "Strawberry Pal", subtitle: "Seed-dimpled berry friend", group: "produce", tags: ["fruit"], width: 58, height: 78, color: "#c84f50", faces: 19_590 },
  { id: "carrot-pal", number: "38", name: "Carrot Pal", subtitle: "Stout leafy root friend", group: "produce", tags: ["veggie"], width: 52, height: 92, color: "#d87342", faces: 18_956 },
  { id: "pumpkin-pal", number: "39", name: "Pumpkin Pal", subtitle: "Soft-lobed harvest pumpkin", group: "produce", tags: ["veggie", "fruit"], width: 70, height: 68, color: "#c8753f", faces: 18_782 },
  { id: "chili-pal", number: "40", name: "Chili Pal", subtitle: "Curved compact pepper friend", group: "produce", tags: ["veggie", "fruit"], width: 54, height: 86, color: "#bf4d43", faces: 19_732 },
  { id: "eggplant-pal", number: "41", name: "Eggplant Pal", subtitle: "Plump aubergine friend", group: "produce", tags: ["veggie", "fruit"], width: 58, height: 84, color: "#68506f", faces: 18_844 },
  { id: "lemon-pal", number: "42", name: "Lemon Pal", subtitle: "Bright rounded citrus friend", group: "produce", tags: ["fruit"], width: 70, height: 64, color: "#d5ae48", faces: 19_298 },

  { id: "monstera-cluster", number: "43", name: "Monstera Cluster", subtitle: "Three thick split-leaf forms", group: "plants", tags: ["plant"], width: 72, height: 92, color: "#3f6b4c", faces: 23_894 },
  { id: "barrel-cactus", number: "44", name: "Barrel Cactus", subtitle: "Needle-free smiling cactus", group: "plants", tags: ["plant"], width: 62, height: 82, color: "#527457", faces: 21_878 },
  { id: "succulent-rosette", number: "45", name: "Succulent Rosette", subtitle: "Low fused leaf rosette", group: "plants", tags: ["plant"], width: 72, height: 62, color: "#6f8a70", faces: 24_354 },
  { id: "fern-sprout", number: "46", name: "Fern Sprout", subtitle: "Three stout curled fronds", group: "plants", tags: ["plant"], width: 68, height: 90, color: "#456e4d", faces: 24_652 },
  { id: "cloud-bonsai", number: "47", name: "Cloud Crown Bonsai", subtitle: "Rounded cloud-canopy tree", group: "plants", tags: ["plant", "tree"], width: 72, height: 92, color: "#496c4b", faces: 26_380 },
  { id: "sunflower-smile", number: "48", name: "Sunflower Smile", subtitle: "Broad fused-petal bloom", group: "plants", tags: ["plant", "flower"], width: 70, height: 94, color: "#ca9644", faces: 24_822 },
  { id: "aloe-rosette", number: "49", name: "Aloe Rosette", subtitle: "Blunt seven-leaf aloe", group: "plants", tags: ["plant"], width: 68, height: 72, color: "#5f8370", faces: 23_372 },

  { id: "basil-bundle", number: "50", name: "Basil Bundle", subtitle: "Six broad fused basil leaves", group: "herbs", tags: ["herbs", "plant"], width: 68, height: 82, color: "#4d794f", faces: 23_828 },
  { id: "mint-bundle", number: "51", name: "Mint Bundle", subtitle: "Rounded scalloped mint cluster", group: "herbs", tags: ["herbs", "plant"], width: 68, height: 82, color: "#59815d", faces: 22_766 },
  { id: "rosemary-bundle", number: "52", name: "Rosemary Bundle", subtitle: "Five sturdy rosemary sprigs", group: "herbs", tags: ["herbs", "plant"], width: 62, height: 90, color: "#4d7059", faces: 24_944 },
  { id: "thyme-mound", number: "53", name: "Thyme Mound", subtitle: "Dense rounded thyme crown", group: "herbs", tags: ["herbs", "plant"], width: 68, height: 68, color: "#6b8065", faces: 25_386 },
  { id: "lavender-bundle", number: "54", name: "Lavender Bundle", subtitle: "Five thick lavender spikes", group: "herbs", tags: ["herbs", "plant", "flower"], width: 62, height: 94, color: "#786b8c", faces: 24_870 },
  { id: "sage-rosette", number: "55", name: "Sage Rosette", subtitle: "Velvety broad sage leaves", group: "herbs", tags: ["herbs", "plant"], width: 70, height: 70, color: "#788579", faces: 23_280 },

  { id: "gingerbread-friend", number: "56", name: "Gingerbread Friend", subtitle: "Rounded iced holiday cookie", group: "christmas", tags: ["christmas", "holiday"], width: 62, height: 88, color: "#9a6549", faces: 23_196 },
  { id: "winter-penguin", number: "57", name: "Winter Penguin", subtitle: "Scarf-wrapped polar friend", group: "christmas", tags: ["christmas", "holiday", "animal"], width: 64, height: 88, color: "#485053", faces: 24_018 },
  { id: "polar-bear-friend", number: "58", name: "Polar Bear Friend", subtitle: "Cozy seated winter bear", group: "christmas", tags: ["christmas", "holiday", "animal"], width: 66, height: 86, color: "#e6e0d2", faces: 24_762 },

  { id: "orbit-astronaut", number: "59", name: "Orbit Astronaut", subtitle: "Chubby seated space explorer", group: "space", tags: ["space", "other"], width: 66, height: 90, color: "#d9d8cf", faces: 25_168 },
  { id: "pocket-rocket", number: "60", name: "Pocket Rocket", subtitle: "Stout three-fin spacecraft", group: "space", tags: ["space", "other"], width: 58, height: 96, color: "#d8d4c8", faces: 22_936 },
  { id: "smiling-saturn", number: "61", name: "Smiling Saturn", subtitle: "Planet with a thick fused ring", group: "space", tags: ["space", "other"], width: 76, height: 70, color: "#bd8f52", faces: 25_146 },
  { id: "crescent-moon", number: "62", name: "Crescent Moon", subtitle: "Thick cratered moon friend", group: "space", tags: ["space", "other"], width: 62, height: 92, color: "#d8c99f", faces: 23_778 },
  { id: "friendly-ufo", number: "63", name: "Friendly UFO", subtitle: "Solid rounded flying saucer", group: "space", tags: ["space", "other"], width: 76, height: 62, color: "#70858b", faces: 24_312 },
  { id: "retro-robot", number: "64", name: "Retro Robot", subtitle: "Compact friendly automaton", group: "space", tags: ["space", "other"], width: 64, height: 88, color: "#71868b", faces: 25_222 },

  { id: "ladybug-friend", number: "65", name: "Ladybug Friend", subtitle: "Low spotted beetle friend", group: "insects", tags: ["insect", "animal"], width: 70, height: 60, color: "#b84e49", faces: 25_414 },
  { id: "bumblebee-friend", number: "66", name: "Bumblebee Friend", subtitle: "Plump close-winged bee", group: "insects", tags: ["insect", "animal"], width: 68, height: 64, color: "#c89542", faces: 26_938 },
  { id: "butterfly-friend", number: "67", name: "Butterfly Friend", subtitle: "Broad fused-wing butterfly", group: "insects", tags: ["insect", "animal"], width: 78, height: 72, color: "#b86d68", faces: 29_546 },
  { id: "beetle-friend", number: "68", name: "Beetle Friend", subtitle: "Compact shell-backed beetle", group: "insects", tags: ["insect", "animal"], width: 68, height: 62, color: "#725342", faces: 27_064 },
  { id: "caterpillar-friend", number: "69", name: "Caterpillar Friend", subtitle: "Five overlapping round segments", group: "insects", tags: ["insect", "animal"], width: 76, height: 58, color: "#6f8b4f", faces: 25_248 },

  { id: "whale-friend", number: "70", name: "Whale Friend", subtitle: "Plump compact ocean whale", group: "ocean", tags: ["ocean", "animal"], width: 76, height: 62, color: "#668390", faces: 24_674 },
  { id: "octopus-friend", number: "71", name: "Octopus Friend", subtitle: "Eight fused tentacle lobes", group: "ocean", tags: ["ocean", "animal"], width: 72, height: 70, color: "#b66d65", faces: 27_222 },
  { id: "sea-turtle-friend", number: "72", name: "Sea Turtle Friend", subtitle: "Low domed shell swimmer", group: "ocean", tags: ["ocean", "animal"], width: 76, height: 58, color: "#63775a", faces: 29_236 },
  { id: "seahorse-friend", number: "73", name: "Seahorse Friend", subtitle: "Stout closed-tail seahorse", group: "ocean", tags: ["ocean", "animal"], width: 58, height: 92, color: "#b58a4d", faces: 27_460 },
  { id: "ocean-fish", number: "74", name: "Ocean Fish", subtitle: "Rounded friendly reef fish", group: "ocean", tags: ["ocean", "animal"], width: 76, height: 64, color: "#688794", faces: 27_338 },
  { id: "starfish-friend", number: "75", name: "Starfish Friend", subtitle: "Five thick rounded arms", group: "ocean", tags: ["ocean", "animal"], width: 76, height: 66, color: "#b87669", faces: 9_900, generation: "Tripo H3.1 text-to-3D" },

  { id: "jack-o-lantern", number: "76", name: "Jack-o'-Lantern", subtitle: "Solid smiling Halloween pumpkin", group: "holiday-pets", tags: ["holiday", "other"], width: 70, height: 70, color: "#c3743e", faces: 23_474 },
  { id: "friendly-ghost", number: "77", name: "Friendly Ghost", subtitle: "Rounded three-lobe ghost", group: "holiday-pets", tags: ["holiday", "other"], width: 66, height: 86, color: "#dedbd2", faces: 23_966 },
  { id: "easter-bunny", number: "78", name: "Easter Bunny", subtitle: "Stout-eared spring bunny", group: "holiday-pets", tags: ["holiday", "animal", "pet"], width: 64, height: 92, color: "#d8d0c1", faces: 25_444 },
  { id: "cozy-cat", number: "79", name: "Cozy Cat", subtitle: "Seated closed-tail companion", group: "holiday-pets", tags: ["pet", "animal"], width: 66, height: 86, color: "#8c8175", faces: 24_880 },
  { id: "cozy-dog", number: "80", name: "Cozy Dog", subtitle: "Floppy-eared seated companion", group: "holiday-pets", tags: ["pet", "animal"], width: 68, height: 84, color: "#a77b58", faces: 25_684 }
] as const satisfies readonly OfficialExpansionEntry[];

export type OfficialExpansionModelId = typeof OFFICIAL_EXPANSION_MODELS[number]["id"];

export const OFFICIAL_MESH_UPGRADES = {
  "gift-box": { group: "christmas", faces: 21_028, width: 66, height: 72, color: "#aa4e4b" },
  "candy-cane": { group: "christmas", faces: 20_816, width: 54, height: 92, color: "#b95a55" },
  "christmas-bell": { group: "christmas", faces: 23_000, width: 66, height: 80, color: "#bd8b48" }
} as const;
