// The literal label used for the "no tip / principled" option.
export const WTF_TIP = 'WTF did we do?'

// The label for "payer tipped a flat amount, back out the %".
export const FLAT_TIP = "It's Not A %?"

// Tip dropdown options. value is the percent (null = WTF, 'flat' = flat amount).
export const TIP_OPTIONS = [
  { label: '0%', value: 0 },
  { label: '5%', value: 5 },
  { label: '10%', value: 10 },
  { label: '15%', value: 15 },
  { label: '18%', value: 18 },
  { label: '20%', value: 20 },
  { label: FLAT_TIP, value: 'flat' },
  { label: WTF_TIP, value: null },
]

// Tip basis options. `preTax: true` => tip on subtotal; false => tip on subtotal + tax.
export const BASIS_FAIR = 'Before Tax'
export const BASIS_DUPED = 'After Tax'

export const BASIS_OPTIONS = [
  { label: BASIS_FAIR, preTax: true },
  { label: BASIS_DUPED, preTax: false },
]
