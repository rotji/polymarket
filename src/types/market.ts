// Universal market type definition
export interface NormalizedMarket {
  source: string;
  exchangeMarketId: string;
  eventGroupId: string;
  title: string;
  structureHint: string;
  outcomes: Array<any>;
  volume: number;
  spread: number;
  resolutionDate: string;
}
