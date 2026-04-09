// Structure classifier output type
type StructureType = 'BINARY' | 'THRESHOLD_LADDER' | 'TIMING_BUCKET' | 'EXACT_RANGE' | 'RANKING' | 'DEPENDENCY' | 'OTHER';

export interface ClassificationResult {
  structureType: StructureType;
  confidence: number;
  reasons: string[];
}
