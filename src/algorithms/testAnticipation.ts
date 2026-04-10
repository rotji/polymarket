// Test script for Anticipation Algorithm
import { analyzeAnticipationOpportunities } from './anticipationAlgorithm.ts';

// Example normalized events data (mock)
const events = [
  {
    title: 'CPI April 2026',
    markets: [
      {
        question: 'Will CPI exceed 3.5% in April?',
        resolutionDate: '2026-04-15T12:30:00Z',
        outcomes: [
          { name: 'Yes', price: '0.51' },
          { name: 'No', price: '0.49' }
        ]
      },
      {
        question: 'Will CPI exceed 4.0% in April?',
        resolutionDate: '2026-04-15T12:30:00Z',
        outcomes: [
          { name: 'Yes', price: '0.50' },
          { name: 'No', price: '0.50' }
        ]
      }
    ]
  },
  {
    title: 'Fed Meeting April 2026',
    markets: [
      {
        question: 'Will the Fed raise rates in April?',
        resolutionDate: '2026-04-20T18:00:00Z',
        outcomes: [
          { name: 'Yes', price: '0.52' },
          { name: 'No', price: '0.48' }
        ]
      }
    ]
  }
];

// Example calendar of upcoming events
const calendar = [
  { name: 'CPI', timestamp: Date.parse('2026-04-15T12:30:00Z'), type: 'economic' },
  { name: 'Fed Meeting', timestamp: Date.parse('2026-04-20T18:00:00Z'), type: 'economic' }
];

const results = analyzeAnticipationOpportunities(events, calendar, { anticipationWindowDays: 10, debug: true });
console.log('Anticipation Algorithm Results:', results);
