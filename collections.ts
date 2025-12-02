export interface NFTCollection {
  address: string
  deployBlock: number
  name: string
}

// NFT Collections configuration
export const collections: NFTCollection[] = [
  { address: '0x12B32F41d11dF8D8f6d23090d0DC8fcB3F5Ac0f4', deployBlock: 13014003, name: 'Bandbear' }, // mock bandbear
//   { address: '0x72D876D9cdf4001b836f8E47254d0551EdA2eebB', deployBlock: 698632, name: 'Bitbear' },
//   { address: '0x7711B2Eb2451259dbF211e30157ceB7CFeb79a19', deployBlock: 698628, name: 'Bandbear' },
//   { address: '0xDDeAf391c4be2d01ca52aBb8C159a06820ef078C', deployBlock: 698625, name: 'Babybear' },
//   { address: '0xf49ec5db255854C4a567de5AB3826c9AAbaFc7cF', deployBlock: 698642, name: 'Boobear' },
//   { address: '0xA0CF472E6132F6B822a944f6F31aA7b261c7c375', deployBlock: 698635, name: 'Bondbear' },
//   { address: '0x141De07E5D4C4759EC9301DA106115D4841f66cD', deployBlock: 698638, name: 'Bongbear' }, // change deployBlock to something recent to debug large token id db save issue
]

// Helper to check if an address is a valid collection
export function isValidCollection(address: string): boolean {
  const normalizedAddress = address.toLowerCase()
  return collections.some(c => c.address.toLowerCase() === normalizedAddress)
}

// Get collection by address
export function getCollection(address: string): NFTCollection | undefined {
  const normalizedAddress = address.toLowerCase()
  return collections.find(c => c.address.toLowerCase() === normalizedAddress)
}
