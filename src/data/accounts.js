export const investmentAccounts = [
  {
    id: 'brokerage-ind',
    name: 'Individual Brokerage',
    number: '•••• 4821',
    balance: 184220.15,
    ytdReturn: 11.2,
    type: 'Taxable',
  },
  {
    id: 'brokerage-joint',
    name: 'Joint Brokerage',
    number: '•••• 1039',
    balance: 96410.88,
    ytdReturn: 9.7,
    type: 'Taxable',
  },
  {
    id: '529-emma',
    name: '529 College Savings · Emma',
    number: '•••• 7402',
    balance: 41200.0,
    ytdReturn: 7.4,
    type: 'Education',
  },
]

export const retirementAccounts = [
  {
    id: 'k401',
    name: 'Keystone 401(k)',
    number: '•••• 9011',
    balance: 612305.77,
    ytdReturn: 10.8,
    type: 'Employer',
    employerMatch: { pct: 6, contributedPct: 4.5 },
  },
  {
    id: 'roth-ira',
    name: 'Roth IRA',
    number: '•••• 5567',
    balance: 148920.33,
    ytdReturn: 12.1,
    type: 'Tax-free',
  },
  {
    id: 'trad-ira',
    name: 'Traditional IRA',
    number: '•••• 3388',
    balance: 72504.12,
    ytdReturn: 9.9,
    type: 'Tax-deferred',
  },
  {
    id: 'hsa',
    name: 'Health Savings Account',
    number: '•••• 7720',
    balance: 28999.17,
    ytdReturn: 6.3,
    type: 'Triple-tax-advantaged',
  },
]
