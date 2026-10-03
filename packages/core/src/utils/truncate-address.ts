/**
 * Shrink a long Algorand address to the first `head` + last `tail` characters
 * joined by an ellipsis. Matches algokit-lora's display style.
 */
export function truncateAddress(address: string, head = 6, tail = 4): string {
  if (!address) return ''
  if (address.length <= head + tail + 1) return address
  return `${address.slice(0, head)}…${address.slice(-tail)}`
}
