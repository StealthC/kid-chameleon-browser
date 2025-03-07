export type KnowRomDetails = {
  name: string
  hack?: boolean
  region?: string
  author?: string
  version?: string
}

export const KnownRoms: Record<string, KnowRomDetails> = {
  '48682698280E1D3975855018A51569B9D3F57632ECDE86E047A60F7EDDAE1A57': {
    name: 'Chameleon Kid (JP)',
    region: 'JP',
  },
  BC08B0188FB715AE469806843A8418D4937D2098B66D04227668865B3D4D5BAA: {
    name: 'Kid Chameleon (US/EUR)',
    region: 'US/EUR',
  },
  E4456FFABA221121BBA3FBE2F645CCD686B6B0E26852D83E109272981F03EC02: {
    name: 'Kid Chameleon (US/EUR) BETA (1991-12-19)',
    region: 'US/EUR',
    version: 'BETA (1991-12-19)',
  },
  E688E63E6162E75CBBF9E5708C35108D40FB0BD7C1457F371D996AEAAF5FBB2C: {
    hack: true,
    name: 'Kid Chameleon (Sound Test)',
    region: 'US/EUR',
    author: 'StealthC',
  },
}
